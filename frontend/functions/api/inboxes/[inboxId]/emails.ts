import type { Env } from '../../../_utils'
import { error, getClientIp, isInboxExpired, json, rateLimit } from '../../../_utils'
import { sanitizeHtml } from '../../../_sanitizeHtml'

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context
  const inboxId = params.inboxId as string | undefined

  if (!inboxId) {
    return error('Missing inbox id', 400)
  }

  if (request.method === 'OPTIONS') {
    return json({}, { status: 204 })
  }

  if (request.method !== 'GET') {
    return error('Method not allowed', 405)
  }

  const inboxRow = await env.DB.prepare(
    `
      SELECT id, expires_at
      FROM inboxes
      WHERE id = ?1
    `,
  )
    .bind(inboxId)
    .first<{ id: string; expires_at: number }>()

  if (!inboxRow) {
    return error('Inbox not found', 404, { code: 'INBOX_NOT_FOUND' })
  }

  if (isInboxExpired(inboxRow.expires_at)) {
    return error('Inbox expired', 404, { code: 'INBOX_EXPIRED' })
  }

  const ip = getClientIp(request)
  const { allowed, remaining, resetAt } = await rateLimit({
    kv: env.RATE_LIMIT_KV,
    key: `ip:read:${ip}:${inboxId}`,
    max: 3,
    windowSeconds: 5,
  })

  if (!allowed) {
    return error('Too many inbox reads from this IP', 429, {
      remaining,
      resetAt,
    })
  }

  const url = new URL(request.url)
  const sinceParam = url.searchParams.get('since')
  const since = sinceParam ? Number(sinceParam) : undefined

  let query = `
    SELECT id, inbox_id, from_address, to_address, subject, html_body, text_body, received_at
    FROM emails
    WHERE inbox_id = ?1
  `
  const binds: (string | number)[] = [inboxId]

  if (!Number.isNaN(since) && since) {
    query += ' AND received_at > ?2'
    binds.push(since)
  }

  query += `
    ORDER BY received_at DESC
    LIMIT 50
  `

  const stmt = env.DB.prepare(query)
  const result = await stmt.bind(...binds).all<{
    id: string
    inbox_id: string
    from_address: string | null
    to_address: string
    subject: string | null
    html_body: string | null
    text_body: string | null
    received_at: number
  }>()

  const emails = (result.results ?? []).map((row) => ({
    id: row.id,
    inboxId: row.inbox_id,
    from: row.from_address,
    to: row.to_address,
    subject: row.subject ?? '(no subject)',
    html: sanitizeHtml(row.html_body ?? ''),
    text: row.text_body,
    receivedAt: row.received_at,
  }))

  const latestReceivedAt = emails.length ? emails[0].receivedAt : since ?? 0

  return json({
    emails,
    latestReceivedAt,
  })
}

