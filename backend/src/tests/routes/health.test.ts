import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../index';
import { testPrisma, mockLogger } from '../setup';

describe('Health Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /v1/health', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/v1/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        version: '1.0.0',
        database: expect.any(String),
        memory: expect.objectContaining({
          used: expect.any(Number),
          total: expect.any(Number),
        }),
      });
    });

    it('should log health check request', async () => {
      await request(app)
        .get('/v1/health')
        .expect(200);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          path: '/v1/health',
          requestId: expect.any(String),
        }),
        'Incoming request'
      );
    });

    it('should handle database connection errors gracefully', async () => {
      // Mock database query to throw error
      vi.spyOn(testPrisma, '$queryRaw').mockRejectedValue(new Error('DB connection failed'));

      const response = await request(app)
        .get('/v1/health')
        .expect(503);

      expect(response.body.status).toBe('degraded');
      expect(response.body.database).toBe('unhealthy');
    });
  });
});
