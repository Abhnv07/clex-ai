import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../utils/db';
import { firebaseAuth } from '../middleware/auth';
import { AppError, NotFoundError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

const router = Router();

// All dashboard routes require Firebase auth
router.use(firebaseAuth);

/**
 * @swagger
 * /v1/keys:
 *   post:
 *     summary: Create a new API key
 *     description: |
 *       Creates a new API key for the authenticated user. The full key value is returned **only once**
 *       in the response – store it securely. Subsequent GET requests return only the masked prefix.
 *       Optionally attach the key to a project and set per-key rate limits.
 *     tags: [API Keys]
 *     security:
 *       - FirebaseAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ApiKeyCreateRequest'
 *     responses:
 *       201:
 *         description: API key created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiKeyCreated'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', async (req: Request, res: Response) => {
  const schema = z.object({
    name: z.string().min(1).max(64).default('Default Key'),
    expiresAt: z.string().datetime().optional(),
    projectId: z.string().uuid().optional(),
    maxRequestsPerMinute: z.number().int().positive().max(10000).optional(),
    maxRequestsPerDay: z.number().int().positive().max(1000000).optional(),
    maxTokensPerDay: z.number().int().positive().max(100000000).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    const fieldErrors = Object.values(parsed.error.flatten().fieldErrors).flatMap((value) => (
      Array.isArray(value) ? value : value ? [value] : []
    ));
    const message = fieldErrors.join(', ') || 'Invalid request body.';
    const error = new ValidationError(message);
    res.status(error.status).json(error.toJSON());
    return;
  }

  try {
    // Validate projectId belongs to user if provided
    if (parsed.data.projectId) {
      const project = await prisma.project.findFirst({
        where: { id: parsed.data.projectId, userId: req.userId! },
      });
      if (!project) {
        const error = new AppError('Project not found or does not belong to you', 404, 'project_not_found', 'not_found_error');
        res.status(error.status).json(error.toJSON());
        return;
      }
    }

    const rawKey = `clex_${(uuidv4() + uuidv4()).replace(/-/g, '').slice(0, 40)}`;
    const keyHash = await bcrypt.hash(rawKey, 12);
    const keyPrefix = rawKey.slice(0, 12);

    const apiKey = await prisma.apiKey.create({
      data: {
        userId: req.userId!,
        projectId: parsed.data.projectId || null,
        name: parsed.data.name,
        keyHash,
        keyPrefix,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
        maxRequestsPerMinute: parsed.data.maxRequestsPerMinute || null,
        maxRequestsPerDay: parsed.data.maxRequestsPerDay || null,
        maxTokensPerDay: parsed.data.maxTokensPerDay || null,
      },
    });

    // Audit log
    await prisma.keyEvent.create({
      data: {
        apiKeyId: apiKey.id,
        action: 'created',
        details: `Key "${apiKey.name}" created${parsed.data.projectId ? ` for project ${parsed.data.projectId}` : ''}`,
        ip: req.ip || null,
      },
    }).catch(() => {});

    res.status(201).json({
      id: apiKey.id,
      key: rawKey, // Only shown once!
      name: apiKey.name,
      prefix: keyPrefix,
      project_id: apiKey.projectId || null,
      created_at: apiKey.createdAt.toISOString(),
      expires_at: apiKey.expiresAt?.toISOString() || null,
      limits: {
        max_requests_per_minute: apiKey.maxRequestsPerMinute,
        max_requests_per_day: apiKey.maxRequestsPerDay,
        max_tokens_per_day: apiKey.maxTokensPerDay,
      },
      warning: 'Save this key now. You will not be able to see it again.',
    });
  } catch (err) {
    logger.error({ err }, 'Failed to create API key');
    const error = new AppError('Failed to create API key', 500, 'api_key_create_failed', 'server_error');
    res.status(error.status).json(error.toJSON());
  }
});

/**
 * @swagger
 * /v1/keys:
 *   get:
 *     summary: List API keys
 *     description: Returns all API keys for the authenticated user. Keys are masked (prefix only). Optionally filter by project.
 *     tags: [API Keys]
 *     security:
 *       - FirebaseAuth: []
 *     parameters:
 *       - in: query
 *         name: project_id
 *         schema:
 *           type: string
 *         description: Filter keys by project ID
 *     responses:
 *       200:
 *         description: List of API keys
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ApiKey'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const projectId = req.query.project_id as string | undefined;
    const where: any = { userId: req.userId! };
    if (projectId) where.projectId = projectId;

    const keys = await prisma.apiKey.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        projectId: true,
        createdAt: true,
        lastUsed: true,
        revokedAt: true,
        expiresAt: true,
        maxRequestsPerMinute: true,
        maxRequestsPerDay: true,
        maxTokensPerDay: true,
      },
    });

    res.json({
      data: keys.map(k => ({
        id: k.id,
        name: k.name,
        prefix: k.keyPrefix,
        project_id: k.projectId || null,
        created_at: k.createdAt.toISOString(),
        last_used: k.lastUsed?.toISOString() || null,
        revoked_at: k.revokedAt?.toISOString() || null,
        expires_at: k.expiresAt?.toISOString() || null,
        limits: {
          max_requests_per_minute: k.maxRequestsPerMinute,
          max_requests_per_day: k.maxRequestsPerDay,
          max_tokens_per_day: k.maxTokensPerDay,
        },
        status: k.revokedAt ? 'revoked' : (k.expiresAt && k.expiresAt < new Date() ? 'expired' : 'active'),
      })),
    });
  } catch (err) {
    logger.error({ err }, 'Failed to list API keys');
    const error = new AppError('Failed to list API keys', 500, 'api_key_list_failed', 'server_error');
    res.status(error.status).json(error.toJSON());
  }
});

/**
 * @swagger
 * /v1/keys/{id}:
 *   delete:
 *     summary: Revoke an API key
 *     description: Immediately revokes the API key. It can no longer be used for authentication.
 *     tags: [API Keys]
 *     security:
 *       - FirebaseAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Key revoked
 *       400:
 *         description: Key already revoked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Key not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const keyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const key = await prisma.apiKey.findFirst({
      where: { id: keyId, userId: req.userId! },
    });

    if (!key) {
      const error = new NotFoundError('API key not found');
      res.status(error.status).json(error.toJSON());
      return;
    }

    if (key.revokedAt) {
      const error = new AppError('API key already revoked', 400, 'api_key_already_revoked', 'invalid_request');
      res.status(error.status).json(error.toJSON());
      return;
    }

    await prisma.apiKey.update({
      where: { id: key.id },
      data: { revokedAt: new Date() },
    });

    // Audit log
    await prisma.keyEvent.create({
      data: {
        apiKeyId: key.id,
        action: 'revoked',
        details: `Key "${key.name}" revoked`,
        ip: req.ip || null,
      },
    }).catch(() => {});

    res.json({ message: 'API key revoked successfully' });
  } catch (err) {
    logger.error({ err }, 'Failed to revoke API key');
    const error = new AppError('Failed to revoke API key', 500, 'api_key_revoke_failed', 'server_error');
    res.status(error.status).json(error.toJSON());
  }
});

/**
 * @swagger
 * /v1/keys/{id}/rotate:
 *   post:
 *     summary: Rotate an API key
 *     description: |
 *       Atomically creates a new API key with the same settings (name, project, limits) and revokes the old one.
 *       Returns the new key value (shown only once).
 *     tags: [API Keys]
 *     security:
 *       - FirebaseAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: New key created, old key revoked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiKeyCreated'
 *       400:
 *         description: Cannot rotate a revoked key
 *       404:
 *         description: Key not found
 */
router.post('/:id/rotate', async (req: Request, res: Response) => {
  try {
    const keyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const oldKey = await prisma.apiKey.findFirst({
      where: { id: keyId, userId: req.userId! },
    });

    if (!oldKey) {
      const error = new NotFoundError('API key not found');
      res.status(error.status).json(error.toJSON());
      return;
    }

    if (oldKey.revokedAt) {
      const error = new AppError('Cannot rotate a revoked key', 400, 'api_key_already_revoked', 'invalid_request');
      res.status(error.status).json(error.toJSON());
      return;
    }

    // Create the new key with the same settings
    const rawKey = `clex_${(uuidv4() + uuidv4()).replace(/-/g, '').slice(0, 40)}`;
    const keyHash = await bcrypt.hash(rawKey, 12);
    const keyPrefix = rawKey.slice(0, 12);

    const [newKey] = await prisma.$transaction([
      prisma.apiKey.create({
        data: {
          userId: req.userId!,
          projectId: oldKey.projectId,
          name: oldKey.name,
          keyHash,
          keyPrefix,
          expiresAt: oldKey.expiresAt,
          maxRequestsPerMinute: oldKey.maxRequestsPerMinute,
          maxRequestsPerDay: oldKey.maxRequestsPerDay,
          maxTokensPerDay: oldKey.maxTokensPerDay,
        },
      }),
      prisma.apiKey.update({
        where: { id: oldKey.id },
        data: { revokedAt: new Date() },
      }),
    ]);

    // Audit logs
    await Promise.all([
      prisma.keyEvent.create({
        data: {
          apiKeyId: oldKey.id,
          action: 'rotated',
          details: `Key rotated – replaced by ${newKey.id}`,
          ip: req.ip || null,
        },
      }),
      prisma.keyEvent.create({
        data: {
          apiKeyId: newKey.id,
          action: 'created',
          details: `Key created via rotation of ${oldKey.id}`,
          ip: req.ip || null,
        },
      }),
    ]).catch(() => {});

    res.status(201).json({
      id: newKey.id,
      key: rawKey,
      name: newKey.name,
      prefix: keyPrefix,
      project_id: newKey.projectId || null,
      created_at: newKey.createdAt.toISOString(),
      expires_at: newKey.expiresAt?.toISOString() || null,
      rotated_from: oldKey.id,
      warning: 'Save this key now. You will not be able to see it again.',
    });
  } catch (err) {
    logger.error({ err }, 'Failed to rotate API key');
    const error = new AppError('Failed to rotate API key', 500, 'api_key_rotate_failed', 'server_error');
    res.status(error.status).json(error.toJSON());
  }
});

/**
 * @swagger
 * /v1/keys/{id}/events:
 *   get:
 *     summary: Get audit events for a key
 *     description: Returns the most recent 50 audit events (created, revoked, rotated) for the specified key.
 *     tags: [API Keys]
 *     security:
 *       - FirebaseAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of key events
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/KeyEvent'
 *       404:
 *         description: Key not found
 */
router.get('/:id/events', async (req: Request, res: Response) => {
  try {
    const keyId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const key = await prisma.apiKey.findFirst({
      where: { id: keyId, userId: req.userId! },
    });

    if (!key) {
      const error = new NotFoundError('API key not found');
      res.status(error.status).json(error.toJSON());
      return;
    }

    const events = await prisma.keyEvent.findMany({
      where: { apiKeyId: keyId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({
      data: events.map(e => ({
        id: e.id,
        action: e.action,
        details: e.details,
        ip: e.ip,
        created_at: e.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch key events');
    const error = new AppError('Failed to fetch key events', 500, 'key_events_failed', 'server_error');
    res.status(error.status).json(error.toJSON());
  }
});

export default router;
