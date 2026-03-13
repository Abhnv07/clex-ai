import { prisma } from '../utils/db';
import { estimateCost, estimateTokens } from '../utils/costs';
import { logger } from '../utils/logger';

interface LogRequestParams {
  requestId: string;
  apiKeyId?: string;
  userId?: string;
  projectId?: string | null;
  model: string;
  provider: string;
  promptTokens: number;
  completionTokens: number;
  status: number;
  durationMs: number;
  errorMessage?: string;
  ip?: string;
  userAgent?: string;
  streaming: boolean;
}

export async function logRequest(params: LogRequestParams): Promise<void> {
  try {
    const totalTokens = params.promptTokens + params.completionTokens;
    const cost = estimateCost(params.model, params.promptTokens, params.completionTokens);

    await prisma.requestLog.create({
      data: {
        requestId: params.requestId,
        apiKeyId: params.apiKeyId || null,
        userId: params.userId || null,
        projectId: params.projectId || null,
        model: params.model,
        provider: params.provider,
        promptTokens: params.promptTokens,
        completionTokens: params.completionTokens,
        totalTokens,
        estimatedCost: cost,
        status: params.status,
        durationMs: params.durationMs,
        errorMessage: params.errorMessage || null,
        ip: params.ip || null,
        userAgent: params.userAgent || null,
        streaming: params.streaming,
      },
    });

    // Update daily usage record
    if (params.userId) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await prisma.usageRecord.upsert({
        where: {
          userId_date_model: {
            userId: params.userId,
            date: today,
            model: params.model,
          },
        },
        update: {
          totalRequests: { increment: 1 },
          totalTokens: { increment: totalTokens },
          totalCost: { increment: cost },
        },
        create: {
          userId: params.userId,
          date: today,
          model: params.model,
          totalRequests: 1,
          totalTokens,
          totalCost: cost,
        },
      });
    }
  } catch (err) {
    logger.error({ err, requestId: params.requestId }, 'Failed to log request usage');
  }
}

export function estimatePromptTokens(messages: Array<{ content: string }>): number {
  return messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
}
