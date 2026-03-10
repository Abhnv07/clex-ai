async function geminiGenerateContent({
  apiKey,
  model,
  body,
  signal,
}) {
  const safeModel = encodeURIComponent(model);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${safeModel}:streamGenerateContent?alt=sse&key=${encodeURIComponent(
    apiKey,
  )}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal,
  });
  return res;
}

module.exports = { geminiGenerateContent };

