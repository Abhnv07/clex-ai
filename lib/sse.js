function setSSEHeaders(res) {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  if (typeof res.flushHeaders === "function") res.flushHeaders();
}

function writeSSE(res, data) {
  if (res.writableEnded) return;
  res.write(`data: ${data}\n\n`);
}

function writeSSEJson(res, obj) {
  writeSSE(res, JSON.stringify(obj));
}

function writeOpenAIContentDelta(res, token) {
  writeSSEJson(res, { choices: [{ delta: { content: token } }] });
}

function writeDone(res) {
  writeSSE(res, "[DONE]");
}

module.exports = {
  setSSEHeaders,
  writeSSE,
  writeSSEJson,
  writeOpenAIContentDelta,
  writeDone,
};

