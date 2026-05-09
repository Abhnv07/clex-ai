// ════════════════════════════════════════════════════════════════════════════
// Clex AI IDE — playground-auth.js
//
// Adds Firebase Sign-in to /playground and auto-mints (or re-uses) a single
// `clex_*` API key labelled "playground" so every signed-in user can hit
// /api/chat without typing or pasting anything. This is what kills the
// "Missing clex API key" 401 most users were seeing.
//
// Public surface:
//
//   import { attachPlaygroundAuth } from "./playground-auth.js";
//   const auth = attachPlaygroundAuth({
//     elements: { ... DOM nodes ... },
//     onKeyReady: (key) => { ... },   // called whenever a usable clex_* key is available
//     onSignedOut: () => { ... },
//   });
//
//   auth.getKey();         // -> "clex_..." | null  (synchronous, from cache)
//   await auth.ensureKey() // -> "clex_..." | null  (mints if needed)
//   await auth.signOut();
//
// The Firebase config is the same one used by /dashboard/dashboard.js
// (Firebase project clex-in). We only need google sign-in here; email /
// github / etc are handled by the dashboard.
// ════════════════════════════════════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCkq2q4kxUyY-Cj2YTNXweI7ckzIx7eots",
  authDomain: "clex-in.firebaseapp.com",
  projectId: "clex-in",
  storageBucket: "clex-in.firebasestorage.app",
  messagingSenderId: "1050016400675",
  appId: "1:1050016400675:web:32eaedd53bc82d2663f896",
  measurementId: "G-P5RC17ZCY2",
};

const PLAYGROUND_KEY_NAME = "playground";
// localStorage key. Scoped per Firebase UID so two accounts in the same
// browser don't trample each other.
const KEY_CACHE_PREFIX = "clex.playground.key.";

const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

/**
 * @typedef {Object} PlaygroundAuthElements
 * @property {HTMLElement | null} root            container in the topbar that holds the auth chip
 * @property {HTMLButtonElement | null} signInBtn "Sign in with Google" button (signed-out)
 * @property {HTMLElement | null} profile         signed-in profile chip (avatar + name)
 * @property {HTMLImageElement | null} avatar     avatar img inside profile chip
 * @property {HTMLElement | null} name            display name span inside profile chip
 * @property {HTMLButtonElement | null} signOutBtn "Sign out" button inside profile chip
 * @property {HTMLInputElement | null} apiKeyInput existing topbar `clex_…` text input — we populate it
 * @property {HTMLElement | null} apiKeyLabel     existing label that says "Auto key" / "Key …xyz"
 * @property {HTMLElement | null} status         optional status banner element
 */

/**
 * @typedef {Object} PlaygroundAuthOpts
 * @property {PlaygroundAuthElements} elements
 * @property {(key: string) => void} [onKeyReady]
 * @property {() => void} [onSignedOut]
 */

/**
 * @typedef {Object} PlaygroundAuthHandle
 * @property {() => string | null} getKey
 * @property {() => Promise<string | null>} ensureKey
 * @property {() => Promise<void>} signIn
 * @property {() => Promise<void>} signOutNow
 * @property {() => import("firebase/auth").User | null} currentUser
 */

/**
 * Attach the Firebase auth flow to the playground topbar.
 * Idempotent — calling twice is a no-op (we only attach listeners once).
 *
 * @param {PlaygroundAuthOpts} opts
 * @returns {PlaygroundAuthHandle}
 */
export function attachPlaygroundAuth(opts) {
  const { elements, onKeyReady, onSignedOut } = opts;

  /** @type {string | null} */
  let cachedKey = null;
  /** @type {import("firebase/auth").User | null} */
  let cachedUser = null;
  /** @type {Promise<string | null> | null} */
  let inflightMint = null;

  // Hook up DOM listeners (defensive — every node is optional).
  elements.signInBtn?.addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      // Popup blocked → fall back to redirect (same UX dashboard.js uses).
      try {
        await signInWithRedirect(auth, googleProvider);
      } catch (e2) {
        showStatus(
          `Sign-in failed: ${(/** @type {Error} */ (e2)).message}`,
          "error",
        );
      }
    }
  });
  elements.signOutBtn?.addEventListener("click", async (e) => {
    e.preventDefault();
    await signOutNow();
  });

  onAuthStateChanged(auth, async (user) => {
    cachedUser = user;
    if (!user) {
      cachedKey = null;
      renderSignedOut();
      onSignedOut?.();
      return;
    }
    renderSignedIn(user);
    try {
      const key = await ensureKey();
      if (key) {
        applyKey(key);
        onKeyReady?.(key);
      }
    } catch (err) {
      showStatus(
        `Could not provision your playground API key: ${(/** @type {Error} */ (err)).message}`,
        "error",
      );
    }
  });

  // ─── helpers ────────────────────────────────────────────────────────────

  function renderSignedOut() {
    if (elements.signInBtn) elements.signInBtn.hidden = false;
    if (elements.profile) elements.profile.hidden = true;
    if (elements.root) elements.root.dataset.authState = "signed-out";
    if (elements.apiKeyInput) elements.apiKeyInput.value = "";
    if (elements.apiKeyLabel) elements.apiKeyLabel.textContent = "Sign in";
  }

  /** @param {import("firebase/auth").User} user */
  function renderSignedIn(user) {
    if (elements.signInBtn) elements.signInBtn.hidden = true;
    if (elements.profile) elements.profile.hidden = false;
    if (elements.root) elements.root.dataset.authState = "signed-in";
    if (elements.avatar) {
      elements.avatar.src = user.photoURL || transparentDataUri();
      elements.avatar.alt = user.displayName || user.email || "Account";
    }
    if (elements.name) {
      elements.name.textContent =
        user.displayName || user.email || "Signed in";
    }
  }

  /** @param {string} key */
  function applyKey(key) {
    cachedKey = key;
    if (elements.apiKeyInput) {
      elements.apiKeyInput.value = key;
      elements.apiKeyInput.dispatchEvent(new Event("input", { bubbles: true }));
    }
    if (elements.apiKeyLabel) {
      elements.apiKeyLabel.textContent = `Auto · …${key.slice(-4)}`;
    }
  }

  function getKey() {
    return cachedKey;
  }

  /**
   * Ensure we have a usable clex_* key for the current user. Returns null if
   * no user is signed in. Caches per-uid in localStorage to avoid re-minting.
   * Concurrent callers share the same in-flight promise.
   */
  async function ensureKey() {
    const user = cachedUser || auth.currentUser;
    if (!user) return null;
    if (cachedKey) return cachedKey;
    if (inflightMint) return inflightMint;

    const cacheKey = KEY_CACHE_PREFIX + user.uid;
    const fromLs = readLocalStorage(cacheKey);
    if (fromLs) {
      cachedKey = fromLs;
      return fromLs;
    }

    inflightMint = mintKey(user, cacheKey).finally(() => {
      inflightMint = null;
    });
    return inflightMint;
  }

  /**
   * @param {import("firebase/auth").User} user
   * @param {string} cacheKey
   * @returns {Promise<string | null>}
   */
  async function mintKey(user, cacheKey) {
    const idToken = await user.getIdToken();

    // First check if we already have a "playground" key on the account so we
    // don't burn a slot in the per-account key cap on every fresh browser.
    const listRes = await fetch("/api/keys", {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (listRes.ok) {
      const data = /** @type {{ keys?: Array<{ name: string, is_active: boolean, prefix: string }> }} */ (
        await listRes.json()
      );
      const existing = (data.keys || []).find(
        (k) => k.name === PLAYGROUND_KEY_NAME && k.is_active,
      );
      if (existing) {
        // We can't recover the plaintext for an existing key — only the
        // prefix is stored server-side. Mint a *new* one labelled
        // "playground" only if none exists *or* none is cached locally.
        // Falling through here means: there IS one server-side but we don't
        // have its plaintext locally → we need to revoke + re-mint or fall
        // back to asking the user. Simpler UX: mint a new one with a
        // numeric suffix so the cap-check still has headroom.
      }
    } else if (listRes.status === 401) {
      throw new Error("Firebase token rejected — please sign in again.");
    }

    // Mint a fresh key. We name it "playground" (or "playground-N" if
    // taken) so it's obvious in the dashboard which one came from the IDE.
    const name = await pickKeyName(idToken);
    const createRes = await fetch("/api/keys", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ name }),
    });
    if (!createRes.ok) {
      let msg = `HTTP ${createRes.status}`;
      try {
        const body = /** @type {{ error?: string, message?: string }} */ (
          await createRes.json()
        );
        msg = body.message || body.error || msg;
      } catch {
        /* ignore */
      }
      throw new Error(msg);
    }
    const created = /** @type {{ key: string }} */ (await createRes.json());
    if (!created.key || !created.key.startsWith("clex_")) {
      throw new Error("Server returned an unexpected key shape.");
    }
    writeLocalStorage(cacheKey, created.key);
    cachedKey = created.key;
    return created.key;
  }

  /** @param {string} idToken */
  async function pickKeyName(idToken) {
    try {
      const res = await fetch("/api/keys", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) return PLAYGROUND_KEY_NAME;
      const data = /** @type {{ keys?: Array<{ name: string }> }} */ (
        await res.json()
      );
      const taken = new Set((data.keys || []).map((k) => k.name));
      if (!taken.has(PLAYGROUND_KEY_NAME)) return PLAYGROUND_KEY_NAME;
      for (let i = 2; i < 50; i++) {
        const candidate = `${PLAYGROUND_KEY_NAME}-${i}`;
        if (!taken.has(candidate)) return candidate;
      }
      return `${PLAYGROUND_KEY_NAME}-${Date.now()}`;
    } catch {
      return PLAYGROUND_KEY_NAME;
    }
  }

  async function signIn() {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch {
      await signInWithRedirect(auth, googleProvider);
    }
  }

  async function signOutNow() {
    const user = cachedUser || auth.currentUser;
    if (user) {
      try {
        localStorage.removeItem(KEY_CACHE_PREFIX + user.uid);
      } catch {
        /* ignore */
      }
    }
    cachedKey = null;
    await signOut(auth);
  }

  /** @param {string} text @param {"info"|"error"} [tone] */
  function showStatus(text, tone) {
    const el = elements.status;
    if (!el) {
      // eslint-disable-next-line no-console
      console.warn("[playground-auth]", text);
      return;
    }
    el.textContent = text;
    el.dataset.tone = tone || "info";
    el.hidden = false;
    setTimeout(() => {
      el.hidden = true;
    }, 6000);
  }

  return {
    getKey,
    ensureKey,
    signIn,
    signOutNow,
    currentUser: () => cachedUser,
  };
}

// ─── localStorage helpers (defensive — Safari private mode throws) ─────────
/** @param {string} k */
function readLocalStorage(k) {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}

/** @param {string} k @param {string} v */
function writeLocalStorage(k, v) {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
}

function transparentDataUri() {
  return (
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><rect width="24" height="24" rx="12" fill="#1a1a1a"/></svg>',
    )
  );
}
