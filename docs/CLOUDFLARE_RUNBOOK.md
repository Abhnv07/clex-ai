# Clex AI — Cloudflare ops runbook

Click-by-click steps you (or a teammate) can follow to get every backend
piece of `clex-ai` healthy. Each section is independent — do them in any
order.

> **TL;DR** for first-time setup
>
> 1. [Set the `CLEX_API_KEY` Pages secret](#1-set-clex_api_key-the-nvidia-nim-key) ← unblocks `/api/chat`.
> 2. [Apply the D1 migrations](#2-apply-d1-migrations-clex-ai-database) ← unblocks support form, key creation, usage logging.
> 3. [Add `api.ai.clex.in` as a custom domain](#3-attach-apiai clexin-custom-domain) ← stops the `api.ai.clex.in → ai.clex.in` redirect.
> 4. [Trigger a redeploy](#5-trigger-a-redeploy) and hard-reload the live site.

---

## Glossary

| Thing                | What it is                                                                                          |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| `clex-ai`            | The Cloudflare **Pages** project that serves `ai.clex.in` and `api.ai.clex.in`.                     |
| `clex-ai` D1         | The Cloudflare **D1** database bound to the project as `DB`. Holds users, keys, support messages.  |
| `RATE_LIMIT_KV`      | KV namespace for rate-limit counters and per-day credit totals.                                     |
| `SESSION_KV`         | KV namespace for short-lived admin sessions and passkey challenges.                                |
| `CLEX_API_KEY`       | Server-side **NVIDIA NIM** API key. Never sent to the browser; injected when the Worker calls NVIDIA. |
| Pages secret         | Encrypted env var only readable by the Pages Function runtime (not in the repo, not in the browser). |

---

## 1. Set `CLEX_API_KEY` (the NVIDIA NIM key)

**Why**: Without this secret, `/api/chat` returns the "NVIDIA key missing"
error you saw in the dashboard. Setting it once is enough — it persists
across redeploys.

**Where to get an NVIDIA key**

1. Go to <https://build.nvidia.com>.
2. Log in / sign up (Google or GitHub works).
3. Top-right menu → **API Keys** → **Generate API Key**.
4. Pick "Personal" or "Team", give it a name like `clex-ai-prod`, copy the
   `nvapi-…` value. **NVIDIA only shows it once.**

**Set it on Cloudflare — option A: dashboard (no CLI required)**

1. Open <https://dash.cloudflare.com> → pick your account
   (`caaede3eeaf98e784d6573d4d03abfca` per `wrangler.toml`).
2. Left sidebar → **Workers & Pages**.
3. Click the **clex-ai** project.
4. Tabs at the top → **Settings** → **Variables and Secrets**.
5. **Production** tab.
6. Click **+ Add** → set:
   - **Type:** Encrypted (must be encrypted, not Plaintext).
   - **Variable name:** `CLEX_API_KEY` (exact case, no spaces).
   - **Value:** paste your `nvapi-…` key.
7. Click **Save**.
8. Repeat the **+ Add** flow on the **Preview** tab if you want preview
   deploys to also reach NVIDIA — otherwise previews will return the same
   "key missing" error and that's fine.
9. Trigger a redeploy ([§5](#5-trigger-a-redeploy)) so the running Workers
   pick up the new secret.

**Set it on Cloudflare — option B: CLI**

```bash
npx wrangler pages secret put CLEX_API_KEY --project-name clex-ai
# Wrangler asks "Enter value:" → paste the nvapi-… key, press Enter.
```

If `wrangler` asks you to log in, run `npx wrangler login` first.

**Verify**

```bash
curl https://api.ai.clex.in/api/health
# → {"ok":true,"checks":{"upstream":"ok"}}  (upstream:ok means the key works)
```

If `upstream` is anything else, the key is wrong, expired, or the NVIDIA
account has no quota. Regenerate and re-`put`.

---

## 2. Apply D1 migrations (`clex-ai` database)

**Why**: New tables added since the previous deploy (most recently
`support_messages` from PR #3) need to exist in production or features
500.

**Database id (already in `wrangler.toml`)**: `e6e97690-7a12-4b2c-837b-f7d2216a6e48`

**Where to find migrations**: `migrations/` at the repo root, numbered
`0001_*.sql`, `0002_*.sql`, …

**Apply — option A: dashboard**

1. <https://dash.cloudflare.com> → **Workers & Pages** → **D1** (left sidebar).
2. Click **clex-ai** in the database list.
3. Click **Console** (top tab).
4. Open `migrations/0002_support_messages.sql` (or the latest unapplied file)
   in your editor, copy its contents.
5. Paste into the SQL console, click **Execute**.
6. Repeat for any later migration files.

**Apply — option B: CLI (recommended)**

```bash
# Apply every unapplied migration in ./migrations to the live DB:
npx wrangler d1 migrations apply clex-ai --remote

# Or apply a specific file directly:
npx wrangler d1 execute clex-ai --remote --file=migrations/0002_support_messages.sql
```

**Verify**

```bash
npx wrangler d1 execute clex-ai --remote --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
```

You should see `support_messages` (and `users`, `api_keys`, `usage_log`,
etc.) in the output.

---

## 3. Attach `api.ai.clex.in` (custom domain)

**Why**: Right now `api.ai.clex.in` either has no DNS record or it points
somewhere that 30x-redirects to `ai.clex.in`. Once we attach it as a Pages
custom domain, requests to `api.ai.clex.in/v1/chat/completions` reach the
same Pages Functions as `ai.clex.in/api/chat` (they're aliased in the
codebase).

**Steps**

1. <https://dash.cloudflare.com> → **Workers & Pages** → **clex-ai**.
2. **Custom domains** tab.
3. Click **Set up a custom domain**.
4. Enter `api.ai.clex.in`. Click **Continue**.
5. Cloudflare offers to create the right DNS record. If your `clex.in`
   zone is already on this Cloudflare account, click **Activate domain** —
   that's it.
   - If `clex.in` is on a different Cloudflare account, Cloudflare will
     show you a CNAME target like `clex-ai.pages.dev`. Add this in the
     other account's DNS:
     - Type: **CNAME**
     - Name: `api.ai`
     - Target: `clex-ai.pages.dev`
     - Proxy: **Proxied (orange cloud)**
6. Wait ~30 seconds for the SSL certificate. The status badge goes from
   "Verifying" → "Active".

**Verify**

```bash
curl -I https://api.ai.clex.in/
# → HTTP/2 200, content-type: text/html (the small "Clex AI API" landing
#   served by functions/_middleware.ts)

curl https://api.ai.clex.in/api/health
# → {"ok":true,...}
```

If you still see a 30x redirect to `ai.clex.in`, find and remove any
**Page Rule** or **Bulk Redirect** for `api.ai.clex.in/*`:

1. Cloudflare dash → pick the `clex.in` zone.
2. **Rules** (left sidebar) → **Page Rules** → delete any rule that
   targets `api.ai.clex.in`.
3. **Rules → Redirect Rules** (and **Bulk Redirects**) → same.

---

## 4. Other Pages secrets to confirm

The dashboard / admin / passkey flows need a handful of additional
secrets. They were set during the original setup, but verify them under
**Settings → Variables and Secrets**:

| Name                     | Type      | Required for                           | Example                                                             |
| ------------------------ | --------- | -------------------------------------- | ------------------------------------------------------------------- |
| `CLEX_API_KEY`           | Encrypted | `/api/chat` upstream calls             | `nvapi-…`                                                           |
| `CLEX_AI_ADMIN_SECRET`   | Encrypted | `/admin` password login                | any long random string                                              |
| `WEBAUTHN_RP_ID`         | Plaintext | Admin passkey login                    | `ai.clex.in`                                                        |
| `WEBAUTHN_RP_NAME`       | Plaintext | Admin passkey UI label                 | `Clex AI`                                                           |
| `FIREBASE_SERVICE_ACCOUNT` (optional) | Encrypted | Server-side Firebase ID token verification (else falls back to public JWKS) | the JSON service-account file as a single-line string |

The non-secret variables (`APP_ENV`, `ALLOWED_ORIGINS`, `PUBLIC_APP_URL`,
`PUBLIC_API_URL`, `NVIDIA_UPSTREAM_URL`, `FIREBASE_PROJECT_ID`) are
already declared in `wrangler.toml` and don't need to be set in the
dashboard.

---

## 5. Trigger a redeploy

Cloudflare Pages automatically redeploys on every push to the connected
GitHub repo, so 99% of the time you don't need this. The exceptions:

- You changed a Pages secret (secrets only refresh on a new deploy).
- A previous deploy is stuck or failed.

**Steps**

1. Cloudflare dash → **Workers & Pages** → **clex-ai**.
2. **Deployments** tab.
3. On the most recent successful deployment, three-dot menu →
   **Retry deployment**. (Cloudflare reuses the same git commit.)
4. Watch the **Build logs** open in a side panel. A typical successful
   Pages Functions build looks like `✓ Compiled Worker successfully`.

**Sanity-check after deploy**

```bash
curl -s https://ai.clex.in/api/health | jq
curl -s https://api.ai.clex.in/api/health | jq
curl -s https://ai.clex.in/api/credits/pricing | jq '.tiers'
```

All three should return JSON with `ok: true`.

---

## 6. Switching the GitHub source repo

You're planning to merge into `Abhinavv-007/clex-ai` (a different GitHub
account) and let Cloudflare pick up future commits from there. Two
options:

### A. Re-point the existing `clex-ai` Pages project (recommended)

Keeps your current domain bindings, secrets, KV, and D1 — only the git
source changes.

1. Push the merged `main` to `Abhinavv-007/clex-ai`.
2. Cloudflare dash → **Workers & Pages** → **clex-ai** → **Settings** →
   **Builds & deployments**.
3. **Source** card → **Disconnect** (it's currently connected to
   `Abhnv07/clex-ai`).
4. **Connect** → choose **GitHub** → authorise the
   `Abhinavv-007` account → pick `clex-ai` → branch `main`.
5. Build settings stay the same:
   - Build command: *(leave blank)*
   - Output directory: `public_assets`
   - Root directory: *(leave blank)*
6. Click **Save**. The first deploy from the new source kicks off
   immediately.

### B. Create a brand-new Pages project from `Abhinavv-007/clex-ai`

Use this only if you want the new account to fully own the project.

1. Push the merged `main` to `Abhinavv-007/clex-ai`.
2. Cloudflare dash (you may want to be logged into the new account here
   too, but the same Cloudflare account works fine) →
   **Workers & Pages** → **Create application** → **Pages** → **Connect
   to Git**.
3. Authorise `Abhinavv-007`, pick `clex-ai`, branch `main`.
4. Build settings: same as above (output `public_assets`).
5. **After it deploys**, you'll have a `*.pages.dev` URL. Then:
   - Re-add custom domains `ai.clex.in` and `api.ai.clex.in` per
     [§3](#3-attach-apiai clexin-custom-domain).
   - Re-create all secrets per [§1](#1-set-clex_api_key-the-nvidia-nim-key)
     and [§4](#4-other-pages-secrets-to-confirm).
   - Bind D1 (`clex-ai`) and KV (`RATE_LIMIT_KV`, `SESSION_KV`) under
     **Settings → Functions → Bindings**. The IDs are already in
     `wrangler.toml`.

---

## 7. Common errors and fixes

| Symptom                                                   | Likely cause                                                                  | Fix                                            |
| --------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------- |
| `/api/chat` 500: "NVIDIA key missing"                     | `CLEX_API_KEY` not set on the right env (Production vs Preview)               | [§1](#1-set-clex_api_key-the-nvidia-nim-key)   |
| Support form 500                                          | `support_messages` table missing                                              | [§2](#2-apply-d1-migrations-clex-ai-database)  |
| `api.ai.clex.in` redirects to `ai.clex.in`                | Custom domain not attached or a stale Page Rule / Bulk Redirect exists        | [§3](#3-attach-apiai clexin-custom-domain)     |
| Dashboard "two login screens" / cached old assets         | CDN/browser cache                                                             | Hard-reload (Cmd-Shift-R / Ctrl-Shift-R)       |
| Playground "page is not cross-origin isolated"            | `_headers` not picked up yet                                                  | Trigger a redeploy ([§5](#5-trigger-a-redeploy)), then hard-reload `/playground.html` |
| `wrangler` says "you must select a project"               | Run `npx wrangler pages project list` to confirm `clex-ai` exists, then add `--project-name clex-ai` |  |

---

## 8. Useful commands cheat-sheet

```bash
# List Pages projects on this account
npx wrangler pages project list

# Tail live logs (Production)
npx wrangler pages deployment tail --project-name clex-ai

# Read every secret name that's set (values are never returned)
npx wrangler pages secret list --project-name clex-ai

# Inspect D1 schema
npx wrangler d1 execute clex-ai --remote \
  --command "SELECT name FROM sqlite_master WHERE type='table';"

# Manually purge Cloudflare's edge cache for a path
# (only needed in extreme cases — `_headers` already revalidates HTML quickly)
curl -X POST "https://api.cloudflare.com/client/v4/zones/<zone_id>/purge_cache" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"files":["https://ai.clex.in/playground.html"]}'
```
