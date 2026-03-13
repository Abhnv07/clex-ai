import { createClient, RedisClientType } from 'redis';
import { logger } from './logger';
import { config } from '../config';

let redisClient: RedisClientType | null = null;

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  keyPrefix?: string;
}

export class CacheService {
  private client: RedisClientType;
  private defaultTTL: number = 300; // 5 minutes
  private keyPrefix: string = 'clex:';

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 5000,
      },
    });

    this.client.on('error', (err) => {
      logger.error({ err }, 'Redis client error');
    });

    this.client.on('connect', () => {
      logger.info('Redis client connected');
    });

    this.client.on('disconnect', () => {
      logger.warn('Redis client disconnected');
    });
  }

  /**
   * Initialize Redis connection
   */
  async connect(): Promise<void> {
    if (!redisClient) {
      try {
        await this.client.connect();
        redisClient = this.client;
        logger.info('Redis connection established');
      } catch (error) {
        logger.error({ err: error }, 'Failed to connect to Redis');
        // Don't throw - we'll operate without cache
      }
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (redisClient) {
      await redisClient.quit();
      redisClient = null;
      logger.info('Redis connection closed');
    }
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    if (!redisClient) {
      return null;
    }

    try {
      const fullKey = this.buildKey(key, options?.keyPrefix);
      const value = await redisClient.get(fullKey);
      
      if (value === null) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      logger.error({ err: error, key }, 'Cache get error');
      return null;
    }
  }

  /**
   * Set a value in cache
   */
  async set<T>(
    key: string, 
    value: T, 
    options?: CacheOptions
  ): Promise<boolean> {
    if (!redisClient) {
      return false;
    }

    try {
      const fullKey = this.buildKey(key, options?.keyPrefix);
      const serializedValue = JSON.stringify(value);
      const ttl = options?.ttl || this.defaultTTL;

      await redisClient.setEx(fullKey, ttl, serializedValue);
      return true;
    } catch (error) {
      logger.error({ err: error, key }, 'Cache set error');
      return false;
    }
  }

  /**
   * Delete a value from cache
   */
  async del(key: string, options?: CacheOptions): Promise<boolean> {
    if (!redisClient) {
      return false;
    }

    try {
      const fullKey = this.buildKey(key, options?.keyPrefix);
      const result = await redisClient.del(fullKey);
      return result > 0;
    } catch (error) {
      logger.error({ err: error, key }, 'Cache delete error');
      return false;
    }
  }

  /**
   * Check if a key exists in cache
   */
  async exists(key: string, options?: CacheOptions): Promise<boolean> {
    if (!redisClient) {
      return false;
    }

    try {
      const fullKey = this.buildKey(key, options?.keyPrefix);
      const result = await redisClient.exists(fullKey);
      return result === 1;
    } catch (error) {
      logger.error({ err: error, key }, 'Cache exists error');
      return false;
    }
  }

  /**
   * Increment a numeric value in cache
   */
  async incr(
    key: string, 
    increment: number = 1, 
    options?: CacheOptions
  ): Promise<number | null> {
    if (!redisClient) {
      return null;
    }

    try {
      const fullKey = this.buildKey(key, options?.keyPrefix);
      const result = await redisClient.incrBy(fullKey, increment);
      
      // Set TTL if key is new
      if (options?.ttl) {
        await redisClient.expire(fullKey, options.ttl);
      }
      
      return result;
    } catch (error) {
      logger.error({ err: error, key }, 'Cache increment error');
      return null;
    }
  }

  /**
   * Get multiple values in a pipeline
   */
  async mget<T>(keys: string[], options?: CacheOptions): Promise<(T | null)[]> {
    if (!redisClient) {
      return keys.map(() => null);
    }

    try {
      const fullKeys = keys.map(key => this.buildKey(key, options?.keyPrefix));
      const values = await redisClient.mGet(fullKeys);
      
      return values.map(value => {
        if (value === null) return null;
        try {
          return JSON.parse(value) as T;
        } catch {
          return null;
        }
      });
    } catch (error) {
      logger.error({ err: error, keys }, 'Cache mget error');
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple values in a pipeline
   */
  async mset<T>(
    entries: Array<{ key: string; value: T }>,
    options?: CacheOptions
  ): Promise<boolean> {
    if (!redisClient) {
      return false;
    }

    try {
      const pipeline = redisClient.multi();
      
      for (const entry of entries) {
        const fullKey = this.buildKey(entry.key, options?.keyPrefix);
        const serializedValue = JSON.stringify(entry.value);
        const ttl = options?.ttl || this.defaultTTL;
        
        pipeline.setEx(fullKey, ttl, serializedValue);
      }
      
      await pipeline.exec();
      return true;
    } catch (error) {
      logger.error({ err: error }, 'Cache mset error');
      return false;
    }
  }

  /**
   * Clear all cache entries with a specific prefix
   */
  async clearPrefix(prefix: string): Promise<boolean> {
    if (!redisClient) {
      return false;
    }

    try {
      const fullPrefix = this.buildKey(prefix);
      const keys = await redisClient.keys(fullPrefix + '*');
      
      if (keys.length > 0) {
        await redisClient.del(keys);
        logger.info({ prefix, count: keys.length }, 'Cache prefix cleared');
      }
      
      return true;
    } catch (error) {
      logger.error({ err: error, prefix }, 'Cache clear prefix error');
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    connected: boolean;
    memory?: string;
    keys?: number;
    info?: any;
  }> {
    if (!redisClient) {
      return { connected: false };
    }

    try {
      const info = await redisClient.info('memory');
      const dbSize = await redisClient.dbSize();
      
      return {
        connected: true,
        keys: dbSize,
        info,
      };
    } catch (error) {
      logger.error({ err: error }, 'Cache stats error');
      return { connected: false };
    }
  }

  private buildKey(key: string, prefix?: string): string {
    const parts = [this.keyPrefix];
    
    if (prefix) {
      parts.push(prefix);
    }
    
    parts.push(key);
    
    return parts.join(':');
  }

  /**
   * Cache wrapper with fallback - executes function and caches result
   */
  async getOrSet<T>(
    key: string,
    fn: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    try {
      const result = await fn();
      await this.set(key, result, options);
      return result;
    } catch (error) {
      logger.error({ err: error, key }, 'Cache getOrSet function error');
      throw error;
    }
  }
}

// Create singleton instance
export const cache = new CacheService();

// Cache key constants
export const CACHE_KEYS = {
  MODELS: 'models',
  USER_API_KEYS: (userId: string) => `user:${userId}:api_keys`,
  USER_USAGE: (userId: string, period: string) => `user:${userId}:usage:${period}`,
  RATE_LIMIT: (userId: string, window: string) => `rate_limit:${userId}:${window}`,
  HEALTH_CHECK: 'health_check',
  SYSTEM_METRICS: 'system_metrics',
} as const;
