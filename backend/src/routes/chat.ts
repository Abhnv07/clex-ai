import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { apiKeyAuth } from '../middleware/auth';
import { config } from '../config';
import { AppError, ValidationError, normalizeProviderError } from '../utils/errors';
import { setSSEHeaders } from '../utils/sse';
import { logger } from '../utils/logger';
import {
  routeChat,
  resolveModel,
  pipeOpenAIStream,
  pipeAnthropicStream,
  pipeGeminiStream,
} from '../services/providerService';
import { logRequest, estimatePromptTokens } from '../services/usageService';

const router = Router();

const chatSchema = z.object({
  model: z.string().min(1, 'model is required'),
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant', 'tool']),
    content: z.string(),
  })).min(1, 'messages must contain at least one message'),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().positive().max(128_000).optional(),
  top_p: z.number().min(0).max(1).optional(),
  stream: z.boolean().optional(),
});

/**
 * @swagger
 * /v1/chat/completions:
 *   post:
 *     summary: Create a chat completion
 *     description: |
 *       Send messages to an AI model and receive a response. Supports streaming (SSE) and non-streaming modes.
 *       All responses are normalized to the OpenAI chat completion format regardless of the upstream provider.
 *     tags: [Chat]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChatCompletionRequest'
 *           example:
 *             model: "openai/gpt-4o"
 *             messages:
 *               - role: "user"
 *                 content: "Hello, how are you?"
 *             temperature: 0.7
 *             max_tokens: 1024
 *             stream: true
 *     responses:
 *       200:
 *         description: Chat completion response (or SSE stream if stream=true)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChatCompletionResponse'
 *           text/event-stream:
 *             description: Server-Sent Events stream of chat completion chunks
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid or missing API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Rate limit or token quota exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       502:
 *         description: Upstream provider error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', apiKeyAuth, async (req: Request, res: Response) => {
  const requestId = req.requestId || uuidv4();
  const startTime = Date.now();

  // Validate request body
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    const details = parsed.error.flatten();
    const err = new ValidationError(
      `Invalid request: ${Object.values(details.fieldErrors).flat().join(', ')}`
    );
    res.status(err.status).json(err.toJSON());
    return;
  }

  const { model, messages, temperature, max_tokens, top_p, stream } = parsed.data;
  const shouldStream = stream !== false;

  const controller = new AbortController();
  const abort = () => { try { controller.abort(); } catch {} };
  req.on('close', abort);
  req.on('aborted', abort);
  const timeoutId = setTimeout(abort, config.PROVIDER_TIMEOUT_MS);

  const route = resolveModel(model);
  const provider = route?.provider || 'nvidia';

  try {
    const upstream = await routeChat({
      model,
      messages,
      temperature: temperature ?? 0.7,
      max_tokens: max_tokens ?? 1024,
      top_p: top_p ?? 0.9,
      stream: shouldStream,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!upstream.ok) {
      const errBody = await upstream.text();
      const appErr = normalizeProviderError(upstream.status, errBody);
      const durationMs = Date.now() - startTime;

      // Log the failed request
      logRequest({
        requestId,
        apiKeyId: req.apiKeyId,
        userId: req.userId,
        projectId: req.projectId,
        model,
        provider,
        promptTokens: estimatePromptTokens(messages),
        completionTokens: 0,
        status: appErr.status,
        durationMs,
        errorMessage: appErr.message,
        ip: req.ip || undefined,
        userAgent: req.headers['user-agent'] || undefined,
        streaming: shouldStream,
      }).catch(() => {});

      res.status(appErr.status).json(appErr.toJSON());
      return;
    }

    if (shouldStream) {
      setSSEHeaders(res);
      res.setHeader('X-Request-Id', requestId);

      // Route to the correct stream handler based on provider
      if (provider === 'anthropic') {
        await pipeAnthropicStream(upstream, res);
      } else if (provider === 'google') {
        await pipeGeminiStream(upstream, res);
      } else {
        // OpenAI and NVIDIA use OpenAI-compatible SSE format
        await pipeOpenAIStream(upstream, res);
      }

      const durationMs = Date.now() - startTime;
      const estimatedPrompt = estimatePromptTokens(messages);

      logRequest({
        requestId,
        apiKeyId: req.apiKeyId,
        userId: req.userId,
        projectId: req.projectId,
        model,
        provider,
        promptTokens: estimatedPrompt,
        completionTokens: Math.max(50, Math.floor(estimatedPrompt * 0.5)),
        status: 200,
        durationMs,
        ip: req.ip || undefined,
        userAgent: req.headers['user-agent'] || undefined,
        streaming: true,
      }).catch(() => {});

    } else {
      // Non-streaming response
      const data = await upstream.json() as any;
      res.setHeader('X-Request-Id', requestId);

      // Normalize non-OpenAI responses
      let responseData = data;
      if (provider === 'anthropic') {
        const text = (data?.content || []).map((p: any) => p.text || '').join('');
        responseData = {
          id: `chatcmpl-${requestId}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model,
          choices: [{ index: 0, message: { role: 'assistant', content: text }, finish_reason: 'stop' }],
          usage: {
            prompt_tokens: data?.usage?.input_tokens || 0,
            completion_tokens: data?.usage?.output_tokens || 0,
            total_tokens: (data?.usage?.input_tokens || 0) + (data?.usage?.output_tokens || 0),
          },
        };
      } else if (provider === 'google') {
        const text = (data?.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || '').join('');
        responseData = {
          id: `chatcmpl-${requestId}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model,
          choices: [{ index: 0, message: { role: 'assistant', content: text }, finish_reason: 'stop' }],
          usage: {
            prompt_tokens: data?.usageMetadata?.promptTokenCount || 0,
            completion_tokens: data?.usageMetadata?.candidatesTokenCount || 0,
            total_tokens: data?.usageMetadata?.totalTokenCount || 0,
          },
        };
      }

      const durationMs = Date.now() - startTime;
      const usage = responseData.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

      logRequest({
        requestId,
        apiKeyId: req.apiKeyId,
        userId: req.userId,
        projectId: req.projectId,
        model,
        provider,
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        status: 200,
        durationMs,
        ip: req.ip || undefined,
        userAgent: req.headers['user-agent'] || undefined,
        streaming: false,
      }).catch(() => {});

      res.json(responseData);
    }

  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError') {
      if (!res.writableEnded) res.end();
      return;
    }

    logger.error({ err, requestId, model }, 'Chat completion error');
    const durationMs = Date.now() - startTime;

    logRequest({
      requestId,
      apiKeyId: req.apiKeyId,
      userId: req.userId,
      projectId: req.projectId,
      model,
      provider,
      promptTokens: estimatePromptTokens(messages),
      completionTokens: 0,
      status: 500,
      durationMs,
      errorMessage: err.message,
      ip: req.ip || undefined,
      userAgent: req.headers['user-agent'] || undefined,
      streaming: shouldStream,
    }).catch(() => {});

    if (!res.headersSent) {
      const status = err.status || 500;
      const appErr = new AppError(
        err.message || 'Internal server error',
        status,
        'internal_error',
        'server_error'
      );
      res.status(status).json(appErr.toJSON());
    } else if (!res.writableEnded) {
      res.end();
    }
  }
});

export default router;
