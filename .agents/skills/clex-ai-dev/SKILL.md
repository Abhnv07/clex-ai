---
name: clex-ai-dev
description: Local dev / testing recipe for the clex-ai (ai.clex.in) Cloudflare Pages site. Use this when running the playground or any /api/* endpoints locally, or when refreshing the NVIDIA model catalog.
---

# Clex AI — local dev & testing

## Stack

- Cloudflare Pages project: `clex-ai` (custom domain `ai.clex.in`, `api.ai.clex.in`).
- Static assets: `public_assets/` (Pages serves this directly, no build step).
- Server: `functions/` (Pages Functions, TypeScript, runs on Workers).
- D1 database binding: `DB`  (`clex-ai`, id `e6e97690-7a12-4b2c-837b-f7d2216a6e48`).
- KV bindings: `RATE_LIMIT_KV` (id `d1ca6321922e4aafb420da7021034697`), `SESSION_KV` (id `8eb2197ff88b4d9c919cdafd807cbfcc`).
- Auth: Firebase project `clex-in` (Google sign-in popup). Same config as the dashboard — see `public_assets/dashboard.js`.

## Local dev (wrangler pages dev)

There is **no** `package.json` / `npm install` step. Wrangler is invoked through `npx`.

1. Create `.dev.vars` at the repo root with:

   ```
   CLEX_API_KEY=nvapi-...                    # NVIDIA NIM key
   NVIDIA_UPSTREAM_URL=https://integrate.api.nvidia.com/v1/chat/completions
   ```

   The user provides the NVIDIA key. `.dev.vars` is gitignored.

2. Boot Pages locally:

   ```sh
   npx -y wrangler pages dev public_assets \
     --port 8788 --ip 127.0.0.1 \
     --d1 DB --kv RATE_LIMIT_KV --kv SESSION_KV \
     --compatibility-date 2025-04-01 --compatibility-flag nodejs_compat
   ```

   Wrangler emulates D1 + KV with miniflare so you don't need real Cloudflare credentials. The first boot takes ~15s while it fetches dependencies.

3. Verify:

   ```sh
   curl -sS http://127.0.0.1:8788/api/health           # {"ok":true}
   curl -sS http://127.0.0.1:8788/api/credits/pricing  # 6 tiers (1/2/3/5/10/15)
   curl -sS http://127.0.0.1:8788/playground -I        # 200
   ```

## Cloudflare Pages preview URLs

`clex-ai` only has a `production` environment configured — preview deploys are not auto-built on PRs. To get a preview URL for a PR branch:

```sh
TOKEN="<CF_API_TOKEN>"
ACCT="caaede3eeaf98e784d6573d4d03abfca"
# Trigger a preview deploy for a branch:
curl -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCT/pages/projects/clex-ai/deployments" \
  -H "Authorization: Bearer $TOKEN" \
  -F branch=devin/<your-branch-name>
# Then poll for status:
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/$ACCT/pages/projects/clex-ai/deployments?per_page=10"
```

The deployment URL is `https://<short_id>.clex-ai.pages.dev`.

## NVIDIA model catalog refresh

The authoritative list of models lives in NVIDIA's `/v1/models` endpoint. Refresh the local catalog with:

```sh
curl -sS -H "Authorization: Bearer $CLEX_API_KEY" \
  https://integrate.api.nvidia.com/v1/models > /tmp/nvmodels.json
python3 tools/build-models-data.py /tmp/nvmodels.json > public_assets/models-data.js
# Then regenerate the server-side mirror — the script that builds models-catalog.ts is
# inlined in tools/build-models-data.py's __main__ block.
```

**Always verify** that `MODEL_CREDIT_COST` in `functions/lib/credits.ts` matches the `OVERRIDES` dict in `tools/build-models-data.py` for every model — `wrangler pages dev` will emit 'duplicate-object-key' warnings if you forget to remove an old tier when promoting a model.

Quick check:

```sh
python3 - <<'PY'
import re, sys, importlib.util
spec = importlib.util.spec_from_file_location('bm', 'tools/build-models-data.py')
bm = importlib.util.module_from_spec(spec); spec.loader.exec_module(bm)
src = open('functions/lib/credits.ts').read()
m = re.search(r"MODEL_CREDIT_COST.*?=\s*\{(.*?)\n\};", src, re.S)
ts = {k.lower(): int(c) for k, c in re.findall(r"'([^']+)'\s*:\s*(\d+)", m.group(1))}
mis = [(k, c, ts.get(k.lower(), 1)) for k, (c, _, _) in bm.OVERRIDES.items() if ts.get(k.lower(), 1) != c]
print('Mismatches:', len(mis))
for k, js, t in mis: print(f'  {k}: JS={js} TS={t}')
PY
```

## Cache busters

`public_assets/playground.html` references `playground.css?v=N` / `playground.js?v=N` / `models-data.js?v=N`. Bump these whenever you ship a non-trivial change so users don't get a stale cached copy on `ai.clex.in`.

## Testing the playground locally

- Sign-in flow uses Firebase popup → `gstatic.com` for the SDK. The `_headers` file scopes COOP `same-origin` + COEP `require-corp` to `/playground` (required for WebContainer's SharedArrayBuffer). gstatic ships CORP headers so the popup works.
- Auto-key minting: `playground-auth.js` calls `GET /api/keys` then `POST /api/keys` to mint a key named `playground`. The plaintext is cached in `localStorage` scoped per Firebase UID.
- The model picker is grouped by credit tier (1/2/3/5/10/15). Read `public_assets/playground.js` → `loadModels()` for the grouping logic.
- The drag-handle splitters are `#ide-splitter-files`, `#ide-splitter-chat`, `#ide-splitter-dock`. Sizes are persisted in `localStorage` under `clex.playground.layout.v1`.
- Mobile breakpoint kicks in at ≤ 820 px and uses `body[data-mobile-pane=…]` to swap a single visible pane.

## Common gotchas

- **Duplicate `MODEL_CREDIT_COST` keys**: silent in production but `wrangler pages dev` warns. Always run the local boot before pushing — the warnings fail-fast on these.
- **WebContainer in Safari iOS**: doesn't expose `SharedArrayBuffer`, so 'Boot Sandbox' will fail with a clear error. This is a Safari iOS constraint, not a bug.
- **Don't commit `.dev.vars`** — it has the live NVIDIA upstream key. The `.gitignore` covers it.
- **`/playground.html` 308-redirects to `/playground`** — this is Cloudflare Pages clean-URLs, not a bug.
