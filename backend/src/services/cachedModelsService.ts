import { cache, CACHE_KEYS } from '../utils/cache';
import { getAllModelIds } from './providerService';
import { logger } from '../utils/logger';
import { ModelInfo } from '../types';

export interface CachedModelList {
  models: ModelInfo[];
  lastUpdated: Date;
  version: string;
}

/**
 * Get cached list of models or fetch and cache them
 */
export async function getCachedModels(): Promise<ModelInfo[]> {
  try {
    // Try to get from cache first
    const cached = await cache.get<CachedModelList>(CACHE_KEYS.MODELS, {
      ttl: 3600, // Cache for 1 hour
    });

    if (cached) {
      logger.debug('Models served from cache');
      return cached.models;
    }

    // Fetch fresh data
    const models = await fetchModelsFromSource();
    
    // Cache the result
    await cache.set(CACHE_KEYS.MODELS, {
      models,
      lastUpdated: new Date(),
      version: '1.0.0',
    }, {
      ttl: 3600, // Cache for 1 hour
    });

    logger.info('Models fetched and cached');
    return models;
  } catch (error) {
    logger.error({ err: error }, 'Failed to get cached models');
    // Fallback to direct fetch
    return fetchModelsFromSource();
  }
}

/**
 * Invalidate models cache
 */
export async function invalidateModelsCache(): Promise<boolean> {
  try {
    const result = await cache.del(CACHE_KEYS.MODELS);
    logger.info('Models cache invalidated');
    return result;
  } catch (error) {
    logger.error({ err: error }, 'Failed to invalidate models cache');
    return false;
  }
}

/**
 * Get models cache status
 */
export async function getModelsCacheStatus(): Promise<{
  cached: boolean;
  lastUpdated?: Date;
  age?: number;
}> {
  try {
    const cached = await cache.get<CachedModelList>(CACHE_KEYS.MODELS);
    
    if (!cached) {
      return { cached: false };
    }

    const age = Date.now() - cached.lastUpdated.getTime();
    
    return {
      cached: true,
      lastUpdated: cached.lastUpdated,
      age,
    };
  } catch (error) {
    logger.error({ err: error }, 'Failed to get models cache status');
    return { cached: false };
  }
}

/**
 * Pre-warm the models cache
 */
export async function prewarmModelsCache(): Promise<void> {
  try {
    logger.info('Pre-warming models cache');
    await getCachedModels();
    logger.info('Models cache pre-warmed');
  } catch (error) {
    logger.error({ err: error }, 'Failed to pre-warm models cache');
  }
}

/**
 * Fetch models from the original source
 * This is a placeholder - in the real implementation, this would
 * call the actual models service
 */
async function fetchModelsFromSource(): Promise<ModelInfo[]> {
  // For now, return a basic implementation
  // In production, this would integrate with the existing models service
  const modelIds = getAllModelIds();
  
  return modelIds.map(id => ({
    id,
    object: 'model' as const,
    created: Date.now(),
    owned_by: getProviderFromModelId(id),
    provider: getProviderFromModelId(id),
    context_length: 128000, // Default context length
    max_output_tokens: 4096, // Default max output
    pricing: {
      prompt: 0.01, // Default pricing
      completion: 0.03,
    },
    capabilities: ['chat', 'completion'],
    category: 'chat',
  }));
}

/**
 * Extract provider name from model ID
 */
function getProviderFromModelId(modelId: string): string {
  if (modelId.startsWith('openai/')) return 'openai';
  if (modelId.startsWith('anthropic/')) return 'anthropic';
  if (modelId.startsWith('google/')) return 'google';
  if (modelId.startsWith('meta/')) return 'meta';
  if (modelId.startsWith('mistralai/')) return 'mistralai';
  if (modelId.startsWith('deepseek/')) return 'deepseek';
  if (modelId.startsWith('qwen/')) return 'qwen';
  
  return 'unknown';
}
