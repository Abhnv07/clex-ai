// Cloudflare Pages middleware. Runs on every request before page assets +
// nested Functions.
//
// Why this exists
// ───────────────
// `api.ai.clex.in` is configured (in dash.cloudflare.com → Pages → clex-ai →
// Custom domains) as a second custom domain that points at the same Pages
// project. Without this middleware, hitting the bare host
// `https://api.ai.clex.in/` would just return the marketing landing
// (`index.html`) — confusing for anyone who lands there expecting an API.
//
// What it does
// ────────────
// 1. If the request hits the API host on the root path, return a small
//    JSON-or-HTML landing that points at the docs and lists the base URL.
// 2. Anything under `/v1/*` or `/api/*` is passed straight through to the
//    matching Pages Function (chat completions, /api/me, etc.).
// 3. Anything else on the API host (e.g. someone visiting
//    `https://api.ai.clex.in/dashboard`) is permanently redirected to the
//    canonical app host so the Firebase auth handler stays on a single
//    origin.
//
// Pure logic — no DNS / Pages-config changes happen here. The actual custom
// domain still has to be wired up in the Cloudflare dashboard; see
// `docs/CLOUDFLARE_RUNBOOK.md` for the click-by-click steps.

interface Env {
  PUBLIC_APP_URL?: string;
  PUBLIC_API_URL?: string;
}

const API_HOSTS = new Set([
  "api.ai.clex.in",
  "api.clex.in", // tolerate both spellings if a CNAME is added later
]);

const APP_HOST_DEFAULT = "https://ai.clex.in";

// Paths that the API host is allowed to serve directly. Everything else is
// redirected to the app host.
const API_PASS_THROUGH = [
  "/v1/",
  "/api/",
  "/.well-known/",
  "/favicon.ico",
  "/robots.txt",
];

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, next, env } = context;
  const url = new URL(request.url);
  const host = url.hostname.toLowerCase();
  const appHost = (env.PUBLIC_APP_URL || APP_HOST_DEFAULT).replace(/\/$/, "");

  if (!API_HOSTS.has(host)) {
    // Normal app-host request — let Pages handle static assets / Functions
    // exactly as before.
    return next();
  }

  // ── API host ──
  // Pass-through API endpoints first.
  if (API_PASS_THROUGH.some((p) => url.pathname === p || url.pathname.startsWith(p))) {
    return next();
  }

  // Root → render a tiny API landing.
  if (url.pathname === "/" || url.pathname === "") {
    return renderApiLanding(request, env);
  }

  // Anything else on the API host (e.g. /dashboard, /pricing, /admin) →
  // 301 to the app host so we don't end up serving two copies of the
  // marketing site on two domains.
  const target = appHost + url.pathname + url.search;
  return Response.redirect(target, 301);
};

function renderApiLanding(request: Request, env: Env): Response {
  const apiBase = (env.PUBLIC_API_URL || "https://api.ai.clex.in").replace(/\/$/, "");
  const appBase = (env.PUBLIC_APP_URL || APP_HOST_DEFAULT).replace(/\/$/, "");
  const accept = request.headers.get("accept") || "";

  // CLI / curl / fetch with `Accept: application/json` → JSON banner.
  if (accept.includes("application/json") && !accept.includes("text/html")) {
    return Response.json(
      {
        service: "Clex AI",
        status: "operational",
        api_base: apiBase + "/v1",
        chat_completions: apiBase + "/v1/chat/completions",
        docs: appBase + "/docs",
        models: appBase + "/models",
        auth: "Bearer clex_*",
        note: "OpenAI-compatible. POST /v1/chat/completions with a JSON body.",
      },
      {
        headers: {
          "cache-control": "public, max-age=60",
          "x-clex-host": "api",
        },
      },
    );
  }

  // Browser → minimal styled HTML landing.
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Clex AI API · ${escapeHtml(new URL(apiBase).hostname)}</title>
  <meta name="robots" content="noindex" />
  <style>
    :root {
      --bg: #0a0a0a;
      --bg-elevated: rgba(255,255,255,0.03);
      --border: rgba(255,255,255,0.08);
      --gold: #c9a96e;
      --text: #ededed;
      --muted: #8a8a8a;
      --mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      --body: 'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; height: 100%; }
    body {
      font-family: var(--body);
      color: var(--text);
      background:
        radial-gradient(circle at 50% -10%, rgba(201,169,110,0.08), transparent 50%),
        var(--bg);
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 40px 20px;
    }
    .card {
      width: 100%;
      max-width: 640px;
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 36px;
      backdrop-filter: blur(12px);
      box-shadow: 0 24px 60px rgba(0,0,0,0.45);
    }
    .eyebrow {
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      font-size: 11px;
      color: var(--muted);
    }
    h1 {
      font-family: 'Playfair Display', serif;
      font-style: italic;
      color: var(--gold);
      font-size: 38px;
      margin: 6px 0 4px;
      line-height: 1.05;
    }
    p { color: var(--muted); margin: 0 0 18px; line-height: 1.55; }
    .row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 14px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: rgba(0,0,0,0.25);
      font-family: var(--mono);
      font-size: 13px;
      color: var(--text);
      margin-bottom: 10px;
      overflow: auto;
    }
    .row .k {
      color: var(--gold);
      min-width: 92px;
      font-size: 11px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .actions {
      display: flex;
      gap: 10px;
      margin-top: 22px;
      flex-wrap: wrap;
    }
    a.btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 16px;
      border-radius: 999px;
      text-decoration: none;
      font-weight: 600;
      font-size: 13px;
      transition: transform 0.15s ease;
    }
    a.btn:hover { transform: translateY(-1px); }
    a.btn.gold {
      background: var(--gold);
      color: #1a1408;
    }
    a.btn.ghost {
      border: 1px solid var(--border);
      color: var(--text);
    }
    pre {
      font-family: var(--mono);
      font-size: 12px;
      background: rgba(0,0,0,0.35);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 14px;
      color: #ddd;
      overflow: auto;
      margin: 18px 0 0;
    }
    .tag {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      background: rgba(201,169,110,0.15);
      color: var(--gold);
      font-size: 10px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin-left: 10px;
      vertical-align: middle;
    }
  </style>
</head>
<body>
  <div class="card">
    <span class="eyebrow">Clex AI</span>
    <h1>API.<span class="tag">operational</span></h1>
    <p>You're on the API host. Endpoints are OpenAI-compatible. Authenticate with a <code>clex_*</code> key from your dashboard.</p>

    <div class="row"><span class="k">Base</span> ${escapeHtml(apiBase)}/v1</div>
    <div class="row"><span class="k">Chat</span> POST ${escapeHtml(apiBase)}/v1/chat/completions</div>
    <div class="row"><span class="k">Health</span> GET ${escapeHtml(apiBase)}/api/health</div>
    <div class="row"><span class="k">Auth</span> Authorization: Bearer clex_********</div>

<pre><code>curl ${escapeHtml(apiBase)}/v1/chat/completions \\
  -H "Authorization: Bearer $CLEX_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "moonshotai/kimi-k2-instruct",
    "messages": [{"role":"user","content":"hello"}]
  }'</code></pre>

    <div class="actions">
      <a class="btn gold" href="${escapeHtml(appBase)}/docs">Read the docs →</a>
      <a class="btn ghost" href="${escapeHtml(appBase)}/dashboard">Dashboard</a>
      <a class="btn ghost" href="${escapeHtml(appBase)}/models">Models &amp; pricing</a>
    </div>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300",
      "x-clex-host": "api",
    },
  });
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[c] || c,
  );
}
