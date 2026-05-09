// ════════════════════════════════════════════════════════════════════════════
// Clex AI IDE — playground.js (v4)
//
// Single-page IDE shell that wires together:
//   1. WebContainer        — in-browser Node sandbox (npm install / npm run dev)
//   2. CodeMirror 6        — multi-tab editor with per-language extensions
//   3. Clex AI chat panel  — streams from /api/chat, can apply file edits
//
// Layout is owned by playground.html / playground.css; this file just drives
// state. The shape is intentionally very close to a small tool like
// Cursor's "panes" / Google AI Studio's "build" tab — file tree, editor,
// AI chat, and a bottom dock for preview + console.
//
// AI file edits
// ─────────────
// Whenever the model returns a fenced code block tagged with a file path,
// e.g.
//    ```jsx file=src/App.jsx
//    export default function App() { ... }
//    ```
// we render it as a normal code block plus an "Apply to <path>" button. On
// click we write the contents into the active WebContainer FS and reload
// the editor for that file (creating it on disk if it didn't exist yet).
//
// We deliberately do NOT auto-apply edits — the user is the gate, exactly
// like Cursor's diff-apply flow.
// ════════════════════════════════════════════════════════════════════════════

import { WebContainer } from "https://unpkg.com/@webcontainer/api@1.5.1/dist/index.js?module";

import { EditorView, basicSetup } from "https://esm.sh/@codemirror/basic-setup@0.20.0";
import { EditorState, Compartment } from "https://esm.sh/@codemirror/state@6.5.2";
import { oneDark } from "https://esm.sh/@codemirror/theme-one-dark@6.1.2";
import { javascript } from "https://esm.sh/@codemirror/lang-javascript@6.2.4";
import { html } from "https://esm.sh/@codemirror/lang-html@6.4.11";
import { css } from "https://esm.sh/@codemirror/lang-css@6.3.1";
import { json } from "https://esm.sh/@codemirror/lang-json@6.0.1";

const $ = (id) => document.getElementById(id);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// ───── DOM handles ─────

const els = {
  status: $("ide-status"),
  template: $("template-select"),
  modelInput: $("model-input"),
  modelName: $("chat-model-name"),
  modelCost: $("chat-model-cost"),
  apiKey: $("clex-api-key"),
  apiKeyLabel: $("chat-key-label"),
  bootBtn: $("boot-btn"),
  installBtn: $("install-btn"),
  runBtn: $("run-btn"),
  saveBtn: $("save-btn"),
  newFileBtn: $("new-file-btn"),
  delFileBtn: $("del-file-btn"),
  formatBtn: $("format-btn"),
  fileTree: $("file-tree"),
  editorTabs: $("editor-tabs"),
  editor: $("editor"),
  chatThread: $("chat-thread"),
  chatForm: $("chat-form"),
  chatInput: $("chat-input"),
  chatSend: $("chat-send"),
  chatClear: $("chat-clear"),
  chatSuggest: $("chat-suggest"),
  chatContext: $("chat-context"),
  chatModeHint: $("chat-mode-hint"),
  modeTabs: $$(".ide-mode-tab"),
  previewFrame: $("preview-frame"),
  previewWrap: $("preview-frame-wrap"),
  previewUrl: $("preview-url"),
  refreshPreview: $("refresh-preview"),
  openPreviewTab: $("open-preview-tab"),
  dockTabs: $$(".ide-dock-tab"),
  dockBodies: $$(".ide-dock-body"),
  dockCollapse: $("dock-collapse"),
  dock: document.querySelector(".ide-dock"),
  deviceBtns: $$(".ide-chip--device"),
  logs: $("logs"),
  editorEmpty: $("editor-empty"),
  menuBtn: $("topbar-menu-btn"),
  menu: $("topbar-menu"),
};

// ───── Mode definitions (Cursor-style: Ask / Agent / Edit) ─────
//
// Ask  → answer questions, never propose file edits.
// Agent→ free-roam: scaffold + edit any file in the project as needed.
// Edit → focus on the active file only, return its full new contents.

const MODES = {
  ask: {
    hint: "Q&A about the active file — won't edit unless you ask.",
    systemHeader:
      "You are the Clex AI assistant. The user is browsing a multi-file web project in an in-browser sandbox. Answer questions clearly and concisely. Do NOT propose file edits unless the user explicitly asks for code changes; if you do, use fenced ```lang file=path blocks with the full new file contents.",
  },
  agent: {
    hint: "Agent — can scaffold and edit any file in the project.",
    systemHeader:
      "You are the Clex AI agent inside the in-browser IDE. Plan, then write code. When you change files, emit fenced code blocks tagged ```lang file=path/to/file with the COMPLETE new contents (not a diff). Keep paths relative, use forward slashes. Always include a short plain-English plan before the code blocks.",
  },
  edit: {
    hint: "Edit — refactor only the active file, returns full new contents.",
    systemHeader:
      "You are the Clex AI inline editor. Restrict your changes to the user's ACTIVE FILE only. Reply with one fenced code block tagged ```lang file=<active-path> containing the COMPLETE new contents of that file, plus a one-paragraph summary above it. Do not touch other files.",
  },
};

let currentMode = "ask";

// ───── State ─────

let wc = null;
let editorView = null;
const langCompartment = new Compartment();
let activePath = null;
let openTabs = [];                  // ordered list of file paths shown as tabs
let fileList = [];                  // flat list of all files in the WC
const dirty = new Set();            // paths with unsaved changes
let chatHistory = [];               // [{role, content}]
let isStreaming = false;

// ───── Templates (kept from previous playground; ports cleanly to WC) ─────

const templates = {
  static: {
    files: {
      "package.json": JSON.stringify(
        {
          name: "clex-static",
          private: true,
          version: "0.0.0",
          scripts: { dev: "npx --yes serve -l 5173 ." },
        },
        null,
        2,
      ),
      "index.html": `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Clex IDE — static</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <div class="app">
      <h1>Static template</h1>
      <p>Edit <code>index.html</code>, <code>styles.css</code>, and <code>main.js</code>.</p>
      <button id="btn">Click me</button>
      <pre id="out"></pre>
    </div>
    <script type="module" src="./main.js"></script>
  </body>
</html>
`,
      "styles.css": `:root { color-scheme: dark; }
body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; background:#02050f; color:#e5e7eb; }
.app { max-width: 960px; margin: 0 auto; padding: 32px; }
button { background: rgba(201,169,110,.18); color:#c9a96e; border:1px solid rgba(201,169,110,.4); padding:10px 14px; border-radius:12px; cursor:pointer; }
button:hover { background: rgba(201,169,110,.28); }
code { color:#c9a96e; }
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
          dependencies: { react: "^18.3.1", "react-dom": "^18.3.1" },
          devDependencies: { vite: "^6.0.0", "@vitejs/plugin-react": "^4.3.4" },
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
    <title>Clex IDE — Vite + React</title>
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
      "src/App.jsx": `import { useState } from 'react'

export default function App() {
  const [count, setCount] = useState(0)
  return (
    <div className="app">
      <h1>Vite + React template</h1>
      <p>Edit <code>src/App.jsx</code> and see live updates.</p>
      <button onClick={() => setCount(count + 1)}>Count: {count}</button>
    </div>
  )
}
`,
      "src/style.css": `:root { color-scheme: dark; }
body { margin:0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; background:#02050f; color:#e5e7eb; }
.app { max-width: 960px; margin: 0 auto; padding: 32px; }
button { background: rgba(201,169,110,.18); color:#c9a96e; border:1px solid rgba(201,169,110,.4); padding:10px 14px; border-radius:12px; cursor:pointer; }
code { color:#c9a96e; }
`,
    },
    entry: "src/App.jsx",
  },

  vue: {
    files: {
      "package.json": JSON.stringify(
        {
          name: "clex-vue",
          private: true,
          version: "0.0.0",
          type: "module",
          scripts: { dev: "vite --host 0.0.0.0 --port 5173" },
          dependencies: { vue: "^3.5.0" },
          devDependencies: { vite: "^6.0.0", "@vitejs/plugin-vue": "^5.2.0" },
        },
        null,
        2,
      ),
      "vite.config.js": `import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
export default defineConfig({ plugins: [vue()] })
`,
      "index.html": `<!doctype html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /><title>Clex IDE — Vue</title></head><body><div id="app"></div><script type="module" src="/src/main.js"></script></body></html>
`,
      "src/main.js": `import { createApp } from 'vue'
import App from './App.vue'
createApp(App).mount('#app')
`,
      "src/App.vue": `<template>
  <div class="app">
    <h1>Vue Template</h1>
    <p>Edit <code>src/App.vue</code> and see live updates.</p>
    <button @click="count++">Count: {{ count }}</button>
  </div>
</template>
<script setup>
import { ref } from 'vue'
const count = ref(0)
</script>
<style>
:root { color-scheme: dark; }
body { margin:0; font-family: system-ui; background:#02050f; color:#e5e7eb; }
.app { max-width:960px; margin:0 auto; padding:32px; }
button { background:rgba(201,169,110,.18); color:#c9a96e; border:1px solid rgba(201,169,110,.4); padding:10px 14px; border-radius:12px; cursor:pointer; }
code { color:#c9a96e; }
</style>
`,
    },
    entry: "src/App.vue",
  },

  svelte: {
    files: {
      "package.json": JSON.stringify(
        {
          name: "clex-svelte",
          private: true,
          version: "0.0.0",
          type: "module",
          scripts: { dev: "vite --host 0.0.0.0 --port 5173" },
          devDependencies: {
            vite: "^6.0.0",
            "@sveltejs/vite-plugin-svelte": "^4.0.0",
            svelte: "^4.2.0",
          },
        },
        null,
        2,
      ),
      "vite.config.js": `import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
export default defineConfig({ plugins: [svelte()] })
`,
      "index.html": `<!doctype html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /><title>Clex IDE — Svelte</title></head><body><div id="app"></div><script type="module" src="/src/main.js"></script></body></html>
`,
      "src/main.js": `import App from './App.svelte'
const app = new App({ target: document.getElementById('app') })
export default app
`,
      "src/App.svelte": `<script>
  let count = 0
</script>
<main class="app">
  <h1>Svelte Template</h1>
  <p>Edit <code>src/App.svelte</code> and see live updates.</p>
  <button on:click={() => count++}>Count: {count}</button>
</main>
<style>
  :global(body) { margin:0; font-family:system-ui; background:#02050f; color:#e5e7eb; }
  .app { max-width:960px; margin:0 auto; padding:32px; }
  button { background:rgba(201,169,110,.18); color:#c9a96e; border:1px solid rgba(201,169,110,.4); padding:10px 14px; border-radius:12px; cursor:pointer; }
  code { color:#c9a96e; }
</style>
`,
    },
    entry: "src/App.svelte",
  },

  typescript: {
    files: {
      "package.json": JSON.stringify(
        {
          name: "clex-ts",
          private: true,
          version: "0.0.0",
          type: "module",
          scripts: { dev: "vite --host 0.0.0.0 --port 5173" },
          devDependencies: { vite: "^6.0.0", typescript: "^5.7.0" },
        },
        null,
        2,
      ),
      "vite.config.js": `import { defineConfig } from 'vite'
export default defineConfig({})
`,
      "tsconfig.json": JSON.stringify(
        {
          compilerOptions: {
            target: "ES2020",
            module: "ESNext",
            moduleResolution: "bundler",
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
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
    <title>Clex IDE — TypeScript</title>
    <link rel="stylesheet" href="./style.css" />
  </head>
  <body>
    <div class="app">
      <h1>TypeScript template</h1>
      <p>Edit <code>main.ts</code> and see live updates.</p>
      <button id="btn">Click me</button>
      <pre id="out"></pre>
    </div>
    <script type="module" src="./main.ts"></script>
  </body>
</html>
`,
      "main.ts": `const out = document.getElementById('out') as HTMLPreElement | null
const btn = document.getElementById('btn') as HTMLButtonElement | null

let count = 0
btn?.addEventListener('click', () => {
  count++
  if (out) out.textContent = 'Clicked ' + count + ' times'
})
`,
      "style.css": `:root { color-scheme: dark; }
body { margin: 0; font-family: ui-sans-serif, system-ui; background:#02050f; color:#e5e7eb; }
.app { max-width:960px; margin:0 auto; padding:32px; }
button { background: rgba(201,169,110,.18); color:#c9a96e; border:1px solid rgba(201,169,110,.4); padding:10px 14px; border-radius:12px; cursor:pointer; }
code { color:#c9a96e; }
`,
    },
    entry: "main.ts",
  },
};

// ───── Status / logging ─────

function setStatus(state, label) {
  if (!els.status) return;
  els.status.dataset.state = state;
  const lbl = els.status.querySelector(".ide-status-label");
  if (lbl) lbl.textContent = label;
}

function log(line) {
  if (!els.logs) return;
  if (els.logs.textContent === "Boot the sandbox to see logs…") {
    els.logs.textContent = "";
  }
  els.logs.textContent +=
    (els.logs.textContent.endsWith("\n") || els.logs.textContent === ""
      ? ""
      : "\n") + line;
  els.logs.scrollTop = els.logs.scrollHeight;
}

// ───── Editor helpers ─────

function langForPath(path) {
  if (!path) return javascript();
  if (path.endsWith(".html") || path.endsWith(".vue") || path.endsWith(".svelte")) {
    return html();
  }
  if (path.endsWith(".css")) return css();
  if (path.endsWith(".json")) return json();
  if (
    path.endsWith(".ts") ||
    path.endsWith(".tsx") ||
    path.endsWith(".jsx") ||
    path.endsWith(".js") ||
    path.endsWith(".mjs")
  ) {
    return javascript({ jsx: true, typescript: path.endsWith(".ts") || path.endsWith(".tsx") });
  }
  return javascript();
}

function initEditor() {
  if (!els.editor) return;
  els.editor.innerHTML = "";
  const state = EditorState.create({
    doc: "",
    extensions: [
      basicSetup,
      oneDark,
      langCompartment.of(javascript()),
      EditorView.updateListener.of((v) => {
        if (v.docChanged && activePath) {
          dirty.add(activePath);
          els.saveBtn.disabled = false;
          renderFileTree();
          renderTabs();
        }
      }),
    ],
  });
  editorView = new EditorView({ state, parent: els.editor });
}

function setEditorDoc(text, path) {
  if (!editorView) initEditor();
  editorView.dispatch({
    changes: { from: 0, to: editorView.state.doc.length, insert: text },
    effects: langCompartment.reconfigure(langForPath(path)),
  });
}

// ───── File tree / tabs rendering ─────

function fileIcon(path) {
  if (path.endsWith(".html")) return "<>";
  if (path.endsWith(".css")) return "#";
  if (path.endsWith(".js") || path.endsWith(".jsx")) return "JS";
  if (path.endsWith(".ts") || path.endsWith(".tsx")) return "TS";
  if (path.endsWith(".vue")) return "V";
  if (path.endsWith(".svelte")) return "S";
  if (path.endsWith(".json")) return "{}";
  if (path.endsWith(".md")) return "M";
  return "·";
}

function renderFileTree() {
  if (!els.fileTree) return;
  if (!fileList.length) {
    els.fileTree.innerHTML = `<p class="ide-empty">Boot the sandbox to load files.</p>`;
    return;
  }
  els.fileTree.innerHTML = "";
  for (const path of fileList) {
    const btn = document.createElement("button");
    btn.className = "ide-file";
    if (path === activePath) btn.classList.add("is-active");
    if (dirty.has(path)) btn.classList.add("is-dirty");
    btn.setAttribute("role", "treeitem");
    btn.innerHTML = `
      <span class="ide-file-icon">${fileIcon(path)}</span>
      <span class="ide-file-name" title="${escapeAttr(path)}">${escapeHtml(path)}</span>
    `;
    btn.addEventListener("click", () => openFile(path));
    els.fileTree.appendChild(btn);
  }
}

function renderTabs() {
  if (!els.editorTabs) return;
  els.editorTabs.innerHTML = "";
  for (const path of openTabs) {
    const tab = document.createElement("div");
    tab.className = "ide-tab";
    if (path === activePath) tab.classList.add("is-active");

    const label = document.createElement("span");
    label.textContent = path.split("/").pop() + (dirty.has(path) ? " ●" : "");
    label.addEventListener("click", () => openFile(path));
    tab.appendChild(label);

    const close = document.createElement("button");
    close.className = "ide-tab-close";
    close.textContent = "×";
    close.title = "Close tab";
    close.addEventListener("click", (e) => {
      e.stopPropagation();
      closeTab(path);
    });
    tab.appendChild(close);

    els.editorTabs.appendChild(tab);
  }
}

function closeTab(path) {
  openTabs = openTabs.filter((p) => p !== path);
  if (path === activePath) {
    activePath = openTabs[openTabs.length - 1] || null;
    if (activePath) {
      openFile(activePath, /* alreadyOpen */ true);
    } else {
      setEditorDoc("", null);
      if (els.editorEmpty) els.editorEmpty.classList.remove("is-hidden");
      els.saveBtn.disabled = true;
      els.delFileBtn.disabled = true;
      els.formatBtn.disabled = true;
    }
  }
  renderTabs();
  renderFileTree();
  updateContextHint();
}

// ───── File ops ─────

async function openFile(path, alreadyOpen = false) {
  if (!wc) return;
  let contents = "";
  try {
    contents = await wc.fs.readFile(path, "utf-8");
  } catch (err) {
    log(`[error] cannot read ${path}: ${err.message}`);
    return;
  }
  activePath = path;
  if (!openTabs.includes(path)) openTabs.push(path);
  setEditorDoc(contents, path);
  els.saveBtn.disabled = !dirty.has(path);
  els.delFileBtn.disabled = false;
  els.formatBtn.disabled = false;
  if (els.editorEmpty) els.editorEmpty.classList.add("is-hidden");
  renderTabs();
  renderFileTree();
  updateContextHint();
  // Refresh the mode-dependent placeholder so Edit mode names the active file.
  setMode(currentMode);
}

async function saveActive() {
  if (!wc || !activePath || !editorView) return;
  const text = editorView.state.doc.toString();
  await wc.fs.writeFile(activePath, text);
  dirty.delete(activePath);
  els.saveBtn.disabled = true;
  log(`[saved] ${activePath}`);
  renderFileTree();
  renderTabs();
}

async function listAllFiles(dir = "/") {
  // Recursive directory walk inside the WebContainer FS, ignoring node_modules.
  const out = [];
  async function walk(d) {
    let entries;
    try {
      entries = await wc.fs.readdir(d, { withFileTypes: true });
    } catch (_) {
      return;
    }
    for (const ent of entries) {
      if (ent.name === "node_modules" || ent.name === ".git") continue;
      const full = (d === "/" ? "" : d) + "/" + ent.name;
      if (ent.isDirectory()) {
        await walk(full);
      } else {
        // Strip leading '/' so paths like 'src/App.jsx' read naturally.
        out.push(full.replace(/^\//, ""));
      }
    }
  }
  await walk("/");
  return out.sort();
}

async function refreshFileList() {
  fileList = await listAllFiles();
  renderFileTree();
}

async function newFilePrompt() {
  if (!wc) return;
  const name = prompt(
    "New file path (relative to project root). Use '/' for nested folders.",
    "src/Component.jsx",
  );
  if (!name) return;
  const path = name.trim().replace(/^\/+/, "");
  if (!path) return;
  try {
    // Ensure parent dirs exist.
    const parent = path.split("/").slice(0, -1).join("/");
    if (parent) await wc.fs.mkdir(parent, { recursive: true });
    await wc.fs.writeFile(path, "");
    await refreshFileList();
    await openFile(path);
    log(`[created] ${path}`);
  } catch (err) {
    log(`[error] could not create ${path}: ${err.message}`);
  }
}

async function deleteActive() {
  if (!wc || !activePath) return;
  if (!confirm(`Delete ${activePath}?`)) return;
  try {
    await wc.fs.rm(activePath);
    log(`[deleted] ${activePath}`);
    closeTab(activePath);
    await refreshFileList();
  } catch (err) {
    log(`[error] could not delete ${activePath}: ${err.message}`);
  }
}

async function resetActiveFromTemplate() {
  if (!wc || !activePath) return;
  const tpl = templates[els.template.value];
  const original = tpl?.files?.[activePath];
  if (typeof original !== "string") {
    log(`[info] no template original for ${activePath}`);
    return;
  }
  if (!confirm(`Reset ${activePath} to its template version? This discards your edits.`)) {
    return;
  }
  await wc.fs.writeFile(activePath, original);
  dirty.delete(activePath);
  setEditorDoc(original, activePath);
  log(`[reset] ${activePath}`);
  renderFileTree();
  renderTabs();
}

// ───── Sandbox boot ─────

function readinessIssues() {
  const issues = [];
  if (!window.isSecureContext) issues.push("page must be served over HTTPS or localhost");
  if (!window.crossOriginIsolated) {
    issues.push(
      "page is not cross-origin isolated (need COOP/COEP headers — already wired for /playground.html on Cloudflare Pages, hard-reload to pick them up)",
    );
  }
  if (!("SharedArrayBuffer" in window)) {
    issues.push("browser session does not expose SharedArrayBuffer");
  }
  return issues;
}

async function mountTemplate(key) {
  const tpl = templates[key];
  const tree = {};
  for (const [filePath, content] of Object.entries(tpl.files)) {
    // Build nested directories.
    const parts = filePath.split("/");
    let cursor = tree;
    for (let i = 0; i < parts.length - 1; i++) {
      const seg = parts[i];
      cursor[seg] = cursor[seg] || { directory: {} };
      cursor = cursor[seg].directory;
    }
    cursor[parts[parts.length - 1]] = { file: { contents: content } };
  }
  await wc.mount(tree);
  await refreshFileList();
  openTabs = [];
  activePath = null;
  if (tpl.entry) await openFile(tpl.entry);
  els.previewFrame.src = "about:blank";
  els.previewUrl.textContent = "(not running)";
}

async function runCommand(cmd, args) {
  if (!wc) return -1;
  log(`$ ${cmd} ${args.join(" ")}`);
  const proc = await wc.spawn(cmd, args);
  proc.output.pipeTo(
    new WritableStream({
      write(chunk) {
        log(String(chunk).replace(/\u001b\[[0-9;]*m/g, "").replace(/\n$/, ""));
      },
    }),
  );
  const code = await proc.exit;
  log(`[exit ${code}] ${cmd}`);
  return code;
}

async function bootSandbox() {
  if (wc) return;
  setStatus("booting", "Booting…");
  els.bootBtn.disabled = true;
  els.bootBtn.innerHTML = `<span class="ide-btn-dot"></span> Booting…`;
  els.logs.textContent = "";
  log("Starting WebContainer…");

  const issues = readinessIssues();
  if (issues.length) {
    setStatus("error", "Sandbox unavailable");
    log("Sandbox readiness check failed:");
    for (const x of issues) log(`  - ${x}`);
    log("WebContainers need cross-origin isolation. Hard-reload after Cloudflare picks up the new headers, or open in Chrome / Edge.");
    els.bootBtn.disabled = false;
    els.bootBtn.innerHTML = `<span class="ide-btn-dot"></span> Boot sandbox`;
    return;
  }

  try {
    const bootP = WebContainer.boot();
    const timeoutP = new Promise((_, rej) =>
      setTimeout(
        () =>
          rej(
            new Error(
              "Boot timed out after 30s. Try a hard reload, or open in Chrome / Edge.",
            ),
          ),
        30_000,
      ),
    );
    wc = await Promise.race([bootP, timeoutP]);

    initEditor();
    wc.on("server-ready", (port, url) => {
      els.previewFrame.src = url;
      els.previewUrl.textContent = url;
      setStatus("running", "Running");
    });

    await mountTemplate(els.template.value);

    setStatus("ready", "Sandbox ready");
    els.installBtn.disabled = false;
    els.runBtn.disabled = false;
    els.newFileBtn.disabled = false;
    log("Sandbox ready. Run npm install, then npm run dev.");
  } catch (err) {
    setStatus("error", "Boot failed");
    log(`[error] failed to boot: ${err.message}`);
    wc = null;
  } finally {
    els.bootBtn.disabled = false;
    els.bootBtn.innerHTML = `<span class="ide-btn-dot"></span> Boot sandbox`;
  }
}

async function reMountIfTemplateChanged() {
  if (!wc) return;
  log(`Switching template → ${els.template.value}`);
  setStatus("booting", "Mounting…");
  await mountTemplate(els.template.value);
  setStatus("ready", "Sandbox ready");
}

// ───── Models / credit hint ─────

function loadModels() {
  const models = (window.CLEX_MODELS || []).map((m) => ({
    id: m.nvidiaId,
    name: m.name,
    publisher: m.publisher,
    credits: m.credits ?? 1,
    category: m.category,
  }));

  if (!els.modelInput) return;

  // Group models by tier and emit grouped <optgroup>s, sorted by credit cost.
  const tiers = {
    1: { label: "1 cr — small / utility", models: [] },
    2: { label: "2 cr — medium", models: [] },
    3: { label: "3 cr — large", models: [] },
    5: { label: "5 cr — premium", models: [] },
  };
  for (const m of models) {
    const tier = tiers[m.credits] || tiers[1];
    tier.models.push(m);
  }
  els.modelInput.innerHTML = "";
  for (const credits of [1, 2, 3, 5]) {
    const tier = tiers[credits];
    if (!tier.models.length) continue;
    const grp = document.createElement("optgroup");
    grp.label = tier.label;
    for (const m of tier.models) {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = `${m.name} (${m.publisher})`;
      opt.dataset.credits = String(m.credits);
      grp.appendChild(opt);
    }
    els.modelInput.appendChild(grp);
  }

  const defaultId =
    "moonshotai/kimi-k2-instruct" in Object.fromEntries(models.map((m) => [m.id, m.id]))
      ? "moonshotai/kimi-k2-instruct"
      : (models.find((m) => /coder/i.test(m.name)) || models[0])?.id;
  if (defaultId) els.modelInput.value = defaultId;
  updateCreditHint();
}

function updateCreditHint() {
  const id = (els.modelInput?.value || "").trim();
  const m = (window.CLEX_MODELS || []).find((x) => x.nvidiaId === id);
  if (els.modelName) els.modelName.textContent = id || "select model";
  if (els.modelCost) {
    els.modelCost.textContent = m ? `${m.credits ?? 1} cr` : "—";
  }
}

function updateApiKeyLabel() {
  if (!els.apiKeyLabel) return;
  const v = (els.apiKey?.value || "").trim();
  if (!v) {
    els.apiKeyLabel.textContent = "Auto key";
  } else if (v.startsWith("clex_")) {
    els.apiKeyLabel.textContent = `Key …${v.slice(-4)}`;
  } else {
    els.apiKeyLabel.textContent = "Custom key";
  }
}

// ───── AI chat ─────

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ||
    c,
  );
}

function escapeAttr(s) {
  return String(s ?? "").replace(/"/g, "&quot;");
}

function clearEmptyState() {
  const empty = els.chatThread.querySelector(".ide-chat-empty");
  if (empty) empty.remove();
}

function appendChatMsg(role, content) {
  clearEmptyState();
  const wrap = document.createElement("div");
  wrap.className = `ide-chat-msg ide-chat-msg--${role}`;
  wrap.innerHTML = `
    <span class="ide-chat-msg-role">${role === "user" ? "You" : role === "ai" ? "Assistant" : "Error"}</span>
    <div class="ide-chat-msg-body"></div>
  `;
  els.chatThread.appendChild(wrap);
  els.chatThread.scrollTop = els.chatThread.scrollHeight;
  return wrap.querySelector(".ide-chat-msg-body");
}

// Convert a streaming markdown-ish AI response into safe HTML, extracting
// code blocks tagged ```lang file=path/to/file as actionable diffs.
function renderAiContent(target, raw) {
  // Split on fenced code blocks, preserving the path metadata.
  const parts = [];
  const fenceRe = /```(\w+)?(?:\s+file=([^\s`]+))?\s*\n([\s\S]*?)```/g;
  let last = 0;
  let m;
  while ((m = fenceRe.exec(raw)) !== null) {
    if (m.index > last) {
      parts.push({ type: "text", text: raw.slice(last, m.index) });
    }
    parts.push({
      type: "code",
      lang: m[1] || "",
      path: m[2] || "",
      code: m[3] || "",
    });
    last = m.index + m[0].length;
  }
  if (last < raw.length) {
    parts.push({ type: "text", text: raw.slice(last) });
  }

  let html = "";
  let editIndex = 0;
  const edits = [];
  for (const p of parts) {
    if (p.type === "text") {
      // Render inline code + bold + line breaks; keep it minimal.
      const safe = escapeHtml(p.text)
        .replace(/`([^`]+)`/g, "<code>$1</code>")
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/\n{2,}/g, "</p><p>")
        .replace(/\n/g, "<br>");
      html += `<p>${safe}</p>`;
    } else {
      const langLabel = (p.lang || "text").toUpperCase();
      const headerLeft = p.path
        ? `<span class="ide-code-block-path" title="${escapeAttr(p.path)}">${escapeHtml(p.path)}</span><span class="ide-code-block-lang">${escapeHtml(langLabel)}</span>`
        : `<span class="ide-code-block-path">code</span><span class="ide-code-block-lang">${escapeHtml(langLabel)}</span>`;
      const idAttr = p.path ? `data-edit-index="${editIndex}"` : "";
      const applyBtn = p.path
        ? `<button class="ide-code-block-btn ide-chat-edit-apply" data-apply-index="${editIndex}" type="button">Apply</button>`
        : "";
      const copyBtn = `<button class="ide-code-block-btn ide-chat-edit-copy" data-copy-index="${editIndex}" type="button">Copy</button>`;
      const code = escapeHtml(p.code);
      html += `
        <div class="ide-code-block" ${idAttr}>
          <div class="ide-code-block-header">
            ${headerLeft}
            <div class="ide-code-block-actions">${copyBtn}${applyBtn}</div>
          </div>
          <pre class="ide-code-block-body"><code>${code}</code></pre>
        </div>`;
      edits.push({ index: editIndex, path: p.path, code: p.code });
      editIndex += 1;
    }
  }
  target.innerHTML = html;

  // Wire up apply buttons.
  target.querySelectorAll(".ide-chat-edit-apply").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const idx = Number(btn.dataset.applyIndex);
      const edit = edits[idx];
      if (!edit || !edit.path) return;
      btn.disabled = true;
      btn.textContent = "Applying…";
      try {
        await applyAiEdit(edit.path, edit.code);
        btn.textContent = "Applied";
        btn.classList.add("is-applied");
      } catch (err) {
        btn.textContent = "Failed";
        log(`[error] could not apply edit to ${edit.path}: ${err.message}`);
      }
    });
  });
  // Wire up copy buttons.
  target.querySelectorAll(".ide-chat-edit-copy").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const idx = Number(btn.dataset.copyIndex);
      const edit = edits[idx];
      if (!edit) return;
      try {
        await navigator.clipboard.writeText(edit.code);
        const orig = btn.textContent;
        btn.textContent = "Copied";
        btn.classList.add("is-applied");
        setTimeout(() => {
          btn.textContent = orig;
          btn.classList.remove("is-applied");
        }, 1200);
      } catch (_) {
        btn.textContent = "Failed";
      }
    });
  });
}

async function applyAiEdit(path, code) {
  if (!wc) {
    throw new Error("Boot the sandbox first.");
  }
  const cleanPath = path.replace(/^\/+/, "");
  const parent = cleanPath.split("/").slice(0, -1).join("/");
  if (parent) await wc.fs.mkdir(parent, { recursive: true });
  await wc.fs.writeFile(cleanPath, code);
  log(`[ai-edit] wrote ${cleanPath} (${code.length} chars)`);
  await refreshFileList();
  if (activePath === cleanPath) {
    setEditorDoc(code, cleanPath);
    dirty.delete(cleanPath);
  } else {
    await openFile(cleanPath);
  }
}

async function buildContext() {
  // Active file + an inventory of other files (paths only) so the model can
  // reason about the whole project without us blowing the prompt budget.
  let ctx = "";
  if (wc && activePath) {
    try {
      const text = await wc.fs.readFile(activePath, "utf-8");
      ctx += `Active file: ${activePath}\n\`\`\`\n${text.slice(0, 4000)}\n\`\`\`\n`;
    } catch (_) {
      // ignore
    }
    const others = fileList.filter((f) => f !== activePath).slice(0, 30);
    if (others.length) {
      ctx += `\nOther files in project: ${others.join(", ")}`;
    }
  }
  return ctx;
}

function updateContextHint() {
  if (!els.chatContext) return;
  els.chatContext.innerHTML = "";
  if (!activePath && !fileList.length) {
    const empty = document.createElement("span");
    empty.className = "ide-chat-context-empty";
    empty.textContent = "No context yet — boot the sandbox.";
    els.chatContext.appendChild(empty);
    return;
  }
  // Show the active file as the primary chip.
  if (activePath) {
    const chip = document.createElement("span");
    chip.className = "ide-context-chip";
    chip.title = activePath;
    chip.innerHTML = `<span class="ide-context-chip-at">@</span>${escapeHtml(activePath)}`;
    els.chatContext.appendChild(chip);
  }
  // Show open tabs (other than active) as secondary chips, max 4.
  const others = openTabs.filter((p) => p !== activePath).slice(0, 4);
  for (const p of others) {
    const chip = document.createElement("span");
    chip.className = "ide-context-chip";
    chip.title = p;
    chip.innerHTML = `<span class="ide-context-chip-at">@</span>${escapeHtml(p.split("/").pop())}`;
    els.chatContext.appendChild(chip);
  }
  // Tail summary chip showing how many files are visible to the model.
  if (fileList.length) {
    const summary = document.createElement("span");
    summary.className = "ide-chat-context-empty";
    const otherCount = Math.max(0, fileList.length - 1 - others.length);
    summary.textContent = otherCount > 0
      ? `+ ${otherCount} more in tree`
      : `${fileList.length} file${fileList.length === 1 ? "" : "s"} in tree`;
    els.chatContext.appendChild(summary);
  }
}

function setMode(mode) {
  if (!MODES[mode]) return;
  currentMode = mode;
  if (els.modeTabs) {
    els.modeTabs.forEach((t) => {
      t.classList.toggle("is-active", t.dataset.mode === mode);
      t.setAttribute("aria-selected", t.dataset.mode === mode ? "true" : "false");
    });
  }
  if (els.chatModeHint) els.chatModeHint.textContent = MODES[mode].hint;
  if (els.chatInput) {
    els.chatInput.placeholder =
      mode === "agent"
        ? "Plan a feature or describe an end-to-end change — the agent can edit any file."
        : mode === "edit"
          ? `Refactor the active file${activePath ? ` (${activePath})` : ""}— returns full new contents.`
          : "Ask anything about the project. The model can see the active file.";
  }
}

async function sendChat(text) {
  if (!text || isStreaming) return;
  const model = els.modelInput.value.trim() || "moonshotai/kimi-k2-instruct";
  isStreaming = true;
  els.chatSend.disabled = true;

  appendChatMsg("user", text).textContent = text;
  const aiBody = appendChatMsg("ai", "");
  aiBody.textContent = "Thinking…";

  const context = await buildContext();
  const modeDef = MODES[currentMode] || MODES.ask;
  const systemPrompt = `${modeDef.systemHeader}

Project context:
${context}`;

  // Keep history bounded to last ~10 turns to stay within budget.
  const history = chatHistory.slice(-10);
  const messages = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: text },
  ];

  try {
    const headers = { "Content-Type": "application/json" };
    const key = els.apiKey.value.trim();
    if (key) headers["x-clex-api-key"] = key;

    const res = await fetch("/api/chat", {
      method: "POST",
      headers,
      body: JSON.stringify({ model, messages, stream: true }),
    });

    if (!res.ok) {
      const errText = await res.text();
      aiBody.textContent = "";
      const err = appendChatMsg("err", "");
      err.textContent = `Request failed (${res.status}): ${errText.slice(0, 400) || res.statusText}`;
      return;
    }

    let acc = "";
    if (window.clex?.streamChatCompletionsSSE) {
      await window.clex.streamChatCompletionsSSE(res, {
        onToken: (token) => {
          acc += token;
          renderAiContent(aiBody, acc);
          els.chatThread.scrollTop = els.chatThread.scrollHeight;
        },
      });
    } else {
      const data = await res.json();
      acc = data?.choices?.[0]?.message?.content || JSON.stringify(data);
      renderAiContent(aiBody, acc);
    }

    chatHistory.push({ role: "user", content: text });
    chatHistory.push({ role: "assistant", content: acc });
  } catch (err) {
    aiBody.textContent = "";
    const errBox = appendChatMsg("err", "");
    errBox.textContent = `Error: ${err.message}`;
  } finally {
    isStreaming = false;
    els.chatSend.disabled = !els.chatInput.value.trim();
  }
}

// ───── Bottom dock (preview ⇄ console) ─────

function setDock(which) {
  els.dockTabs.forEach((t) =>
    t.classList.toggle("active", t.dataset.dock === which),
  );
  els.dockBodies.forEach((b) =>
    b.classList.toggle("hidden", b.dataset.dockBody !== which),
  );
  if (els.dock?.classList.contains("is-collapsed")) {
    els.dock.classList.remove("is-collapsed");
    if (els.dockCollapse) els.dockCollapse.textContent = "▾";
  }
}

function setDevice(d) {
  els.deviceBtns.forEach((b) =>
    b.classList.toggle("active", b.dataset.device === d),
  );
  if (!els.previewWrap) return;
  const sizes = {
    desktop: { w: "100%", h: "100%" },
    tablet: { w: "820px", h: "1100px" },
    mobile: { w: "390px", h: "780px" },
  };
  const s = sizes[d] || sizes.desktop;
  els.previewFrame.style.width = s.w;
  els.previewFrame.style.height = s.h;
}

// ───── Wiring ─────

function bind() {
  els.bootBtn.addEventListener("click", bootSandbox);
  els.template.addEventListener("change", reMountIfTemplateChanged);
  els.installBtn.addEventListener("click", async () => {
    if (!wc) return;
    setStatus("installing", "Installing");
    els.installBtn.disabled = true;
    try {
      await runCommand("npm", ["install"]);
      setStatus("ready", "Sandbox ready");
    } finally {
      els.installBtn.disabled = false;
    }
  });
  els.runBtn.addEventListener("click", async () => {
    if (!wc) return;
    els.runBtn.disabled = true;
    setStatus("running", "Starting dev server");
    try {
      await runCommand("npm", ["run", "dev"]);
    } finally {
      els.runBtn.disabled = false;
    }
  });
  els.saveBtn.addEventListener("click", saveActive);
  els.newFileBtn.addEventListener("click", newFilePrompt);
  els.delFileBtn.addEventListener("click", deleteActive);
  els.formatBtn.addEventListener("click", resetActiveFromTemplate);

  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      saveActive();
    }
  });

  els.refreshPreview.addEventListener("click", () => {
    if (els.previewFrame.src && els.previewFrame.src !== "about:blank") {
      // eslint-disable-next-line no-self-assign
      els.previewFrame.src = els.previewFrame.src;
    }
  });
  els.openPreviewTab.addEventListener("click", () => {
    if (els.previewFrame.src && els.previewFrame.src !== "about:blank") {
      window.open(els.previewFrame.src, "_blank");
    }
  });

  els.dockTabs.forEach((t) =>
    t.addEventListener("click", () => setDock(t.dataset.dock)),
  );
  els.dockCollapse.addEventListener("click", () => {
    if (!els.dock) return;
    els.dock.classList.toggle("is-collapsed");
    els.dockCollapse.textContent = els.dock.classList.contains("is-collapsed") ? "▴" : "▾";
  });
  els.deviceBtns.forEach((b) =>
    b.addEventListener("click", () => setDevice(b.dataset.device)),
  );

  // Mode tabs (Ask / Agent / Edit) and ⌘+1–3 hotkeys.
  els.modeTabs.forEach((t) => {
    t.addEventListener("click", () => setMode(t.dataset.mode));
  });
  document.addEventListener("keydown", (e) => {
    if (!(e.metaKey || e.ctrlKey)) return;
    if (e.key === "1") { e.preventDefault(); setMode("ask"); }
    else if (e.key === "2") { e.preventDefault(); setMode("agent"); }
    else if (e.key === "3") { e.preventDefault(); setMode("edit"); }
  });

  // Chat
  els.chatInput.addEventListener("input", () => {
    els.chatSend.disabled = !els.chatInput.value.trim() || isStreaming;
  });
  els.chatInput.addEventListener("keydown", (e) => {
    // Enter → send. Shift+Enter → newline. Matches the in-pane help text.
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (els.chatInput.value.trim() && !isStreaming) {
        els.chatForm.requestSubmit();
      }
    }
  });
  els.chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = els.chatInput.value.trim();
    if (!text) return;
    els.chatInput.value = "";
    els.chatSend.disabled = true;
    sendChat(text);
  });
  els.chatClear.addEventListener("click", () => {
    chatHistory = [];
    els.chatThread.innerHTML = `
      <div class="ide-chat-empty">
        <h3 class="ide-chat-empty-title">Pair-program with Clex.</h3>
        <p class="ide-chat-empty-line">Switch to <strong>Agent</strong> to scaffold and edit files directly. The model sees your active file plus everything in the explorer.</p>
        <p class="ide-chat-empty-hint">Code blocks tagged <code>\`\`\`lang file=path/to/file</code> get an <strong>Apply</strong> button that writes straight to the sandbox.</p>
      </div>`;
  });
  $$(".ide-chip").forEach((chip) => {
    if (!chip.dataset.prompt) return;
    chip.addEventListener("click", () => {
      els.chatInput.value = chip.dataset.prompt;
      els.chatSend.disabled = isStreaming;
      els.chatInput.focus();
    });
  });

  els.modelInput.addEventListener("change", updateCreditHint);
  els.apiKey.addEventListener("input", updateApiKeyLabel);

  // Hamburger menu — open / close on click + outside-click + Esc.
  if (els.menuBtn && els.menu) {
    const closeMenu = () => {
      els.menu.hidden = true;
      els.menuBtn.setAttribute("aria-expanded", "false");
    };
    const openMenu = () => {
      els.menu.hidden = false;
      els.menuBtn.setAttribute("aria-expanded", "true");
    };
    els.menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (els.menu.hidden) openMenu();
      else closeMenu();
    });
    document.addEventListener("click", (e) => {
      if (els.menu.hidden) return;
      if (els.menu.contains(e.target) || els.menuBtn.contains(e.target)) return;
      closeMenu();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !els.menu.hidden) closeMenu();
    });
  }

  els.newFileBtn.disabled = !wc;
  els.delFileBtn.disabled = !wc;

  // Bootstrapping the model list as soon as models-data.js has loaded.
  if (window.CLEX_MODELS) {
    loadModels();
  } else {
    // models-data.js is loaded synchronously above this script tag, so this
    // path is effectively unreachable, but keep a defensive timer just in
    // case the load order ever changes.
    setTimeout(loadModels, 200);
  }
}

bind();
setMode("ask");
updateContextHint();
updateApiKeyLabel();
setStatus("idle", "Idle");
log("Welcome to the Clex AI IDE. Click Boot sandbox to start.");
