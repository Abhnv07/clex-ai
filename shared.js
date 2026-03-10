/* ============================================================================
   CLEX.IN - SHARED JAVASCRIPT
   ========================================================================== */

const CLEX_NAV_ITEMS = [
  { key: "platform", href: "index.html", label: "Platform" },
  { key: "models", href: "models.html", label: "Models" },
  { key: "docs", href: "docs.html", label: "Docs" },
  { key: "playground", href: "playground.html", label: "Playground" },
  { key: "pricing", href: "pricing.html", label: "Pricing" },
  { key: "support", href: "support.html", label: "Support" },
];

const CLEX_PAGE_BY_FILE = {
  "": "platform",
  "index.html": "platform",
  "models.html": "models",
  "docs.html": "docs",
  "playground.html": "playground",
  "pricing.html": "pricing",
  "support.html": "support",
  "privacy.html": "privacy",
  "terms.html": "terms",
  "login.html": "login",
};

function getCurrentFileName() {
  const path = window.location.pathname || "";
  const file = path.split("/").pop() || "index.html";
  return file;
}

function getCurrentPageKey() {
  return CLEX_PAGE_BY_FILE[getCurrentFileName()] || "platform";
}

function renderNavLinks(activePage) {
  return CLEX_NAV_ITEMS.map((item) => {
    const activeClass = item.key === activePage ? " active" : "";
    return `<a href="${item.href}" class="nav-link${activeClass}">${item.label}</a>`;
  }).join("");
}

function renderAuthActions(options) {
  const isLoggedIn = localStorage.getItem("clex_logged_in") === "true";
  const showAuth = options.showAuth !== "false";
  const ctaHref = options.ctaHref || "docs.html#getting-started";
  const ctaLabel = options.ctaLabel || "Get Started";
  const dashboardHref = options.dashboardHref || "";

  if (!showAuth) {
    return `<a href="${ctaHref}" class="bg-white/10 border border-white/20 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-white hover:text-black transition-all no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400">${ctaLabel}</a>`;
  }

  if (isLoggedIn) {
    return `
      <div class="hidden sm:flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1 text-xs text-gray-300">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
        <span>Signed in</span>
      </div>
      ${
        dashboardHref
          ? `<a href="${dashboardHref}" class="text-sm font-medium text-gray-300 hover:text-white transition-colors no-underline">Dashboard</a>`
          : ""
      }
      <button type="button" data-clex-signout class="text-sm font-medium text-gray-300 hover:text-white transition-colors">Sign Out</button>
      <a href="${ctaHref}" class="bg-white/10 border border-white/20 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-white hover:text-black transition-all no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400">${ctaLabel}</a>
    `;
  }

  return `
    <a href="login.html" class="text-sm font-medium text-gray-400 hover:text-white transition-colors hidden sm:block no-underline">Sign In</a>
    <a href="${ctaHref}" class="bg-white/10 border border-white/20 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-white hover:text-black transition-all no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400">${ctaLabel}</a>
  `;
}

function renderHeader(pageKey, options = {}) {
  return `
    <header id="main-header" class="fixed top-0 w-full z-50 transition-all duration-300 py-6">
      <div class="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 flex items-center justify-between">
        <a href="index.html" class="flex items-center gap-1.5 cursor-pointer no-underline">
          <span class="text-xl font-bold tracking-widest text-white">CLEX</span>
          <div class="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)] animate-pulse"></div>
        </a>
        <nav class="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-1 bg-white/5 border border-white/10 rounded-full p-1 backdrop-blur-md">
          ${renderNavLinks(pageKey)}
        </nav>
        <div class="flex items-center gap-4">
          ${renderAuthActions(options)}
        </div>
      </div>
    </header>
  `;
}

function renderFooter() {
  return `
    <footer class="w-full py-8 border-t border-white/10 bg-[#02050f]/80 backdrop-blur-md z-20 mt-auto relative">
      <div class="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 flex flex-wrap justify-center md:justify-between items-center gap-6 text-sm text-gray-400">
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full bg-white/20"></div>
          <span id="copyright-year"></span> clex.in. All rights reserved.
        </div>
        <div class="flex flex-wrap justify-center items-center gap-6 font-medium">
          <a href="support.html" class="hover:text-cyan-300 transition-colors">Support</a>
          <a href="privacy.html" class="hover:text-cyan-300 transition-colors">Privacy Policy</a>
          <a href="terms.html" class="hover:text-cyan-300 transition-colors">Terms of Service</a>
        </div>
      </div>
    </footer>
  `;
}

window.clex = window.clex || {};
window.clex.renderHeader = renderHeader;
window.clex.renderFooter = renderFooter;

function applySiteChrome() {
  const headerMounts = document.querySelectorAll("[data-clex-header]");
  const footerMounts = document.querySelectorAll("[data-clex-footer]");
  const defaultPage = getCurrentPageKey();

  headerMounts.forEach((mount) => {
    const page = mount.dataset.page || defaultPage;
    mount.outerHTML = renderHeader(page, {
      showAuth: mount.dataset.showAuth,
      ctaHref: mount.dataset.ctaHref,
      ctaLabel: mount.dataset.ctaLabel,
      dashboardHref: mount.dataset.dashboardHref,
    });
  });

  footerMounts.forEach((mount) => {
    mount.outerHTML = renderFooter();
  });

  // Fallback for pages not yet migrated to placeholders.
  if (!headerMounts.length) {
    document.querySelectorAll("header nav").forEach((nav) => {
      nav.innerHTML = renderNavLinks(defaultPage);
    });
  }
}

function syncCopyrightYear() {
  const value = `\u00a9 ${new Date().getFullYear()}`;
  document.querySelectorAll("#copyright-year, [data-clex-year]").forEach((el) => {
    el.textContent = value;
  });
}

function syncModelCountLabels() {
  if (!Array.isArray(window.CLEX_MODELS)) return;
  const count = window.CLEX_MODELS.length;
  const countPlus = `${count}+`;
  const countLabel = `${count}+ models`;

  document.querySelectorAll("[data-model-count]").forEach((el) => {
    el.textContent = String(count);
  });

  document.querySelectorAll("[data-model-count-plus]").forEach((el) => {
    el.textContent = countPlus;
  });

  document.querySelectorAll("[data-model-count-label]").forEach((el) => {
    el.textContent = countLabel;
  });
}

function bindAuthActions() {
  document.querySelectorAll("[data-clex-signout]").forEach((button) => {
    button.addEventListener("click", () => {
      localStorage.removeItem("clex_logged_in");
      window.location.reload();
    });
  });
}

function initHeaderScrollEffect() {
  const header = document.getElementById("main-header");
  if (!header) return;

  const onScroll = () => {
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
  };

  window.addEventListener("scroll", onScroll);
  onScroll();
}

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

// --- Provider Logo Generator ---
function getProviderLogo(provider) {
  const value = String(provider || "").toLowerCase();
  let iconHTML = "";
  let colorClass = "";
  let textName = "";

  switch (value) {
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
    case "deepseek":
    case "deepseek-ai":
    case "deepseek ai":
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
    case "anthropic":
      iconHTML = `<div class="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/50 flex items-center justify-center"><span class="text-amber-400 font-bold text-xs">AI</span></div>`;
      colorClass = "text-amber-400";
      textName = "Anthropic";
      break;
    case "qwen":
      iconHTML = `<div class="w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-500/50 flex items-center justify-center"><div class="w-5 h-5 border-[2px] border-purple-400 rounded-full"></div></div>`;
      colorClass = "text-purple-400";
      textName = "Qwen";
      break;
    default: {
      const initial = (provider || "?").substring(0, 1).toUpperCase();
      iconHTML = `<div class="w-10 h-10 rounded-md bg-gray-800 border border-gray-600 flex items-center justify-center text-lg font-bold text-gray-300">${initial}</div>`;
      colorClass = "text-gray-300";
      textName = String(provider || "Unknown");
    }
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

// --- Streaming SSE helper (OpenAI-style chunks) ---
// Expects lines like: `data: {...}\n\n` and termination `data: [DONE]`
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
          } catch (error) {
            if (onError) onError(error, data);
          }
        }

        boundary = buffer.indexOf("\n\n");
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch (error) {
      // no-op
    }
  }
};

document.addEventListener("DOMContentLoaded", () => {
  applySiteChrome();
  syncCopyrightYear();
  syncModelCountLabels();
  bindAuthActions();
  initFeaturedCards();
  initHeaderScrollEffect();
});

window.addEventListener("load", initAsciiCanvas);
