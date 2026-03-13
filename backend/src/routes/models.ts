/**
 * @swagger
 * /v1/models:
 *   get:
 *     summary: List available models
 *     description: Returns a list of all available AI models from all providers
 *     tags: [Models]
 *     responses:
 *       200:
 *         description: List of models retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 object:
 *                   type: string
 *                   example: list
 *                   description: Object type
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Model'
*/
import { Router, Request, Response } from 'express';
import { ModelInfo } from '../types';
import { getCachedModels, getModelsCacheStatus } from '../services/cachedModelsService';
import { logger } from '../utils/logger';

const router = Router();

// ═══════════════════════════════════════════════════════
// Full model catalog – add new models here
// ═══════════════════════════════════════════════════════

const MODEL_CATALOG: ModelInfo[] = [
  // ─── OpenAI ──────────────────────────────────────────
  {
    id: 'openai/gpt-4o',
    object: 'model',
    created: 1715367049,
    owned_by: 'openai',
    provider: 'openai',
    context_length: 128000,
    max_output_tokens: 16384,
    pricing: { prompt: 2.50, completion: 10.00 },
    capabilities: ['text', 'code', 'vision'],
    category: 'text',
  },
  {
    id: 'openai/gpt-4o-mini',
    object: 'model',
    created: 1721172741,
    owned_by: 'openai',
    provider: 'openai',
    context_length: 128000,
    max_output_tokens: 16384,
    pricing: { prompt: 0.15, completion: 0.60 },
    capabilities: ['text', 'code', 'vision'],
    category: 'text',
  },
  {
    id: 'openai/gpt-4-turbo',
    object: 'model',
    created: 1712361441,
    owned_by: 'openai',
    provider: 'openai',
    context_length: 128000,
    max_output_tokens: 4096,
    pricing: { prompt: 10.00, completion: 30.00 },
    capabilities: ['text', 'code', 'vision'],
    category: 'text',
  },
  {
    id: 'openai/gpt-3.5-turbo',
    object: 'model',
    created: 1677610602,
    owned_by: 'openai',
    provider: 'openai',
    context_length: 16385,
    max_output_tokens: 4096,
    pricing: { prompt: 0.50, completion: 1.50 },
    capabilities: ['text', 'code'],
    category: 'text',
  },

  // ─── Anthropic ───────────────────────────────────────
  {
    id: 'anthropic/claude-3.5-sonnet',
    object: 'model',
    created: 1718841600,
    owned_by: 'anthropic',
    provider: 'anthropic',
    context_length: 200000,
    max_output_tokens: 8192,
    pricing: { prompt: 3.00, completion: 15.00 },
    capabilities: ['text', 'code', 'vision'],
    category: 'text',
  },
  {
    id: 'anthropic/claude-3-opus',
    object: 'model',
    created: 1709251200,
    owned_by: 'anthropic',
    provider: 'anthropic',
    context_length: 200000,
    max_output_tokens: 4096,
    pricing: { prompt: 15.00, completion: 75.00 },
    capabilities: ['text', 'code', 'vision'],
    category: 'text',
  },
  {
    id: 'anthropic/claude-3-haiku',
    object: 'model',
    created: 1710288000,
    owned_by: 'anthropic',
    provider: 'anthropic',
    context_length: 200000,
    max_output_tokens: 4096,
    pricing: { prompt: 0.25, completion: 1.25 },
    capabilities: ['text', 'code'],
    category: 'text',
  },

  // ─── Google ──────────────────────────────────────────
  {
    id: 'google/gemini-1.5-pro',
    object: 'model',
    created: 1715367049,
    owned_by: 'google',
    provider: 'google',
    context_length: 2097152,
    max_output_tokens: 8192,
    pricing: { prompt: 1.25, completion: 5.00 },
    capabilities: ['text', 'code', 'vision'],
    category: 'text',
  },
  {
    id: 'google/gemini-1.5-flash',
    object: 'model',
    created: 1715367049,
    owned_by: 'google',
    provider: 'google',
    context_length: 1048576,
    max_output_tokens: 8192,
    pricing: { prompt: 0.075, completion: 0.30 },
    capabilities: ['text', 'code', 'vision'],
    category: 'text',
  },
  {
    id: 'google/gemini-2.0-flash',
    object: 'model',
    created: 1733011200,
    owned_by: 'google',
    provider: 'google',
    context_length: 1048576,
    max_output_tokens: 8192,
    pricing: { prompt: 0.10, completion: 0.40 },
    capabilities: ['text', 'code', 'vision'],
    category: 'text',
  },

  // ─── Meta (via NVIDIA) ──────────────────────────────
  {
    id: 'meta/llama-3.3-70b-instruct',
    object: 'model',
    created: 1733011200,
    owned_by: 'meta',
    provider: 'nvidia',
    context_length: 131072,
    max_output_tokens: 4096,
    pricing: { prompt: 0.20, completion: 0.20 },
    capabilities: ['text', 'code'],
    category: 'text',
  },
  {
    id: 'meta/llama-3.1-405b-instruct',
    object: 'model',
    created: 1721606400,
    owned_by: 'meta',
    provider: 'nvidia',
    context_length: 131072,
    max_output_tokens: 4096,
    pricing: { prompt: 1.00, completion: 1.00 },
    capabilities: ['text', 'code'],
    category: 'text',
  },
  {
    id: 'meta/llama-3.1-70b-instruct',
    object: 'model',
    created: 1721606400,
    owned_by: 'meta',
    provider: 'nvidia',
    context_length: 131072,
    max_output_tokens: 4096,
    pricing: { prompt: 0.20, completion: 0.20 },
    capabilities: ['text', 'code'],
    category: 'text',
  },
  {
    id: 'meta/llama-3.1-8b-instruct',
    object: 'model',
    created: 1721606400,
    owned_by: 'meta',
    provider: 'nvidia',
    context_length: 131072,
    max_output_tokens: 4096,
    pricing: { prompt: 0.05, completion: 0.05 },
    capabilities: ['text', 'code'],
    category: 'text',
  },

  // ─── Mistral (via NVIDIA) ───────────────────────────
  {
    id: 'mistralai/mistral-large-2',
    object: 'model',
    created: 1721606400,
    owned_by: 'mistralai',
    provider: 'nvidia',
    context_length: 131072,
    max_output_tokens: 4096,
    pricing: { prompt: 2.00, completion: 6.00 },
    capabilities: ['text', 'code'],
    category: 'text',
  },
  {
    id: 'mistralai/mixtral-8x22b-instruct',
    object: 'model',
    created: 1713398400,
    owned_by: 'mistralai',
    provider: 'nvidia',
    context_length: 65536,
    max_output_tokens: 4096,
    pricing: { prompt: 0.90, completion: 0.90 },
    capabilities: ['text', 'code'],
    category: 'text',
  },
  {
    id: 'mistralai/mistral-7b-instruct',
    object: 'model',
    created: 1696118400,
    owned_by: 'mistralai',
    provider: 'nvidia',
    context_length: 32768,
    max_output_tokens: 4096,
    pricing: { prompt: 0.03, completion: 0.03 },
    capabilities: ['text', 'code'],
    category: 'text',
  },

  // ─── DeepSeek (via NVIDIA) ──────────────────────────
  {
    id: 'deepseek/deepseek-r1',
    object: 'model',
    created: 1737504000,
    owned_by: 'deepseek',
    provider: 'nvidia',
    context_length: 131072,
    max_output_tokens: 8192,
    pricing: { prompt: 0.55, completion: 2.19 },
    capabilities: ['text', 'code'],
    category: 'text',
  },
  {
    id: 'deepseek/deepseek-v3',
    object: 'model',
    created: 1735257600,
    owned_by: 'deepseek',
    provider: 'nvidia',
    context_length: 131072,
    max_output_tokens: 8192,
    pricing: { prompt: 0.27, completion: 1.10 },
    capabilities: ['text', 'code'],
    category: 'text',
  },

  // ─── Qwen (via NVIDIA) ─────────────────────────────
  {
    id: 'qwen/qwen2.5-72b-instruct',
    object: 'model',
    created: 1726790400,
    owned_by: 'qwen',
    provider: 'nvidia',
    context_length: 131072,
    max_output_tokens: 8192,
    pricing: { prompt: 0.30, completion: 0.30 },
    capabilities: ['text', 'code'],
    category: 'text',
  },
];

router.get('/', async (req: Request, res: Response) => {
  try {
    // Get cached models
    const models = await getCachedModels();
    
    // Support filtering
    const provider = req.query.provider as string | undefined;
    const capability = req.query.capability as string | undefined;

    let filtered = models;

    if (provider) {
      filtered = filtered.filter(m => m.provider === provider || m.owned_by === provider);
    }
    if (capability) {
      filtered = filtered.filter(m => m.capabilities.includes(capability) || m.category === capability);
    }

    // Add cache headers
    const cacheStatus = await getModelsCacheStatus();
    res.set({
      'X-Cache-Status': cacheStatus.cached ? 'HIT' : 'MISS',
      ...(cacheStatus.lastUpdated && {
        'X-Cache-Last-Updated': cacheStatus.lastUpdated.toISOString(),
      }),
    });

    res.json({
      object: 'list',
      data: filtered,
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to get models');
    res.status(500).json({
      error: {
        message: 'Failed to retrieve models',
        type: 'models_error',
        code: 'models_fetch_failed',
        status: 500,
      },
    });
  }
});

export default router;
export { MODEL_CATALOG };
