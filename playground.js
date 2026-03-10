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
const builderView = $("builder-view");
const llmView = $("llm-view");

function setTab(tab) {
  const isBuilder = tab === "builder";
  tabBuilder.classList.toggle("active", isBuilder);
  tabLLM.classList.toggle("active", !isBuilder);
  builderView.classList.toggle("hidden", !isBuilder);
  llmView.classList.toggle("hidden", isBuilder);
}
tabBuilder.addEventListener("click", () => setTab("builder"));
tabLLM.addEventListener("click", () => setTab("llm"));

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

function log(line) {
  logsEl.textContent += (logsEl.textContent.endsWith("\n") ? "" : "\n") + line;
  logsEl.scrollTop = logsEl.scrollHeight;
}

function setButtons({ booted }) {
  installBtn.disabled = !booted;
  runBtn.disabled = !booted;
  saveBtn.disabled = !booted || !activePath;
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
      EditorView.updateListener.of(() => {}),
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

function renderFileTree(paths) {
  fileTree.innerHTML = "";
  for (const p of paths) {
    const btn = document.createElement("button");
    btn.className =
      "text-left px-3 py-2 rounded-lg border border-white/5 bg-white/0 hover:bg-white/5 hover:border-cyan-500/30 transition-all text-gray-200";
    btn.textContent = p;
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

bootBtn.addEventListener("click", async () => {
  if (wc) return;
  logsEl.textContent = "";
  log("Booting WebContainer...");
  wc = await WebContainer.boot();
  initEditor();
  setButtons({ booted: true });
  wc.on("server-ready", (port, url) => {
    previewFrame.src = url;
    previewUrlEl.textContent = `Preview URL: ${url}`;
  });
  await mountTemplate(templateSelect.value);
  log("Sandbox ready. Run npm install, then npm run dev.");
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
