import { Router, Request, Response } from 'express';
import { prisma } from '../utils/db';
import { firebaseAuth } from '../middleware/auth';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

const router = Router();
router.use(firebaseAuth);

/**
 * @swagger
 * /v1/analytics:
 *   get:
 *     summary: Get aggregated analytics
 *     description: Returns daily usage breakdown, totals, top models, active keys, and recent requests for the authenticated user.
 *     tags: [Analytics]
 *     security:
 *       - FirebaseAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *           minimum: 1
 *           maximum: 90
 *         description: Number of days to look back
 *     responses:
 *       200:
 *         description: Aggregated analytics data
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const days = Math.min(90, Math.max(1, parseInt(req.query.days as string) || 30));
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const userId = req.userId!;

    // Parallel queries for dashboard data
    const [
      dailyUsage,
      totalStats,
      topModels,
      recentRequests,
      activeKeys,
    ] = await Promise.all([
      // Daily usage breakdown
      prisma.usageRecord.findMany({
        where: { userId, date: { gte: since } },
        orderBy: { date: 'asc' },
        select: {
          date: true,
          totalRequests: true,
          totalTokens: true,
          totalCost: true,
          model: true,
        },
      }),

      // Total stats
      prisma.requestLog.aggregate({
        where: { userId, createdAt: { gte: since } },
        _count: true,
        _sum: {
          totalTokens: true,
          estimatedCost: true,
          promptTokens: true,
          completionTokens: true,
        },
        _avg: {
          durationMs: true,
        },
      }),

      // Top models by usage
      prisma.requestLog.groupBy({
        by: ['model'],
        where: { userId, createdAt: { gte: since } },
        _count: true,
        _sum: { totalTokens: true, estimatedCost: true },
        orderBy: { _count: { model: 'desc' } },
        take: 10,
      }),

      // Recent requests
      prisma.requestLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          model: true,
          status: true,
          totalTokens: true,
          estimatedCost: true,
          durationMs: true,
          createdAt: true,
        },
      }),

      // Active API keys count
      prisma.apiKey.count({
        where: { userId, revokedAt: null },
      }),
    ]);

    // Aggregate daily usage by date
    const dailyMap = new Map<string, { requests: number; tokens: number; cost: number }>();
    for (const record of dailyUsage) {
      const dateStr = record.date.toISOString().split('T')[0];
      const existing = dailyMap.get(dateStr) || { requests: 0, tokens: 0, cost: 0 };
      existing.requests += record.totalRequests;
      existing.tokens += record.totalTokens;
      existing.cost += record.totalCost;
      dailyMap.set(dateStr, existing);
    }

    const dailyChartData = Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      requests: data.requests,
      tokens: data.tokens,
      cost: Math.round(data.cost * 1_000_000) / 1_000_000,
    }));

    // Error rate
    const errorCount = await prisma.requestLog.count({
      where: { userId, createdAt: { gte: since }, status: { gte: 400 } },
    });
    const totalCount = totalStats._count || 0;
    const errorRate = totalCount > 0 ? (errorCount / totalCount) * 100 : 0;

    res.json({
      period: { days, since: since.toISOString() },
      overview: {
        total_requests: totalCount,
        total_tokens: totalStats._sum.totalTokens || 0,
        total_cost: Math.round((totalStats._sum.estimatedCost || 0) * 1_000_000) / 1_000_000,
        avg_duration_ms: Math.round(totalStats._avg.durationMs || 0),
        error_rate: Math.round(errorRate * 100) / 100,
        active_api_keys: activeKeys,
        prompt_tokens: totalStats._sum.promptTokens || 0,
        completion_tokens: totalStats._sum.completionTokens || 0,
      },
      daily: dailyChartData,
      top_models: topModels.map(m => ({
        model: m.model,
        requests: m._count,
        tokens: m._sum.totalTokens || 0,
        cost: Math.round((m._sum.estimatedCost || 0) * 1_000_000) / 1_000_000,
      })),
      recent_requests: recentRequests.map(r => ({
        id: r.id,
        model: r.model,
        status: r.status,
        total_tokens: r.totalTokens,
        estimated_cost: r.estimatedCost,
        duration_ms: r.durationMs,
        created_at: r.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch analytics');
    const error = new AppError('Failed to fetch analytics', 500, 'analytics_unavailable', 'server_error');
    res.status(error.status).json(error.toJSON());
  }
});

export default router;
