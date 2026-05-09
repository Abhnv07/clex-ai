// ════════════════════════════════════════════════════════════════════════════
// Clex AI IDE — playground-layout.js
//
// Drives the resizable column / row splitters and the mobile tab-pane
// swapper. Pure DOM + CSS variables, no framework.
//
// CSS variables tweaked:
//   --files-w   → width of the left file tree
//   --chat-w    → width of the right AI chat
//   --dock-h    → height of the bottom preview/console dock
//
// All sizes persist in localStorage per breakpoint so a phone-sized window
// doesn't poison the desktop layout and vice-versa.
// ════════════════════════════════════════════════════════════════════════════

const ROOT = /** @type {HTMLElement} */ (document.documentElement);
const BODY = /** @type {HTMLBodyElement} */ (document.body);

const STORAGE_KEY = "clex.playground.layout.v1";

const MIN_FILES_W = 160;
const MAX_FILES_W = 480;
const MIN_CHAT_W = 280;
const MAX_CHAT_W = 720;
const MIN_DOCK_H = 120;
const MAX_DOCK_H = 0.8; // multiplier of viewport height — clamped at runtime

/**
 * @typedef {Object} LayoutState
 * @property {number} filesW
 * @property {number} chatW
 * @property {number} dockH
 */

/** @returns {LayoutState | null} */
function readState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = /** @type {LayoutState} */ (JSON.parse(raw));
    if (
      typeof parsed.filesW !== "number" ||
      typeof parsed.chatW !== "number" ||
      typeof parsed.dockH !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** @param {LayoutState} state */
function writeState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* private mode — no-op */
  }
}

/** @returns {LayoutState} */
function defaults() {
  return { filesW: 240, chatW: 400, dockH: 240 };
}

/** @param {LayoutState} state */
function applyState(state) {
  const maxDockH = Math.floor(window.innerHeight * MAX_DOCK_H);
  const filesW = clamp(state.filesW, MIN_FILES_W, MAX_FILES_W);
  const chatW = clamp(state.chatW, MIN_CHAT_W, MAX_CHAT_W);
  const dockH = clamp(state.dockH, MIN_DOCK_H, maxDockH);
  ROOT.style.setProperty("--files-w", filesW + "px");
  ROOT.style.setProperty("--chat-w", chatW + "px");
  ROOT.style.setProperty("--dock-h", dockH + "px");
}

/** @param {number} v @param {number} lo @param {number} hi */
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Wire one column splitter. The handle, when dragged, mutates the named CSS
 * variable in pixels (delta from the starting size).
 *
 * @param {string} handleId
 * @param {"files" | "chat"} which
 */
function bindColSplitter(handleId, which) {
  const handle = document.getElementById(handleId);
  if (!handle) return;

  const onPointerDown = (/** @type {PointerEvent} */ ev) => {
    if (window.matchMedia("(max-width: 820px)").matches) return;
    ev.preventDefault();
    handle.setPointerCapture(ev.pointerId);
    handle.classList.add("is-dragging");
    BODY.classList.add("is-resizing");

    const startX = ev.clientX;
    const startState = currentState();
    const startW = which === "files" ? startState.filesW : startState.chatW;

    const onMove = (/** @type {PointerEvent} */ e) => {
      const dx = e.clientX - startX;
      const next = which === "files" ? startW + dx : startW - dx;
      const lo = which === "files" ? MIN_FILES_W : MIN_CHAT_W;
      const hi = which === "files" ? MAX_FILES_W : MAX_CHAT_W;
      const clamped = clamp(next, lo, hi);
      ROOT.style.setProperty(
        which === "files" ? "--files-w" : "--chat-w",
        clamped + "px",
      );
    };
    const onUp = () => {
      handle.releasePointerCapture(ev.pointerId);
      handle.classList.remove("is-dragging");
      BODY.classList.remove("is-resizing");
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
      writeState(currentState());
    };
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
  };

  handle.addEventListener("pointerdown", onPointerDown);
  // Keyboard accessibility: arrow keys nudge by 16 px.
  handle.addEventListener("keydown", (/** @type {KeyboardEvent} */ e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const sign = e.key === "ArrowLeft" ? -1 : 1;
    const step = e.shiftKey ? 48 : 16;
    const state = currentState();
    if (which === "files") state.filesW += sign * step;
    else state.chatW -= sign * step;
    applyState(state);
    writeState(currentState());
  });
}

/** Wire the horizontal splitter above the dock. */
function bindRowSplitter() {
  const handle = document.getElementById("ide-splitter-dock");
  if (!handle) return;

  const onPointerDown = (/** @type {PointerEvent} */ ev) => {
    if (window.matchMedia("(max-width: 820px)").matches) return;
    ev.preventDefault();
    handle.setPointerCapture(ev.pointerId);
    handle.classList.add("is-dragging");
    BODY.classList.add("is-resizing");
    BODY.classList.add("is-resizing--row");

    const startY = ev.clientY;
    const startState = currentState();

    const onMove = (/** @type {PointerEvent} */ e) => {
      const dy = e.clientY - startY;
      const next = startState.dockH - dy;
      const maxDockH = Math.floor(window.innerHeight * MAX_DOCK_H);
      const clamped = clamp(next, MIN_DOCK_H, maxDockH);
      ROOT.style.setProperty("--dock-h", clamped + "px");
    };
    const onUp = () => {
      handle.releasePointerCapture(ev.pointerId);
      handle.classList.remove("is-dragging");
      BODY.classList.remove("is-resizing");
      BODY.classList.remove("is-resizing--row");
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
      writeState(currentState());
    };
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
  };

  handle.addEventListener("pointerdown", onPointerDown);
  handle.addEventListener("keydown", (/** @type {KeyboardEvent} */ e) => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const sign = e.key === "ArrowUp" ? 1 : -1;
    const step = e.shiftKey ? 48 : 16;
    const state = currentState();
    state.dockH += sign * step;
    applyState(state);
    writeState(currentState());
  });
}

/** Read the current values back from the inline style on :root. */
function currentState() {
  /** @param {string} v @param {number} fallback */
  const px = (v, fallback) => {
    const n = parseInt(v.trim(), 10);
    return Number.isFinite(n) ? n : fallback;
  };
  const cs = getComputedStyle(ROOT);
  const d = defaults();
  return {
    filesW: px(cs.getPropertyValue("--files-w"), d.filesW),
    chatW: px(cs.getPropertyValue("--chat-w"), d.chatW),
    dockH: px(cs.getPropertyValue("--dock-h"), d.dockH),
  };
}

/** Mobile pane swapper — sets body[data-mobile-pane=...]. */
function bindMobileTabs() {
  const tabs = /** @type {HTMLButtonElement[]} */ (
    Array.from(document.querySelectorAll(".ide-mobile-tab"))
  );
  if (!tabs.length) return;

  /** @param {string} which */
  const setPane = (which) => {
    BODY.dataset.mobilePane = which;
    for (const tab of tabs) {
      const isActive = tab.dataset.mobilePane === which;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
    }
  };

  for (const tab of tabs) {
    tab.addEventListener("click", () => {
      const which = tab.dataset.mobilePane;
      if (which) setPane(which);
    });
  }

  // Default to "editor" on mobile so users land on code, not file tree.
  if (window.matchMedia("(max-width: 820px)").matches) {
    setPane("editor");
  } else {
    BODY.dataset.mobilePane = "editor";
  }

  window.addEventListener("resize", () => {
    if (
      window.matchMedia("(max-width: 820px)").matches &&
      !BODY.dataset.mobilePane
    ) {
      setPane("editor");
    }
  });
}

/** Public entrypoint — call once after the IDE DOM is ready. */
export function initPlaygroundLayout() {
  applyState(readState() || defaults());
  bindColSplitter("ide-splitter-files", "files");
  bindColSplitter("ide-splitter-chat", "chat");
  bindRowSplitter();
  bindMobileTabs();
  window.addEventListener("resize", () => {
    // Re-clamp on viewport changes (e.g., orientation flip).
    applyState(readState() || defaults());
  });
}
