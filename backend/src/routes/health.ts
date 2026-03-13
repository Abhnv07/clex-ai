import { Router, Request, Response } from 'express';
import { getConfigurationError, config } from '../config';
import { getDatabaseStatus } from '../utils/db';
import { logger } from '../utils/logger';
import { checkProviderHealth } from '../services/providerService';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     HealthCheck:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: Name of the health check
 *         status:
 *           type: string
 *           enum: [healthy, unhealthy, degraded]
 *           description: Status of the health check
 *         responseTime:
 *           type: number
 *           description: Response time in milliseconds
 *         error:
 *           type: string
 *           description: Error message if check failed
 *         details:
 *           type: object
 *           description: Additional details about the check
 *     SystemMetrics:
 *       type: object
 *       properties:
 *         uptime:
 *           type: number
 *           description: System uptime in seconds
 *         memory:
 *           type: object
 *           properties:
 *             used:
 *               type: number
 *               description: Memory used in bytes
 *             total:
 *               type: number
 *               description: Total memory in bytes
 *             percentage:
 *               type: number
 *               description: Memory usage percentage
 *         cpu:
 *           type: object
 *           properties:
 *             loadAverage:
 *               type: array
 *               items:
 *                 type: number
 *               description: CPU load averages
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: When metrics were collected
 */

/**
 * @swagger
 * /v1/health:
 *   get:
 *     summary: Get API health status
 *     description: Returns the current health status of the API and its dependencies
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Health status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 *       503:
 *         description: Service is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 */
/**
 * @swagger
 * /v1/health/detailed:
 *   get:
 *     summary: Get detailed health status
 *     description: Returns detailed health status with system metrics and all checks
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Detailed health status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/HealthCheck'
 *                 - type: object
 *                   properties:
 *                     uptime:
 *                       type: number
 *                       description: Service uptime in seconds
 *                     memory:
 *                       $ref: '#/components/schemas/SystemMetrics/properties/memory'
 *                     cpu:
 *                       $ref: '#/components/schemas/SystemMetrics/properties/cpu'
 *                     checks:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/HealthCheck'
 *       503:
 *         description: Service is unhealthy
 */
/**
 * @swagger
 * /v1/health/ping:
 *   get:
 *     summary: Simple health ping
 *     description: Simple endpoint for load balancer health checks
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is responding
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */

interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  error?: string;
  details?: any;
}

interface SystemMetrics {
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    loadAverage: number[];
  };
  timestamp: string;
}

export async function getSystemMetrics(): Promise<SystemMetrics> {
  const memUsage = process.memoryUsage();
  const totalMem = require('os').totalmem();
  const freeMem = require('os').freemem();
  const usedMem = totalMem - freeMem;
  
  return {
    uptime: process.uptime(),
    memory: {
      used: memUsage.heapUsed,
      total: memUsage.heapTotal,
      percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
    },
    cpu: {
      loadAverage: require('os').loadavg(),
    },
    timestamp: new Date().toISOString(),
  };
}

export async function getHealthResponse() {
  const startTime = Date.now();
  
  // Basic health checks
  const configurationError = getConfigurationError();
  const databaseStatus = await getDatabaseStatus();
  const systemMetrics = await getSystemMetrics();
  
  // Provider health checks
  const providerChecks = await checkProviderHealth();
  
  // Additional service checks
  const healthChecks: HealthCheck[] = [
    {
      name: 'database',
      status: databaseStatus === 'connected' ? 'healthy' : 'unhealthy',
      details: { status: databaseStatus },
    },
    {
      name: 'configuration',
      status: configurationError ? 'degraded' : 'healthy',
      error: configurationError?.message,
    },
    ...providerChecks,
  ];
  
  // Calculate overall status
  const unhealthyCount = healthChecks.filter(c => c.status === 'unhealthy').length;
  const degradedCount = healthChecks.filter(c => c.status === 'degraded').length;
  
  let overallStatus: 'ok' | 'degraded' | 'unhealthy';
  if (unhealthyCount > 0) {
    overallStatus = 'unhealthy';
  } else if (degradedCount > 0) {
    overallStatus = 'degraded';
  } else {
    overallStatus = 'ok';
  }
  
  const responseTime = Date.now() - startTime;
  
  // Log health check result
  logger.info({
    status: overallStatus,
    responseTime,
    checks: healthChecks.length,
    unhealthy: unhealthyCount,
    degraded: degradedCount,
  }, 'Health check completed');
  
  return {
    statusCode: overallStatus === 'ok' ? 200 : overallStatus === 'degraded' ? 200 : 503,
    body: {
      status: overallStatus,
      version: '1.0.0',
      service: 'clex-api',
      timestamp: new Date().toISOString(),
      responseTime,
      uptime: systemMetrics.uptime,
      memory: systemMetrics.memory,
      cpu: systemMetrics.cpu,
      checks: healthChecks,
      ...(configurationError ? { error: configurationError.toJSON().error } : {}),
    },
  };
}

// Detailed health endpoint with more information
router.get('/detailed', async (_req: Request, res: Response) => {
  const response = await getHealthResponse();
  res.status(response.statusCode).json(response.body);
});

// Simple health endpoint for load balancers
router.get('/ping', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Main health endpoint
router.get('/', async (_req: Request, res: Response) => {
  const response = await getHealthResponse();
  res.status(response.statusCode).json(response.body);
});

export default router;
