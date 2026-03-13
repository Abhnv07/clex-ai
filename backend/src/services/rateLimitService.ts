import { prisma } from '../utils/db';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';

export interface RateLimitConfig {
  perMinute: number;
  perHour: number;
  perDay: number;
  monthlyTokens?: number;
}

export interface QuotaCheck {
  allowed: boolean;
  remaining: {
    minute: number;
    hour: number;
    day: number;
    month?: number;
  };
  resetTimes: {
    minute: Date;
    hour: Date;
    day: Date;
    month?: Date;
  };
}

export interface TokenQuotaCheck {
  allowed: boolean;
  remainingTokens: number;
  resetDate: Date;
}

export class RateLimitService {
  /**
   * Check if user is within rate limits
   */
  async checkRateLimit(userId: string, config: RateLimitConfig): Promise<QuotaCheck> {
    const now = new Date();
    
    // Calculate window start times
    const minuteWindow = new Date(now.getTime() - (now.getTime() % (60 * 1000)));
    const hourWindow = new Date(now.getTime() - (now.getTime() % (60 * 60 * 1000)));
    const dayWindow = new Date(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
    const monthWindow = new Date(new Date(now.getFullYear(), now.getMonth(), 1));
    
    try {
      // Get or create quota usage records for each window
      const [minuteUsage, hourUsage, dayUsage, monthUsage] = await Promise.all([
        this.getOrCreateUsage(userId, 'minute', minuteWindow),
        this.getOrCreateUsage(userId, 'hour', hourWindow),
        this.getOrCreateUsage(userId, 'day', dayWindow),
        config.monthlyTokens ? this.getOrCreateUsage(userId, 'month', monthWindow) : null,
      ]);
      
      const remaining = {
        minute: Math.max(0, config.perMinute - minuteUsage.requestCount),
        hour: Math.max(0, config.perHour - hourUsage.requestCount),
        day: Math.max(0, config.perDay - dayUsage.requestCount),
        ...(config.monthlyTokens && monthUsage ? { 
          month: Math.max(0, config.monthlyTokens - monthUsage.tokenCount) 
        } : {}),
      };
      
      const resetTimes = {
        minute: new Date(minuteWindow.getTime() + 60 * 1000),
        hour: new Date(hourWindow.getTime() + 60 * 60 * 1000),
        day: new Date(dayWindow.getTime() + 24 * 60 * 60 * 1000),
        ...(config.monthlyTokens ? { 
          month: new Date(monthWindow.getFullYear(), monthWindow.getMonth() + 1, 1) 
        } : {}),
      };
      
      const allowed: boolean = remaining.minute > 0 && remaining.hour > 0 && remaining.day > 0 && 
                     (!config.monthlyTokens || (remaining.month !== undefined && remaining.month > 0));
      
      return {
        allowed,
        remaining,
        resetTimes,
      };
    } catch (error) {
      logger.error({ err: error, userId }, 'Rate limit check failed');
      // Fail open - allow the request but log the error
      return {
        allowed: true,
        remaining: { minute: 1, hour: 1, day: 1 },
        resetTimes: {
          minute: new Date(now.getTime() + 60 * 1000),
          hour: new Date(now.getTime() + 60 * 60 * 1000),
          day: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        },
      };
    }
  }
  
  /**
   * Check if user is within token quota
   */
  async checkTokenQuota(userId: string, requestedTokens: number): Promise<TokenQuotaCheck> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          monthlyTokenLimit: true,
          currentTokenUsage: true,
          tokenUsageResetDate: true,
        },
      });
      
      if (!user) {
        throw new AppError('User not found', 404, 'user_not_found');
      }
      
      // If no monthly limit, allow unlimited
      if (!user.monthlyTokenLimit) {
        return {
          allowed: true,
          remainingTokens: Number.MAX_SAFE_INTEGER,
          resetDate: user.tokenUsageResetDate,
        };
      }
      
      // Reset usage if we're in a new month
      const now = new Date();
      if (now > user.tokenUsageResetDate) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            currentTokenUsage: 0,
            tokenUsageResetDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
          },
        });
        
        return {
          allowed: true,
          remainingTokens: user.monthlyTokenLimit,
          resetDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
        };
      }
      
      const remainingTokens = Math.max(0, user.monthlyTokenLimit - user.currentTokenUsage);
      const allowed = remainingTokens >= requestedTokens;
      
      return {
        allowed,
        remainingTokens,
        resetDate: user.tokenUsageResetDate,
      };
    } catch (error) {
      logger.error({ err: error, userId }, 'Token quota check failed');
      // Fail open for non-user errors
      if (error instanceof AppError) {
        throw error;
      }
      return {
        allowed: true,
        remainingTokens: Number.MAX_SAFE_INTEGER,
        resetDate: new Date(),
      };
    }
  }
  
  /**
   * Record usage after a successful request
   */
  async recordUsage(
    userId: string, 
    requestTokens: number, 
    completionTokens: number,
    totalTokens: number
  ): Promise<void> {
    const now = new Date();
    
    // Calculate window start times
    const minuteWindow = new Date(now.getTime() - (now.getTime() % (60 * 1000)));
    const hourWindow = new Date(now.getTime() - (now.getTime() % (60 * 60 * 1000)));
    const dayWindow = new Date(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
    const monthWindow = new Date(new Date(now.getFullYear(), now.getMonth(), 1));
    
    try {
      // Update usage records
      await Promise.all([
        this.incrementUsage(userId, 'minute', minuteWindow, 1, 0),
        this.incrementUsage(userId, 'hour', hourWindow, 1, 0),
        this.incrementUsage(userId, 'day', dayWindow, 1, 0),
        this.incrementUsage(userId, 'month', monthWindow, 1, totalTokens),
      ]);
      
      // Update user's monthly token usage
      await prisma.user.update({
        where: { id: userId },
        data: {
          currentTokenUsage: {
            increment: totalTokens,
          },
        },
      });
      
      logger.debug({
        userId,
        requestTokens,
        completionTokens,
        totalTokens,
      }, 'Usage recorded');
    } catch (error) {
      logger.error({ err: error, userId }, 'Failed to record usage');
      // Don't throw - this is non-critical
    }
  }
  
  private async getOrCreateUsage(
    userId: string, 
    windowType: string, 
    windowStart: Date
  ) {
    return await prisma.userQuotaUsage.upsert({
      where: {
        userId_windowType_windowStart: {
          userId,
          windowType,
          windowStart,
        },
      },
      update: {},
      create: {
        userId,
        windowType,
        windowStart,
      },
    });
  }
  
  private async incrementUsage(
    userId: string,
    windowType: string,
    windowStart: Date,
    requestCount: number,
    tokenCount: number
  ) {
    await prisma.userQuotaUsage.upsert({
      where: {
        userId_windowType_windowStart: {
          userId,
          windowType,
          windowStart,
        },
      },
      update: {
        requestCount: {
          increment: requestCount,
        },
        tokenCount: {
          increment: tokenCount,
        },
      },
      create: {
        userId,
        windowType,
        windowStart,
        requestCount,
        tokenCount,
      },
    });
  }
  
  /**
   * Get user's current usage statistics
   */
  async getUserUsageStats(userId: string) {
    const now = new Date();
    const minuteWindow = new Date(now.getTime() - (now.getTime() % (60 * 1000)));
    const hourWindow = new Date(now.getTime() - (now.getTime() % (60 * 60 * 1000)));
    const dayWindow = new Date(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
    const monthWindow = new Date(new Date(now.getFullYear(), now.getMonth(), 1));
    
    const [user, minuteUsage, hourUsage, dayUsage, monthUsage] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          planTier: true,
          rateLimitPerMinute: true,
          rateLimitPerHour: true,
          rateLimitPerDay: true,
          monthlyTokenLimit: true,
          currentTokenUsage: true,
          tokenUsageResetDate: true,
        },
      }),
      this.getOrCreateUsage(userId, 'minute', minuteWindow),
      this.getOrCreateUsage(userId, 'hour', hourWindow),
      this.getOrCreateUsage(userId, 'day', dayWindow),
      this.getOrCreateUsage(userId, 'month', monthWindow),
    ]);
    
    if (!user) {
      throw new AppError('User not found', 404, 'user_not_found');
    }
    
    return {
      planTier: user.planTier,
      limits: {
        perMinute: user.rateLimitPerMinute,
        perHour: user.rateLimitPerHour,
        perDay: user.rateLimitPerDay,
        monthlyTokens: user.monthlyTokenLimit,
      },
      current: {
        minute: minuteUsage.requestCount,
        hour: hourUsage.requestCount,
        day: dayUsage.requestCount,
        month: monthUsage.tokenCount,
        monthlyTokens: user.currentTokenUsage,
      },
      remaining: {
        minute: Math.max(0, user.rateLimitPerMinute - minuteUsage.requestCount),
        hour: Math.max(0, user.rateLimitPerHour - hourUsage.requestCount),
        day: Math.max(0, user.rateLimitPerDay - dayUsage.requestCount),
        month: user.monthlyTokenLimit ? 
          Math.max(0, user.monthlyTokenLimit - user.currentTokenUsage) : null,
      },
      resetDates: {
        minute: new Date(minuteWindow.getTime() + 60 * 1000),
        hour: new Date(hourWindow.getTime() + 60 * 60 * 1000),
        day: new Date(dayWindow.getTime() + 24 * 60 * 60 * 1000),
        month: user.tokenUsageResetDate,
      },
    };
  }
}

export const rateLimitService = new RateLimitService();
