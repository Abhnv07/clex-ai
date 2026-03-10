/* ═══════════════════════════════════════════════════════
   CLEX.IN – SHARED JAVASCRIPT
   ═══════════════════════════════════════════════════════ */

// --- Copyright Year ---
document.addEventListener("DOMContentLoaded", () => {
  const el = document.getElementById("copyright-year");
  if (el) el.textContent = "© " + new Date().getFullYear();
});

// --- Header Scroll Effect ---
(function () {
  const header = document.getElementById("main-header");
  if (!header) return;
  window.addEventListener("scroll", () => {
    if (window.scrollY > 50) {
      header.classList.remove("py-8");
      header.classList.add(
        "bg-[#02050f]/80",
        "backdrop-blur-md",
        "border-b",
        "border-white/10",
        "py-4",
      );
    } else {
      header.classList.add("py-8");
      header.classList.remove(
        "bg-[#02050f]/80",
        "backdrop-blur-md",
        "border-b",
        "border-white/10",
        "py-4",
      );
    }
  });
})();

// --- ASCII Canvas Particle Effect ---
function initAsciiCanvas() {
  const canvas = document.getElementById("ascii-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const chars = ["0", "1", "{", "}", "/", "<", ">", "*", "A", "I"];
  const fontSize = 14;

  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  window.addEventListener("resize", resize);
  resize();

  const noise = (x, y, t) => {
    return (
      Math.sin(x * 0.08 + t) * Math.cos(y * 0.08 + t * 0.8) +
      Math.sin(y * 0.12 - t * 0.4) * Math.cos(x * 0.12 + t * 0.5)
    );
  };

  const render = (time) => {
    const t = time * 0.0005;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    const cols = Math.floor(canvas.width / fontSize);
    const rows = Math.floor(canvas.height / fontSize);
    const cx = canvas.width * 0.7;
    const cy = canvas.height * 0.5;

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const x = i * fontSize + fontSize / 2;
        const y = j * fontSize + fontSize / 2;
        const dx = x - cx;
        const dy = y - cy;
        const headDist = Math.hypot(dx, (dy + canvas.height * 0.15) * 1.2);
        const torsoDist = Math.hypot(dx * 0.8, dy - canvas.height * 0.15);

        let baseIntensity = 0;
        if (headDist < 140) baseIntensity = 1 - headDist / 140;
        else if (torsoDist < 280 && dy > -canvas.height * 0.1)
          baseIntensity = 1 - torsoDist / 280;

        const n = noise(i * 0.5, j * 0.5, t);
        let intensity = baseIntensity + n * 0.35;

        if (intensity <= 0) {
          const auraNoise = noise(i * 0.1, j * 0.1, t * 0.3);
          if (auraNoise > 0.6) intensity = (auraNoise - 0.6) * 0.3;
        }

        if (intensity > 0.05) {
          const charNoise = noise(i * 0.3, j * 0.3, 0);
          const charIdx = Math.floor(Math.abs(charNoise * 20)) % chars.length;
          const char = chars[charIdx];
          const colorNoise = noise(i * 0.1, j * 0.1, t * 0.2);
          let r, g, b;

          if (intensity > 0.8 || colorNoise > 0.7) {
            r = 230;
            g = 255;
            b = 100;
          } else if (intensity > 0.5 || colorNoise > 0.3) {
            r = 80;
            g = 240;
            b = 150;
          } else if (intensity > 0.2) {
            r = 40;
            g = 180;
            b = 255;
          } else {
            r = 20;
            g = 80;
            b = 180;
          }

          const twinkle = (Math.sin(t * 5 + i * 0.2 + j * 0.2) + 1) * 0.5;
          const alpha = Math.min(1, intensity * (0.4 + twinkle * 0.6));
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
          ctx.fillText(char, x, y);
        }
      }
    }
    requestAnimationFrame(render);
  };
  render(0);
}

window.addEventListener("load", initAsciiCanvas);

// --- Provider Logo Generator ---
function getProviderLogo(provider) {
  let iconHTML = "";
  let colorClass = "";
  let textName = "";

  switch (provider.toLowerCase()) {
    case "openai":
      iconHTML = `<div class="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center"><div class="w-4 h-4 bg-emerald-400 rounded-sm rotate-45"></div></div>`;
      colorClass = "text-emerald-400";
      textName = "OpenAI";
      break;
    case "meta":
      iconHTML = `<div class="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center"><div class="w-5 h-2.5 border-2 border-blue-400 rounded-full"></div></div>`;
      colorClass = "text-blue-400";
      textName = "Meta";
      break;
    case "google":
      iconHTML = `<div class="w-10 h-10 rounded-full bg-white/10 border border-white/30 flex items-center justify-center"><span class="text-white font-bold text-lg">G</span></div>`;
      colorClass = "text-white";
      textName = "Google";
      break;
    case "nvidia":
      iconHTML = `<div class="w-10 h-10 bg-green-500/20 border border-green-500/50 flex items-center justify-center rotate-45"><div class="w-4 h-4 bg-green-400"></div></div>`;
      colorClass = "text-green-400";
      textName = "NVIDIA";
      break;
    case "deepseek ai":
    case "deepseek-ai":
      iconHTML = `<div class="w-10 h-10 rounded-lg bg-indigo-500/20 border border-indigo-500/50 flex items-center justify-center"><div class="w-4 h-4 bg-indigo-400 rounded-full"></div></div>`;
      colorClass = "text-indigo-400";
      textName = "DeepSeek";
      break;
    case "mistral ai":
    case "mistralai":
      iconHTML = `<div class="w-10 h-10 rounded-full bg-orange-500/20 border border-orange-500/50 flex items-center justify-center"><span class="text-orange-400 font-bold text-lg">M</span></div>`;
      colorClass = "text-orange-400";
      textName = "Mistral AI";
      break;
    case "qwen":
      iconHTML = `<div class="w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-500/50 flex items-center justify-center"><div class="w-5 h-5 border-[2px] border-purple-400 rounded-full"></div></div>`;
      colorClass = "text-purple-400";
      textName = "Qwen";
      break;
    case "microsoft":
      iconHTML = `<div class="w-10 h-10 rounded-md bg-blue-600/20 border border-blue-500/50 flex items-center justify-center"><div class="w-4 h-4 grid grid-cols-2 gap-0.5"><div class="bg-[#f25022]"></div><div class="bg-[#7fba00]"></div><div class="bg-[#00a4ef]"></div><div class="bg-[#ffb900]"></div></div></div>`;
      colorClass = "text-blue-400";
      textName = "Microsoft";
      break;
    case "ibm":
      iconHTML = `<div class="w-10 h-10 rounded-md bg-blue-800/20 border border-blue-700/50 flex items-center justify-center font-bold text-blue-400 font-serif tracking-tighter">IBM</div>`;
      colorClass = "text-blue-400";
      textName = "IBM";
      break;
    case "bytedance":
      iconHTML = `<div class="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center"><span class="text-red-400 font-bold text-lg">B</span></div>`;
      colorClass = "text-red-400";
      textName = "ByteDance";
      break;
    case "ai21 labs":
    case "ai21":
      iconHTML = `<div class="w-10 h-10 rounded-md bg-amber-500/20 border border-amber-500/50 flex items-center justify-center"><span class="text-amber-400 font-bold text-xs">AI21</span></div>`;
      colorClass = "text-amber-400";
      textName = "AI21 Labs";
      break;
    case "tiiuae":
      iconHTML = `<div class="w-10 h-10 rounded-full bg-sky-500/20 border border-sky-500/50 flex items-center justify-center"><span class="text-sky-400 font-bold text-lg">F</span></div>`;
      colorClass = "text-sky-400";
      textName = "TII UAE";
      break;
    case "baai":
      iconHTML = `<div class="w-10 h-10 rounded-md bg-teal-500/20 border border-teal-500/50 flex items-center justify-center"><span class="text-teal-400 font-bold text-xs">BAAI</span></div>`;
      colorClass = "text-teal-400";
      textName = "BAAI";
      break;
    default:
      const initial = provider.substring(0, 1).toUpperCase();
      iconHTML = `<div class="w-10 h-10 rounded-md bg-gray-800 border border-gray-600 flex items-center justify-center text-lg font-bold text-gray-300">${initial}</div>`;
      colorClass = "text-gray-300";
      textName = provider
        .split(/[-\s]/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
  }

  return { iconHTML, colorClass, textName };
}

// --- Featured Card Mouse Tracking ---
function initFeaturedCards() {
  document.querySelectorAll(".featured-card").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty(
        "--mouse-x",
        ((e.clientX - rect.left) / rect.width) * 100 + "%",
      );
      card.style.setProperty(
        "--mouse-y",
        ((e.clientY - rect.top) / rect.height) * 100 + "%",
      );
    });
  });
}

document.addEventListener("DOMContentLoaded", initFeaturedCards);

// --- Auth State UI Management ---
document.addEventListener("DOMContentLoaded", () => {
  const isLoggedIn = localStorage.getItem("clex_logged_in") === "true";
  const signInLinks = document.querySelectorAll('a[href="login.html"]');

  // Convert Sign In buttons to Dashboard or Sign Out links
  if (isLoggedIn) {
    signInLinks.forEach((link) => {
      // Check if it's the main header link, modify it to a dropdown or Sign Out
      if (link.textContent.trim() === "Sign In") {
        link.textContent = "Dashboard";
        link.href = "#";

        // Add a simple click event to clear storage and "sign out" for now
        // In a real app this would call Firebase auth.signOut()
        link.addEventListener("click", (e) => {
          e.preventDefault();
          if (confirm("Do you want to sign out?")) {
            localStorage.removeItem("clex_logged_in");
            window.location.reload();
          }
        });
      }
    });
  }
});

// --- Streaming SSE helper (OpenAI-style chunks) ---
// Expects lines like: `data: {...}\n\n` and termination `data: [DONE]`
window.clex = window.clex || {};
window.clex.streamChatCompletionsSSE = async function streamChatCompletionsSSE(
  response,
  { onToken, onError, onDone },
) {
  if (!response?.body?.getReader) {
    throw new Error("Streaming not supported in this browser.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const chunk = buffer.slice(0, boundary).trim();
        buffer = buffer.slice(boundary + 2);

        const lines = chunk.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (!data) continue;
          if (data === "[DONE]") {
            if (onDone) onDone();
            continue;
          }
          try {
            const parsed = JSON.parse(data);
            const token = parsed?.choices?.[0]?.delta?.content;
            if (token && onToken) onToken(token, parsed);
          } catch (e) {
            // Ignore parse errors for partial chunks; surface only if callback exists.
            if (onError) onError(e, data);
          }
        }

        boundary = buffer.indexOf("\n\n");
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch (e) {}
  }
};
