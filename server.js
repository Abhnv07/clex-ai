// ═══════════════════════════════════════════════════════
// CLEX.IN – NVIDIA API Proxy Server
// ═══════════════════════════════════════════════════════

const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const admin = require('firebase-admin');
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

// Middleware
app.disable('x-powered-by');

app.use(helmet({
    // This project serves some inline scripts/styles in static HTML.
    contentSecurityPolicy: false
}));

app.use(cors({
    origin: (origin, cb) => {
        const allowed = process.env.ALLOWED_ORIGIN;
        if (!origin) return cb(null, true); // curl / same-origin / server-to-server
        if (!allowed) return cb(null, true);
        if (origin === allowed) return cb(null, true);
        return cb(new Error('CORS blocked by ALLOWED_ORIGIN'));
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

// Optional Firebase auth enforcement (ID token verification)
let firebaseReady = false;
try {
    const svcJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (svcJson) {
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
    const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;

    if (!NVIDIA_API_KEY) {
        return res.status(500).json({
            error: 'NVIDIA API key not configured. Set NVIDIA_API_KEY environment variable.'
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

        const nvidiaRes = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${NVIDIA_API_KEY}`
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

        if (!nvidiaRes.ok) {
            const errBody = await nvidiaRes.text();
            let errMsg = errBody;
            try {
                const parsed = JSON.parse(errBody);
                errMsg = parsed.detail || parsed.error?.message || parsed.message || errBody;
            } catch (e) { }
            return res.status(nvidiaRes.status).json({
                error: `NVIDIA API error (${nvidiaRes.status}): ${errMsg}`
            });
        }

        if (shouldStream) {
            // Stream the response via SSE
            res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache, no-transform');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('X-Accel-Buffering', 'no'); // Disable proxy buffering
            res.flushHeaders(); // Ensure headers are sent immediately

            if (nvidiaRes.body) {
                // Use async iteration which is extremely robust in Node 18+ for Web Streams
                const decoder = new TextDecoder();
                try {
                    for await (const chunk of nvidiaRes.body) {
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
            const data = await nvidiaRes.json();
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
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        nvidia_key_configured: !!process.env.NVIDIA_API_KEY,
        timestamp: new Date().toISOString()
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
  ║  NVIDIA API Key: ${process.env.NVIDIA_API_KEY ? '✅ Configured' : '❌ Not set'}       ║
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

        if (!process.env.NVIDIA_API_KEY) {
            console.log('  ⚠️  Set NVIDIA_API_KEY to enable AI chat:');
            console.log('     NVIDIA_API_KEY="nvapi-xxx" node server.js\\n');
        }
    });
}

// Export for Vercel serverless functions
module.exports = app;
