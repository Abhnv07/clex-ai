async function openaiChat({
  apiKey,
  baseUrl,
  body,
  signal,
}) {
  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  });
  return res;
}

module.exports = { openaiChat };

