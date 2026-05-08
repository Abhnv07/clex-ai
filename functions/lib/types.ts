// ═══════════════════════════════════════════════════════════════════════════
// Shared types / env shape for Cloudflare Pages Functions.
// Everything here is per-request and read-only at runtime.
// ═══════════════════════════════════════════════════════════════════════════

export interface Env {
  // Bindings (wrangler.toml)
  DB: D1Database;
  RATE_LIMIT_KV: KVNamespace;
  SESSION_KV: KVNamespace;

  // [vars]
  APP_ENV: string;
  ALLOWED_ORIGINS: string;
  PUBLIC_APP_URL: string;
  PUBLIC_API_URL: string;
  NVIDIA_UPSTREAM_URL: string;
  FIREBASE_PROJECT_ID: string;

  // [secrets]
  CLEX_API_KEY?: string;
  CLEX_AI_ADMIN_SECRET?: string;
  WEBAUTHN_RP_ID?: string;
  WEBAUTHN_RP_NAME?: string;
}

export type PlanTier = 'free' | 'starter' | 'pro' | 'developer';
export type PlanDuration = '1m' | '3m' | '6m' | '1y' | 'lifetime';

export interface UserRow {
  id: string;
  firebase_uid: string;
  email: string | null;
  display_name: string | null;
  plan_tier: PlanTier;
  plan_started_at: number | null;
  plan_expires_at: number | null;
  is_lifetime: number;
  is_admin: number;
  is_blocked: number;
  created_at: number;
  last_seen_at: number | null;
  last_ip: string | null;
  last_ua: string | null;
}

export interface ApiKeyRow {
  id: string;
  user_id: string;
  name: string;
  key_hash: string;
  key_prefix: string;
  created_at: number;
  last_used_at: number | null;
  revoked_at: number | null;
}

export interface AdminPasskeyRow {
  id: string;
  credential_id: string;
  public_key: string;
  counter: number;
  transports: string | null;
  label: string | null;
  created_at: number;
  created_ip: string | null;
  last_used_at: number | null;
  last_used_ip: string | null;
  revoked_at: number | null;
}

export interface AdminSession {
  sid: string;
  ip: string | null;
  ua: string | null;
  expires_at: number;
  methods: Array<'password' | 'passkey'>;
}
