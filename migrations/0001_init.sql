-- ═══════════════════════════════════════════════════════════════════════════
-- Clex AI · initial D1 schema.
--
-- Conventions:
--   • integer epoch seconds for every timestamp (no SQLite DATETIME)
--   • snake_case column names, plural table names
--   • all FKs ON DELETE CASCADE unless otherwise noted
--   • plan tier is a TEXT enum: 'free' | 'starter' | 'pro' | 'developer'
--   • duration enum: '1m' | '3m' | '6m' | '1y' | 'lifetime'
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── users ────────────────────────────────────────────────────────────────
-- One row per Firebase user the first time they hit /api/me.
-- `firebase_uid` is the unique identity.
CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,
  firebase_uid    TEXT NOT NULL UNIQUE,
  email           TEXT,
  display_name    TEXT,
  plan_tier       TEXT NOT NULL DEFAULT 'free',
  plan_started_at INTEGER,
  plan_expires_at INTEGER,                  -- NULL = no plan / lifetime if plan_tier != 'free'
  is_lifetime     INTEGER NOT NULL DEFAULT 0,
  is_admin        INTEGER NOT NULL DEFAULT 0,
  is_blocked      INTEGER NOT NULL DEFAULT 0,
  created_at      INTEGER NOT NULL,
  last_seen_at    INTEGER,
  last_ip         TEXT,
  last_ua         TEXT
);
CREATE INDEX IF NOT EXISTS idx_users_email          ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_plan_tier      ON users (plan_tier);
CREATE INDEX IF NOT EXISTS idx_users_last_seen      ON users (last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_plan_expires   ON users (plan_expires_at);

-- ─── api_keys ─────────────────────────────────────────────────────────────
-- Plaintext token (clex_xxx) is shown ONLY at creation time. We store
-- sha256(token) so lookups are constant-time and we never have the secret
-- on disk. `prefix` is the first 12 characters for display.
CREATE TABLE IF NOT EXISTS api_keys (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  name          TEXT NOT NULL DEFAULT 'Default key',
  key_hash      TEXT NOT NULL UNIQUE,        -- sha256(token) hex
  key_prefix    TEXT NOT NULL,               -- e.g. clex_abc1
  created_at    INTEGER NOT NULL,
  last_used_at  INTEGER,
  revoked_at    INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_api_keys_user      ON api_keys (user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_revoked   ON api_keys (revoked_at);

-- ─── plan_changes ─────────────────────────────────────────────────────────
-- Audit trail every time admin upgrades / downgrades a user.
CREATE TABLE IF NOT EXISTS plan_changes (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  from_tier   TEXT,
  to_tier     TEXT NOT NULL,
  duration    TEXT,                          -- '1m' | '3m' | '6m' | '1y' | 'lifetime'
  expires_at  INTEGER,
  changed_by  TEXT NOT NULL DEFAULT 'admin', -- 'admin' or future 'self' / 'webhook'
  changed_ip  TEXT,
  note        TEXT,
  created_at  INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_plan_changes_user ON plan_changes (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plan_changes_time ON plan_changes (created_at DESC);

-- ─── daily_usage ──────────────────────────────────────────────────────────
-- Coarse roll-up so admin can show usage over time without a big logs table.
-- `day` is yyyymmdd as INTEGER (e.g. 20260508).
CREATE TABLE IF NOT EXISTS daily_usage (
  user_id    TEXT NOT NULL,
  api_key_id TEXT,
  day        INTEGER NOT NULL,
  requests   INTEGER NOT NULL DEFAULT 0,
  successes  INTEGER NOT NULL DEFAULT 0,
  errors     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, api_key_id, day),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_daily_usage_day      ON daily_usage (day);
CREATE INDEX IF NOT EXISTS idx_daily_usage_user_day ON daily_usage (user_id, day);

-- ─── request_logs (lite) ──────────────────────────────────────────────────
-- We deliberately do NOT store prompts or completions. This table keeps a
-- short-lived log of each /api/chat hit so admin can see "API Usage" feed.
-- Retention: app code prunes anything older than 90 days.
CREATE TABLE IF NOT EXISTS request_logs (
  id           TEXT PRIMARY KEY,
  user_id      TEXT,
  api_key_id   TEXT,
  route        TEXT NOT NULL,        -- 'POST /api/chat'
  status       INTEGER NOT NULL,
  model        TEXT,
  ip           TEXT,
  ua           TEXT,
  created_at   INTEGER NOT NULL,
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE SET NULL,
  FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_request_logs_time  ON request_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_logs_user  ON request_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_logs_key   ON request_logs (api_key_id, created_at DESC);

-- ─── ip_log ───────────────────────────────────────────────────────────────
-- Signed-in account access by IP and time. Admin uses this to spot abuse.
CREATE TABLE IF NOT EXISTS ip_log (
  id           TEXT PRIMARY KEY,
  user_id      TEXT,
  ip           TEXT NOT NULL,
  ua           TEXT,
  reason       TEXT,                          -- 'login' | 'api_call' | 'dashboard'
  created_at   INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_ip_log_user_time ON ip_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ip_log_time      ON ip_log (created_at DESC);

-- ─── admin_login_events ───────────────────────────────────────────────────
-- Every attempt at /admin (right or wrong). Surfaced as the "Password log"
-- in the admin panel.
CREATE TABLE IF NOT EXISTS admin_login_events (
  id          TEXT PRIMARY KEY,
  method      TEXT NOT NULL,            -- 'password' | 'passkey'
  result      TEXT NOT NULL,            -- 'success' | 'failure'
  reason      TEXT,
  ip          TEXT,
  ua          TEXT,
  passkey_id  TEXT,                     -- references admin_passkeys.id when method='passkey'
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_login_time   ON admin_login_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_login_method ON admin_login_events (method, created_at DESC);

-- ─── admin_passkeys ───────────────────────────────────────────────────────
-- WebAuthn credentials registered to the /admin gate. Registration is
-- only possible while a valid admin-secret session is active.
CREATE TABLE IF NOT EXISTS admin_passkeys (
  id              TEXT PRIMARY KEY,
  credential_id   TEXT NOT NULL UNIQUE,    -- base64url
  public_key      TEXT NOT NULL,           -- base64url COSE
  counter         INTEGER NOT NULL DEFAULT 0,
  transports      TEXT,
  label           TEXT,
  created_at      INTEGER NOT NULL,
  created_ip      TEXT,
  last_used_at    INTEGER,
  last_used_ip    TEXT,
  revoked_at      INTEGER
);
CREATE INDEX IF NOT EXISTS idx_admin_passkeys_active ON admin_passkeys (revoked_at);

-- (no bootstrap rows; FK constraints would reject placeholder user_id)
