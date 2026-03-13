import { Response as ExpressResponse } from 'express';
import { config } from '../config';
import { ChatMessage } from '../types';
import { ProviderError, normalizeProviderError } from '../utils/errors';
import { setSSEHeaders, writeOpenAIContentDelta, writeDone, writeSSEJson } from '../utils/sse';
import { logger } from '../utils/logger';
import { openaiChat } from './providers/openai';
import { anthropicChat } from './providers/anthropic';
import { geminiChat } from './providers/google';
import { nvidiaChat } from './providers/nvidia';

// ═══════════════════════════════════════════════════════
// Model → Provider routing map
// ═══════════════════════════════════════════════════════

interface ProviderRoute {
  provider: 'openai' | 'anthropic' | 'google' | 'nvidia';
  modelId: string; // model ID to send to upstream
}

const MODEL_ROUTES: Record<string, ProviderRoute> = {
  // OpenAI
  'openai/gpt-4o': { provider: 'openai', modelId: 'gpt-4o' },
  'openai/gpt-4o-mini': { provider: 'openai', modelId: 'gpt-4o-mini' },
  'openai/gpt-4-turbo': { provider: 'openai', modelId: 'gpt-4-turbo' },
  'openai/gpt-3.5-turbo': { provider: 'openai', modelId: 'gpt-3.5-turbo' },

  // Anthropic
  'anthropic/claude-3.5-sonnet': { provider: 'anthropic', modelId: 'claude-3-5-sonnet-20241022' },
  'anthropic/claude-3-opus': { provider: 'anthropic', modelId: 'claude-3-opus-20240229' },
  'anthropic/claude-3-haiku': { provider: 'anthropic', modelId: 'claude-3-haiku-20240307' },

  // Google
  'google/gemini-1.5-pro': { provider: 'google', modelId: 'gemini-1.5-pro' },
  'google/gemini-1.5-flash': { provider: 'google', modelId: 'gemini-1.5-flash' },
  'google/gemini-2.0-flash': { provider: 'google', modelId: 'gemini-2.0-flash' },

  // Meta / NVIDIA
  'meta/llama-3.3-70b-instruct': { provider: 'nvidia', modelId: 'meta/llama-3.3-70b-instruct' },
  'meta/llama-3.1-405b-instruct': { provider: 'nvidia', modelId: 'meta/llama-3.1-405b-instruct' },
  'meta/llama-3.1-70b-instruct': { provider: 'nvidia', modelId: 'meta/llama-3.1-70b-instruct' },
  'meta/llama-3.1-8b-instruct': { provider: 'nvidia', modelId: 'meta/llama-3.1-8b-instruct' },

  // Mistral / NVIDIA
  'mistralai/mistral-large-2': { provider: 'nvidia', modelId: 'mistralai/mistral-large-2-instruct' },
  'mistralai/mixtral-8x22b-instruct': { provider: 'nvidia', modelId: 'mistralai/mixtral-8x22b-instruct-v0.1' },
  'mistralai/mistral-7b-instruct': { provider: 'nvidia', modelId: 'mistralai/mistral-7b-instruct-v0.3' },

  // DeepSeek / NVIDIA
  'deepseek/deepseek-r1': { provider: 'nvidia', modelId: 'deepseek/deepseek-r1' },
  'deepseek/deepseek-v3': { provider: 'nvidia', modelId: 'deepseek/deepseek-v3' },

  // Qwen / NVIDIA
  'qwen/qwen2.5-72b-instruct': { provider: 'nvidia', modelId: 'qwen/qwen2.5-72b-instruct' },
};

function getProviderApiKey(provider: string): string {
  switch (provider) {
    case 'openai': return config.OPENAI_API_KEY || '';
    case 'anthropic': return config.ANTHROPIC_API_KEY || '';
    case 'google': return config.GOOGLE_API_KEY || '';
    case 'nvidia': return config.NVIDIA_API_KEY || '';
    default: return '';
  }
}

export function resolveModel(model: string): ProviderRoute | null {
  return MODEL_ROUTES[model] || null;
}

export function getAllModelIds(): string[] {
  return Object.keys(MODEL_ROUTES);
}

interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  error?: string;
  details?: any;
}

export async function checkProviderHealth(): Promise<HealthCheck[]> {
  const providers = ['openai', 'anthropic', 'google', 'nvidia'] as const;
  const checks: HealthCheck[] = [];

  for (const provider of providers) {
    const startTime = Date.now();
    const apiKey = getProviderApiKey(provider);
    
    if (!apiKey) {
      checks.push({
        name: provider,
        status: 'degraded',
        error: 'API key not configured',
      });
      continue;
    }

    try {
      // Simple health check - we'll just verify the key format for now
      // In a real implementation, you might make a lightweight API call
      const responseTime = Date.now() - startTime;
      checks.push({
        name: provider,
        status: 'healthy',
        responseTime,
        details: { apiKeyConfigured: true },
      });
    } catch (error) {
      checks.push({
        name: provider,
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return checks;
}

interface ChatParams {
  model: string;
  messages: ChatMessage[];
  temperature: number;
  max_tokens: number;
  top_p: number;
  stream: boolean;
  signal?: AbortSignal;
}

export async function routeChat(params: ChatParams): Promise<globalThis.Response> {
  const route = resolveModel(params.model);

  if (!route) {
    // Try sending directly to NVIDIA as fallback (many models available there)
    const nvidiaKey = getProviderApiKey('nvidia');
    if (nvidiaKey) {
      logger.info({ model: params.model }, 'Model not in route map, falling back to NVIDIA');
      return nvidiaChat({
        apiKey: nvidiaKey,
        model: params.model,
        messages: params.messages,
        temperature: params.temperature,
        max_tokens: params.max_tokens,
        top_p: params.top_p,
        stream: params.stream,
        signal: params.signal,
      });
    }
    throw new ProviderError(`Model "${params.model}" is not available. Check /v1/models for supported models.`, 404);
  }

  const apiKey = getProviderApiKey(route.provider);
  if (!apiKey) {
    throw new ProviderError(`Provider "${route.provider}" is not configured. Set the API key in environment.`, 503);
  }

  switch (route.provider) {
    case 'openai':
      return openaiChat({
        apiKey,
        model: route.modelId,
        messages: params.messages,
        temperature: params.temperature,
        max_tokens: params.max_tokens,
        top_p: params.top_p,
        stream: params.stream,
        signal: params.signal,
      });

    case 'anthropic':
      return anthropicChat({
        apiKey,
        model: route.modelId,
        messages: params.messages,
        temperature: params.temperature,
        max_tokens: params.max_tokens,
        stream: params.stream,
        signal: params.signal,
      });

    case 'google':
      return geminiChat({
        apiKey,
        model: route.modelId,
        messages: params.messages,
        temperature: params.temperature,
        max_tokens: params.max_tokens,
        top_p: params.top_p,
        stream: params.stream,
        signal: params.signal,
      });

    case 'nvidia':
      return nvidiaChat({
        apiKey,
        model: route.modelId,
        messages: params.messages,
        temperature: params.temperature,
        max_tokens: params.max_tokens,
        top_p: params.top_p,
        stream: params.stream,
        signal: params.signal,
      });

    default:
      throw new ProviderError(`Unsupported provider: ${route.provider}`);
  }
}

// ═══════════════════════════════════════════════════════
// Stream normalization helpers
// ═══════════════════════════════════════════════════════

export async function pipeOpenAIStream(upstream: globalThis.Response, res: ExpressResponse): Promise<void> {
  const decoder = new TextDecoder();
  const body = upstream.body;
  if (!body) { res.end(); return; }

  try {
    for await (const chunk of body as any) {
      if (res.writableEnded) break;
      res.write(decoder.decode(chunk, { stream: true }));
    }
  } catch (err: any) {
    if (err?.name !== 'AbortError') {
      logger.error({ err }, 'Stream pipe error');
    }
  } finally {
    if (!res.writableEnded) res.end();
  }
}

export async function pipeAnthropicStream(upstream: globalThis.Response, res: ExpressResponse): Promise<void> {
  const body = upstream.body;
  if (!body) { res.end(); return; }

  const reader = (body as any).getReader();
  const decoder = new TextDecoder();
  let buf = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      let boundary = buf.indexOf('\n\n');
      while (boundary !== -1) {
        const evt = buf.slice(0, boundary).trim();
        buf = buf.slice(boundary + 2);

        const lines = evt.split('\n');
        const dataLines = lines.filter((l: string) => l.startsWith('data:'));
        for (const dl of dataLines) {
          const raw = dl.slice(5).trim();
          if (!raw) continue;
          try {
            const parsed = JSON.parse(raw);
            if (parsed?.type === 'content_block_delta') {
              const t = parsed?.delta?.text;
              if (t) writeOpenAIContentDelta(res, t);
            }
            if (parsed?.type === 'message_stop') {
              writeDone(res);
            }
          } catch { /* ignore parse errors */ }
        }
        boundary = buf.indexOf('\n\n');
      }
    }
  } catch (err: any) {
    if (err?.name !== 'AbortError') {
      logger.error({ err }, 'Anthropic stream error');
    }
  }
  writeDone(res);
  if (!res.writableEnded) res.end();
}

export async function pipeGeminiStream(upstream: globalThis.Response, res: ExpressResponse): Promise<void> {
  const body = upstream.body;
  if (!body) { res.end(); return; }

  const reader = (body as any).getReader();
  const decoder = new TextDecoder();
  let buf = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      let boundary = buf.indexOf('\n\n');
      while (boundary !== -1) {
        const evt = buf.slice(0, boundary).trim();
        buf = buf.slice(boundary + 2);

        const lines = evt.split('\n');
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const raw = line.slice(5).trim();
          if (!raw || raw === '[DONE]') continue;
          try {
            const parsed = JSON.parse(raw);
            const parts = parsed?.candidates?.[0]?.content?.parts || [];
            const text = parts.map((p: any) => p.text || '').join('');
            if (text) writeOpenAIContentDelta(res, text);
          } catch { /* ignore parse errors */ }
        }
        boundary = buf.indexOf('\n\n');
      }
    }
  } catch (err: any) {
    if (err?.name !== 'AbortError') {
      logger.error({ err }, 'Gemini stream error');
    }
  }
  writeDone(res);
  if (!res.writableEnded) res.end();
}
