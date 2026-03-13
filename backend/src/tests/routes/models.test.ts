import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../index';
import { mockLogger } from '../setup';

describe('Models Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /v1/models', () => {
    it('should return list of available models', async () => {
      const response = await request(app)
        .get('/v1/models')
        .expect(200);

      expect(response.body).toEqual({
        object: 'list',
        data: expect.arrayContaining([
          expect.objectContaining({
            id: expect.stringMatching(/^(openai|anthropic|google|meta|mistralai|deepseek)\//),
            object: 'model',
            created: expect.any(Number),
            owned_by: expect.any(String),
          }),
        ]),
      });
    });

    it('should include models from all providers', async () => {
      const response = await request(app)
        .get('/v1/models')
        .expect(200);

      const modelIds = response.body.data.map((model: any) => model.id);
      
      // Check for models from each provider
      expect(modelIds.some((id: string) => id.startsWith('openai/'))).toBe(true);
      expect(modelIds.some((id: string) => id.startsWith('anthropic/'))).toBe(true);
      expect(modelIds.some((id: string) => id.startsWith('google/'))).toBe(true);
      expect(modelIds.some((id: string) => id.startsWith('meta/'))).toBe(true);
    });

    it('should log models request', async () => {
      await request(app)
        .get('/v1/models')
        .expect(200);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          path: '/v1/models',
          requestId: expect.any(String),
        }),
        'Incoming request'
      );
    });

    it('should handle CORS correctly', async () => {
      const response = await request(app)
        .get('/v1/models')
        .set('Origin', 'https://clex.in')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('https://clex.in');
    });
  });
});
