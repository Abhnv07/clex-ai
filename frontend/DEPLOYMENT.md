## Deployment guide for `modih.in` temp mail

### 1. Prerequisites

- Cloudflare account with:
  - `modih.in` added as a zone and using Cloudflare DNS.
  - Access to **D1**, **KV**, and **Email Routing**.
- `wrangler` CLI installed locally.

### 2. Create D1 database

```bash
cd frontend
wrangler d1 create modihin-temp-mail
```

Copy the returned `database_id` and update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "modihin-temp-mail"
database_id = "REPLACE_WITH_YOUR_D1_ID"
```

Then apply the initial migration:

```bash
wrangler d1 execute modihin-temp-mail --file=functions/db/migrations/001_init.sql
```

### 3. Create KV namespaces

Create KV namespaces for rate limiting and optional sessions:

```bash
wrangler kv:namespace create RATE_LIMIT_KV
wrangler kv:namespace create SESSION_KV
```

Copy the resulting IDs into `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "REPLACE_WITH_YOUR_RATE_LIMIT_KV_ID"

[[kv_namespaces]]
binding = "SESSION_KV"
id = "REPLACE_WITH_YOUR_SESSION_KV_ID"
```

### 4. Deploy the API + email ingest worker

The `wrangler.toml` in `frontend/` is configured to deploy a Worker that exposes:

- HTTP API at `/api/inboxes` and `/api/inboxes/:id/emails`
- An `email` event handler in `functions/email-ingest.ts` for Cloudflare Email Routing

Build and deploy:

```bash
cd frontend
npm install
npm run build
wrangler deploy
```

Take note of the Worker URL that Cloudflare prints (e.g. `https://modihin-temp-mail.your-account.workers.dev`).

### 5. Configure Cloudflare Pages for the frontend

1. In the Cloudflare dashboard, create a **Pages** project pointing at this repository.
2. Set:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build --prefix frontend`
   - **Output directory**: `frontend/dist`
3. Under **Functions** for the Pages project, ensure that:
   - The `functions/` directory in `frontend/` is enabled as Pages Functions (matching the API endpoints already implemented).
4. Add the same bindings used by the Worker:
   - D1 binding `DB`
   - KV namespace `RATE_LIMIT_KV`
   - Optional `SESSION_KV`

Pages will then serve the React SPA at `https://modih.in` and route `/api/*` to the Functions implementation you already added under `frontend/functions/api`.

### 6. Configure DNS for `modih.in`

- Point the root (`modih.in`) and any desired subdomains (e.g. `www.modih.in`) to the Cloudflare Pages project by:
  - Going to **Pages → (your project) → Custom domains** and adding `modih.in` (and `www.modih.in` if needed).
  - Cloudflare will create the appropriate CNAME/AAAA records for you.

### 7. Configure Cloudflare Email Routing

1. In the `modih.in` zone in Cloudflare, open **Email → Email Routing**.
2. Enable Email Routing if not already enabled.
3. Create a catch-all route:
   - **Custom address**: `*@modih.in`
   - **Destination**: choose **Worker** and select the Worker you deployed from `frontend/wrangler.toml` (`modihin-temp-mail`).
4. Save the rule.

All emails sent to any `*@modih.in` address will now be passed to the `email` event in `functions/email-ingest.ts`, which stores them in D1.

### 8. End-to-end test

Once Pages and the Worker are deployed:

1. Visit `https://modih.in` in a browser.
2. Click **Generate disposable inbox**.
3. Copy the generated `random@modih.in` address.
4. From an external email account, send a test email to that address.
5. Within a few seconds, the email should appear in the right-hand inbox panel, updating automatically every few seconds.
6. Verify:
   - **Copy** button copies the address.
   - **Refresh** reloads the email list.
   - **Delete** marks the inbox as expired (future emails will be rejected).

### 9. Notes on limits and safety

- **Rate limiting**:
  - Inbox creation: max 5 inboxes per IP per 30 minutes.
  - Inbox reads: up to 3 requests per IP+inbox per 5 seconds.
- **HTML sanitization**:
  - The backend strips scripts, iframes, objects, embeds, and event handler attributes from HTML before exposing them to the frontend.
  - `javascript:` and `data:` URLs are blocked in `href`/`src` attributes.
- **Retention**:
  - Inboxes are treated as expired after 30 minutes; you can optionally add a cron-triggered Worker to hard delete old rows based on `expires_at`.

