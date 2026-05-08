/* ============================================================================
   CLEX.IN – SHARED JAVASCRIPT v3.0
   Cinematic Premium AI Platform
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
  const ctaHref = options.ctaHref || "login.html";
  const ctaLabel = options.ctaLabel || "Get Started";
  const dashboardHref = options.dashboardHref || "/dashboard/";

  if (!showAuth) {
    return `<a href="${ctaHref}" class="text-sm font-medium text-[#888] hover:text-white transition-colors no-underline">${ctaLabel}</a>`;
  }

  if (isLoggedIn) {
    return `
      <div class="hidden xl:flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-full px-3 py-1 text-xs text-[#888]">
        <span class="w-1.5 h-1.5 rounded-full bg-[#c9a96e]"></span>
        <span>Signed in</span>
      </div>
      <a href="${dashboardHref}" class="text-sm font-medium text-[#888] hover:text-white transition-colors no-underline">Dashboard</a>
      <button type="button" data-clex-signout class="text-sm font-medium text-[#888] hover:text-white transition-colors">Sign Out</button>
      <a href="${dashboardHref}" class="text-sm font-medium px-5 py-2 rounded-full bg-white/[0.06] border border-white/[0.08] text-white hover:bg-white/[0.1] hover:border-white/[0.15] transition-all no-underline">Open dashboard</a>
    `;
  }

  return `
    <a href="login.html" class="text-sm font-medium text-[#888] hover:text-white transition-colors hidden sm:block no-underline">Sign In</a>
    <a href="${ctaHref}" class="text-sm font-medium px-5 py-2 rounded-full bg-white/[0.06] border border-white/[0.08] text-white hover:bg-white/[0.1] hover:border-white/[0.15] transition-all no-underline">${ctaLabel}</a>
  `;
}

function renderHeader(pageKey, options = {}) {
  return `
    <header id="main-header" class="fixed top-0 w-full z-50 transition-all duration-500 py-5">
      <div class="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-16 flex items-center justify-between gap-4">
        <div class="flex justify-start min-w-fit">
          <a href="index.html" class="flex items-center gap-2 cursor-pointer no-underline group relative z-10">
            <span class="text-lg font-bold tracking-[0.25em] text-white uppercase" style="font-family:'Inter',sans-serif">CLEX</span>
            <div class="w-1.5 h-1.5 rounded-full bg-[#c9a96e] shadow-[0_0_8px_rgba(201,169,110,0.6)] group-hover:shadow-[0_0_14px_rgba(201,169,110,0.9)] transition-shadow"></div>
          </a>
        </div>
        
        <div class="hidden lg:flex flex-1 justify-center min-w-0 z-0">
          <nav class="flex items-center gap-0.5 bg-white/[0.03] border border-white/[0.06] rounded-full p-1 backdrop-blur-xl whitespace-nowrap overflow-x-auto overflow-y-hidden" style="scrollbar-width: none;">
            ${renderNavLinks(pageKey)}
          </nav>
        </div>
        
        <div class="flex justify-end items-center gap-3 sm:gap-4 shrink-0 relative z-10">
          ${renderAuthActions(options)}
        </div>
      </div>
    </header>
  `;
}

function renderFooter() {
  return `
    <footer class="w-full pt-12 pb-10 border-t border-white/[0.04] bg-[#050505]/95 backdrop-blur-md z-20 mt-auto relative">
      <div class="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-16">
        
        <!-- Top Footer Section -->
        <div class="flex flex-wrap justify-center md:justify-between items-center gap-6 text-sm text-[#555] mb-10">
          <div class="flex flex-col md:flex-row items-center gap-3">
            <span class="text-xs font-bold tracking-[0.25em] text-[#888] uppercase">CLEX</span>
            <span class="text-[#333] hidden md:inline">·</span>
            <span id="copyright-year"></span> ai.clex.in
          </div>
          <div class="flex flex-wrap justify-center items-center gap-8 text-xs tracking-wide uppercase font-medium">
            <a href="support.html" class="hover:text-[#c9a96e] transition-colors no-underline">Support</a>
            <a href="privacy.html" class="hover:text-[#c9a96e] transition-colors no-underline">Privacy</a>
            <a href="terms.html" class="hover:text-[#c9a96e] transition-colors no-underline">Terms</a>
          </div>
        </div>
        
        <!-- Elegant Branding Showcase Section -->
        <div class="pt-8 border-t border-white/[0.04] flex flex-col items-center justify-center gap-6">
          <div class="flex flex-col items-center gap-4 text-center">
            <div class="flex items-center justify-center gap-3">
              <span class="text-sm font-medium tracking-wide text-[#888]">
                A project by <strong class="text-white font-semibold">Abhinav</strong>
              </span>
              <a href="https://www.linkedin.com/in/abhnv07/" target="_blank" rel="noopener noreferrer" class="hover:opacity-80 transition-opacity transform hover:scale-105 duration-200" title="Connect on LinkedIn">
                <!-- Latest LinkedIn Square Logo (Official Blue) -->
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#0A66C2" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
            </div>
            
            <div class="flex flex-wrap justify-center items-center gap-4 sm:gap-6 text-sm">
              <a href="https://abhnv.in" target="_blank" rel="noopener noreferrer" class="text-[#666] hover:text-[#c9a96e] hover:-translate-y-0.5 transition-all duration-300 font-medium no-underline tracking-wide">abhnv.in</a>
              <span class="w-1 h-1 rounded-full bg-white/20 hidden sm:block"></span>
              <a href="https://abhnv.me" target="_blank" rel="noopener noreferrer" class="text-[#666] hover:text-[#c9a96e] hover:-translate-y-0.5 transition-all duration-300 font-medium no-underline tracking-wide">abhnv.me</a>
              <span class="w-1 h-1 rounded-full bg-white/20 hidden sm:block"></span>
              <a href="https://lnch.in" target="_blank" rel="noopener noreferrer" class="text-[#666] hover:text-[#c9a96e] hover:-translate-y-0.5 transition-all duration-300 font-medium no-underline tracking-wide">lnch.in</a>
            </div>
          </div>
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
        "bg-[#050505]/85",
        "backdrop-blur-xl",
        "border-b",
        "border-white/[0.04]",
        "py-3",
      );
    } else {
      header.classList.add("py-8");
      header.classList.remove(
        "bg-[#050505]/85",
        "backdrop-blur-xl",
        "border-b",
        "border-white/[0.04]",
        "py-3",
      );
    }
  };

  window.addEventListener("scroll", onScroll);
  onScroll();
}

// ═══════════════════════════════════════════════════
// 3D DOTTED PARTICLE WAVE – Cursor Responsive
// ═══════════════════════════════════════════════════
function initParticleWave() {
  const canvas = document.getElementById("particle-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let width, height, cols, rows;
  const spacing = 28;
  const dotRadius = 1.2;
  let mouseX = -9999, mouseY = -9999;
  let time = 0;
  let animId;
  const isMobile = /Mobi|Android/i.test(navigator.userAgent) || window.innerWidth < 768;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(width / spacing) + 2;
    rows = Math.ceil(height / spacing) + 2;
  }

  function handleMouse(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
  }

  function handleTouch(e) {
    if (e.touches.length > 0) {
      mouseX = e.touches[0].clientX;
      mouseY = e.touches[0].clientY;
    }
  }

  function handleMouseLeave() {
    mouseX = -9999;
    mouseY = -9999;
  }

  window.addEventListener("resize", resize);
  document.addEventListener("mousemove", handleMouse);
  document.addEventListener("touchmove", handleTouch, { passive: true });
  document.addEventListener("mouseleave", handleMouseLeave);
  resize();

  function render() {
    time += isMobile ? 0.008 : 0.012;
    ctx.clearRect(0, 0, width, height);

    const effectiveCols = isMobile ? Math.ceil(cols * 0.7) : cols;
    const effectiveRows = isMobile ? Math.ceil(rows * 0.7) : rows;
    const effectiveSpacing = isMobile ? spacing * 1.4 : spacing;

    for (let i = 0; i < effectiveCols; i++) {
      for (let j = 0; j < effectiveRows; j++) {
        const baseX = i * effectiveSpacing;
        const baseY = j * effectiveSpacing;

        // 3D wave displacement
        const wave1 = Math.sin(baseX * 0.008 + time * 1.2) * 12;
        const wave2 = Math.cos(baseY * 0.006 + time * 0.8) * 10;
        const wave3 = Math.sin((baseX + baseY) * 0.005 + time * 0.6) * 8;
        const waveZ = wave1 + wave2 + wave3;

        // Perspective projection
        const perspective = 800;
        const scale = perspective / (perspective + waveZ * 2);
        const x = baseX + (baseX - width / 2) * (scale - 1) * 0.3;
        const y = baseY + (baseY - height / 2) * (scale - 1) * 0.3 + waveZ * 0.5;

        // Mouse interaction
        const dx = x - mouseX;
        const dy = y - mouseY;
        const mouseDist = Math.sqrt(dx * dx + dy * dy);
        const mouseRadius = isMobile ? 120 : 180;
        const mouseInfluence = Math.max(0, 1 - mouseDist / mouseRadius);

        // Base opacity from wave height
        const normalizedZ = (waveZ + 30) / 60;
        let alpha = 0.08 + normalizedZ * 0.2;

        // Brighter near cursor
        alpha += mouseInfluence * 0.5;
        alpha = Math.min(alpha, 0.7);

        // Size variation
        let r = dotRadius * scale;
        r += mouseInfluence * 2;

        // Color: warm gold tint near cursor, cool white-gray far away
        let red, green, blue;
        if (mouseInfluence > 0.01) {
          // Gold/amber near cursor
          red = Math.round(201 + mouseInfluence * 54);
          green = Math.round(169 + mouseInfluence * 50);
          blue = Math.round(110 + mouseInfluence * 20);
        } else {
          // Brighter cool white/gray
          const brightness = 140 + normalizedZ * 80;
          red = Math.round(brightness);
          green = Math.round(brightness);
          blue = Math.round(brightness + 15);
        }

        ctx.beginPath();
        ctx.arc(x, y, Math.max(0.3, r), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${red},${green},${blue},${alpha})`;
        ctx.fill();
      }
    }

    animId = requestAnimationFrame(render);
  }

  render();

  // Cleanup on page hide
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(animId);
    } else {
      render();
    }
  });
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
  document.querySelectorAll(".featured-card, .glass-card").forEach((card) => {
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

// --- Inject noise overlay ---
function injectNoiseOverlay() {
  if (document.querySelector('.noise-overlay')) return;
  const div = document.createElement('div');
  div.className = 'noise-overlay';
  document.body.appendChild(div);
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
  injectNoiseOverlay();
});

window.addEventListener("load", initParticleWave);
