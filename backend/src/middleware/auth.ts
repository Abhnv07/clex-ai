import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../utils/db';
import { AppError, AuthenticationError } from '../utils/errors';
import { getFirebaseAdminAuth, getFirebaseAdminInitError } from '../utils/firebaseAdmin';
import { logger } from '../utils/logger';

export async function apiKeyAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    const err = new AuthenticationError('Missing Authorization header. Use: Bearer clex_xxx');
    res.status(err.status).json(err.toJSON());
    return;
  }

  const rawKey = match[1].trim();

  if (!rawKey.startsWith('clex_')) {
    const err = new AuthenticationError('Invalid API key format. Keys start with clex_');
    res.status(err.status).json(err.toJSON());
    return;
  }

  try {
    // Optimized lookup: use key prefix to narrow candidates before bcrypt
    const keyPrefix = rawKey.slice(0, 12);
    const candidates = await prisma.apiKey.findMany({
      where: {
        keyPrefix,
        revokedAt: null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      include: { user: true },
    });

    let matched: typeof candidates[0] | null = null;
    for (const candidate of candidates) {
      if (await bcrypt.compare(rawKey, candidate.keyHash)) {
        matched = candidate;
        break;
      }
    }

    if (!matched) {
      const err = new AuthenticationError('Invalid API key');
      res.status(err.status).json(err.toJSON());
      return;
    }

    // Update last used timestamp (fire and forget)
    prisma.apiKey.update({
      where: { id: matched.id },
      data: { lastUsed: new Date() },
    }).catch(e => logger.warn({ err: e }, 'Failed to update lastUsed'));

    req.userId = matched.userId;
    req.apiKeyId = matched.id;
    req.projectId = matched.projectId;

    // Attach per-key rate limits so downstream middleware can use them
    if (matched.maxRequestsPerMinute || matched.maxRequestsPerDay || matched.maxTokensPerDay) {
      req.apiKeyLimits = {
        maxRequestsPerMinute: matched.maxRequestsPerMinute,
        maxRequestsPerDay: matched.maxRequestsPerDay,
        maxTokensPerDay: matched.maxTokensPerDay,
      };
    }

    next();
  } catch (error) {
    logger.error({ err: error }, 'API key auth error');
    const err = new AppError('Authentication service error', 500, 'auth_service_error', 'server_error');
    res.status(500).json(err.toJSON());
  }
}

// Firebase ID token auth for dashboard endpoints
export async function firebaseAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    const err = new AuthenticationError('Missing Authorization Bearer token');
    res.status(err.status).json(err.toJSON());
    return;
  }

  const token = match[1].trim();

  // For development, accept a special dev token
  if (process.env.NODE_ENV === 'development' && token === 'dev-token') {
    req.userId = 'dev-user-id';
    next();
    return;
  }

  // In production, verify Firebase ID token
  try {
    const adminAuth = getFirebaseAdminAuth();
    if (!adminAuth) {
      const initError = getFirebaseAdminInitError();
      const err = new AppError(
        initError
          ? `Firebase Admin is misconfigured: ${initError.message}`
          : 'Dashboard auth is not configured on the server.',
        500,
        'dashboard_auth_unavailable',
        'server_error',
      );
      res.status(err.status).json(err.toJSON());
      return;
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const email = decoded.email || `${decoded.uid}@users.clex.in`;
    const displayName = decoded.name || null;

    // Find or create user
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: decoded.uid },
          { email },
        ],
      },
    });
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: decoded.uid,
          email,
          name: displayName,
        },
      });
    } else if (user.email !== email || user.name !== displayName) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          email,
          name: displayName,
        },
      });
    }

    req.userId = user.id;
    next();
  } catch (error) {
    logger.error({ err: error }, 'Firebase auth error');
    const err = new AuthenticationError('Invalid authentication token');
    res.status(err.status).json(err.toJSON());
  }
}
