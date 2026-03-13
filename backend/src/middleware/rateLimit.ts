import { Request, Response, NextFunction } from 'express';
import { rateLimitService, RateLimitConfig } from '../services/rateLimitService';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { prisma } from '../utils/db';
import { estimateTokens } from '../utils/costs';

/**
 * Middleware to enforce per-user rate limiting
 */
export async function perUserRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Skip rate limiting for health checks and docs
  if (req.path.startsWith('/v1/health') || req.path.startsWith('/docs')) {
    return next();
  }

  const userId = req.userId;
  if (!userId) {
    // If no userId, this is probably a public endpoint - use global rate limiting
    return next();
  }

  try {
    // Load user's plan-specific rate limits from DB
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        rateLimitPerMinute: true,
        rateLimitPerHour: true,
        rateLimitPerDay: true,
        monthlyTokenLimit: true,
      },
    });

    const config: RateLimitConfig = {
      perMinute: user?.rateLimitPerMinute ?? 60,
      perHour: user?.rateLimitPerHour ?? 1000,
      perDay: user?.rateLimitPerDay ?? 10000,
      monthlyTokens: user?.monthlyTokenLimit ?? undefined,
    };

    // If per-key limits are set (narrower), use the stricter value
    const keyLimits = req.apiKeyLimits;
    if (keyLimits) {
      if (keyLimits.maxRequestsPerMinute) {
        config.perMinute = Math.min(config.perMinute, keyLimits.maxRequestsPerMinute);
      }
      if (keyLimits.maxRequestsPerDay) {
        config.perDay = Math.min(config.perDay, keyLimits.maxRequestsPerDay);
      }
    }

    // Check rate limits
    const quotaCheck = await rateLimitService.checkRateLimit(userId, config);

    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit-Minute': config.perMinute.toString(),
      'X-RateLimit-Remaining-Minute': quotaCheck.remaining.minute.toString(),
      'X-RateLimit-Reset-Minute': quotaCheck.resetTimes.minute.toISOString(),
      'X-RateLimit-Limit-Hour': config.perHour.toString(),
      'X-RateLimit-Remaining-Hour': quotaCheck.remaining.hour.toString(),
      'X-RateLimit-Reset-Hour': quotaCheck.resetTimes.hour.toISOString(),
      'X-RateLimit-Limit-Day': config.perDay.toString(),
      'X-RateLimit-Remaining-Day': quotaCheck.remaining.day.toString(),
      'X-RateLimit-Reset-Day': quotaCheck.resetTimes.day.toISOString(),
    });

    if (!quotaCheck.allowed) {
      // Determine which limit was exceeded for better error message
      const exceededLimits = [];
      if (quotaCheck.remaining.minute <= 0) exceededLimits.push('minute');
      if (quotaCheck.remaining.hour <= 0) exceededLimits.push('hour');
      if (quotaCheck.remaining.day <= 0) exceededLimits.push('day');

      const primaryLimit = exceededLimits[0];
      const resetTime = quotaCheck.resetTimes[primaryLimit as keyof typeof quotaCheck.resetTimes];

      logger.warn({
        userId,
        exceededLimits,
        path: req.path,
        method: req.method,
      }, 'Rate limit exceeded');

      const error = new AppError(
        `Rate limit exceeded. ${primaryLimit} limit reached. Reset at ${resetTime?.toISOString()}`,
        429,
        'rate_limit_exceeded',
        'rate_limit_error'
      );

      res.status(429).json(error.toJSON());
      return;
    }

    // Store quota check for later use in request processing
    req.rateLimitCheck = quotaCheck;
    next();
  } catch (error) {
    logger.error({ err: error, userId }, 'Rate limiting middleware error');
    // Fail open - allow the request but log the error
    next();
  }
}

/**
 * Middleware to check token quotas for chat completion requests
 */
export async function tokenQuotaCheck(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Only apply to chat completion endpoints
  if (!req.path.includes('/chat/completions')) {
    return next();
  }

  const userId = req.userId;
  if (!userId) {
    return next();
  }

  try {
    // Estimate tokens for incoming request
    const messages = req.body?.messages;
    let estimatedTokens = 500; // default estimate
    if (Array.isArray(messages)) {
      estimatedTokens = messages.reduce(
        (sum: number, m: any) => sum + estimateTokens(String(m?.content ?? '')),
        0
      );
    }

    // Also enforce per-key daily token limit if set
    const keyLimits = req.apiKeyLimits;
    if (keyLimits?.maxTokensPerDay) {
      // We rely on the day-window token count from quota usage
      const now = new Date();
      const dayWindow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const dayUsage = await prisma.userQuotaUsage.findUnique({
        where: {
          userId_windowType_windowStart: {
            userId,
            windowType: 'day',
            windowStart: dayWindow,
          },
        },
      });
      const dayTokens = dayUsage?.tokenCount ?? 0;
      if (dayTokens + estimatedTokens > keyLimits.maxTokensPerDay) {
        const error = new AppError(
          `Per-key daily token limit exceeded (${keyLimits.maxTokensPerDay} tokens/day)`,
          429,
          'quota_exceeded',
          'rate_limit_error'
        );
        res.set('X-Quota-Limit-Tokens-Day', keyLimits.maxTokensPerDay.toString());
        res.set('X-Quota-Remaining-Tokens-Day', Math.max(0, keyLimits.maxTokensPerDay - dayTokens).toString());
        res.status(429).json(error.toJSON());
        return;
      }
    }

    const quotaCheck = await rateLimitService.checkTokenQuota(userId, estimatedTokens);

    // Add quota headers
    if (quotaCheck.remainingTokens < Number.MAX_SAFE_INTEGER) {
      res.set('X-Quota-Remaining-Tokens', quotaCheck.remainingTokens.toString());
      res.set('X-Quota-Reset', quotaCheck.resetDate.toISOString());
    }

    if (!quotaCheck.allowed) {
      logger.warn({ userId, estimatedTokens, remaining: quotaCheck.remainingTokens }, 'Token quota exceeded');
      const error = new AppError(
        `Monthly token quota exceeded. Resets at ${quotaCheck.resetDate.toISOString()}`,
        429,
        'quota_exceeded',
        'rate_limit_error'
      );
      res.status(429).json(error.toJSON());
      return;
    }

    req.tokenQuotaCheck = quotaCheck;
    next();
  } catch (error) {
    logger.error({ err: error, userId }, 'Token quota check error');
    // Fail open
    next();
  }
}

/**
 * Middleware to record usage after successful requests
 */
export async function recordUsage(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Store original end function
  const originalEnd = res.end.bind(res);
  
  res.end = function(chunk?: any, encoding?: any, cb?: any): Response {
    // Only record usage for successful requests
    if (res.statusCode >= 200 && res.statusCode < 300 && req.userId) {
      const usage = req.usageMetrics;
      if (usage) {
        // Record usage asynchronously
        rateLimitService.recordUsage(
          req.userId!,
          usage.promptTokens || 0,
          usage.completionTokens || 0,
          usage.totalTokens || 0
        ).catch(error => {
          logger.error({ err: error, userId: req.userId }, 'Failed to record usage');
        });
      }
    }
    
    // Call original end with proper typing
    return originalEnd(chunk, encoding, cb);
  };

  next();
}

// Extend Request interface to include our custom properties
declare global {
  namespace Express {
    interface Request {
      rateLimitCheck?: any;
      tokenQuotaCheck?: any;
      apiKeyLimits?: {
        maxRequestsPerMinute?: number | null;
        maxRequestsPerDay?: number | null;
        maxTokensPerDay?: number | null;
      };
      projectId?: string | null;
      usageMetrics?: {
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
      };
    }
  }
}
