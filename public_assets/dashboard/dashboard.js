// Clex AI dashboard SPA — Firebase auth + /api/* (Cloudflare Pages Functions).
// No bundler — loads Firebase Web SDK from gstatic CDN.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCkq2q4kxUyY-Cj2YTNXweI7ckzIx7eots",
  authDomain: "clex-in.firebaseapp.com",
  projectId: "clex-in",
  storageBucket: "clex-in.firebasestorage.app",
  messagingSenderId: "1050016400675",
  appId: "1:1050016400675:web:32eaedd53bc82d2663f896",
  measurementId: "G-P5RC17ZCY2",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

// ─────────── DOM helpers ───────────

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[c],
  );
}

function fmtNumber(n) {
  if (n === null || n === undefined) return "—";
  return Number(n).toLocaleString();
}

function fmtTime(epoch) {
  if (!epoch) return "—";
  return new Date(epoch * 1000).toLocaleString();
}

function fmtRelative(epoch) {
  if (!epoch) return "—";
  const diff = Math.floor(Date.now() / 1000 - epoch);
  if (diff < 60) return diff + "s ago";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  return Math.floor(diff / 86400) + "d ago";
}

function fmtDayStamp(yyyymmdd) {
  if (yyyymmdd === null || yyyymmdd === undefined) return "—";
  const s = String(yyyymmdd);
  return s.length === 8
    ? s.slice(0, 4) + "-" + s.slice(4, 6) + "-" + s.slice(6, 8)
    : s;
}

let toastTimer = null;
function toast(msg, kind = "") {
  const el = $("#toast");
  el.className = "toast " + kind;
  el.textContent = msg;
  el.hidden = false;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.hidden = true;
  }, 3200);
}

// ─────────── API wrapper ───────────

let cachedToken = null;
let cachedTokenExpiry = 0;

async function getIdToken(forceRefresh = false) {
  const u = auth.currentUser;
  if (!u) return null;
  if (
    !forceRefresh &&
    cachedToken &&
    Date.now() < cachedTokenExpiry - 60_000
  ) {
    return cachedToken;
  }
  const t = await u.getIdToken(forceRefresh);
  cachedToken = t;
  cachedTokenExpiry = Date.now() + 50 * 60_000;
  return t;
}

async function api(path, opts = {}) {
  const token = await getIdToken();
  if (!token) throw new Error("Not signed in");
  const headers = Object.assign(
    {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    opts.headers || {},
  );
  const res = await fetch(path, { ...opts, headers });
  if (res.status === 401) {
    cachedToken = null;
    const t = await getIdToken(true);
    if (t) {
      const res2 = await fetch(path, {
        ...opts,
        headers: Object.assign({}, headers, { Authorization: "Bearer " + t }),
      });
      return handleResponse(res2);
    }
  }
  return handleResponse(res);
}

async function handleResponse(res) {
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_) {
    data = null;
  }
  if (!res.ok) {
    const msg =
      (data && (data.error || data.message)) ||
      `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// ─────────── Auth UI ───────────

function showAuth() {
  $("#auth-screen").hidden = false;
  $("#shell").hidden = true;
}

function showShell() {
  $("#auth-screen").hidden = true;
  $("#shell").hidden = false;
}

function setAuthError(message) {
  const el = $("#auth-error");
  if (!message) {
    el.hidden = true;
    el.textContent = "";
    return;
  }
  el.textContent = message;
  el.hidden = false;
}

function bindAuthTabs() {
  $$(".auth-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      $$(".auth-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const which = tab.dataset.tab;
      $("#form-signin").hidden = which !== "signin";
      $("#form-signup").hidden = which !== "signup";
      setAuthError("");
    });
  });
}

function bindAuthForms() {
  $("#form-signin").addEventListener("submit", async (e) => {
    e.preventDefault();
    setAuthError("");
    const email = $("#signin-email").value.trim();
    const password = $("#signin-password").value;
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setAuthError(humanFirebaseError(err));
    }
  });

  $("#form-signup").addEventListener("submit", async (e) => {
    e.preventDefault();
    setAuthError("");
    const email = $("#signup-email").value.trim();
    const password = $("#signup-password").value;
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setAuthError(humanFirebaseError(err));
    }
  });

  $("#signin-reset").addEventListener("click", async () => {
    setAuthError("");
    const email = $("#signin-email").value.trim();
    if (!email) {
      setAuthError("Type your email above first.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      toast("Reset email sent.", "success");
    } catch (err) {
      setAuthError(humanFirebaseError(err));
    }
  });

  $("#oauth-google").addEventListener("click", async () => {
    setAuthError("");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(humanFirebaseError(err));
    }
  });

  $("#oauth-github").addEventListener("click", async () => {
    setAuthError("");
    try {
      await signInWithPopup(auth, githubProvider);
    } catch (err) {
      setAuthError(humanFirebaseError(err));
    }
  });
}

function humanFirebaseError(err) {
  const code = err && err.code;
  switch (code) {
    case "auth/invalid-email":
      return "That doesn't look like a valid email.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Email or password didn't match.";
    case "auth/email-already-in-use":
      return "An account with that email already exists. Try signing in.";
    case "auth/weak-password":
      return "Password is too weak — use at least 8 characters.";
    case "auth/popup-closed-by-user":
      return "Sign-in window was closed before finishing.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    default:
      return (err && err.message) || "Something went wrong.";
  }
}

$("#logout-btn")?.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (err) {
    toast("Couldn't sign out: " + (err.message || err), "error");
  }
});

// ─────────── Routing ───────────

const routes = ["overview", "keys", "usage", "plan"];

function setRoute(name) {
  if (!routes.includes(name)) name = "overview";
  routes.forEach((r) => {
    const el = $(`#route-${r}`);
    if (el) el.hidden = r !== name;
  });
  $$(".nav-item[data-route]").forEach((b) => {
    b.classList.toggle("active", b.dataset.route === name);
  });
  const titleMap = {
    overview: ["Account ", "overview"],
    keys: ["Your ", "API keys"],
    usage: ["Live ", "usage"],
    plan: ["Plan & ", "billing"],
  };
  const [base, italic] = titleMap[name];
  $("#page-title").innerHTML =
    `<span class="page-title-base">${escapeHtml(base)}</span>` +
    `<span class="page-title-italic">${escapeHtml(italic)}</span>`;
  if (location.hash !== "#" + name) location.hash = name;
  if (name === "overview") loadOverview();
  if (name === "keys") loadKeys();
  if (name === "usage") loadUsage();
  if (name === "plan") loadPlan();
}

function bindNav() {
  $$(".nav-item[data-route]").forEach((b) => {
    b.addEventListener("click", () => setRoute(b.dataset.route));
  });
  $$(".btn-ghost[data-jump]").forEach((b) => {
    b.addEventListener("click", () => setRoute(b.dataset.jump));
  });
}

// ─────────── Data caches ───────────

let cachedMe = null;
let cachedUsage = null;
let cachedKeys = null;

async function loadMe(force = false) {
  if (cachedMe && !force) return cachedMe;
  cachedMe = await api("/api/me");
  return cachedMe;
}

async function loadUsageData(force = false) {
  if (cachedUsage && !force) return cachedUsage;
  cachedUsage = await api("/api/usage");
  return cachedUsage;
}

async function loadKeysData(force = false) {
  if (cachedKeys && !force) return cachedKeys;
  const data = await api("/api/keys");
  cachedKeys = data.keys || [];
  return cachedKeys;
}

// ─────────── Overview ───────────

async function loadOverview() {
  try {
    const [me, usage, keys] = await Promise.all([
      loadMe(),
      loadUsageData(),
      loadKeysData(),
    ]);
    renderAccountMeta(me);
    renderOverviewStats(me, usage, keys);
    renderOverviewPlan(me, usage);
    renderOverviewRecent(usage);
    renderSpark($("#overview-spark"), (usage.daily || []).slice(-14));
  } catch (err) {
    toast("Couldn't load overview: " + err.message, "error");
  }
}

function renderAccountMeta(me) {
  const { user } = me;
  const lines = [];
  if (user.email) lines.push(escapeHtml(user.email));
  if (user.display_name) lines.push(escapeHtml(user.display_name));
  lines.push(escapeHtml(user.id));
  $("#account-meta").innerHTML = lines.join("<br />");
}

function liveSnapshot(me, usage) {
  const live = (usage && usage.live) || {};
  const minute =
    typeof live.minute === "number" ? live.minute : me.usage.minute;
  const day = typeof live.day === "number" ? live.day : me.usage.day;
  return { minute, day };
}

function renderOverviewStats(me, usage, keys) {
  const limits = me.plan.limits;
  const { minute, day } = liveSnapshot(me, usage);
  const activeKeys = (keys || []).filter((k) => !k.revoked_at).length;
  const stats = [
    {
      label: "Plan",
      value: titleCase(me.plan.tier),
      meta: me.plan.expires_at
        ? `Until ${fmtTime(me.plan.expires_at)}`
        : me.plan.tier === "free"
          ? "Default tier"
          : "Lifetime",
      gold: me.plan.tier !== "free",
    },
    {
      label: "Today",
      value: fmtNumber(day),
      meta: `of ${fmtNumber(limits.requests_per_day)} / day`,
    },
    {
      label: "This minute",
      value: fmtNumber(minute),
      meta: `of ${fmtNumber(limits.requests_per_minute)} / min`,
    },
    {
      label: "Active keys",
      value: fmtNumber(activeKeys),
      meta: `of ${fmtNumber(limits.max_active_keys)} max`,
    },
  ];
  $("#overview-stats").innerHTML = stats
    .map(
      (s) => `
      <div class="stat">
        <span class="stat-label">${escapeHtml(s.label)}</span>
        <span class="stat-value">${s.gold ? `<span class="italic">${escapeHtml(s.value)}</span>` : escapeHtml(s.value)}</span>
        <span class="stat-meta">${escapeHtml(s.meta)}</span>
      </div>`,
    )
    .join("");
}

function renderOverviewPlan(me, usage) {
  const limits = me.plan.limits;
  const planName = titleCase(me.plan.tier);
  const expiry = me.plan.expires_at
    ? `Renews / expires ${fmtTime(me.plan.expires_at)}`
    : me.plan.tier === "free"
      ? "Default tier · upgrade for higher limits"
      : "Lifetime";
  const { minute, day } = liveSnapshot(me, usage);
  const dayPct = Math.min(
    100,
    Math.round((day / Math.max(1, limits.requests_per_day)) * 100),
  );
  const minutePct = Math.min(
    100,
    Math.round((minute / Math.max(1, limits.requests_per_minute)) * 100),
  );
  $("#overview-plan").innerHTML = `
    <div class="row">
      <span class="label">Tier</span>
      <span><strong>${escapeHtml(planName)}</strong></span>
    </div>
    <div class="row">
      <span class="label">Validity</span>
      <span>${escapeHtml(expiry)}</span>
    </div>
    <div>
      <div class="row">
        <span class="label">Daily quota</span>
        <span>${fmtNumber(day)} / ${fmtNumber(limits.requests_per_day)}</span>
      </div>
      <div class="plan-bar"><span style="width:${dayPct}%"></span></div>
    </div>
    <div>
      <div class="row">
        <span class="label">Per-minute</span>
        <span>${fmtNumber(minute)} / ${fmtNumber(limits.requests_per_minute)}</span>
      </div>
      <div class="plan-bar"><span style="width:${minutePct}%"></span></div>
    </div>
  `;
}

function renderOverviewRecent(usage) {
  const days = (usage.daily || []).slice(-7).reverse();
  if (!days.length) {
    $("#overview-recent").innerHTML =
      `<div class="list-empty">No traffic yet — generate an API key to start.</div>`;
    return;
  }
  $("#overview-recent").innerHTML = days
    .map(
      (d) => `
      <div class="list-item">
        <div>
          <div class="list-title">${escapeHtml(fmtDayStamp(d.day))}</div>
          <div class="list-meta">${fmtNumber(d.successes || 0)} ok · ${fmtNumber(d.errors || 0)} errors</div>
        </div>
        <div class="list-meta">${fmtNumber(d.requests || 0)} calls</div>
      </div>`,
    )
    .join("");
}

// ─────────── Sparkline ───────────

function renderSpark(host, daily) {
  if (!host) return;
  if (!daily || !daily.length) {
    host.innerHTML = `<div class="list-empty" style="width:100%">No data yet.</div>`;
    return;
  }
  const max = Math.max(1, ...daily.map((d) => d.requests || 0));
  host.innerHTML = daily
    .map((d) => {
      const h = ((d.requests || 0) / max) * 100;
      return `<div class="spark-bar" style="height:${Math.max(2, h)}%" data-count="${d.requests || 0}" title="${escapeHtml(fmtDayStamp(d.day))} · ${fmtNumber(d.requests || 0)}"></div>`;
    })
    .join("");
}

// ─────────── Keys ───────────

async function loadKeys() {
  try {
    const list = await loadKeysData(true);
    if (!list.length) {
      $("#keys-list").innerHTML =
        `<div class="list-empty">You haven't generated any keys yet.</div>`;
      return;
    }
    $("#keys-list").innerHTML = list
      .map(
        (k) => `
        <div class="list-item">
          <div>
            <div class="list-title">
              ${escapeHtml(k.name || "Untitled key")}
              ${k.revoked_at ? `<span class="tag error">revoked</span>` : `<span class="tag success">active</span>`}
            </div>
            <div class="list-meta">${escapeHtml(k.prefix || "")}…  ·  created ${escapeHtml(fmtRelative(k.created_at))}  ·  last used ${escapeHtml(k.last_used_at ? fmtRelative(k.last_used_at) : "never")}</div>
          </div>
          <div>
            ${k.revoked_at ? "" : `<button class="btn-danger" data-revoke="${escapeHtml(k.id)}">Revoke</button>`}
          </div>
        </div>`,
      )
      .join("");
    $$("#keys-list [data-revoke]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.revoke;
        if (!confirm("Revoke this API key? This cannot be undone.")) return;
        btn.disabled = true;
        try {
          await api(`/api/keys/${encodeURIComponent(id)}`, {
            method: "DELETE",
          });
          toast("Key revoked.", "success");
          cachedKeys = null;
          await loadKeys();
        } catch (err) {
          toast("Couldn't revoke: " + err.message, "error");
          btn.disabled = false;
        }
      });
    });
  } catch (err) {
    toast("Couldn't load keys: " + err.message, "error");
  }
}

function bindKeyForm() {
  $("#key-create-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("#key-name").value.trim();
    if (!name) return;
    const btn = e.target.querySelector("button");
    btn.disabled = true;
    try {
      const data = await api("/api/keys", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      $("#key-name").value = "";
      const reveal = $("#key-revealed");
      reveal.hidden = false;
      const rec = data.record || {};
      reveal.innerHTML = `
        <div class="label">Your new key — visible once</div>
        <div class="secret">${escapeHtml(data.key)}</div>
        <div class="label">${escapeHtml(rec.name || "")} · ${escapeHtml(rec.prefix || "")}…</div>
        <button class="btn-ghost" id="key-copy">Copy to clipboard</button>
      `;
      $("#key-copy").addEventListener("click", () => {
        navigator.clipboard
          .writeText(data.key)
          .then(() => toast("Copied to clipboard.", "success"))
          .catch(() => toast("Copy failed.", "error"));
      });
      toast("Key created.", "success");
      cachedKeys = null;
      await loadKeys();
    } catch (err) {
      toast("Couldn't create key: " + err.message, "error");
    } finally {
      btn.disabled = false;
    }
  });
  $("#keys-refresh").addEventListener("click", () => {
    cachedKeys = null;
    loadKeys();
  });
}

// ─────────── Usage ───────────

async function loadUsage() {
  try {
    const me = await loadMe();
    const usage = await loadUsageData(true);
    const limits = me.plan.limits;
    const { minute, day } = liveSnapshot(me, usage);
    const total30 = (usage.daily || []).reduce(
      (acc, d) => acc + (d.requests || 0),
      0,
    );
    const errors30 = (usage.daily || []).reduce(
      (acc, d) => acc + (d.errors || 0),
      0,
    );
    const stats = [
      {
        label: "Today",
        value: fmtNumber(day),
        meta: `of ${fmtNumber(limits.requests_per_day)}`,
      },
      {
        label: "This minute",
        value: fmtNumber(minute),
        meta: `of ${fmtNumber(limits.requests_per_minute)}`,
      },
      {
        label: "Last 30 days",
        value: fmtNumber(total30),
        meta: `${fmtNumber(errors30)} errors`,
      },
      {
        label: "Plan tier",
        value: titleCase(me.plan.tier),
        meta: me.plan.expires_at
          ? `Until ${fmtTime(me.plan.expires_at)}`
          : "—",
      },
    ];
    $("#usage-stats").innerHTML = stats
      .map(
        (s) => `
        <div class="stat">
          <span class="stat-label">${escapeHtml(s.label)}</span>
          <span class="stat-value">${escapeHtml(s.value)}</span>
          <span class="stat-meta">${escapeHtml(s.meta)}</span>
        </div>`,
      )
      .join("");
    renderSpark($("#usage-spark"), usage.daily || []);
    const recent = (usage.daily || []).slice(-30).reverse();
    if (!recent.length) {
      $("#usage-recent").innerHTML =
        `<div class="list-empty">No requests yet — once you call /v1/chat/completions, they'll show here.</div>`;
    } else {
      $("#usage-recent").innerHTML = recent
        .map(
          (d) => `
          <div class="list-item">
            <div>
              <div class="list-title">${escapeHtml(fmtDayStamp(d.day))}</div>
              <div class="list-meta">${fmtNumber(d.successes || 0)} ok · ${fmtNumber(d.errors || 0)} errors</div>
            </div>
            <div class="list-meta">${fmtNumber(d.requests || 0)} calls</div>
          </div>`,
        )
        .join("");
    }
  } catch (err) {
    toast("Couldn't load usage: " + err.message, "error");
  }
}

// ─────────── Plan ───────────

async function loadPlan() {
  try {
    const me = await loadMe(true);
    const limits = me.plan.limits;
    $("#plan-current").innerHTML = `
      <div class="card-head">
        <div>
          <h3 class="card-title">Current plan</h3>
          <p class="card-sub">
            ${me.plan.expires_at ? `Expires ${escapeHtml(fmtTime(me.plan.expires_at))}` : "No expiry"}
          </p>
        </div>
        <span class="tag gold">${escapeHtml(titleCase(me.plan.tier))}</span>
      </div>
      <div class="grid-3col" style="margin-top:8px">
        <div class="stat">
          <span class="stat-label">Requests / day</span>
          <span class="stat-value">${fmtNumber(limits.requests_per_day)}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Requests / minute</span>
          <span class="stat-value">${fmtNumber(limits.requests_per_minute)}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Active keys</span>
          <span class="stat-value">${fmtNumber(limits.max_active_keys)}</span>
        </div>
      </div>
    `;
    $$("#route-plan .plan-card").forEach((card) => {
      const cta = card.querySelector(".plan-cta");
      const planName = card.dataset.plan;
      if (planName === me.plan.tier) {
        cta.textContent = "Current plan";
        cta.disabled = true;
        cta.classList.remove("btn-gold");
        cta.classList.add("btn-ghost");
      } else if (planName === "free") {
        cta.textContent = "Default tier";
        cta.disabled = true;
        cta.classList.remove("btn-gold");
        cta.classList.add("btn-ghost");
      } else {
        cta.textContent = "Coming soon";
        cta.disabled = true;
        cta.classList.remove("btn-ghost");
        cta.classList.add("btn-gold");
      }
    });
  } catch (err) {
    toast("Couldn't load plan: " + err.message, "error");
  }
}

// ─────────── Misc ───────────

function titleCase(s) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─────────── Boot ───────────

bindAuthTabs();
bindAuthForms();
bindNav();
bindKeyForm();

window.addEventListener("hashchange", () => {
  if (auth.currentUser) setRoute(location.hash.replace(/^#/, "") || "overview");
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    cachedMe = null;
    cachedUsage = null;
    cachedKeys = null;
    cachedToken = null;
    showAuth();
    return;
  }
  try {
    await loadMe(true);
  } catch (err) {
    if (err.status === 401) {
      try {
        await getIdToken(true);
        await loadMe(true);
      } catch (_) {
        toast("Session ended — sign in again.", "error");
        await signOut(auth);
        return;
      }
    } else {
      toast("Couldn't load account: " + err.message, "error");
    }
  }
  showShell();
  setRoute(location.hash.replace(/^#/, "") || "overview");
});
