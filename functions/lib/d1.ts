// ═══════════════════════════════════════════════════════════════════════════
// D1 helpers used across routes. Keep all SQL and column names in this file
// (or in the route that owns the query) so we don't drift.
// ═══════════════════════════════════════════════════════════════════════════

import type { Env, UserRow, ApiKeyRow, AdminPasskeyRow, PlanTier } from './types';
import { newId, nowSeconds, utcDayStamp } from './ids';
import { sha256Hex } from './crypto';

export async function getUserByFirebaseUid(
  env: Env,
  uid: string
): Promise<UserRow | null> {
  return env.DB.prepare(`SELECT * FROM users WHERE firebase_uid = ?1`)
    .bind(uid)
    .first<UserRow>();
}

export async function getUserById(env: Env, id: string): Promise<UserRow | null> {
  return env.DB.prepare(`SELECT * FROM users WHERE id = ?1`).bind(id).first<UserRow>();
}

export async function ensureUserFromFirebase(
  env: Env,
  fields: {
    firebase_uid: string;
    email: string | null;
    display_name: string | null;
    last_ip: string | null;
    last_ua: string | null;
  }
): Promise<UserRow> {
  const existing = await getUserByFirebaseUid(env, fields.firebase_uid);
  const ts = nowSeconds();
  if (existing) {
    await env.DB.prepare(
      `UPDATE users SET last_seen_at = ?1, last_ip = ?2, last_ua = ?3,
       email = COALESCE(?4, email), display_name = COALESCE(?5, display_name)
       WHERE id = ?6`
    )
      .bind(ts, fields.last_ip, fields.last_ua, fields.email, fields.display_name, existing.id)
      .run();
    return { ...existing, last_seen_at: ts, last_ip: fields.last_ip, last_ua: fields.last_ua };
  }
  const id = newId();
  await env.DB.prepare(
    `INSERT INTO users (id, firebase_uid, email, display_name, plan_tier,
       plan_started_at, plan_expires_at, is_lifetime, is_admin, is_blocked,
       created_at, last_seen_at, last_ip, last_ua)
     VALUES (?1, ?2, ?3, ?4, 'free', NULL, NULL, 0, 0, 0, ?5, ?5, ?6, ?7)`
  )
    .bind(id, fields.firebase_uid, fields.email, fields.display_name, ts, fields.last_ip, fields.last_ua)
    .run();
  return (await getUserById(env, id)) as UserRow;
}

export async function listUserApiKeys(env: Env, userId: string): Promise<ApiKeyRow[]> {
  const res = await env.DB.prepare(
    `SELECT * FROM api_keys WHERE user_id = ?1 ORDER BY created_at DESC`
  )
    .bind(userId)
    .all<ApiKeyRow>();
  return res.results || [];
}

export async function createApiKeyRow(
  env: Env,
  userId: string,
  name: string,
  keyHash: string,
  keyPrefix: string
): Promise<ApiKeyRow> {
  const id = newId();
  const ts = nowSeconds();
  await env.DB.prepare(
    `INSERT INTO api_keys (id, user_id, name, key_hash, key_prefix, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
  )
    .bind(id, userId, name, keyHash, keyPrefix, ts)
    .run();
  return {
    id,
    user_id: userId,
    name,
    key_hash: keyHash,
    key_prefix: keyPrefix,
    created_at: ts,
    last_used_at: null,
    revoked_at: null,
  };
}

export async function revokeApiKey(
  env: Env,
  userId: string,
  keyId: string
): Promise<boolean> {
  const ts = nowSeconds();
  const res = await env.DB.prepare(
    `UPDATE api_keys SET revoked_at = ?1
     WHERE id = ?2 AND user_id = ?3 AND revoked_at IS NULL`
  )
    .bind(ts, keyId, userId)
    .run();
  return Boolean(res.meta?.changes);
}

// Look up an api key row + its user by raw clex_xxx token. Returns null if
// the token is unknown or revoked.
export async function lookupApiKey(
  env: Env,
  token: string
): Promise<{ key: ApiKeyRow; user: UserRow } | null> {
  const hash = await sha256Hex(token);
  const row = await env.DB.prepare(
    `SELECT k.*, u.id AS u_id, u.firebase_uid AS u_firebase_uid, u.email AS u_email,
            u.display_name AS u_display_name, u.plan_tier AS u_plan_tier,
            u.plan_started_at AS u_plan_started_at, u.plan_expires_at AS u_plan_expires_at,
            u.is_lifetime AS u_is_lifetime, u.is_admin AS u_is_admin,
            u.is_blocked AS u_is_blocked, u.created_at AS u_created_at,
            u.last_seen_at AS u_last_seen_at, u.last_ip AS u_last_ip, u.last_ua AS u_last_ua
       FROM api_keys k
       JOIN users u ON u.id = k.user_id
      WHERE k.key_hash = ?1 AND k.revoked_at IS NULL
      LIMIT 1`
  )
    .bind(hash)
    .first<Record<string, unknown>>();
  if (!row) return null;
  const key: ApiKeyRow = {
    id: String(row.id),
    user_id: String(row.user_id),
    name: String(row.name),
    key_hash: String(row.key_hash),
    key_prefix: String(row.key_prefix),
    created_at: Number(row.created_at),
    last_used_at: row.last_used_at == null ? null : Number(row.last_used_at),
    revoked_at: row.revoked_at == null ? null : Number(row.revoked_at),
  };
  const user: UserRow = {
    id: String(row.u_id),
    firebase_uid: String(row.u_firebase_uid),
    email: row.u_email == null ? null : String(row.u_email),
    display_name: row.u_display_name == null ? null : String(row.u_display_name),
    plan_tier: String(row.u_plan_tier) as PlanTier,
    plan_started_at: row.u_plan_started_at == null ? null : Number(row.u_plan_started_at),
    plan_expires_at: row.u_plan_expires_at == null ? null : Number(row.u_plan_expires_at),
    is_lifetime: Number(row.u_is_lifetime),
    is_admin: Number(row.u_is_admin),
    is_blocked: Number(row.u_is_blocked),
    created_at: Number(row.u_created_at),
    last_seen_at: row.u_last_seen_at == null ? null : Number(row.u_last_seen_at),
    last_ip: row.u_last_ip == null ? null : String(row.u_last_ip),
    last_ua: row.u_last_ua == null ? null : String(row.u_last_ua),
  };
  return { key, user };
}

export async function bumpApiKeyUsage(
  env: Env,
  keyId: string,
  userId: string,
  status: number
): Promise<void> {
  const ts = nowSeconds();
  const day = utcDayStamp(ts);
  const ok = status >= 200 && status < 400 ? 1 : 0;
  const err = ok ? 0 : 1;
  await env.DB.batch([
    env.DB.prepare(`UPDATE api_keys SET last_used_at = ?1 WHERE id = ?2`).bind(ts, keyId),
    env.DB.prepare(
      `INSERT INTO daily_usage (user_id, api_key_id, day, requests, successes, errors)
       VALUES (?1, ?2, ?3, 1, ?4, ?5)
       ON CONFLICT(user_id, api_key_id, day) DO UPDATE SET
         requests = requests + 1,
         successes = successes + ?4,
         errors = errors + ?5`
    ).bind(userId, keyId, day, ok, err),
  ]);
}

export async function logRequest(
  env: Env,
  fields: {
    user_id: string | null;
    api_key_id: string | null;
    route: string;
    status: number;
    model: string | null;
    ip: string | null;
    ua: string | null;
  }
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO request_logs (id, user_id, api_key_id, route, status, model, ip, ua, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`
  )
    .bind(
      newId(),
      fields.user_id,
      fields.api_key_id,
      fields.route,
      fields.status,
      fields.model,
      fields.ip,
      fields.ua,
      nowSeconds()
    )
    .run();
}

export async function logIp(
  env: Env,
  fields: {
    user_id: string | null;
    ip: string | null;
    ua: string | null;
    reason: string;
  }
): Promise<void> {
  if (!fields.ip || !fields.user_id) return;
  await env.DB.prepare(
    `INSERT INTO ip_log (id, user_id, ip, ua, reason, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
  )
    .bind(newId(), fields.user_id, fields.ip, fields.ua, fields.reason, nowSeconds())
    .run();
}

export async function listAdminPasskeys(env: Env): Promise<AdminPasskeyRow[]> {
  const res = await env.DB.prepare(
    `SELECT * FROM admin_passkeys WHERE revoked_at IS NULL ORDER BY created_at DESC`
  ).all<AdminPasskeyRow>();
  return res.results || [];
}

export async function logAdminLogin(
  env: Env,
  fields: {
    method: 'password' | 'passkey';
    result: 'success' | 'failure';
    reason: string | null;
    ip: string | null;
    ua: string | null;
    passkey_id: string | null;
  }
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO admin_login_events
       (id, method, result, reason, ip, ua, passkey_id, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
  )
    .bind(
      newId(),
      fields.method,
      fields.result,
      fields.reason,
      fields.ip,
      fields.ua,
      fields.passkey_id,
      nowSeconds()
    )
    .run();
}
