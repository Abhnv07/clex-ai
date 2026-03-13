# CLEX Backend Implementation Summary

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up database
npx prisma generate
npx prisma migrate dev    # or: npx prisma db push

# 3. (Optional) Seed dev data
npm run db:seed

# 4. Start dev server
npm run dev                # → http://localhost:4000
```

### First API call

```bash
# Create a key (requires Firebase auth token)
curl -X POST http://localhost:4000/v1/keys \
  -H "Authorization: Bearer <firebase-id-token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Key"}'
# → { "key": "clex_abc123...", ... }

# Chat completion
curl http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer clex_abc123..." \
  -H "Content-Type: application/json" \
  -d '{"model":"openai/gpt-4o","messages":[{"role":"user","content":"Hello"}]}'
```

Browse **`/docs`** for the interactive Swagger UI or **`/docs/json`** for the raw OpenAPI spec.

---

## Endpoint Catalog

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | — | Service info + endpoint catalog |
| `GET` | `/v1/health` | — | Health check |
| `GET` | `/v1/health/detailed` | — | Detailed system metrics |
| `GET` | `/v1/health/ping` | — | Load-balancer ping |
| `GET` | `/v1/models` | — | List available models |
| `GET` | `/v1/metrics` | — | Usage metrics |
| `POST` | `/v1/chat/completions` | API Key | Chat completion (streaming + non-streaming) |
| `POST` | `/v1/keys` | Firebase | Create API key (returns raw key once) |
| `GET` | `/v1/keys` | Firebase | List keys (masked) |
| `DELETE` | `/v1/keys/:id` | Firebase | Revoke a key |
| `POST` | `/v1/keys/:id/rotate` | Firebase | Rotate key (create new, revoke old) |
| `GET` | `/v1/keys/:id/events` | Firebase | Audit log for a key |
| `GET` | `/v1/usage` | Firebase | Paginated request logs |
| `GET` | `/v1/analytics` | Firebase | Aggregated analytics |
| `GET` | `/v1/projects` | Firebase | List projects |
| `POST` | `/v1/projects` | Firebase | Create project |
| `PATCH` | `/v1/projects/:id` | Firebase | Update project |
| `DELETE` | `/v1/projects/:id` | Firebase | Archive (soft-delete) project |
| `GET` | `/v1/projects/:id/keys` | Firebase | Keys scoped to project |
| `GET` | `/v1/projects/:id/usage` | Firebase | Usage scoped to project |
| `GET` | `/docs` | — | Swagger UI |
| `GET` | `/docs/json` | — | OpenAPI 3.0 JSON spec |

---

## Architecture

### Stack
- **Runtime**: TypeScript + Express
- **Database**: PostgreSQL via Prisma ORM
- **Cache**: Redis (optional, graceful fallback)
- **Auth**: Firebase Admin SDK (dashboard), bcrypt-hashed API keys (chat)
- **Docs**: swagger-jsdoc + swagger-ui-express

### Prisma Models

| Model | Purpose |
|-------|---------|
| `User` | Account, plan tier, per-user rate limits, monthly token quota |
| `Project` | Grouping container for keys + usage |
| `ApiKey` | Hashed key, prefix, per-key rate limits, project link |
| `KeyEvent` | Audit trail (created / revoked / rotated) |
| `RequestLog` | Per-request log with project + key linkage |
| `UsageRecord` | Daily aggregated usage per user + model |
| `UserQuotaUsage` | Sliding-window counters (minute/hour/day) |

### Middleware Pipeline

```
Request → Helmet → CORS → RequestId → Security → RateLimit
       → Auth (apiKey or firebase) → TokenQuota → Route Handler
       → RecordUsage → ErrorHandler → Response
```

---

## Rate Limiting & Quotas

### Per-user limits (from `User` record)
- `rateLimitPerMinute` (default 60)
- `rateLimitPerHour` (default 1000)
- `rateLimitPerDay` (default 10000)
- `monthlyTokenLimit` (optional)

### Per-key overrides (from `ApiKey` record)
- `maxRequestsPerMinute` — narrows user's per-minute cap
- `maxRequestsPerDay` — narrows user's per-day cap
- `maxTokensPerDay` — daily token budget for this key

When a limit is hit the API returns **429** with headers:

```
X-RateLimit-Limit-Minute: 60
X-RateLimit-Remaining-Minute: 0
X-RateLimit-Reset-Minute: 2025-01-15T12:01:00.000Z
```

Token-quota responses include:

```
X-Quota-Remaining-Tokens: 48200
X-Quota-Reset: 2025-02-01T00:00:00.000Z
```

### Error shape (all errors)

```json
{
  "error": {
    "message": "Rate limit exceeded (60 requests/minute)",
    "type": "rate_limit_error",
    "code": "rate_limit_exceeded",
    "status": 429
  }
}
```

---

## Projects / Workspaces

Projects let users group API keys and track usage per project.

- **Create**: `POST /v1/projects` with `{ "name": "My App", "description": "..." }`
- **Attach key**: `POST /v1/keys` with `{ "name": "Prod", "projectId": "<uuid>" }`
- **View scoped usage**: `GET /v1/projects/:id/usage`
- **Archive**: `DELETE /v1/projects/:id` (soft-delete, keys unlinked)

All request logs automatically record the `projectId` from the API key used.

---

## API Key Management

| Operation | Endpoint | Notes |
|-----------|----------|-------|
| Create | `POST /v1/keys` | Returns raw key **once**. Supports `projectId`, per-key limits. |
| List | `GET /v1/keys` | Masked prefix only. Filter with `?project_id=`. |
| Revoke | `DELETE /v1/keys/:id` | Immediate, irreversible. |
| Rotate | `POST /v1/keys/:id/rotate` | Atomic: new key inherits settings, old key revoked. |
| Audit | `GET /v1/keys/:id/events` | Last 50 events (created, revoked, rotated). |

Key lookup is optimized: the auth middleware filters by `keyPrefix` before bcrypt comparison, reducing comparisons from O(N) to typically O(1).

---

## Testing

```bash
npm test              # Run all tests (vitest)
npm run test:watch    # Watch mode
npm test -- --coverage
```

4 test suites, 21+ tests covering health, models, auth middleware, and provider service.

---

## Environment Variables

```bash
DATABASE_URL=postgresql://...
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
GOOGLE_API_KEY=...
NVIDIA_API_KEY=...
FIREBASE_SERVICE_ACCOUNT_JSON='{...}'
JWT_SECRET=...

# Optional
REDIS_URL=redis://localhost:6379
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
ALLOWED_ORIGINS=http://localhost:5173,https://clex.in
PROVIDER_TIMEOUT_MS=30000
```

---

## npm Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Build dashboard + compile TypeScript |
| `npm start` | Run compiled server |
| `npm test` | Run test suite |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:push` | Push schema to DB (no migration) |
| `npm run db:seed` | Seed dev data |
| `npm run db:studio` | Open Prisma Studio |
| `npm run lint` | Lint source files |
