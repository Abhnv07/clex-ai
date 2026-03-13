import Joi from 'joi';
import { ChatMessage } from '../types';

// Common validation patterns
export const patterns = {
  apiKey: /^clex_[a-zA-Z0-9_-]{20,}$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  modelId: /^[a-zA-Z0-9_\-\/]+$/,
  requestId: /^[a-zA-Z0-9_-]{1,100}$/,
};

// Sanitization functions
export const sanitizers = {
  string: (value: string): string => {
    return value
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .slice(0, 10000); // Limit length
  },
  
  text: (value: string): string => {
    return value
      .trim()
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .slice(0, 100000); // Longer limit for text content
  },
  
  apiKey: (value: string): string => {
    return value.trim().slice(0, 100);
  },
  
  modelId: (value: string): string => {
    return value.trim().slice(0, 100);
  },
};

// Validation schemas
export const schemas = {
  // Chat completion request validation
  chatCompletion: Joi.object({
    model: Joi.string()
      .required()
      .pattern(patterns.modelId)
      .custom((value) => sanitizers.modelId(value))
      .messages({
        'string.pattern.base': 'Invalid model ID format',
        'any.required': 'Model is required',
      }),
    
    messages: Joi.array()
      .required()
      .min(1)
      .max(100)
      .items(
        Joi.object({
          role: Joi.string()
            .required()
            .valid('system', 'user', 'assistant', 'tool')
            .messages({
              'any.only': 'Role must be one of: system, user, assistant, tool',
              'any.required': 'Message role is required',
            }),
          
          content: Joi.string()
            .required()
            .min(1)
            .max(100000)
            .custom((value) => sanitizers.text(value))
            .messages({
              'string.min': 'Message content cannot be empty',
              'string.max': 'Message content too long (max 100,000 characters)',
              'any.required': 'Message content is required',
            }),
        })
      )
      .messages({
        'array.min': 'At least one message is required',
        'array.max': 'Too many messages (max 100)',
        'any.required': 'Messages are required',
      }),
    
    temperature: Joi.number()
      .optional()
      .min(0)
      .max(2)
      .default(1)
      .messages({
        'number.min': 'Temperature must be at least 0',
        'number.max': 'Temperature must be at most 2',
      }),
    
    max_tokens: Joi.number()
      .optional()
      .integer()
      .min(1)
      .max(8192)
      .default(1000)
      .messages({
        'number.min': 'Max tokens must be at least 1',
        'number.max': 'Max tokens cannot exceed 8192',
        'number.integer': 'Max tokens must be an integer',
      }),
    
    top_p: Joi.number()
      .optional()
      .min(0)
      .max(1)
      .default(1)
      .messages({
        'number.min': 'Top_p must be at least 0',
        'number.max': 'Top_p must be at most 1',
      }),
    
    stream: Joi.boolean()
      .optional()
      .default(false)
      .messages({
        'boolean.base': 'Stream must be a boolean',
      }),
  }),

  // API key creation validation
  apiKeyCreate: Joi.object({
    name: Joi.string()
      .required()
      .min(1)
      .max(100)
      .custom((value) => sanitizers.string(value))
      .messages({
        'string.min': 'API key name cannot be empty',
        'string.max': 'API key name too long (max 100 characters)',
        'any.required': 'API key name is required',
      }),
    
    expiresAt: Joi.date()
      .optional()
      .iso()
      .greater('now')
      .messages({
        'date.format': 'Invalid date format',
        'date.greater': 'Expiration date must be in the future',
      }),
  }),

  // Pagination validation
  pagination: Joi.object({
    page: Joi.number()
      .optional()
      .integer()
      .min(1)
      .default(1)
      .messages({
        'number.min': 'Page must be at least 1',
        'number.integer': 'Page must be an integer',
      }),
    
    limit: Joi.number()
      .optional()
      .integer()
      .min(1)
      .max(100)
      .default(20)
      .messages({
        'number.min': 'Limit must be at least 1',
        'number.max': 'Limit cannot exceed 100',
        'number.integer': 'Limit must be an integer',
      }),
  }),

  // Date range validation
  dateRange: Joi.object({
    startDate: Joi.date()
      .optional()
      .iso()
      .max('now')
      .messages({
        'date.format': 'Invalid start date format',
        'date.max': 'Start date cannot be in the future',
      }),
    
    endDate: Joi.date()
      .optional()
      .iso()
      .min(Joi.ref('startDate'))
      .max('now')
      .messages({
        'date.format': 'Invalid end date format',
        'date.min': 'End date must be after start date',
        'date.max': 'End date cannot be in the future',
      }),
  }),

  // User update validation
  userUpdate: Joi.object({
    name: Joi.string()
      .optional()
      .min(1)
      .max(100)
      .custom((value) => sanitizers.string(value))
      .messages({
        'string.min': 'Name cannot be empty',
        'string.max': 'Name too long (max 100 characters)',
      }),
    
    planTier: Joi.string()
      .optional()
      .valid('free', 'pro', 'enterprise')
      .messages({
        'any.only': 'Plan tier must be one of: free, pro, enterprise',
      }),
  }),

  // Health check validation
  healthCheck: Joi.object({
    detailed: Joi.boolean()
      .optional()
      .default(false),
  }),
};

// Validation result interface
export interface ValidationResult<T = any> {
  isValid: boolean;
  data?: T;
  errors?: Array<{
    field: string;
    message: string;
    value: any;
  }>;
}

/**
 * Validate data against a schema
 */
export function validate<T>(data: any, schema: Joi.Schema): ValidationResult<T> {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value,
    }));

    return {
      isValid: false,
      errors,
    };
  }

  return {
    isValid: true,
    data: value as T,
  };
}

/**
 * Validate and sanitize request body
 */
export function validateBody<T>(schema: Joi.Schema) {
  return (req: any, res: any, next: any) => {
    const result = validate<T>(req.body, schema);
    
    if (!result.isValid) {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          type: 'validation_error',
          code: 'invalid_request',
          status: 400,
          details: result.errors,
        },
      });
    }

    // Replace request body with validated and sanitized data
    req.body = result.data;
    next();
  };
}

/**
 * Validate and sanitize query parameters
 */
export function validateQuery<T>(schema: Joi.Schema) {
  return (req: any, res: any, next: any) => {
    const result = validate<T>(req.query, schema);
    
    if (!result.isValid) {
      return res.status(400).json({
        error: {
          message: 'Query validation failed',
          type: 'validation_error',
          code: 'invalid_query',
          status: 400,
          details: result.errors,
        },
      });
    }

    // Replace query with validated and sanitized data
    req.query = result.data;
    next();
  };
}

/**
 * Validate and sanitize path parameters
 */
export function validateParams<T>(schema: Joi.Schema) {
  return (req: any, res: any, next: any) => {
    const result = validate<T>(req.params, schema);
    
    if (!result.isValid) {
      return res.status(400).json({
        error: {
          message: 'Parameter validation failed',
          type: 'validation_error',
          code: 'invalid_params',
          status: 400,
          details: result.errors,
        },
      });
    }

    // Replace params with validated and sanitized data
    req.params = result.data;
    next();
  };
}

/**
 * Content Security Policy middleware
 */
export function contentSecurityPolicy(req: any, res: any, next: any) {
  // Check for suspicious content in request body
  if (req.body && typeof req.body === 'object') {
    const bodyStr = JSON.stringify(req.body);
    
    // Check for common attack patterns
    const suspiciousPatterns = [
      /<script[^>]*>/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /eval\s*\(/i,
      /expression\s*\(/i,
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(bodyStr)) {
        return res.status(400).json({
          error: {
            message: 'Request contains suspicious content',
            type: 'security_error',
            code: 'suspicious_content',
            status: 400,
          },
        });
      }
    }
  }

  next();
}

/**
 * Rate limiting validation
 */
export function validateRateLimitHeaders(req: any, res: any, next: any) {
  // Check for suspicious rate limit bypass attempts
  const forwardedFor = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];
  const cfConnectingIp = req.headers['cf-connecting-ip']; // Cloudflare

  // If multiple IPs are present, it might be a proxy chain or bypass attempt
  if (forwardedFor && typeof forwardedFor === 'string') {
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    if (ips.length > 5) {
      return res.status(400).json({
        error: {
          message: 'Invalid proxy chain detected',
          type: 'security_error',
          code: 'invalid_proxy_chain',
          status: 400,
        },
      });
    }
  }

  next();
}
