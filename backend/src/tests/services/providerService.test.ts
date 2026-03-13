import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProviderError } from '../../utils/errors';
import * as providerService from '../../services/providerService';
import * as openaiProvider from '../../services/providers/openai';
import * as anthropicProvider from '../../services/providers/anthropic';
import * as googleProvider from '../../services/providers/google';
import * as nvidiaProvider from '../../services/providers/nvidia';

// Mock all provider modules
vi.mock('../../services/providers/openai');
vi.mock('../../services/providers/anthropic');
vi.mock('../../services/providers/google');
vi.mock('../../services/providers/nvidia');

const mockOpenaiChat = vi.mocked(openaiProvider.openaiChat);
const mockAnthropicChat = vi.mocked(anthropicProvider.anthropicChat);
const mockGoogleChat = vi.mocked(googleProvider.geminiChat);
const mockNvidiaChat = vi.mocked(nvidiaProvider.nvidiaChat);

describe('Provider Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Model Routing', () => {
    it('should resolve OpenAI models correctly', () => {
      const route = providerService.resolveModel('openai/gpt-4o');
      
      expect(route).toEqual({
        provider: 'openai',
        modelId: 'gpt-4o',
      });
    });

    it('should resolve Anthropic models correctly', () => {
      const route = providerService.resolveModel('anthropic/claude-3.5-sonnet');
      
      expect(route).toEqual({
        provider: 'anthropic',
        modelId: 'claude-3-5-sonnet-20241022',
      });
    });

    it('should resolve Google models correctly', () => {
      const route = providerService.resolveModel('google/gemini-1.5-pro');
      
      expect(route).toEqual({
        provider: 'google',
        modelId: 'gemini-1.5-pro',
      });
    });

    it('should resolve NVIDIA models correctly', () => {
      const route = providerService.resolveModel('meta/llama-3.3-70b-instruct');
      
      expect(route).toEqual({
        provider: 'nvidia',
        modelId: 'meta/llama-3.3-70b-instruct',
      });
    });

    it('should return null for unknown model', () => {
      const route = providerService.resolveModel('unknown/model');
      
      expect(route).toBeNull();
    });

    it('should return all model IDs', () => {
      const modelIds = providerService.getAllModelIds();
      
      expect(modelIds).toContain('openai/gpt-4o');
      expect(modelIds).toContain('anthropic/claude-3.5-sonnet');
      expect(modelIds).toContain('google/gemini-1.5-pro');
      expect(modelIds).toContain('meta/llama-3.3-70b-instruct');
    });
  });

  describe('Chat Routing', () => {
    it('should route OpenAI models to OpenAI provider', async () => {
      const mockResponse = new Response(JSON.stringify({
        choices: [{ message: { content: 'OpenAI response' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      }), { status: 200 });

      mockOpenaiChat.mockResolvedValue(mockResponse);

      const result = await providerService.routeChat({
        model: 'openai/gpt-4o',
        messages: [{ role: 'user', content: 'Hello' }],
        stream: false,
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 1,
      });

      expect(mockOpenaiChat).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'Hello' }],
          stream: false,
          temperature: 0.7,
          max_tokens: 1000,
          top_p: 1,
        })
      );

      expect(result).toBe(mockResponse);
    });

    it('should route Anthropic models to Anthropic provider', async () => {
      const mockResponse = new Response(JSON.stringify({
        content: [{ text: 'Anthropic response' }],
        usage: { input_tokens: 10, output_tokens: 5 },
      }), { status: 200 });

      mockAnthropicChat.mockResolvedValue(mockResponse);

      const result = await providerService.routeChat({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [{ role: 'user', content: 'Hello' }],
        stream: false,
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 1,
      });

      expect(mockAnthropicChat).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-3-5-sonnet-20241022',
          messages: [{ role: 'user', content: 'Hello' }],
          stream: false,
          temperature: 0.7,
          max_tokens: 1000,
          top_p: 1,
        })
      );

      expect(result).toBe(mockResponse);
    });

    it('should handle provider errors gracefully', async () => {
      mockOpenaiChat.mockRejectedValue(new Error('OpenAI API error'));

      await expect(providerService.routeChat({
        model: 'openai/gpt-4o',
        messages: [{ role: 'user', content: 'Hello' }],
        stream: false,
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 1,
      })).rejects.toThrow(ProviderError);
    });

    it('should fallback to NVIDIA for unknown models when NVIDIA key is available', async () => {
      vi.stubEnv('NVIDIA_API_KEY', 'test-key');
      
      const mockResponse = new Response(JSON.stringify({
        choices: [{ message: { content: 'NVIDIA fallback response' } }],
      }), { status: 200 });

      mockNvidiaChat.mockResolvedValue(mockResponse);

      const result = await providerService.routeChat({
        model: 'unknown/model',
        messages: [{ role: 'user', content: 'Hello' }],
        stream: false,
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 1,
      });

      expect(mockNvidiaChat).toHaveBeenCalled();
      expect(result).toBe(mockResponse);
    });

    it('should throw error for unknown model when no NVIDIA key', async () => {
      vi.stubEnv('NVIDIA_API_KEY', '');

      await expect(providerService.routeChat({
        model: 'unknown/model',
        messages: [{ role: 'user', content: 'Hello' }],
        stream: false,
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 1,
      })).rejects.toThrow(ProviderError);
    });
  });
});
