# CLEX API Backend

Production backend for `api.clex.in`.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/v1/health` | None | Health check |
| GET | `/v1/models` | None | List available models |
| POST | `/v1/chat/completions` | API Key | OpenAI-style chat completions |
| POST | `/v1/keys` | Firebase | Create API key |
| GET | `/v1/keys` | Firebase | List API keys |
| DELETE | `/v1/keys/:id` | Firebase | Revoke API key |
| GET | `/v1/usage` | Firebase | Request logs |
| GET | `/v1/analytics` | Firebase | Aggregated analytics |
| GET | `/dashboard` | Firebase UI | Serves the dashboard SPA |

## Quick start

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run db:seed
npm run dev
```

## Required environment

See `.env.example`.

Important values:

- `DATABASE_URL`
- `ALLOWED_ORIGINS`
- provider keys like `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`, `NVIDIA_API_KEY`
- `FIREBASE_SERVICE_ACCOUNT_JSON` for dashboard auth verification

## Auth model

### Public API

`POST /v1/chat/completions` expects:

```text
Authorization: Bearer clex_xxx
```

### Dashboard endpoints

`/v1/keys`, `/v1/usage`, and `/v1/analytics` expect:

```text
Authorization: Bearer <firebase-id-token>
```

## Build and test

```bash
npm run build
npm test
```

The build also compiles the sibling dashboard into `backend/public/dashboard` so Vercel can serve `/dashboard` as static assets.

## Production deploy

```bash
npm run build
npx prisma migrate deploy
NODE_ENV=production npm start
```

Build output lands in `backend/public/dashboard`, which Vercel can serve directly.
