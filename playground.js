import { WebContainer } from "https://unpkg.com/@webcontainer/api@1.5.1/dist/index.js?module";

import { EditorView, basicSetup } from "https://esm.sh/@codemirror/basic-setup@0.20.0";
import { EditorState } from "https://esm.sh/@codemirror/state@6.5.2";
import { oneDark } from "https://esm.sh/@codemirror/theme-one-dark@6.1.2";
import { javascript } from "https://esm.sh/@codemirror/lang-javascript@6.2.4";
import { html } from "https://esm.sh/@codemirror/lang-html@6.4.11";
import { css } from "https://esm.sh/@codemirror/lang-css@6.3.1";

const $ = (id) => document.getElementById(id);

// Tabs
const tabBuilder = $("tab-builder");
const tabLLM = $("tab-llm");
const tabAIAssist = $("tab-ai-assist");
const builderView = $("builder-view");
const llmView = $("llm-view");
const aiAssistView = $("ai-assist-view");

const allTabs = [tabBuilder, tabLLM, tabAIAssist];
const allViews = { builder: builderView, llm: llmView, "ai-assist": aiAssistView };

function setTab(tab) {
  allTabs.forEach((t) => t.classList.remove("active"));
  Object.values(allViews).forEach((v) => { if (v) v.classList.add("hidden"); });
  if (tab === "builder") { tabBuilder.classList.add("active"); builderView.classList.remove("hidden"); }
  else if (tab === "llm") { tabLLM.classList.add("active"); llmView.classList.remove("hidden"); }
  else if (tab === "ai-assist" && aiAssistView) { tabAIAssist.classList.add("active"); aiAssistView.classList.remove("hidden"); }
}
tabBuilder.addEventListener("click", () => setTab("builder"));
tabLLM.addEventListener("click", () => setTab("llm"));
if (tabAIAssist) tabAIAssist.addEventListener("click", () => setTab("ai-assist"));

// Simple auth indicator (matches existing site behavior)
(() => {
  const pill = $("pg-auth-pill");
  const signedIn = localStorage.getItem("clex_logged_in") === "true";
  if (pill && signedIn) pill.classList.remove("hidden");
})();

// -----------------------------------------------------------------------------
// Templates
// -----------------------------------------------------------------------------
const templates = {
  static: {
    files: {
      "package.json": JSON.stringify(
        {
          name: "clex-static",
          private: true,
          version: "0.0.0",
          scripts: {
            dev: "npx --yes serve -l 5173 .",
          },
        },
        null,
        2,
      ),
      "index.html": `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Static Template</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <div class="app">
      <h1>Static template</h1>
      <p>Edit <code>index.html</code>, <code>styles.css</code>, and <code>main.js</code>.</p>
      <button id="btn">Click</button>
      <pre id="out"></pre>
    </div>
    <script type="module" src="./main.js"></script>
  </body>
</html>
`,
      "styles.css": `:root { color-scheme: dark; }
body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; background:#02050f; color:#e5e7eb; }
.app { max-width: 960px; margin: 0 auto; padding: 32px; }
button { background: rgba(34,211,238,.15); color:#22d3ee; border:1px solid rgba(34,211,238,.35); padding:10px 14px; border-radius:12px; cursor:pointer; }
button:hover{ background: rgba(34,211,238,.22); }
code { color:#67e8f9; }
pre { margin-top: 16px; padding: 12px; background: rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.08); border-radius: 12px; }
`,
      "main.js": `const out = document.getElementById('out');
document.getElementById('btn').addEventListener('click', () => {
  out.textContent = 'Hello from WebContainer at ' + new Date().toLocaleTimeString();
});
`,
    },
    entry: "index.html",
  },
  "vite-react": {
    files: {
      "package.json": JSON.stringify(
        {
          name: "clex-vite-react",
          private: true,
          version: "0.0.0",
          type: "module",
          scripts: {
            dev: "vite --host 0.0.0.0 --port 5173",
            build: "vite build",
            preview: "vite preview --host 0.0.0.0 --port 5173",
          },
          dependencies: {
            react: "^18.3.1",
            "react-dom": "^18.3.1",
          },
          devDependencies: {
            vite: "^6.0.0",
            "@vitejs/plugin-react": "^4.3.4",
          },
        },
        null,
        2,
      ),
      "vite.config.js": `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({ plugins: [react()] })
`,
      "index.html": `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vite + React</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`,
      "src/main.jsx": `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './style.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`,
      "src/App.jsx": `export default function App() {
  return (
    <div className="app">
      <h1>Vite + React template</h1>
      <p>Edit <code>src/App.jsx</code> and see live updates.</p>
    </div>
  )
}
`,
      "src/style.css": `:root { color-scheme: dark; }
body { margin:0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; background:#02050f; color:#e5e7eb; }
.app { max-width: 960px; margin: 0 auto; padding: 32px; }
code { color:#67e8f9; }
`,
    },
    entry: "src/App.jsx",
  },
  vue: {
    files: {
      "package.json": JSON.stringify({ name: "clex-vue", private: true, version: "0.0.0", type: "module", scripts: { dev: "vite --host 0.0.0.0 --port 5173" }, dependencies: { vue: "^3.5.0" }, devDependencies: { vite: "^6.0.0", "@vitejs/plugin-vue": "^5.2.0" } }, null, 2),
      "vite.config.js": `import { defineConfig } from 'vite'\nimport vue from '@vitejs/plugin-vue'\nexport default defineConfig({ plugins: [vue()] })\n`,
      "index.html": `<!doctype html>\n<html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /><title>Vue</title></head><body><div id="app"></div><script type="module" src="/src/main.js"></script></body></html>\n`,
      "src/main.js": `import { createApp } from 'vue'\nimport App from './App.vue'\ncreateApp(App).mount('#app')\n`,
      "src/App.vue": `<template>\n  <div class="app">\n    <h1>Vue Template</h1>\n    <p>Edit <code>src/App.vue</code> and see live updates.</p>\n    <button @click="count++">Count: {{ count }}</button>\n  </div>\n</template>\n<script setup>\nimport { ref } from 'vue'\nconst count = ref(0)\n</script>\n<style>\n:root { color-scheme: dark; }\nbody { margin:0; font-family: system-ui; background:#02050f; color:#e5e7eb; }\n.app { max-width:960px; margin:0 auto; padding:32px; }\nbutton { background:rgba(34,211,238,.15); color:#22d3ee; border:1px solid rgba(34,211,238,.35); padding:10px 14px; border-radius:12px; cursor:pointer; }\ncode { color:#67e8f9; }\n</style>\n`,
    },
    entry: "src/App.vue",
  },
  svelte: {
    files: {
      "package.json": JSON.stringify({ name: "clex-svelte", private: true, version: "0.0.0", type: "module", scripts: { dev: "vite --host 0.0.0.0 --port 5173" }, devDependencies: { vite: "^6.0.0", "@sveltejs/vite-plugin-svelte": "^4.0.0", svelte: "^4.2.0" } }, null, 2),
      "vite.config.js": `import { defineConfig } from 'vite'\nimport { svelte } from '@sveltejs/vite-plugin-svelte'\nexport default defineConfig({ plugins: [svelte()] })\n`,
      "index.html": `<!doctype html>\n<html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /><title>Svelte</title></head><body><div id="app"></div><script type="module" src="/src/main.js"></script></body></html>\n`,
      "src/main.js": `import App from './App.svelte'\nconst app = new App({ target: document.getElementById('app') })\nexport default app\n`,
      "src/App.svelte": `<script>\n  let count = 0\n</script>\n<main class="app">\n  <h1>Svelte Template</h1>\n  <p>Edit <code>src/App.svelte</code> and see live updates.</p>\n  <button on:click={() => count++}>Count: {count}</button>\n</main>\n<style>\n  :global(body) { margin:0; font-family:system-ui; background:#02050f; color:#e5e7eb; }\n  .app { max-width:960px; margin:0 auto; padding:32px; }\n  button { background:rgba(34,211,238,.15); color:#22d3ee; border:1px solid rgba(34,211,238,.35); padding:10px 14px; border-radius:12px; cursor:pointer; }\n  code { color:#67e8f9; }\n</style>\n`,
    },
    entry: "src/App.svelte",
  },
  typescript: {
    files: {
      "package.json": JSON.stringify({ name: "clex-ts", private: true, version: "0.0.0", type: "module", scripts: { dev: "vite --host 0.0.0.0 --port 5173" }, devDependencies: { vite: "^6.0.0", typescript: "^5.7.0" } }, null, 2),
      "vite.config.js": `import { defineConfig } from 'vite'\nexport default defineConfig({})\n`,
      "index.html": `<!doctype html>\n<html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /><title>TypeScript</title><link rel="stylesheet" href="/src/style.css" /></head><body><div id="app"></div><script type="module" src="/src/main.ts"></script></body></html>\n`,
      "src/main.ts": `const app = document.getElementById('app')!\n\ninterface Counter {\n  count: number\n  increment(): void\n}\n\nconst counter: Counter = {\n  count: 0,\n  increment() { this.count++; render(); }\n}\n\nfunction render() {\n  app.innerHTML = \`\n    <div class="app">\n      <h1>TypeScript Template</h1>\n      <p>Edit <code>src/main.ts</code> with full type safety.</p>\n      <button id="btn">Count: \${counter.count}</button>\n    </div>\n  \`\n  document.getElementById('btn')?.addEventListener('click', () => counter.increment())\n}\nrender()\n`,
      "src/style.css": `:root { color-scheme: dark; }\nbody { margin:0; font-family:system-ui; background:#02050f; color:#e5e7eb; }\n.app { max-width:960px; margin:0 auto; padding:32px; }\nbutton { background:rgba(34,211,238,.15); color:#22d3ee; border:1px solid rgba(34,211,238,.35); padding:10px 14px; border-radius:12px; cursor:pointer; }\ncode { color:#67e8f9; }\n`,
      "tsconfig.json": JSON.stringify({ compilerOptions: { target: "ES2022", module: "ESNext", strict: true } }, null, 2),
    },
    entry: "src/main.ts",
  },
};

// -----------------------------------------------------------------------------
// WebContainer builder
// -----------------------------------------------------------------------------
const bootBtn = $("boot-btn");
const installBtn = $("install-btn");
const runBtn = $("run-btn");
const saveBtn = $("save-btn");
const templateSelect = $("template-select");
const fileTree = $("file-tree");
const logsEl = $("logs");
const clearLogsBtn = $("clear-logs");
const previewFrame = $("preview-frame");
const previewUrlEl = $("preview-url");
const activeFileLabel = $("active-file-label");

let wc = null;
let editorView = null;
let activePath = null;
let rotated = false;
let currentDevice = "desktop";
let deviceSize = { w: null, h: null };

function getSandboxReadinessIssues() {
  const issues = [];

  if (!window.isSecureContext) {
    issues.push("This page must be served over HTTPS or localhost.");
  }

  if (!window.crossOriginIsolated) {
    issues.push("This page is not cross-origin isolated yet. It needs COOP/COEP headers.");
  }

  if (!("SharedArrayBuffer" in window)) {
    issues.push("This browser session does not expose SharedArrayBuffer.");
  }

  return issues;
}

function log(line) {
  logsEl.textContent += (logsEl.textContent.endsWith("\n") ? "" : "\n") + line;
  logsEl.scrollTop = logsEl.scrollHeight;
}

const newFileBtn = $("new-file-btn");
const delFileBtn = $("del-file-btn");
let fileList = [];

function setButtons({ booted }) {
  installBtn.disabled = !booted;
  runBtn.disabled = !booted;
  saveBtn.disabled = !booted || !activePath;
  if (newFileBtn) newFileBtn.disabled = !booted;
  if (delFileBtn) delFileBtn.disabled = !booted || !activePath;
}

function detectLang(path) {
  if (!path) return javascript();
  if (path.endsWith(".html")) return html();
  if (path.endsWith(".css")) return css();
  if (path.endsWith(".js") || path.endsWith(".jsx") || path.endsWith(".ts") || path.endsWith(".tsx")) return javascript({ jsx: true });
  return javascript();
}

function initEditor() {
  const parent = $("editor");
  parent.innerHTML = "";

  const state = EditorState.create({
    doc: "",
    extensions: [
      basicSetup,
      oneDark,
      EditorView.updateListener.of((v) => {
        if (v.docChanged) {
          // enable save if any
          saveBtn.disabled = !wc || !activePath;
        }
      }),
    ],
  });

  editorView = new EditorView({ state, parent });
}

function setEditorDoc(text, path) {
  if (!editorView) initEditor();
  const langExt = detectLang(path);
  const newState = EditorState.create({
    doc: text,
    extensions: [
      basicSetup,
      oneDark,
      langExt,
      EditorView.updateListener.of(() => { }),
    ],
  });
  editorView.setState(newState);
}

async function mountTemplate(templateKey) {
  const t = templates[templateKey];
  const tree = {};
  for (const [filePath, content] of Object.entries(t.files)) {
    tree[filePath] = { file: { contents: content } };
  }
  await wc.mount(tree);
  renderFileTree(Object.keys(t.files).sort());
  await openFile(t.entry);
  previewFrame.src = "about:blank";
  previewUrlEl.textContent = "Preview URL: (not running)";
}

function getFileIcon(path) {
  if (path.endsWith('.html')) return '🌐';
  if (path.endsWith('.css')) return '🎨';
  if (path.endsWith('.js') || path.endsWith('.jsx')) return '⚡';
  if (path.endsWith('.ts') || path.endsWith('.tsx')) return '🔷';
  if (path.endsWith('.vue')) return '💚';
  if (path.endsWith('.svelte')) return '🔶';
  if (path.endsWith('.json')) return '📋';
  return '📄';
}

function renderFileTree(paths) {
  fileTree.innerHTML = "";
  fileList = paths;
  for (const p of paths) {
    const btn = document.createElement("button");
    const isActive = p === activePath;
    btn.className = `text-left px-3 py-2 rounded-lg border transition-all flex items-center gap-2 ${
      isActive ? 'border-cyan-500/40 bg-cyan-500/8 text-cyan-300' : 'border-white/5 bg-white/0 hover:bg-white/5 hover:border-cyan-500/30 text-gray-200'
    }`;
    btn.innerHTML = `<span class="text-xs">${getFileIcon(p)}</span><span class="truncate">${p}</span>`;
    btn.addEventListener("click", () => openFile(p));
    fileTree.appendChild(btn);
  }
}

async function openFile(path) {
  if (!wc) return;
  activePath = path;
  setButtons({ booted: true });
  activeFileLabel.textContent = path;
  const contents = await wc.fs.readFile(path, "utf-8");
  setEditorDoc(contents, path);
}

async function saveFile() {
  if (!wc || !activePath || !editorView) return;
  const text = editorView.state.doc.toString();
  await wc.fs.writeFile(activePath, text);
  log(`[saved] ${activePath}`);
}

async function runCommand(cmd, args) {
  if (!wc) return;
  log(`$ ${cmd} ${args.join(" ")}`);
  const proc = await wc.spawn(cmd, args);
  proc.output.pipeTo(
    new WritableStream({
      write(data) {
        log(data.toString().replace(/\n$/, ""));
      },
    }),
  );
  const exitCode = await proc.exit;
  log(`[exit ${exitCode}] ${cmd}`);
  return exitCode;
}

function logSandboxReadiness() {
  const issues = getSandboxReadinessIssues();
  if (!issues.length) {
    log("Sandbox environment check passed.");
    return;
  }

  log("Sandbox environment check failed:");
  for (const issue of issues) {
    log(`- ${issue}`);
  }
  log("WebContainers need cross-origin isolation. If this is production, redeploy after the COOP/COEP header changes.");
}

logSandboxReadiness();

bootBtn.addEventListener("click", async () => {
  if (wc) return;
  logsEl.textContent = "";
  logSandboxReadiness();

  const readinessIssues = getSandboxReadinessIssues();
  if (readinessIssues.length) {
    bootBtn.disabled = false;
    bootBtn.innerHTML = `<span class="w-2 h-2 rounded-full bg-black/70"></span> Boot Sandbox`;
    return;
  }

  log("Booting WebContainer...");
  bootBtn.disabled = true;
  bootBtn.textContent = "Booting...";

  try {
    // Add a 30-second timeout to prevent infinite hang
    const bootPromise = WebContainer.boot();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Boot timed out after 30 seconds. WebContainers require a modern browser with SharedArrayBuffer support (Chrome/Edge). Try refreshing or using a supported browser.")), 30000)
    );
    wc = await Promise.race([bootPromise, timeoutPromise]);
    initEditor();
    setButtons({ booted: true });
    wc.on("server-ready", (port, url) => {
      previewFrame.src = url;
      previewUrlEl.textContent = `Preview URL: ${url}`;
    });
    await mountTemplate(templateSelect.value);
    log("Sandbox ready. Run npm install, then npm run dev.");
  } catch (err) {
    log(`[Error] Failed to boot WebContainer: ${err.message}`);
    log("WebContainers require SharedArrayBuffer support.");
    log("Make sure you are using Chrome or Edge, and the page is served with proper COOP/COEP headers.");
    wc = null;
    setButtons({ booted: false });
  } finally {
    bootBtn.disabled = false;
    bootBtn.innerHTML = `<span class="w-2 h-2 rounded-full bg-black/70"></span> Boot Sandbox`;
  }
});

templateSelect.addEventListener("change", async () => {
  if (!wc) return;
  logsEl.textContent = "";
  log(`Switching template → ${templateSelect.value}`);
  await mountTemplate(templateSelect.value);
});

installBtn.addEventListener("click", async () => {
  installBtn.disabled = true;
  try {
    await runCommand("npm", ["install"]);
  } finally {
    installBtn.disabled = false;
  }
});

runBtn.addEventListener("click", async () => {
  runBtn.disabled = true;
  try {
    // For static template we use `npm run dev` (serve).
    await runCommand("npm", ["run", "dev"]);
  } finally {
    runBtn.disabled = false;
  }
});

saveBtn.addEventListener("click", saveFile);

// Keyboard shortcut: Cmd+S / Ctrl+S to save
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "s") {
    e.preventDefault();
    saveFile();
  }
});

// New file button
if (newFileBtn) {
  newFileBtn.addEventListener("click", async () => {
    if (!wc) return;
    const name = prompt("Enter file name (e.g. utils.js, components/Header.jsx):");
    if (!name || !name.trim()) return;
    const filePath = name.trim();
    try {
      await wc.fs.writeFile(filePath, "");
      fileList.push(filePath);
      renderFileTree(fileList.sort());
      await openFile(filePath);
      log(`[created] ${filePath}`);
    } catch (err) {
      log(`[error] Could not create ${filePath}: ${err.message}`);
    }
  });
}

// Delete file button
if (delFileBtn) {
  delFileBtn.addEventListener("click", async () => {
    if (!wc || !activePath) return;
    if (!confirm(`Delete ${activePath}?`)) return;
    try {
      await wc.fs.rm(activePath);
      fileList = fileList.filter((f) => f !== activePath);
      log(`[deleted] ${activePath}`);
      activePath = null;
      renderFileTree(fileList.sort());
      if (fileList.length > 0) await openFile(fileList[0]);
      else { setEditorDoc("", null); activeFileLabel.textContent = "Editor"; }
    } catch (err) {
      log(`[error] Could not delete ${activePath}: ${err.message}`);
    }
  });
}

// Refresh preview
const refreshPreviewBtn = $("refresh-preview");
if (refreshPreviewBtn) {
  refreshPreviewBtn.addEventListener("click", () => {
    if (previewFrame.src && previewFrame.src !== "about:blank") {
      previewFrame.src = previewFrame.src;
    }
  });
}

// Open preview in new tab
const openPreviewTabBtn = $("open-preview-tab");
if (openPreviewTabBtn) {
  openPreviewTabBtn.addEventListener("click", () => {
    if (previewFrame.src && previewFrame.src !== "about:blank") {
      window.open(previewFrame.src, "_blank");
    }
  });
}

clearLogsBtn.addEventListener("click", () => {
  logsEl.textContent = "";
});

// -----------------------------------------------------------------------------
// Device preview controls
// -----------------------------------------------------------------------------
const previewWrap = $("preview-frame-wrap");
const deviceButtons = document.querySelectorAll(".pg-device-btn[data-device]");
const rotateBtn = $("rotate-btn");
const customW = $("custom-w");
const customH = $("custom-h");
const applyCustom = $("apply-custom");

const presets = {
  desktop: { w: null, h: 520 },
  tablet: { w: 820, h: 1180 },
  mobile: { w: 390, h: 844 },
};

function applyDevice({ device, w, h }) {
  currentDevice = device || currentDevice;
  deviceSize = { w, h };
  const wrapW = w ? `${w}px` : "100%";
  const wrapH = h ? `${h}px` : "520px";
  previewFrame.style.width = wrapW;
  previewFrame.style.height = wrapH;
  previewWrap.style.justifyContent = w ? "center" : "flex-start";
}

function setActiveDeviceBtn(device) {
  deviceButtons.forEach((b) => b.classList.toggle("active", b.dataset.device === device));
}

deviceButtons.forEach((b) => {
  b.addEventListener("click", () => {
    rotated = false;
    const base = presets[b.dataset.device];
    applyDevice({ device: b.dataset.device, w: base.w, h: base.h });
    setActiveDeviceBtn(b.dataset.device);
  });
});

rotateBtn.addEventListener("click", () => {
  if (currentDevice === "desktop") return;
  rotated = !rotated;
  const base = deviceSize.w == null ? presets[currentDevice] : deviceSize;
  const w = rotated ? base.h : base.w;
  const h = rotated ? base.w : base.h;
  applyDevice({ device: currentDevice, w, h });
});

applyCustom.addEventListener("click", () => {
  const w = Number(customW.value) || null;
  const h = Number(customH.value) || null;
  applyDevice({ device: currentDevice, w, h });
});

applyDevice({ device: "desktop", w: presets.desktop.w, h: presets.desktop.h });
setActiveDeviceBtn("desktop");

// -----------------------------------------------------------------------------
// AI Playground (CLEX API default)
// -----------------------------------------------------------------------------
const runCompareBtn = $("run-compare");
const promptEl = $("compare-prompt");
const providerFilterEl = $("provider-filter");
const capabilityFilterEl = $("capability-filter");
const modelInputEl = $("model-input");
const modelOptionsEl = $("model-options");
const clexApiKeyEl = $("clex-api-key");
const outputEl = $("compare-output");

const catalogModels = Array.isArray(window.CLEX_MODELS) ? window.CLEX_MODELS : [];

function sortedUnique(values) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function populateProviderFilter() {
  if (!providerFilterEl) return;
  const providers = sortedUnique(catalogModels.map((m) => m.provider).filter(Boolean));
  providers.forEach((provider) => {
    const option = document.createElement("option");
    option.value = provider;
    option.textContent = provider;
    providerFilterEl.appendChild(option);
  });
}

function getFilteredModels() {
  const selectedProvider = providerFilterEl?.value || "all";
  const selectedCapability = capabilityFilterEl?.value || "all";

  return catalogModels.filter((model) => {
    const providerOk = selectedProvider === "all" || model.provider === selectedProvider;
    const capabilityOk =
      selectedCapability === "all" ||
      model.category === selectedCapability ||
      (Array.isArray(model.capabilities) && model.capabilities.includes(selectedCapability));
    return providerOk && capabilityOk;
  });
}

function refreshModelOptions() {
  if (!modelOptionsEl) return;
  const filtered = getFilteredModels();
  modelOptionsEl.innerHTML = filtered
    .map((model) => `<option value="${model.id}"></option>`)
    .join("");

  if ((!modelInputEl.value || !filtered.some((m) => m.id === modelInputEl.value)) && filtered[0]) {
    modelInputEl.value = filtered[0].id;
  }
}

function updateRunEnabled() {
  const hasPrompt = (promptEl?.value || "").trim().length > 0;
  const hasModel = (modelInputEl?.value || "").trim().length > 0;
  runCompareBtn.disabled = !(hasPrompt && hasModel);
}

if (providerFilterEl) {
  providerFilterEl.addEventListener("change", () => {
    refreshModelOptions();
    updateRunEnabled();
  });
}

if (capabilityFilterEl) {
  capabilityFilterEl.addEventListener("change", () => {
    refreshModelOptions();
    updateRunEnabled();
  });
}

if (modelInputEl) {
  modelInputEl.addEventListener("input", updateRunEnabled);
}

if (promptEl) {
  promptEl.addEventListener("input", updateRunEnabled);
}

runCompareBtn.addEventListener("click", async () => {
  const modelId = modelInputEl.value.trim();
  const prompt = promptEl.value.trim();
  if (!modelId || !prompt) return;

  const headers = { "Content-Type": "application/json" };
  const clexKey = clexApiKeyEl?.value?.trim();
  if (clexKey) headers["x-clex-api-key"] = clexKey;

  runCompareBtn.disabled = true;
  outputEl.textContent = "Sending request...";

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: "user", content: prompt }],
        stream: true,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      outputEl.textContent = `Request failed: ${errText || res.statusText}`;
      return;
    }

    let acc = "";
    outputEl.textContent = "";
    await window.clex.streamChatCompletionsSSE(res, {
      onToken: (token) => {
        acc += token;
        outputEl.textContent = acc;
      },
    });
  } catch (error) {
    outputEl.textContent = `Request error: ${error.message}`;
  } finally {
    updateRunEnabled();
  }
});

populateProviderFilter();
refreshModelOptions();
updateRunEnabled();

// -----------------------------------------------------------------------------
// AI Code Assist
// -----------------------------------------------------------------------------
const aiChatInput = $("ai-chat-input");
const aiChatSend = $("ai-chat-send");
const aiChatMessages = $("ai-chat-messages");
const aiOutput = $("ai-output");
const aiCopyOutput = $("ai-copy-output");

function enableAISend() {
  if (aiChatSend) aiChatSend.disabled = !(aiChatInput?.value?.trim());
}
if (aiChatInput) aiChatInput.addEventListener("input", enableAISend);
if (aiChatInput) aiChatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !aiChatSend.disabled) sendAIMessage();
});
if (aiChatSend) aiChatSend.addEventListener("click", sendAIMessage);

// Quick suggest buttons
document.querySelectorAll(".ai-suggest-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (aiChatInput) {
      aiChatInput.value = btn.dataset.prompt || "";
      enableAISend();
      sendAIMessage();
    }
  });
});

async function sendAIMessage() {
  const prompt = aiChatInput?.value?.trim();
  if (!prompt) return;

  // Add user message to chat
  const userMsg = document.createElement("div");
  userMsg.className = "bg-white/5 border border-white/8 rounded-xl px-4 py-2 text-sm text-white";
  userMsg.textContent = prompt;
  aiChatMessages?.appendChild(userMsg);
  aiChatInput.value = "";
  enableAISend();

  // Get current editor context
  let codeContext = "";
  if (editorView && activePath) {
    codeContext = `\n\nCurrent file (${activePath}):\n\`\`\`\n${editorView.state.doc.toString().slice(0, 2000)}\n\`\`\``;
  }

  const systemPrompt = `You are a helpful coding assistant for a web development playground. The user is building a web project. Respond with code when asked. Be concise.${codeContext}`;

  if (aiOutput) aiOutput.textContent = "Generating...";

  try {
    const headers = { "Content-Type": "application/json" };
    const clexKey = $("clex-api-key")?.value?.trim();
    if (clexKey) headers["x-clex-api-key"] = clexKey;

    const res = await fetch("/api/chat", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "meta/llama-3.3-70b-instruct",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        stream: true,
      }),
    });

    if (!res.ok) {
      aiOutput.textContent = `Error: ${await res.text()}`;
      return;
    }

    let acc = "";
    aiOutput.textContent = "";
    if (window.clex?.streamChatCompletionsSSE) {
      await window.clex.streamChatCompletionsSSE(res, {
        onToken: (token) => {
          acc += token;
          aiOutput.textContent = acc;
        },
      });
    } else {
      const data = await res.json();
      acc = data?.choices?.[0]?.message?.content || JSON.stringify(data);
      aiOutput.textContent = acc;
    }

    // Add AI response to chat
    const aiMsg = document.createElement("div");
    aiMsg.className = "bg-cyan-500/5 border border-cyan-500/15 rounded-xl px-4 py-2 text-sm text-gray-300";
    aiMsg.textContent = acc.slice(0, 200) + (acc.length > 200 ? "..." : "");
    aiChatMessages?.appendChild(aiMsg);
    aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
  } catch (err) {
    if (aiOutput) aiOutput.textContent = `Error: ${err.message}`;
  }
}

// Copy AI output
if (aiCopyOutput) {
  aiCopyOutput.addEventListener("click", () => {
    if (aiOutput?.textContent) {
      navigator.clipboard.writeText(aiOutput.textContent);
      aiCopyOutput.textContent = "Copied!";
      setTimeout(() => { aiCopyOutput.textContent = "Copy"; }, 1500);
    }
  });
}
