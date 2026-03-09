// ═══════════════════════════════════════════════════════
// CLEX.IN – NVIDIA API Proxy Server
// ═══════════════════════════════════════════════════════

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname)));

// ─── Chat Completions Proxy ─────────────────────────────
app.post('/api/chat', async (req, res) => {
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

    const { model, messages, temperature, max_tokens, top_p, stream } = body || {};

    if (!model || !messages) {
        return res.status(400).json({
            error: 'Missing required fields: "model" and "messages" are required.'
        });
    }

    const shouldStream = stream !== false; // Default to streaming

    try {
        const nvidiaRes = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${NVIDIA_API_KEY}`
            },
            body: JSON.stringify({
                model,
                messages,
                temperature: temperature ?? 0.7,
                max_tokens: max_tokens ?? 1024,
                top_p: top_p ?? 0.9,
                stream: shouldStream
            })
        });

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
                        res.write(decoder.decode(chunk, { stream: true }));
                    }
                } catch (streamErr) {
                    console.error('[Stream Error]', streamErr.message);
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
        console.error('[Server Error]', err.message);
        res.status(500).json({
            error: `Server error: ${err.message}`
        });
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
