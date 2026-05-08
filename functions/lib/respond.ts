// ═══════════════════════════════════════════════════════════════════════════
// JSON / error response helpers. All API routes go through these so headers
// stay consistent.
// ═══════════════════════════════════════════════════════════════════════════

import type { Env } from './types';

const JSON_TYPE = 'application/json; charset=utf-8';

function pickAllowedOrigin(req: Request, env: Env): string | null {
  const origin = req.headers.get('Origin');
  if (!origin) return null;
  const list = (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length === 0) return origin; // permissive default
  return list.includes(origin) ? origin : null;
}

export function corsHeaders(req: Request, env: Env): Headers {
  const h = new Headers();
  const allowOrigin = pickAllowedOrigin(req, env);
  if (allowOrigin) h.set('Access-Control-Allow-Origin', allowOrigin);
  h.set('Vary', 'Origin');
  h.set('Access-Control-Allow-Credentials', 'true');
  h.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Admin-Secret, X-Clex-Api-Key, X-Admin-Session, X-Requested-With'
  );
  h.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  h.set('Access-Control-Max-Age', '86400');
  return h;
}

export function jsonResponse(
  body: unknown,
  init: ResponseInit = {},
  req?: Request,
  env?: Env
): Response {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', JSON_TYPE);
  headers.set('Cache-Control', 'no-store');
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set('X-Content-Type-Options', 'nosniff');
  if (req && env) {
    for (const [k, v] of corsHeaders(req, env).entries()) headers.set(k, v);
  }
  return new Response(JSON.stringify(body), { ...init, headers });
}

export function badRequest(msg: string, req?: Request, env?: Env): Response {
  return jsonResponse({ error: msg }, { status: 400 }, req, env);
}

export function unauthorized(msg = 'Unauthorized', req?: Request, env?: Env): Response {
  return jsonResponse({ error: msg }, { status: 401 }, req, env);
}

export function forbidden(msg = 'Forbidden', req?: Request, env?: Env): Response {
  return jsonResponse({ error: msg }, { status: 403 }, req, env);
}

export function notFound(msg = 'Not found', req?: Request, env?: Env): Response {
  return jsonResponse({ error: msg }, { status: 404 }, req, env);
}

export function rateLimited(
  msg: string,
  retryAfterSeconds: number,
  req?: Request,
  env?: Env
): Response {
  return jsonResponse(
    { error: msg, retry_after: retryAfterSeconds },
    {
      status: 429,
      headers: { 'Retry-After': String(Math.max(1, Math.ceil(retryAfterSeconds))) },
    },
    req,
    env
  );
}

export function serverError(msg: string, req?: Request, env?: Env): Response {
  return jsonResponse({ error: msg }, { status: 500 }, req, env);
}
