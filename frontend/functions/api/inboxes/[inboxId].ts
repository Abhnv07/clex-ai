import type { Env } from '../../_utils'
import { error, isInboxExpired, json } from '../../_utils'

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context
  const inboxId = params.inboxId as string | undefined

  if (!inboxId) {
    return error('Missing inbox id', 400)
  }

  if (request.method === 'OPTIONS') {
    return json({}, { status: 204 })
  }

  if (request.method === 'GET') {
    return getInbox(inboxId, env)
  }

  if (request.method === 'DELETE') {
    return deleteInbox(inboxId, env)
  }

  return error('Method not allowed', 405)
}

async function getInbox(inboxId: string, env: Env): Promise<Response> {
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

async function deleteInbox(inboxId: string, env: Env): Promise<Response> {
  const now = Date.now()
  const res = await env.DB.prepare(
    `
      UPDATE inboxes
      SET expires_at = ?1
      WHERE id = ?2
    `,
  )
    .bind(now, inboxId)
    .run()

  if (!res.meta.changes) {
    return error('Inbox not found', 404, { code: 'INBOX_NOT_FOUND' })
  }

  return json({ ok: true, expiresAt: now })
}

