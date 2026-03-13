import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { validateBody, validateQuery, validateParams, schemas, contentSecurityPolicy, validateRateLimitHeaders } from '../utils/validation';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';

/**
 * Enhanced rate limiting with security features
 */
export const securityRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per window
  message: {
    error: {
      message: 'Too many requests from this IP, please try again later.',
      type: 'rate_limit_error',
      code: 'too_many_requests',
      status: 429,
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests
  skipSuccessfulRequests: false,
  // Skip failed requests
  skipFailedRequests: false,
  // Custom key generator to prevent IP spoofing
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || 'unknown';
  },
  // Custom handler to log violations
  handler: (req, res) => {
    logger.warn({
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
    }, 'Rate limit exceeded');
    
    res.status(429).json({
      error: {
        message: 'Too many requests from this IP, please try again later.',
        type: 'rate_limit_error',
        code: 'too_many_requests',
        status: 429,
      },
    });
  },
});

/**
 * Stricter rate limiting for sensitive endpoints
 */
export const strictRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // Much lower limit for sensitive operations
  message: {
    error: {
      message: 'Too many sensitive requests, please try again later.',
      type: 'rate_limit_error',
      code: 'sensitive_rate_limit',
      status: 429,
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Request size limiter to prevent abuse
 */
export const requestSizeLimit = (maxSize: number = 10 * 1024 * 1024) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    
    if (contentLength > maxSize) {
      return res.status(413).json({
        error: {
          message: 'Request entity too large',
          type: 'request_too_large',
          code: 'payload_too_large',
          status: 413,
        },
      });
    }

    next();
  };
};

/**
 * Security headers middleware
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Set security headers
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
  });

  // Remove server information
  res.removeHeader('Server');
  res.removeHeader('X-Powered-By');

  next();
};

/**
 * Input sanitization middleware
 */
export const inputSanitization = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = req.query[key]!.trim().slice(0, 1000);
      }
    }
  }

  // Sanitize path parameters
  if (req.params && typeof req.params === 'object') {
    for (const key in req.params) {
      if (typeof req.params[key] === 'string') {
        req.params[key] = req.params[key]!.trim().slice(0, 100);
      }
    }
  }

  next();
};

/**
 * API key validation middleware
 */
export const validateApiKeyFormat = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return next(); // Let auth middleware handle missing auth
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return res.status(401).json({
      error: {
        message: 'Invalid authorization header format',
        type: 'authentication_error',
        code: 'invalid_auth_format',
        status: 401,
      },
    });
  }

  const apiKey = match[1].trim();
  
  // Basic format validation
  if (!apiKey.startsWith('clex_') || apiKey.length < 25) {
    return res.status(401).json({
      error: {
        message: 'Invalid API key format',
        type: 'authentication_error',
        code: 'invalid_api_key_format',
        status: 401,
      },
    });
  }

  // Check for common patterns that might indicate abuse
  const suspiciousPatterns = [
    /clex_test/i,
    /clex_demo/i,
    /clex_example/i,
    /clex_+/,
    /clex_*$/,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(apiKey)) {
      logger.warn({
        apiKey: apiKey.slice(0, 12) + '...',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      }, 'Suspicious API key pattern detected');
      
      return res.status(401).json({
        error: {
          message: 'Invalid API key',
          type: 'authentication_error',
          code: 'invalid_api_key',
          status: 401,
        },
      });
    }
  }

  next();
};

/**
 * Request timeout middleware
 */
export const requestTimeout = (timeoutMs: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        logger.warn({
          path: req.path,
          method: req.method,
          ip: req.ip,
          timeout: timeoutMs,
        }, 'Request timeout');
        
        res.status(408).json({
          error: {
            message: 'Request timeout',
            type: 'timeout_error',
            code: 'request_timeout',
            status: 408,
          },
        });
      }
    }, timeoutMs);

    // Clear timeout when response finishes
    res.on('finish', () => clearTimeout(timeout));
    res.on('close', () => clearTimeout(timeout));

    next();
  };
};

/**
 * Comprehensive security middleware
 */
export const securityMiddleware = [
  securityHeaders,
  validateRateLimitHeaders,
  inputSanitization,
  contentSecurityPolicy,
  requestSizeLimit(10 * 1024 * 1024), // 10MB limit
  securityRateLimit,
];

/**
 * Chat completion specific security
 */
export const chatCompletionSecurity = [
  validateBody(schemas.chatCompletion),
  requestTimeout(60000), // 60 second timeout for chat
  validateApiKeyFormat,
];

/**
 * API key management security
 */
export const apiKeySecurity = [
  strictRateLimit,
  validateApiKeyFormat,
];

/**
 * Analytics and usage security
 */
export const analyticsSecurity = [
  validateQuery(schemas.pagination),
  validateQuery(schemas.dateRange),
];
