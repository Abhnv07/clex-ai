import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/db';
import { firebaseAuth } from '../middleware/auth';
import { AppError, NotFoundError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

const router = Router();

// All project routes require Firebase auth
router.use(firebaseAuth);

/**
 * @swagger
 * /v1/projects:
 *   get:
 *     summary: List user's projects
 *     tags: [Projects]
 *     security:
 *       - FirebaseAuth: []
 *     responses:
 *       200:
 *         description: List of projects
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Project'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const includeArchived = req.query.include_archived === 'true';

    const where: any = { userId: req.userId! };
    if (!includeArchived) {
      where.archivedAt = null;
    }

    const projects = await prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            apiKeys: { where: { revokedAt: null } },
            requests: true,
          },
        },
      },
    });

    res.json({
      data: projects.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        created_at: p.createdAt.toISOString(),
        updated_at: p.updatedAt.toISOString(),
        archived_at: p.archivedAt?.toISOString() || null,
        active_keys: p._count.apiKeys,
        total_requests: p._count.requests,
      })),
    });
  } catch (err) {
    logger.error({ err }, 'Failed to list projects');
    const error = new AppError('Failed to list projects', 500, 'projects_list_failed', 'server_error');
    res.status(error.status).json(error.toJSON());
  }
});

/**
 * @swagger
 * /v1/projects:
 *   post:
 *     summary: Create a new project
 *     tags: [Projects]
 *     security:
 *       - FirebaseAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       201:
 *         description: Project created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', async (req: Request, res: Response) => {
  const schema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    const fieldErrors = Object.values(parsed.error.flatten().fieldErrors).flat();
    const error = new ValidationError(fieldErrors.join(', ') || 'Invalid request body.');
    res.status(error.status).json(error.toJSON());
    return;
  }

  try {
    const project = await prisma.project.create({
      data: {
        userId: req.userId!,
        name: parsed.data.name,
        description: parsed.data.description || null,
      },
    });

    res.status(201).json({
      id: project.id,
      name: project.name,
      description: project.description,
      created_at: project.createdAt.toISOString(),
      updated_at: project.updatedAt.toISOString(),
      archived_at: null,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to create project');
    const error = new AppError('Failed to create project', 500, 'project_create_failed', 'server_error');
    res.status(error.status).json(error.toJSON());
  }
});

/**
 * @swagger
 * /v1/projects/{id}:
 *   patch:
 *     summary: Update a project
 *     tags: [Projects]
 *     security:
 *       - FirebaseAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Project updated
 *       404:
 *         description: Not found
 */
router.patch('/:id', async (req: Request, res: Response) => {
  const schema = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    const fieldErrors = Object.values(parsed.error.flatten().fieldErrors).flat();
    const error = new ValidationError(fieldErrors.join(', ') || 'Invalid request body.');
    res.status(error.status).json(error.toJSON());
    return;
  }

  try {
    const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const existing = await prisma.project.findFirst({
      where: { id: projectId, userId: req.userId! },
    });

    if (!existing) {
      const error = new NotFoundError('Project not found');
      res.status(error.status).json(error.toJSON());
      return;
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
      },
    });

    res.json({
      id: updated.id,
      name: updated.name,
      description: updated.description,
      created_at: updated.createdAt.toISOString(),
      updated_at: updated.updatedAt.toISOString(),
      archived_at: updated.archivedAt?.toISOString() || null,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to update project');
    const error = new AppError('Failed to update project', 500, 'project_update_failed', 'server_error');
    res.status(error.status).json(error.toJSON());
  }
});

/**
 * @swagger
 * /v1/projects/{id}:
 *   delete:
 *     summary: Archive (soft-delete) a project
 *     tags: [Projects]
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
 *         description: Project archived
 *       404:
 *         description: Not found
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const existing = await prisma.project.findFirst({
      where: { id: projectId, userId: req.userId! },
    });

    if (!existing) {
      const error = new NotFoundError('Project not found');
      res.status(error.status).json(error.toJSON());
      return;
    }

    if (existing.archivedAt) {
      const error = new AppError('Project already archived', 400, 'project_already_archived', 'invalid_request');
      res.status(error.status).json(error.toJSON());
      return;
    }

    await prisma.project.update({
      where: { id: projectId },
      data: { archivedAt: new Date() },
    });

    res.json({ message: 'Project archived successfully' });
  } catch (err) {
    logger.error({ err }, 'Failed to archive project');
    const error = new AppError('Failed to archive project', 500, 'project_archive_failed', 'server_error');
    res.status(error.status).json(error.toJSON());
  }
});

/**
 * @swagger
 * /v1/projects/{id}/keys:
 *   get:
 *     summary: List API keys for a project
 *     tags: [Projects]
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
 *         description: List of keys for the project
 */
router.get('/:id/keys', async (req: Request, res: Response) => {
  try {
    const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.userId! },
    });

    if (!project) {
      const error = new NotFoundError('Project not found');
      res.status(error.status).json(error.toJSON());
      return;
    }

    const keys = await prisma.apiKey.findMany({
      where: { projectId, userId: req.userId! },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
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
    logger.error({ err }, 'Failed to list project keys');
    const error = new AppError('Failed to list project keys', 500, 'project_keys_list_failed', 'server_error');
    res.status(error.status).json(error.toJSON());
  }
});

/**
 * @swagger
 * /v1/projects/{id}/usage:
 *   get:
 *     summary: Get usage logs for a project
 *     tags: [Projects]
 *     security:
 *       - FirebaseAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Usage logs for the project
 */
router.get('/:id/usage', async (req: Request, res: Response) => {
  try {
    const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.userId! },
    });

    if (!project) {
      const error = new NotFoundError('Project not found');
      res.status(error.status).json(error.toJSON());
      return;
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));

    const where = { projectId, userId: req.userId! };

    const [logs, total] = await Promise.all([
      prisma.requestLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          requestId: true,
          model: true,
          provider: true,
          promptTokens: true,
          completionTokens: true,
          totalTokens: true,
          estimatedCost: true,
          status: true,
          durationMs: true,
          streaming: true,
          createdAt: true,
        },
      }),
      prisma.requestLog.count({ where }),
    ]);

    res.json({
      data: logs.map(l => ({
        id: l.id,
        request_id: l.requestId,
        model: l.model,
        provider: l.provider,
        prompt_tokens: l.promptTokens,
        completion_tokens: l.completionTokens,
        total_tokens: l.totalTokens,
        estimated_cost: l.estimatedCost,
        status: l.status,
        duration_ms: l.durationMs,
        streaming: l.streaming,
        created_at: l.createdAt.toISOString(),
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch project usage');
    const error = new AppError('Failed to fetch project usage', 500, 'project_usage_failed', 'server_error');
    res.status(error.status).json(error.toJSON());
  }
});

export default router;
