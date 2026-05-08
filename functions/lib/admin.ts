// ═══════════════════════════════════════════════════════════════════════════
// Admin authentication helpers. Two paths in:
//   1) Password (the CLEX_AI_ADMIN_SECRET, rotated via Cloudflare secrets)
//   2) WebAuthn passkey (registered after a successful password login)
// Both paths produce an admin session in SESSION_KV which subsequent
// /api/admin/* requests carry via the X-Admin-Session header.
// ═══════════════════════════════════════════════════════════════════════════

import type { Env, AdminSession } from './types';
import { newId, nowSeconds } from './ids';
import { getAdminSession, putAdminSession, deleteAdminSession } from './kv';
import { safeEqual } from './crypto';

export const ADMIN_SESSION_HEADER = 'x-admin-session';

export function getSessionId(req: Request): string | null {
  return req.headers.get(ADMIN_SESSION_HEADER);
}

export async function requireAdmin(
  env: Env,
  req: Request
): Promise<{ session: AdminSession } | { error: Response }> {
  const sid = getSessionId(req);
  if (!sid) {
    return {
      error: new Response(JSON.stringify({ error: 'admin_session_required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }
  const sess = await getAdminSession(env, sid);
  if (!sess) {
    return {
      error: new Response(JSON.stringify({ error: 'admin_session_expired' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }
  if (sess.expires_at <= nowSeconds()) {
    await deleteAdminSession(env, sid);
    return {
      error: new Response(JSON.stringify({ error: 'admin_session_expired' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }
  return { session: sess };
}

export function verifyAdminSecret(env: Env, candidate: string): boolean {
  if (!env.CLEX_AI_ADMIN_SECRET) return false;
  if (typeof candidate !== 'string' || candidate.length === 0) return false;
  return safeEqual(env.CLEX_AI_ADMIN_SECRET, candidate);
}

export async function startAdminSession(
  env: Env,
  method: 'password' | 'passkey',
  ip: string | null,
  ua: string | null
): Promise<AdminSession> {
  const session: AdminSession = {
    session_id: newId(),
    created_at: nowSeconds(),
    expires_at: nowSeconds() + 60 * 60 * 8,
    method,
    ip,
    ua,
  };
  await putAdminSession(env, session);
  return session;
}

export async function endAdminSession(env: Env, sid: string): Promise<void> {
  await deleteAdminSession(env, sid);
}
