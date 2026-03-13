/**
 * @swagger
 * /v1/metrics:
 *   get:
 *     summary: Get API metrics
 *     description: Returns detailed metrics about API usage, system performance, and database statistics
 *     tags: [Metrics]
 *     responses:
 *       200:
 *         description: Metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   description: When metrics were collected
 *                 uptime:
 *                   type: number
 *                   description: Service uptime in seconds
 *                 system:
 *                   type: object
 *                   properties:
 *                     memory:
 *                       type: object
 *                       properties:
 *                         used:
 *                           type: number
 *                           description: Memory used in bytes
 *                         total:
 *                           type: number
 *                           description: Total memory in bytes
 *                         percentage:
 *                           type: number
 *                           description: Memory usage percentage
 *                     cpu:
 *                       type: object
 *                       properties:
 *                         loadAverage:
 *                           type: array
 *                           items:
 *                             type: number
 *                           description: CPU load averages
 *                 api:
 *                   type: object
 *                   properties:
 *                     totalRequests:
 *                       type: integer
 *                       description: Total number of API requests
 *                     requestsPerMinute:
 *                       type: number
 *                       description: Requests per minute
 *                     errorRate:
 *                       type: number
 *                       description: Error rate percentage
 *                     averageResponseTime:
 *                       type: number
 *                       description: Average response time in milliseconds
 *                 database:
 *                   type: object
 *                   properties:
 *                     totalUsers:
 *                       type: integer
 *                       description: Total number of users
 *                     totalApiKeys:
 *                       type: integer
 *                       description: Total number of API keys
 *                     totalRequests:
 *                       type: integer
 *                       description: Total requests in database
 *                     requestsToday:
 *                       type: integer
 *                       description: Requests made today
 *                 models:
 *                   type: object
 *                   properties:
 *                     totalRequests:
 *                       type: integer
 *                       description: Total model requests
 *                     topModels:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           model:
 *                             type: string
 *                             description: Model name
 *                           requests:
 *                             type: integer
 *                             description: Number of requests
 *                           percentage:
 *                             type: number
 *                             description: Percentage of total requests
 *       500:
 *         description: Failed to generate metrics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @swagger
 * /v1/metrics/prometheus:
 *   get:
 *     summary: Get Prometheus metrics
 *     description: Returns metrics in Prometheus format for monitoring systems
 *     tags: [Metrics]
 *     responses:
 *       200:
 *         description: Prometheus metrics retrieved successfully
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               description: Prometheus-formatted metrics
 *       500:
 *         description: Failed to generate Prometheus metrics
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 */
import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { prisma } from '../utils/db';
import { getSystemMetrics } from '../routes/health';

const router = Router();

interface MetricsData {
  timestamp: string;
  uptime: number;
  system: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      loadAverage: number[];
    };
  };
  api: {
    totalRequests: number;
    requestsPerMinute: number;
    errorRate: number;
    averageResponseTime: number;
  };
  database: {
    totalUsers: number;
    totalApiKeys: number;
    totalRequests: number;
    requestsToday: number;
  };
  models: {
    totalRequests: number;
    topModels: Array<{
      model: string;
      requests: number;
      percentage: number;
    }>;
  };
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    const systemMetrics = await getSystemMetrics();
    
    // Get database metrics
    const [userCount, apiKeyCount, totalRequests, requestsToday] = await Promise.all([
      prisma.user.count(),
      prisma.apiKey.count(),
      prisma.requestLog.count(),
      prisma.requestLog.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);
    
    // Get API metrics from last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const [recentRequests, recentErrors] = await Promise.all([
      prisma.requestLog.count({
        where: {
          createdAt: { gte: oneHourAgo },
        },
      }),
      prisma.requestLog.count({
        where: {
          createdAt: { gte: oneHourAgo },
          status: { gte: 400 },
        },
      }),
    ]);
    
    // Get top models
    const topModels = await prisma.requestLog.groupBy({
      by: ['model'],
      _count: {
        model: true,
      },
      orderBy: {
        _count: {
          model: 'desc',
        },
      },
      take: 10,
    });
    
    const requestsPerMinute = recentRequests / 60;
    const errorRate = recentRequests > 0 ? (recentErrors / recentRequests) * 100 : 0;
    
    const metrics: MetricsData = {
      timestamp: new Date().toISOString(),
      uptime: systemMetrics.uptime,
      system: systemMetrics,
      api: {
        totalRequests,
        requestsPerMinute,
        errorRate,
        averageResponseTime: 0, // Could be calculated from request logs
      },
      database: {
        totalUsers: userCount,
        totalApiKeys: apiKeyCount,
        totalRequests,
        requestsToday,
      },
      models: {
        totalRequests,
        topModels: topModels.map(item => ({
          model: item.model,
          requests: item._count.model,
          percentage: totalRequests > 0 ? (item._count.model / totalRequests) * 100 : 0,
        })),
      },
    };
    
    const responseTime = Date.now() - startTime;
    
    logger.info({
      responseTime,
      metricsGenerated: true,
    }, 'Metrics endpoint accessed');
    
    res.status(200).json(metrics);
  } catch (error) {
    logger.error({ err: error }, 'Failed to generate metrics');
    res.status(500).json({
      error: {
        message: 'Failed to generate metrics',
        type: 'metrics_error',
        code: 'metrics_generation_failed',
        status: 500,
      },
    });
  }
});

// Prometheus-style metrics endpoint
router.get('/prometheus', async (_req: Request, res: Response) => {
  try {
    const systemMetrics = await getSystemMetrics();
    
    // Get basic counts
    const [userCount, apiKeyCount, totalRequests] = await Promise.all([
      prisma.user.count(),
      prisma.apiKey.count(),
      prisma.requestLog.count(),
    ]);
    
    const metrics = [
      `# HELP clex_uptime_seconds Total uptime of the service`,
      `# TYPE clex_uptime_seconds counter`,
      `clex_uptime_seconds ${systemMetrics.uptime}`,
      ``,
      `# HELP clex_memory_bytes Memory usage in bytes`,
      `# TYPE clex_memory_bytes gauge`,
      `clex_memory_bytes{type="used"} ${systemMetrics.memory.used}`,
      `clex_memory_bytes{type="total"} ${systemMetrics.memory.total}`,
      ``,
      `# HELP clex_users_total Total number of users`,
      `# TYPE clex_users_total gauge`,
      `clex_users_total ${userCount}`,
      ``,
      `# HELP clex_api_keys_total Total number of API keys`,
      `# TYPE clex_api_keys_total gauge`,
      `clex_api_keys_total ${apiKeyCount}`,
      ``,
      `# HELP clex_requests_total Total number of requests`,
      `# TYPE clex_requests_total counter`,
      `clex_requests_total ${totalRequests}`,
      ``,
      `# HELP clex_cpu_load CPU load average`,
      `# TYPE clex_cpu_load gauge`,
      `clex_cpu_load ${systemMetrics.cpu.loadAverage[0]}`,
    ].join('\n');
    
    res.set('Content-Type', 'text/plain');
    res.status(200).send(metrics);
  } catch (error) {
    logger.error({ err: error }, 'Failed to generate Prometheus metrics');
    res.status(500).set('Content-Type', 'text/plain').send('# Error generating metrics\n');
  }
});

export default router;
