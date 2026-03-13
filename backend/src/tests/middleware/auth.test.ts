import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { apiKeyAuth, firebaseAuth } from '../../middleware/auth';
import { testPrisma } from '../setup';
import { AppError, AuthenticationError } from '../../utils/errors';

describe('Authentication Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await cleanupDatabase();
  });

  async function cleanupDatabase() {
    await testPrisma.apiKey.deleteMany();
    await testPrisma.user.deleteMany();
  }

  describe('apiKeyAuth', () => {
    it('should reject requests without Authorization header', async () => {
      await apiKeyAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Missing Authorization header. Use: Bearer clex_xxx',
            type: 'authentication_error',
          }),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject requests with invalid API key format', async () => {
      mockReq.headers!.authorization = 'Bearer invalid-key';

      await apiKeyAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Invalid API key format. Keys start with clex_',
          }),
        })
      );
    });

    it('should reject requests with non-existent API key', async () => {
      mockReq.headers!.authorization = 'Bearer clex_nonexistent';

      await apiKeyAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Invalid API key',
          }),
        })
      );
    });

    it('should authenticate with valid API key', async () => {
      // Create test user and API key
      const user = await testPrisma.user.create({
        data: {
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
        },
      });

      const apiKey = 'clex_test-key-12345678';
      const hashedKey = await bcrypt.hash(apiKey, 10);

      await testPrisma.apiKey.create({
        data: {
          id: 'test-key-id',
          userId: user.id,
          name: 'Test Key',
          keyHash: hashedKey,
          keyPrefix: apiKey.slice(0, 12),
        },
      });

      mockReq.headers!.authorization = `Bearer ${apiKey}`;

      await apiKeyAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.userId).toBe(user.id);
      expect(mockReq.apiKeyId).toBe('test-key-id');
    });

    it('should reject revoked API keys', async () => {
      const user = await testPrisma.user.create({
        data: {
          id: 'test-user-id',
          email: 'test@example.com',
        },
      });

      const apiKey = 'clex_test-key-12345678';
      const hashedKey = await bcrypt.hash(apiKey, 10);

      await testPrisma.apiKey.create({
        data: {
          id: 'test-key-id',
          userId: user.id,
          name: 'Test Key',
          keyHash: hashedKey,
          keyPrefix: apiKey.slice(0, 12),
          revokedAt: new Date(),
        },
      });

      mockReq.headers!.authorization = `Bearer ${apiKey}`;

      await apiKeyAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('firebaseAuth', () => {
    it('should accept dev token in development', async () => {
      vi.stubEnv('NODE_ENV', 'development');
      mockReq.headers!.authorization = 'Bearer dev-token';

      await firebaseAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.userId).toBe('dev-user-id');
    });

    it('should reject requests without Authorization header', async () => {
      await firebaseAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Missing Authorization Bearer token',
          }),
        })
      );
    });

    it('should handle Firebase auth errors gracefully', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      mockReq.headers!.authorization = 'Bearer invalid-token';

      await firebaseAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Invalid authentication token',
          }),
        })
      );
    });
  });
});
