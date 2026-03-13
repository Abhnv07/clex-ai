export type Env = {
  DB: D1Database
  RATE_LIMIT_KV: KVNamespace
  SESSION_KV?: KVNamespace
}

export type JsonResponseInit = ResponseInit & { status: number }

export function json<T>(
  data: T,
  init: JsonResponseInit = { status: 200 },
): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS',
      'access-control-allow-headers': 'Content-Type',
      ...(init.headers ?? {}),
    },
  })
}

export function error(
  message: string,
  status: number,
  extra?: Record<string, unknown>,
): Response {
  return json(
    {
      error: message,
      ...(extra ?? {}),
    },
    { status },
  )
}

export async function rateLimit(options: {
  kv: KVNamespace
  key: string
  max: number
  windowSeconds: number
}): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const { kv, key, max, windowSeconds } = options
  const now = Date.now()
  const windowStart = Math.floor(now / (windowSeconds * 1000))
  const windowKey = `${key}:${windowStart}`

  const currentRaw = await kv.get(windowKey)
  const current = currentRaw ? parseInt(currentRaw, 10) : 0

  if (current >= max) {
    const resetAt = (windowStart + 1) * windowSeconds * 1000
    return { allowed: false, remaining: 0, resetAt }
  }

  await kv.put(windowKey, String(current + 1), {
    expirationTtl: windowSeconds,
  })

  const remaining = Math.max(0, max - (current + 1))
  const resetAt = (windowStart + 1) * windowSeconds * 1000

  return { allowed: true, remaining, resetAt }
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get('CF-Connecting-IP') ||
    req.headers.get('x-forwarded-for') ||
    'unknown'
  )
}

const RANDOM_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789'

export function randomId(length = 16): string {
  let result = ''
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  for (let i = 0; i < length; i++) {
    result += RANDOM_CHARS[array[i] % RANDOM_CHARS.length]
  }
  return result
}

export function randomLocalPart(): string {
  const adjectives = [
    'quantum',
    'stellar',
    'lunar',
    'ember',
    'neon',
    'cosmic',
    'nova',
    'solar',
  ]
  const nouns = [
    'flux',
    'pulse',
    'spark',
    'wave',
    'node',
    'signal',
    'drift',
    'shard',
  ]

  const a = adjectives[Math.floor(Math.random() * adjectives.length)]
  const n = nouns[Math.floor(Math.random() * nouns.length)]
  const suffix = randomId(4)
  return `${a}-${n}-${suffix}`
}

export function isInboxExpired(expiresAt: number): boolean {
  return expiresAt <= Date.now()
}

