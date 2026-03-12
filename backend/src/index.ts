// ═══════════════════════════════════════════════════════
// CLEX API Backend – Production Server
// ═══════════════════════════════════════════════════════

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';

import { config, allowedOrigins } from './config';
import { logger } from './utils/logger';
import { requestIdMiddleware } from './middleware/requestId';
import { errorHandler } from './middleware/errorHandler';

import healthRouter from './routes/health';
import modelsRouter from './routes/models';
import chatRouter from './routes/chat';
import keysRouter from './routes/keys';
import usageRouter from './routes/usage';
import analyticsRouter from './routes/analytics';

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
app.get('/', (_req, res) => {
  res.json({
    name: 'CLEX API',
    version: '1.0.0',
    docs: 'https://clex.in/docs.html',
    dashboard: 'https://api.clex.in/dashboard',
    endpoints: {
      health: 'GET /v1/health',
      models: 'GET /v1/models',
      chat: 'POST /v1/chat/completions',
      keys: 'GET|POST|DELETE /v1/keys',
      usage: 'GET /v1/usage',
      analytics: 'GET /v1/analytics',
    },
  });
});

app.use('/v1/health', healthRouter);
app.use('/v1/models', modelsRouter);
app.use('/v1/chat/completions', chatRouter);
app.use('/v1/keys', keysRouter);
app.use('/v1/usage', usageRouter);
app.use('/v1/analytics', analyticsRouter);

// ─── Dashboard SPA Fallback ───────────────────────────
app.get('/dashboard/*', (_req, res) => {
  res.sendFile(path.join(dashboardPath, 'index.html'));
});

// ─── Error Handling ────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ──────────────────────────────────────
if (require.main === module) {
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
  ║  • POST /v1/chat/completions              ║
  ║  • POST /v1/keys                          ║
  ║  • GET  /v1/usage                         ║
  ║  • GET  /v1/analytics                     ║
  ║                                           ║
  ║  Dashboard: /dashboard                    ║
  ║                                           ║
  ╚═══════════════════════════════════════════╝
    `);
  });
}

export default app;
