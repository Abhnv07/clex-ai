import type { Env } from '../_utils'
import {
  error,
  getClientIp,
  isInboxExpired,
  json,
  randomId,
  randomLocalPart,
  rateLimit,
} from '../_utils'

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  if (request.method === 'OPTIONS') {
    return json({}, { status: 204 })
  }

  if (request.method === 'POST') {
    return handleCreateInbox(request, env)
  }

  if (request.method === 'GET') {
    const url = new URL(request.url)
    const inboxId = url.searchParams.get('id')
    if (!inboxId) {
      return error('Missing inbox id', 400)
    }
    return handleGetInbox(inboxId, env)
  }

  return error('Method not allowed', 405)
}

async function handleCreateInbox(request: Request, env: Env): Promise<Response> {
  const ip = getClientIp(request)
  const { allowed, remaining, resetAt } = await rateLimit({
    kv: env.RATE_LIMIT_KV,
    key: `ip:create:${ip}`,
    max: 5,
    windowSeconds: 30 * 60,
  })

  if (!allowed) {
    return error('Too many inboxes created from this IP', 429, {
      remaining,
      resetAt,
    })
  }

  const id = randomId(20)
  const localPart = randomLocalPart()
  const address = `${localPart}@modih.in`
  const now = Date.now()
  const expiresAt = now + 30 * 60 * 1000

  await env.DB.prepare(
    `
      INSERT INTO inboxes (id, address, created_at, expires_at, client_ip)
      VALUES (?1, ?2, ?3, ?4, ?5)
    `,
  )
    .bind(id, address, now, expiresAt, ip)
    .run()

  return json(
    {
      id,
      address,
      createdAt: now,
      expiresAt,
    },
    { status: 201 },
  )
}

async function handleGetInbox(inboxId: string, env: Env): Promise<Response> {
  const row = await env.DB.prepare(
    `
      SELECT id, address, created_at, expires_at
      FROM inboxes
      WHERE id = ?1
    `,
  )
    .bind(inboxId)
    .first<{
      id: string
      address: string
      created_at: number
      expires_at: number
    }>()

  if (!row) {
    return error('Inbox not found', 404, { code: 'INBOX_NOT_FOUND' })
  }

  if (isInboxExpired(row.expires_at)) {
    return error('Inbox expired', 404, { code: 'INBOX_EXPIRED' })
  }

  return json({
    id: row.id,
    address: row.address,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  })
}

