// ═══════════════════════════════════════════════════════
// CLEX API Backend – Production Server
// ═══════════════════════════════════════════════════════

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';

import { config, allowedOrigins, getConfigurationError } from './config';
import { logger } from './utils/logger';
import { requestIdMiddleware } from './middleware/requestId';
import { errorHandler } from './middleware/errorHandler';
import { requireConfiguration } from './middleware/requireConfiguration';
import { perUserRateLimit, tokenQuotaCheck, recordUsage } from './middleware/rateLimit';
import { securityMiddleware, chatCompletionSecurity, apiKeySecurity, analyticsSecurity } from './middleware/security';
import { cache } from './utils/cache';

import healthRouter from './routes/health';
import modelsRouter from './routes/models';
import chatRouter from './routes/chat';
import keysRouter from './routes/keys';
import usageRouter from './routes/usage';
import analyticsRouter from './routes/analytics';
import metricsRouter from './routes/metrics';
import projectsRouter from './routes/projects';
import docsRouter from './routes/docs';

const app = express();

// ─── Global Middleware ─────────────────────────────────
app.disable('x-powered-by');

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin) || config.NODE_ENV === 'development') {
      return cb(null, true);
    }
    return cb(new Error('CORS blocked'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '2mb' }));
app.use(requestIdMiddleware);

// Apply global security middleware
app.use(securityMiddleware);

// ─── Rate Limiting ─────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  limit: config.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: 'Rate limit exceeded. Please try again later.',
      type: 'rate_limit_error',
      code: 'rate_limit_exceeded',
      status: 429,
    },
  },
});

app.use('/v1', apiLimiter);

// ─── Request Logging ───────────────────────────────────
app.use((req, _res, next) => {
  logger.info({
    method: req.method,
    path: req.path,
    requestId: req.requestId,
    ip: req.ip,
  }, 'Incoming request');
  next();
});

// ─── Dashboard Static Files ────────────────────────────
// On Vercel, files under public/** are served by the CDN.
// Keep a local Express fallback so local `npm start` still serves the built dashboard.
const dashboardPath = path.join(__dirname, '..', 'public', 'dashboard');
app.use('/dashboard', express.static(dashboardPath));

// ─── API Routes ────────────────────────────────────────
export function getRootResponse() {
  const configurationError = getConfigurationError();

  return {
    statusCode: configurationError ? 503 : 200,
    body: {
      name: 'CLEX API',
      version: '1.0.0',
      status: configurationError ? 'degraded' : 'ok',
      docs: 'https://clex.in/docs.html',
      dashboard: 'https://api.clex.in/dashboard',
      endpoints: {
        health: 'GET /v1/health',
        models: 'GET /v1/models',
        metrics: 'GET /v1/metrics',
        docs: 'GET /docs',
        chat: 'POST /v1/chat/completions',
        keys: 'GET|POST|DELETE /v1/keys',
        projects: 'GET|POST|PATCH|DELETE /v1/projects',
        usage: 'GET /v1/usage',
        analytics: 'GET /v1/analytics',
      },
      ...(configurationError ? { error: configurationError.toJSON().error } : {}),
    },
  };
}

app.get('/', (req, res) => {
  const acceptsHtml = req.headers.accept?.includes('text/html');
  const isApiClient = req.headers.accept?.includes('application/json') ||
    !req.headers.accept ||
    (req.headers['user-agent']?.includes('curl') ?? false);

  if (acceptsHtml && !isApiClient) {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
    return;
  }

  const response = getRootResponse();
  res.status(response.statusCode).json(response.body);
});

app.use('/v1/health', healthRouter);
app.use('/v1/models', modelsRouter);
app.use('/v1/metrics', metricsRouter);
app.use('/docs', docsRouter);

// Apply rate limiting and usage tracking to protected routes
app.use('/v1/chat/completions', ...chatCompletionSecurity, perUserRateLimit, tokenQuotaCheck, recordUsage);
app.use('/v1/keys', ...apiKeySecurity, perUserRateLimit, recordUsage);
app.use('/v1/usage', ...analyticsSecurity, perUserRateLimit, recordUsage);
app.use('/v1/analytics', ...analyticsSecurity, perUserRateLimit, recordUsage);
app.use('/v1/projects', ...analyticsSecurity, perUserRateLimit, recordUsage);

app.use(
  ['/v1/chat/completions', '/v1/keys', '/v1/usage', '/v1/analytics', '/v1/projects'],
  requireConfiguration(['DATABASE_URL']),
);
app.use('/v1/chat/completions', chatRouter);
app.use('/v1/keys', keysRouter);
app.use('/v1/usage', usageRouter);
app.use('/v1/analytics', analyticsRouter);
app.use('/v1/projects', projectsRouter);

// ─── Dashboard SPA Fallback ───────────────────────────
app.get('/dashboard/*', (_req, res) => {
  res.sendFile(path.join(dashboardPath, 'index.html'));
});

// ─── Error Handling ────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ──────────────────────────────────────
if (require.main === module) {
  // Initialize cache connection
  cache.connect().catch(error => {
    logger.warn({ err: error }, 'Failed to connect to Redis cache - operating without cache');
  });

  app.listen(config.PORT, () => {
    logger.info(`
  ╔═══════════════════════════════════════════╗
  ║        CLEX API Backend v1.0.0            ║
  ╠═══════════════════════════════════════════╣
  ║                                           ║
  ║  🌐  http://localhost:${config.PORT}                ║
  ║                                           ║
  ║  Endpoints:                               ║
  ║  • GET  /v1/health                        ║
  ║  • GET  /v1/models                        ║
  ║  • GET  /v1/metrics                       ║
  ║  • GET  /docs                             ║
  ║  • POST /v1/chat/completions              ║
  ║  • POST /v1/keys                          ║
  ║  • GET  /v1/usage                         ║
  ║  • GET  /v1/analytics                     ║
  ║  • CRUD /v1/projects                      ║
  ║                                           ║
  ║  Dashboard: /dashboard                    ║
  ║                                           ║
  ╚═══════════════════════════════════════════╝
    `);
  });
}

export default app;
