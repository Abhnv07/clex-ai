# CLEX Developer Dashboard

React dashboard for `api.clex.in/dashboard`.

## What it does

- Signs users in with Firebase Auth
- Calls authenticated dashboard endpoints under `/v1`
- Manages API keys
- Shows usage logs
- Shows analytics and model trends
- Reuses the main CLEX visual shell instead of a separate admin theme

## Local development

```bash
npm install --legacy-peer-deps
cp .env.example .env
npm run dev
```

By default the Vite dev server expects the backend on `http://localhost:4000`.

## Required environment

See `.env.example`.

Important values:

- `VITE_API_BASE_URL`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`

## Build

```bash
npm run build
```

The production build outputs to `../backend/public/dashboard`, which is what the backend and Vercel serve at `/dashboard`.
