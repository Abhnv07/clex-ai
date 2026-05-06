// ═══════════════════════════════════════════════════════
// CLEX.IN – API Proxy Server
// ═══════════════════════════════════════════════════════

const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');

// firebase-admin is optional – only needed if REQUIRE_AUTH=true
let admin;
try { admin = require('firebase-admin'); } catch (_) { admin = null; }
require('dotenv').config();
const {
    setSSEHeaders,
    writeSSE,
    writeSSEJson,
    writeOpenAIContentDelta,
    writeDone
} = require('./lib/sse');
const { openaiChat } = require('./lib/providers/openai');
const { anthropicMessages } = require('./lib/providers/anthropic');
const { geminiGenerateContent } = require('./lib/providers/gemini');

const app = express();
const PORT = process.env.PORT || 3000;
const isolatedPlaygroundPaths = new Set([
    '/playground',
    '/playground.html',
    '/playground.js',
    '/playground.css',
    '/shared.css',
    '/shared.js'
]);

// Middleware
app.disable('x-powered-by');

app.use((req, res, next) => {
    if (isolatedPlaygroundPaths.has(req.path)) {
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
        res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
        res.setHeader('Origin-Agent-Cluster', '?1');
    }
    next();
});

app.use(helmet({
    // This project serves some inline scripts/styles in static HTML.
    contentSecurityPolicy: false
}));

// CORS allow-list. Single ALLOWED_ORIGIN keeps existing behaviour; a
// comma-separated ALLOWED_ORIGINS allows multiple aliases (api.clex.in,
// api.ai.clex.in, ai.clex.in dashboard etc.). When neither is set we
// fall through and allow everything — same as before.
const corsAllowed = (() => {
    const list = process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || '';
    return list
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
})();

app.use(cors({
    origin: (origin, cb) => {
        if (!origin) return cb(null, true); // curl / same-origin / server-to-server
        if (corsAllowed.length === 0) return cb(null, true);
        if (corsAllowed.includes(origin)) return cb(null, true);
        return cb(new Error('CORS blocked by ALLOWED_ORIGINS'));
    }
}));

app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '1mb' }));

const apiLimiter = rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
    limit: Number(process.env.RATE_LIMIT_MAX || 120),
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api', apiLimiter);

// ─── In-memory metrics ──────────────────────────────────
// Lightweight per-route counters used by /api/admin/usage. clex-ai is
// stateless (no D1 / no DB) so this is the only honest data source we
// have for the LaunchOps admin dashboard. Resets on every cold start;
// that's deliberate — anything more durable would mean adding storage
// just for telemetry.
const metricsBootedAt = Date.now();
const metrics = {
    bootedAt: metricsBootedAt,
    totalRequests: 0,
    perRoute: new Map(), // route -> { total, success, errors, lastSeen, bytesOut, latencySum }
    statusCodes: new Map(), // status -> count
    providerCalls: new Map(), // provider -> { total, errors }
};
function bumpMetric(route, status, latencyMs) {
    metrics.totalRequests += 1;
    const r = metrics.perRoute.get(route) || { total: 0, success: 0, errors: 0, lastSeen: 0, latencySum: 0 };
    r.total += 1;
    if (status >= 400) r.errors += 1;
    else r.success += 1;
    r.lastSeen = Math.floor(Date.now() / 1000);
    r.latencySum += latencyMs || 0;
    metrics.perRoute.set(route, r);
    metrics.statusCodes.set(status, (metrics.statusCodes.get(status) || 0) + 1);
}
function bumpProviderCall(provider, ok) {
    const p = metrics.providerCalls.get(provider) || { total: 0, errors: 0 };
    p.total += 1;
    if (!ok) p.errors += 1;
    metrics.providerCalls.set(provider, p);
}
app.use((req, res, next) => {
    const startedAt = Date.now();
    res.on('finish', () => {
        // Group every per-instance route under its template so we don't
        // explode the map. We only care about the API surface.
        const route = req.baseUrl + (req.route?.path || req.path);
        const norm = route.startsWith('/api') || route.startsWith('/v1') || route.startsWith('/health')
            ? route
            : null;
        if (norm) bumpMetric(norm, res.statusCode, Date.now() - startedAt);
    });
    next();
});

// ─── Admin auth ─────────────────────────────────────────
// Uses CLEX_AI_ADMIN_SECRET (falls back to ADMIN_SECRET if the legacy
// name is set). Constant-time compare. LaunchOps calls these endpoints
// server-to-server; the secret never reaches the browser.
function safeEqual(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    if (a.length !== b.length) return false;
    let mismatch = 0;
    for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return mismatch === 0;
}
function requireAdmin(req, res, next) {
    const expected = process.env.CLEX_AI_ADMIN_SECRET || process.env.ADMIN_SECRET || '';
    if (!expected) return res.status(401).json({ error: 'Unauthorized' });
    const provided = req.get('X-Admin-Secret') || '';
    if (!provided || !safeEqual(provided, expected)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    res.set('Cache-Control', 'private, no-store');
    next();
}

// Optional Firebase auth enforcement (ID token verification)
let firebaseReady = false;
try {
    const svcJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (admin && svcJson) {
        const serviceAccount = JSON.parse(svcJson);
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        firebaseReady = true;
    }
} catch (e) {
    console.warn('[Firebase Admin] Not initialized:', e?.message || e);
}

async function requireFirebaseAuth(req, res, next) {
    if (process.env.REQUIRE_AUTH !== 'true') return next();
    if (!firebaseReady) {
        return res.status(500).json({ error: 'Auth required but Firebase Admin is not configured.' });
    }
    const auth = req.headers.authorization || '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return res.status(401).json({ error: 'Missing Authorization Bearer token.' });
    try {
        const decoded = await admin.auth().verifyIdToken(m[1]);
        req.user = decoded;
        return next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid auth token.' });
    }
}

// Serve static files
app.use(express.static(path.join(__dirname)));

// ─── Chat Completions Proxy ─────────────────────────────
app.post('/api/chat', requireFirebaseAuth, async (req, res) => {
    const headerClexKey = (req.get('x-clex-api-key') || '').trim();
    const bearerMatch = (req.headers.authorization || '').match(/^Bearer\s+(.+)$/i);
    const bearerToken = bearerMatch ? bearerMatch[1].trim() : '';
    const authLooksLikeClexKey = /^clex_/i.test(bearerToken);
    const CLEX_API_KEY =
        headerClexKey ||
        (authLooksLikeClexKey ? bearerToken : '') ||
        process.env.CLEX_API_KEY ||
        process.env.NVIDIA_API_KEY;

    if (!CLEX_API_KEY) {
        return res.status(500).json({
            error: 'CLEX API key not configured. Provide x-clex-api-key or set CLEX_API_KEY (legacy fallback: NVIDIA_API_KEY).'
        });
    }

    // On Vercel, req.body might already be parsed, or it might be stringified
    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) { }
    }

    const chatSchema = z.object({
        model: z.string().min(1),
        messages: z.array(z.object({
            role: z.enum(['system', 'user', 'assistant', 'tool']),
            content: z.string()
        })).min(1),
        temperature: z.number().min(0).max(2).optional(),
        max_tokens: z.number().int().positive().max(32_768).optional(),
        top_p: z.number().min(0).max(1).optional(),
        stream: z.boolean().optional()
    });

    const parsedBody = chatSchema.safeParse(body || {});
    if (!parsedBody.success) {
        return res.status(400).json({
            error: 'Invalid request body.',
            details: parsedBody.error.flatten()
        });
    }

    const { model, messages, temperature, max_tokens, top_p, stream } = parsedBody.data;

    const shouldStream = stream !== false; // Default to streaming

    try {
        const controller = new AbortController();
        const abort = () => {
            try { controller.abort(); } catch (e) { }
        };
        req.on('close', abort);
        req.on('aborted', abort);

        const timeoutMs = Number(process.env.PROVIDER_TIMEOUT_MS || 60_000);
        const timeoutId = setTimeout(abort, timeoutMs);

        const upstreamChatUrl =
            process.env.CLEX_CHAT_COMPLETIONS_URL ||
            (process.env.CLEX_API_KEY
                ? 'https://api.clex.in/v1/chat/completions'
                : 'https://integrate.api.nvidia.com/v1/chat/completions');

        const upstreamRes = await fetch(upstreamChatUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CLEX_API_KEY}`
            },
            signal: controller.signal,
            body: JSON.stringify({
                model,
                messages,
                temperature: temperature ?? 0.7,
                max_tokens: max_tokens ?? 1024,
                top_p: top_p ?? 0.9,
                stream: shouldStream
            })
        });
        clearTimeout(timeoutId);

        if (!upstreamRes.ok) {
            const errBody = await upstreamRes.text();
            let errMsg = errBody;
            try {
                const parsed = JSON.parse(errBody);
                errMsg = parsed.detail || parsed.error?.message || parsed.message || errBody;
            } catch (e) { }
            return res.status(upstreamRes.status).json({
                error: `Upstream provider error (${upstreamRes.status}): ${errMsg}`
            });
        }

        if (shouldStream) {
            // Stream the response via SSE
            setSSEHeaders(res);

            if (upstreamRes.body) {
                // Use async iteration which is extremely robust in Node 18+ for Web Streams
                const decoder = new TextDecoder();
                try {
                    for await (const chunk of upstreamRes.body) {
                        if (res.writableEnded) break;
                        res.write(decoder.decode(chunk, { stream: true }));
                    }
                } catch (streamErr) {
                    if (streamErr?.name !== 'AbortError') {
                        console.error('[Stream Error]', streamErr.message);
                    }
                } finally {
                    res.end();
                }
            } else {
                res.end();
            }
        } else {
            // Non-streaming: return JSON directly
            const data = await upstreamRes.json();
            res.json(data);
        }

    } catch (err) {
        if (err?.name === 'AbortError') {
            // Client disconnected or request aborted.
            if (!res.writableEnded) res.end();
            return;
        }
        console.error('[Server Error]', err.message);
        if (!res.headersSent) {
            res.status(500).json({
                error: `Server error: ${err.message}`
            });
        } else {
            res.end();
        }
    }
});

// ─── Multi-Provider Playground Proxy (BYOK per request) ────────────────
app.post('/api/playground/chat', requireFirebaseAuth, async (req, res) => {
    // On Vercel, req.body might already be parsed, or it might be stringified
    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) { }
    }

    const pgSchema = z.object({
        provider: z.enum(['openai', 'anthropic', 'google', 'nvidia']),
        user_api_key: z.string().min(1),
        model: z.string().min(1),
        messages: z.array(z.object({
            role: z.enum(['system', 'user', 'assistant']),
            content: z.string()
        })).min(1),
        temperature: z.number().min(0).max(2).optional(),
        max_tokens: z.number().int().positive().max(32_768).optional(),
        top_p: z.number().min(0).max(1).optional(),
        stream: z.boolean().optional()
    });

    const parsed = pgSchema.safeParse(body || {});
    if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request body.', details: parsed.error.flatten() });
    }

    const { provider, user_api_key, model, messages, temperature, max_tokens, top_p, stream } = parsed.data;
    const shouldStream = stream !== false;

    const controller = new AbortController();
    const abort = () => {
        try { controller.abort(); } catch (e) { }
    };
    req.on('close', abort);
    req.on('aborted', abort);
    const timeoutMs = Number(process.env.PROVIDER_TIMEOUT_MS || 60_000);
    const timeoutId = setTimeout(abort, timeoutMs);

    try {
        if (shouldStream) setSSEHeaders(res);

        // Provider: NVIDIA (reuse existing env key OR BYOK key)
        if (provider === 'nvidia') {
            const nvidiaKey = user_api_key;
            const upstream = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${nvidiaKey}`
                },
                signal: controller.signal,
                body: JSON.stringify({
                    model,
                    messages,
                    temperature: temperature ?? 0.7,
                    max_tokens: max_tokens ?? 1024,
                    top_p: top_p ?? 0.9,
                    stream: shouldStream
                })
            });

            clearTimeout(timeoutId);

            if (!upstream.ok) {
                const errText = await upstream.text();
                return res.status(upstream.status).json({ error: errText });
            }

            if (!shouldStream) {
                return res.json(await upstream.json());
            }

            const decoder = new TextDecoder();
            for await (const chunk of upstream.body) {
                if (res.writableEnded) break;
                res.write(decoder.decode(chunk, { stream: true }));
            }
            return res.end();
        }

        // Provider: OpenAI/Codex-compatible
        if (provider === 'openai') {
            const upstream = await openaiChat({
                apiKey: user_api_key,
                baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
                signal: controller.signal,
                body: {
                    model,
                    messages,
                    temperature: temperature ?? 0.7,
                    max_tokens: max_tokens ?? 1024,
                    top_p: top_p ?? 0.9,
                    stream: shouldStream
                }
            });

            clearTimeout(timeoutId);

            if (!upstream.ok) {
                const errText = await upstream.text();
                return res.status(upstream.status).json({ error: errText });
            }

            if (!shouldStream) {
                return res.json(await upstream.json());
            }

            // OpenAI streaming is already OpenAI-style SSE; pass-through.
            const decoder = new TextDecoder();
            for await (const chunk of upstream.body) {
                if (res.writableEnded) break;
                res.write(decoder.decode(chunk, { stream: true }));
            }
            return res.end();
        }

        // Provider: Anthropic Claude
        if (provider === 'anthropic') {
            const system = messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n') || undefined;
            const anthropicMessagesArr = messages
                .filter(m => m.role !== 'system')
                .map(m => ({ role: m.role, content: m.content }));

            const upstream = await anthropicMessages({
                apiKey: user_api_key,
                signal: controller.signal,
                body: {
                    model,
                    system,
                    max_tokens: max_tokens ?? 1024,
                    temperature: temperature ?? 0.7,
                    stream: shouldStream,
                    messages: anthropicMessagesArr
                }
            });

            clearTimeout(timeoutId);

            if (!upstream.ok) {
                const errText = await upstream.text();
                return res.status(upstream.status).json({ error: errText });
            }

            if (!shouldStream) {
                const data = await upstream.json();
                const text = (data?.content || []).map(p => p.text || '').join('');
                return res.json({ choices: [{ message: { role: 'assistant', content: text } }] });
            }

            // Parse Anthropic SSE and normalize to OpenAI delta tokens.
            const reader = upstream.body.getReader();
            const decoder = new TextDecoder();
            let buf = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += decoder.decode(value, { stream: true });

                let boundary = buf.indexOf('\n\n');
                while (boundary !== -1) {
                    const evt = buf.slice(0, boundary).trim();
                    buf = buf.slice(boundary + 2);

                    // Anthropic can send `event: ...` and `data: ...`
                    const lines = evt.split('\n');
                    const dataLines = lines.filter(l => l.startsWith('data:'));
                    for (const dl of dataLines) {
                        const raw = dl.slice(5).trim();
                        if (!raw) continue;
                        try {
                            const parsed = JSON.parse(raw);
                            if (parsed?.type === 'content_block_delta') {
                                const t = parsed?.delta?.text;
                                if (t) writeOpenAIContentDelta(res, t);
                            }
                            if (parsed?.type === 'message_stop') {
                                writeDone(res);
                            }
                        } catch (e) {
                            // ignore
                        }
                    }

                    boundary = buf.indexOf('\n\n');
                }
            }
            writeDone(res);
            return res.end();
        }

        // Provider: Google Gemini
        if (provider === 'google') {
            // Gemini expects `contents` with `parts`.
            const contents = messages.map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
            }));
            const upstream = await geminiGenerateContent({
                apiKey: user_api_key,
                model,
                signal: controller.signal,
                body: {
                    contents,
                    generationConfig: {
                        temperature: temperature ?? 0.7,
                        topP: top_p ?? 0.9,
                        maxOutputTokens: max_tokens ?? 1024
                    }
                }
            });

            clearTimeout(timeoutId);

            if (!upstream.ok) {
                const errText = await upstream.text();
                return res.status(upstream.status).json({ error: errText });
            }

            if (!shouldStream) {
                const data = await upstream.json();
                // best-effort normalization
                const text = (data?.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
                return res.json({ choices: [{ message: { role: 'assistant', content: text } }] });
            }

            // Gemini SSE: `data: {...}\n\n`
            const reader = upstream.body.getReader();
            const decoder = new TextDecoder();
            let buf = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += decoder.decode(value, { stream: true });

                let boundary = buf.indexOf('\n\n');
                while (boundary !== -1) {
                    const evt = buf.slice(0, boundary).trim();
                    buf = buf.slice(boundary + 2);
                    const lines = evt.split('\n');
                    for (const line of lines) {
                        if (!line.startsWith('data:')) continue;
                        const raw = line.slice(5).trim();
                        if (!raw || raw === '[DONE]') continue;
                        try {
                            const parsed = JSON.parse(raw);
                            const parts = parsed?.candidates?.[0]?.content?.parts || [];
                            const text = parts.map(p => p.text || '').join('');
                            if (text) writeOpenAIContentDelta(res, text);
                        } catch (e) {
                            // ignore
                        }
                    }
                    boundary = buf.indexOf('\n\n');
                }
            }
            writeDone(res);
            return res.end();
        }

        return res.status(400).json({ error: 'Unsupported provider.' });
    } catch (err) {
        clearTimeout(timeoutId);
        if (err?.name === 'AbortError') {
            if (!res.writableEnded) res.end();
            return;
        }
        if (!shouldStream && !res.headersSent) {
            return res.status(500).json({ error: `Server error: ${err.message}` });
        }
        try {
            writeSSEJson(res, { error: `Server error: ${err.message}` });
            writeDone(res);
        } catch (e) { }
        return res.end();
    }
});

// ─── Health Check ───────────────────────────────────────
// Standardized payload consumed by lnch.in's LaunchOps health probe and
// any external uptime monitor. `/health` and `/v1/health` are aliases so
// every callsite — including OpenAI-compatible clients pointed at /v1 —
// can probe with the same shape.
const healthHandler = (req, res) => {
    res.set('Cache-Control', 'public, max-age=10, s-maxage=30');
    res.json({
        ok: true,
        service: 'clex-ai',
        ts: Math.floor(Date.now() / 1000),
        version: 'phase-1-public-face',
        clex_key_configured: !!(process.env.CLEX_API_KEY || process.env.NVIDIA_API_KEY),
        timestamp: new Date().toISOString(),
    });
};
app.get('/api/health', healthHandler);
app.get('/health', healthHandler);
app.get('/v1/health', healthHandler);

// ─── Public Summary ─────────────────────────────────────
// Tiny, public-safe overview. clex-ai is a stateless gateway so we can
// only publish what's true at boot — no per-key, per-IP, per-model data.
app.get('/api/public/summary', (req, res) => {
    res.set('Cache-Control', 'public, max-age=60, s-maxage=120, stale-while-revalidate=300');
    res.json({
        service: 'clex-ai',
        generatedAt: Math.floor(Date.now() / 1000),
        gateway: {
            type: 'openai-compatible',
            keyConfigured: !!(process.env.CLEX_API_KEY || process.env.NVIDIA_API_KEY),
        },
        endpoints: {
            chatCompletions: '/v1/chat/completions',
            models: '/v1/models',
            health: '/api/health',
        },
    });
});

// ─── Admin: gateway summary ─────────────────────────────
// One-shot read for LaunchOps. Surfaces process info, key/provider
// configuration, and the per-route counters from the in-memory metrics
// middleware.
app.get('/api/admin/summary', requireAdmin, (req, res) => {
    const uptimeMs = Date.now() - metrics.bootedAt;
    const perRoute = Array.from(metrics.perRoute.entries()).map(([route, r]) => ({
        route,
        total: r.total,
        success: r.success,
        errors: r.errors,
        error_rate_pct: r.total > 0 ? Number(((r.errors / r.total) * 100).toFixed(2)) : null,
        last_seen: r.lastSeen,
        avg_latency_ms: r.total > 0 ? Math.round(r.latencySum / r.total) : null,
    })).sort((a, b) => b.total - a.total);
    const statusCodes = Object.fromEntries(metrics.statusCodes.entries());
    const providers = Array.from(metrics.providerCalls.entries()).map(([name, p]) => ({
        provider: name,
        total: p.total,
        errors: p.errors,
        error_rate_pct: p.total > 0 ? Number(((p.errors / p.total) * 100).toFixed(2)) : null,
    }));

    res.json({
        service: 'clex-ai',
        generatedAt: Math.floor(Date.now() / 1000),
        process: {
            booted_at: Math.floor(metrics.bootedAt / 1000),
            uptime_ms: uptimeMs,
            uptime_seconds: Math.floor(uptimeMs / 1000),
            node_version: process.version,
            platform: process.platform,
            memory_rss_mb: Math.round((process.memoryUsage?.().rss || 0) / 1024 / 1024),
        },
        config: {
            clex_key_configured: !!(process.env.CLEX_API_KEY || process.env.NVIDIA_API_KEY),
            firebase_admin_ready: firebaseReady,
            require_auth: process.env.REQUIRE_AUTH === 'true',
            allowed_origin: process.env.ALLOWED_ORIGIN || null,
            allowed_origins: corsAllowed.length ? corsAllowed : null,
            rate_limit_window_ms: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
            rate_limit_max: Number(process.env.RATE_LIMIT_MAX || 120),
            json_body_limit: process.env.JSON_BODY_LIMIT || '1mb',
            providers: {
                openai: !!process.env.OPENAI_API_KEY,
                anthropic: !!process.env.ANTHROPIC_API_KEY,
                gemini: !!process.env.GEMINI_API_KEY,
            },
        },
        metrics: {
            total_requests: metrics.totalRequests,
            per_route: perRoute,
            status_codes: statusCodes,
            providers,
        },
    });
});

// ─── Admin: usage breakdown ─────────────────────────────
// Same shape as /api/admin/summary.metrics but with no surrounding
// process info — handy when LaunchOps just wants a refresh of the
// counters without re-rendering the whole panel.
app.get('/api/admin/usage', requireAdmin, (req, res) => {
    const perRoute = Array.from(metrics.perRoute.entries()).map(([route, r]) => ({
        route,
        total: r.total,
        success: r.success,
        errors: r.errors,
        error_rate_pct: r.total > 0 ? Number(((r.errors / r.total) * 100).toFixed(2)) : null,
        last_seen: r.lastSeen,
        avg_latency_ms: r.total > 0 ? Math.round(r.latencySum / r.total) : null,
    })).sort((a, b) => b.total - a.total);

    res.json({
        service: 'clex-ai',
        generatedAt: Math.floor(Date.now() / 1000),
        booted_at: Math.floor(metrics.bootedAt / 1000),
        total_requests: metrics.totalRequests,
        per_route: perRoute,
        status_codes: Object.fromEntries(metrics.statusCodes.entries()),
        providers: Array.from(metrics.providerCalls.entries()).map(([name, p]) => ({
            provider: name,
            total: p.total,
            errors: p.errors,
            error_rate_pct: p.total > 0 ? Number(((p.errors / p.total) * 100).toFixed(2)) : null,
        })),
    });
});

// ─── Admin: extended health ─────────────────────────────
// Public /api/health stays terse (no auth, cacheable). This admin
// variant adds boot time, provider configuration, memory + process
// info, and per-route hit counts so an operator can tell whether a
// given instance has actually served traffic.
app.get('/api/admin/health', requireAdmin, (req, res) => {
    res.json({
        ok: true,
        service: 'clex-ai',
        ts: Math.floor(Date.now() / 1000),
        version: 'phase-2-admin-api',
        booted_at: Math.floor(metrics.bootedAt / 1000),
        uptime_ms: Date.now() - metrics.bootedAt,
        node_version: process.version,
        platform: process.platform,
        memory_rss_mb: Math.round((process.memoryUsage?.().rss || 0) / 1024 / 1024),
        config: {
            clex_key_configured: !!(process.env.CLEX_API_KEY || process.env.NVIDIA_API_KEY),
            firebase_admin_ready: firebaseReady,
            require_auth: process.env.REQUIRE_AUTH === 'true',
        },
        metrics: {
            total_requests: metrics.totalRequests,
            per_route_count: metrics.perRoute.size,
        },
    });
});

// ─── Admin: audit (process events) ──────────────────────
// clex-ai is stateless, so the only audit-worthy events we have are
// process boot, last admin call, and the recent rate of 4xx/5xx
// responses. Sufficient for LaunchOps to draw a "recent activity" feed.
app.get('/api/admin/audit', requireAdmin, (req, res) => {
    const events = [
        {
            type: 'process.boot',
            ts: Math.floor(metrics.bootedAt / 1000),
            details: {
                node_version: process.version,
                platform: process.platform,
            },
        },
    ];
    for (const [code, count] of metrics.statusCodes.entries()) {
        if (code >= 500) {
            events.push({
                type: 'response.5xx',
                ts: Math.floor(Date.now() / 1000),
                details: { status: code, count },
            });
        }
    }
    res.json({
        service: 'clex-ai',
        generatedAt: Math.floor(Date.now() / 1000),
        events: events.sort((a, b) => b.ts - a.ts),
    });
});

// ─── Support Contact Endpoint ─────────────────────────────
app.post('/api/support/contact', async (req, res) => {
    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) { }
    }

    const contactSchema = z.object({
        name: z.string().trim().min(1).max(120),
        email: z.string().trim().email().max(254),
        message: z.string().trim().min(10).max(5000),
    });

    const parsed = contactSchema.safeParse(body || {});
    if (!parsed.success) {
        return res.status(400).json({
            error: 'Invalid contact payload.',
            details: parsed.error.flatten(),
        });
    }

    const { name, email, message } = parsed.data;
    const preview = message.length > 180 ? `${message.slice(0, 180)}...` : message;
    console.log(`[Support Contact] ${new Date().toISOString()} | ${name} <${email}> | ${preview}`);

    return res.status(202).json({
        ok: true,
        message: 'Support request accepted.',
    });
});

// ─── SPA Fallback ───────────────────────────────────────
app.get('*', (req, res) => {
    // Try to serve the file, or fall back to index.html
    const filePath = path.join(__dirname, req.path);
    res.sendFile(filePath, (err) => {
        if (err) res.sendFile(path.join(__dirname, 'index.html'));
    });
});

// ─── Start Server ───────────────────────────────────────
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`
  ╔═══════════════════════════════════════╗
  ║          CLEX.IN Server v2.0          ║
  ╠═══════════════════════════════════════╣
  ║                                       ║
  ║  🌐  http://localhost:${PORT}            ║
  ║                                       ║
  ║  CLEX API Key: ${(process.env.CLEX_API_KEY || process.env.NVIDIA_API_KEY) ? '✅ Configured' : '❌ Not set'}         ║
  ║                                       ║
  ║  Pages:                               ║
  ║  • Platform  /index.html              ║
  ║  • Models    /models.html             ║
  ║  • Docs      /docs.html              ║
  ║                                       ║
  ║  API:                                 ║
  ║  • POST /api/chat                     ║
  ║  • GET  /api/health                   ║
  ║                                       ║
  ╚═══════════════════════════════════════╝
  `);

        if (!(process.env.CLEX_API_KEY || process.env.NVIDIA_API_KEY)) {
            console.log('  ⚠️  Set CLEX_API_KEY to enable AI chat (or legacy NVIDIA_API_KEY):');
            console.log('     CLEX_API_KEY="clex_xxx" node server.js\\n');
        }
    });
}

// Export for Vercel serverless functions
module.exports = app;
