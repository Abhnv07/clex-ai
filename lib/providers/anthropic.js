async function anthropicMessages({
  apiKey,
  body,
  signal,
}) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": process.env.ANTHROPIC_VERSION || "2023-06-01",
    },
    body: JSON.stringify(body),
    signal,
  });
  return res;
}

module.exports = { anthropicMessages };

