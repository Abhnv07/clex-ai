// ════════════════════════════════════════════════════════════════════
// Clex AI · Admin SPA
// Vanilla JS — no bundler. Talks to /api/admin/* endpoints using a
// session id stored in localStorage and sent via X-Admin-Session.
// ════════════════════════════════════════════════════════════════════

const STORE_KEY = "clex.admin.session";

function getSession() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || "null");
  } catch {
    return null;
  }
}
function setSession(sess) {
  if (sess) localStorage.setItem(STORE_KEY, JSON.stringify(sess));
  else localStorage.removeItem(STORE_KEY);
}

async function api(path, opts = {}) {
  const sess = getSession();
  const headers = new Headers(opts.headers || {});
  if (sess?.session_id) headers.set("X-Admin-Session", sess.session_id);
  if (opts.body && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");
  const res = await fetch(path, { ...opts, headers });
  let data = null;
  try {
    data = await res.json();
  } catch {
    // empty
  }
  if (res.status === 401 && sess?.session_id) {
    setSession(null);
    showAuthScreen();
    throw new Error("session_expired");
  }
  if (!res.ok) {
    const err = new Error(data?.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function fmtTime(epochSecondsOrNull) {
  if (!epochSecondsOrNull) return "—";
  const d = new Date(epochSecondsOrNull * 1000);
  return d.toLocaleString();
}
function fmtNumber(n) {
  if (n == null || isNaN(n)) return "0";
  return Number(n).toLocaleString();
}
function fmtRelative(epoch) {
  if (!epoch) return "—";
  const diff = Math.floor(Date.now() / 1000) - epoch;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
function fmtDayStamp(yyyymmdd) {
  if (!yyyymmdd) return "—";
  const s = String(yyyymmdd);
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[m]));
}

function toast(msg, kind = "") {
  const el = document.getElementById("toast");
  el.className = `toast ${kind}`.trim();
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    el.hidden = true;
  }, 3500);
}

// ── Auth screen ───────────────────────────────────────────────────

function showAuthScreen() {
  document.getElementById("shell").hidden = true;
  document.getElementById("auth-screen").hidden = false;
  document.getElementById("auth-error").hidden = true;
  closeUserModal();
}

function closeUserModal() {
  const modal = document.getElementById("user-modal");
  if (modal) modal.hidden = true;
  const body = document.getElementById("user-modal-body");
  if (body) body.innerHTML = "";
}

function showShell() {
  document.getElementById("shell").hidden = false;
  document.getElementById("auth-screen").hidden = true;
}

function bindAuth() {
  const tabs = document.querySelectorAll(".auth-tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const which = tab.dataset.tab;
      document.getElementById("auth-password-form").hidden = which !== "password";
      document.getElementById("auth-passkey-pane").hidden = which !== "passkey";
    });
  });

  document
    .getElementById("auth-password-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const secret = document.getElementById("auth-secret").value;
      const errEl = document.getElementById("auth-error");
      errEl.hidden = true;
      try {
        const data = await fetch("/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ secret }),
        }).then(async (r) => {
          const j = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
          return j;
        });
        setSession(data);
        showShell();
        boot();
      } catch (err) {
        errEl.textContent = `Sign-in failed: ${err.message}`;
        errEl.hidden = false;
      }
    });

  document
    .getElementById("passkey-login-btn")
    .addEventListener("click", async () => {
      const errEl = document.getElementById("auth-error");
      errEl.hidden = true;
      try {
        await loginWithPasskey();
        showShell();
        boot();
      } catch (err) {
        errEl.textContent = `Passkey sign-in failed: ${err.message}`;
        errEl.hidden = false;
      }
    });

  document.getElementById("logout-btn").addEventListener("click", async () => {
    try {
      await api("/api/admin/logout", { method: "POST" });
    } catch {
      // best-effort
    }
    setSession(null);
    showAuthScreen();
  });
}

// ── WebAuthn helpers ──────────────────────────────────────────────

function b64urlToBytes(s) {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}
function bytesToB64url(bytes) {
  let s = "";
  bytes = new Uint8Array(bytes);
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function loginWithPasskey() {
  const begin = await fetch("/api/admin/login/passkey/begin", { method: "POST" })
    .then((r) => r.json());
  if (!begin.publicKey) throw new Error(begin.error || "begin_failed");
  const opts = { ...begin.publicKey };
  opts.challenge = b64urlToBytes(opts.challenge);
  opts.allowCredentials = (opts.allowCredentials || []).map((c) => ({
    ...c,
    id: b64urlToBytes(c.id),
  }));
  const cred = await navigator.credentials.get({ publicKey: opts });
  if (!cred) throw new Error("user_cancelled");
  const r = cred.response;
  const finishRes = await fetch("/api/admin/login/passkey/finish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      handle: begin.handle,
      credentialId: bytesToB64url(cred.rawId),
      response: {
        authenticatorData: bytesToB64url(r.authenticatorData),
        clientDataJSON: bytesToB64url(r.clientDataJSON),
        signature: bytesToB64url(r.signature),
      },
    }),
  }).then(async (rr) => {
    const j = await rr.json().catch(() => ({}));
    if (!rr.ok) throw new Error(j.error || `HTTP ${rr.status}`);
    return j;
  });
  setSession(finishRes);
}

async function registerPasskey() {
  const beginRes = await api("/api/admin/passkeys/register/begin", {
    method: "POST",
  });
  const opts = { ...beginRes.publicKey };
  opts.challenge = b64urlToBytes(opts.challenge);
  opts.user.id = b64urlToBytes(opts.user.id);
  opts.excludeCredentials = (opts.excludeCredentials || []).map((c) => ({
    ...c,
    id: b64urlToBytes(c.id),
  }));
  const cred = await navigator.credentials.create({ publicKey: opts });
  if (!cred) throw new Error("user_cancelled");
  const r = cred.response;
  await api("/api/admin/passkeys/register/finish", {
    method: "POST",
    body: JSON.stringify({
      handle: beginRes.handle,
      label: `Device ${new Date().toISOString().slice(0, 10)}`,
      response: {
        attestationObject: bytesToB64url(r.attestationObject),
        clientDataJSON: bytesToB64url(r.clientDataJSON),
        transports: r.getTransports ? r.getTransports() : [],
      },
    }),
  });
}

// ── Routing ───────────────────────────────────────────────────────

const routes = ["overview", "users", "feeds", "audit", "passkeys"];
const titles = {
  overview: ["Operator ", "overview"],
  users: ["All ", "users"],
  feeds: ["Live ", "feed"],
  audit: ["Security ", "audit"],
  passkeys: ["Admin ", "passkeys"],
};

function setRoute(name) {
  if (!routes.includes(name)) name = "overview";
  routes.forEach((r) => {
    document.getElementById(`route-${r}`).hidden = r !== name;
  });
  document.querySelectorAll(".nav-item").forEach((b) => {
    b.classList.toggle("active", b.dataset.route === name);
  });
  const [base, italic] = titles[name];
  const t = document.getElementById("page-title");
  t.innerHTML = `<span class="page-title-base">${base}</span><span class="page-title-italic">${italic}</span>`;
  document.getElementById("page-actions").innerHTML = "";
  if (name === "overview") loadOverview();
  if (name === "users") loadUsers(true);
  if (name === "feeds") loadFeeds();
  if (name === "audit") loadAudit();
  if (name === "passkeys") loadPasskeys();
}

function bindNav() {
  document.querySelectorAll(".nav-item").forEach((b) =>
    b.addEventListener("click", () => setRoute(b.dataset.route))
  );
}

// ── Overview ──────────────────────────────────────────────────────

async function loadOverview() {
  try {
    const data = await api("/api/admin/stats");
    const planMap = Object.fromEntries(
      (data.plans || []).map((p) => [p.tier, p.n])
    );
    const cards = [
      { label: "Total users", value: fmtNumber(data.users.total) },
      {
        label: "Active API keys",
        value: fmtNumber(data.keys.active),
      },
      {
        label: "Today · requests",
        value: fmtNumber(data.today.requests),
        sub: `${data.today.successes || 0} ok / ${data.today.errors || 0} err`,
      },
      {
        label: "Free tier",
        value: fmtNumber(planMap.free || 0),
      },
      {
        label: "Starter tier",
        value: fmtNumber(planMap.starter || 0),
      },
      {
        label: "Pro tier",
        value: fmtNumber(planMap.pro || 0),
      },
      {
        label: "Developer tier",
        value: fmtNumber(planMap.developer || 0),
      },
    ];
    document.getElementById("overview-stats").innerHTML = cards
      .map(
        (c) => `<div class="stat">
          <div class="stat-label">${escapeHtml(c.label)}</div>
          <div class="stat-value">${escapeHtml(c.value)}</div>
          ${c.sub ? `<div class="stat-sub">${escapeHtml(c.sub)}</div>` : ""}
        </div>`
      )
      .join("");

    const signupsEl = document.getElementById("overview-signups");
    signupsEl.innerHTML =
      (data.recent_signups || [])
        .map(
          (u) => `<div class="list-item compact">
            <div class="cell">
              <div class="cell-main">${escapeHtml(u.email || u.display_name || u.id)}</div>
              <div class="cell-sub">${escapeHtml(u.id)}</div>
            </div>
            <span class="spacer"></span>
            <span class="tag gold">${escapeHtml(u.plan_tier)}</span>
            <span class="cell-sub">${escapeHtml(fmtRelative(u.created_at))}</span>
          </div>`
        )
        .join("") || `<div class="list-empty">No signups yet</div>`;

    const loginsEl = document.getElementById("overview-logins");
    loginsEl.innerHTML =
      (data.recent_admin_logins || [])
        .map(
          (e) => `<div class="list-item compact">
            <div class="cell">
              <div class="cell-main">${escapeHtml(e.method)} · ${escapeHtml(
                e.result
              )}${e.reason ? ` · ${escapeHtml(e.reason)}` : ""}</div>
              <div class="cell-sub">${escapeHtml(e.ip || "—")} · ${escapeHtml(
                (e.ua || "").slice(0, 60)
              )}</div>
            </div>
            <span class="spacer"></span>
            <span class="cell-sub">${escapeHtml(fmtRelative(e.created_at))}</span>
          </div>`
        )
        .join("") || `<div class="list-empty">No admin sessions yet</div>`;

    const last30 = data.last_30 || [];
    const max = Math.max(1, ...last30.map((d) => d.requests || 0));
    const sparkEl = document.getElementById("overview-spark");
    sparkEl.innerHTML = last30
      .map((d) => {
        const h = Math.round(((d.requests || 0) / max) * 100);
        return `<div class="spark-bar" style="height:${Math.max(2, h)}%"
          data-tooltip="${escapeHtml(fmtDayStamp(d.day))} · ${fmtNumber(d.requests)} req"></div>`;
      })
      .join("") || `<div class="list-empty">No requests recorded yet</div>`;
  } catch (err) {
    toast(`Failed to load overview: ${err.message}`, "error");
  }
}

// ── Users ─────────────────────────────────────────────────────────

let usersState = { offset: 0, limit: 25, total: 0 };

function bindUsers() {
  document.getElementById("users-q").addEventListener("input", debounce(() => {
    usersState.offset = 0;
    loadUsers(true);
  }, 300));
  document.getElementById("users-plan").addEventListener("change", () => {
    usersState.offset = 0;
    loadUsers(true);
  });
  document.getElementById("users-refresh").addEventListener("click", () => loadUsers(true));
  document.getElementById("users-prev").addEventListener("click", () => {
    usersState.offset = Math.max(0, usersState.offset - usersState.limit);
    loadUsers(true);
  });
  document.getElementById("users-next").addEventListener("click", () => {
    if (usersState.offset + usersState.limit < usersState.total) {
      usersState.offset += usersState.limit;
      loadUsers(true);
    }
  });
}

function debounce(fn, ms) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

async function loadUsers(force) {
  const q = document.getElementById("users-q").value.trim();
  const plan = document.getElementById("users-plan").value;
  const params = new URLSearchParams({
    limit: String(usersState.limit),
    offset: String(usersState.offset),
  });
  if (q) params.set("q", q);
  if (plan) params.set("plan", plan);
  try {
    const data = await api(`/api/admin/users?${params.toString()}`);
    usersState.total = data.total || 0;
    const tbody = (data.users || [])
      .map(
        (u) => `<tr class="row-action" data-id="${escapeHtml(u.id)}">
          <td>
            <div class="cell">
              <div class="cell-main">${escapeHtml(u.email || u.display_name || "—")}</div>
              <div class="cell-sub">${escapeHtml(u.id)}</div>
            </div>
          </td>
          <td><span class="tag gold">${escapeHtml(u.effective_tier)}</span>
            ${u.is_lifetime ? '<span class="tag">lifetime</span>' : ""}
            ${u.is_blocked ? '<span class="tag error">blocked</span>' : ""}
          </td>
          <td class="mono">${escapeHtml(u.last_ip || "—")}</td>
          <td>${escapeHtml(fmtRelative(u.last_seen_at))}</td>
          <td>${escapeHtml(fmtRelative(u.created_at))}</td>
        </tr>`
      )
      .join("");
    document.getElementById("users-table").innerHTML = `<table>
      <thead>
        <tr>
          <th>User</th><th>Plan</th><th>Last IP</th><th>Last seen</th><th>Joined</th>
        </tr>
      </thead>
      <tbody>${tbody || `<tr><td colspan="5" class="list-empty">No users matched.</td></tr>`}</tbody>
    </table>`;
    document.querySelectorAll("#users-table .row-action").forEach((tr) => {
      tr.addEventListener("click", () => openUserModal(tr.dataset.id));
    });
    document.getElementById("users-page-info").textContent = `${usersState.offset + 1}–${Math.min(usersState.offset + usersState.limit, usersState.total)} of ${usersState.total}`;
  } catch (err) {
    toast(`Failed to load users: ${err.message}`, "error");
  }
}

// ── User modal ────────────────────────────────────────────────────

async function openUserModal(id) {
  const modal = document.getElementById("user-modal");
  const body = document.getElementById("user-modal-body");
  body.innerHTML = `<div class="list-empty">Loading…</div>`;
  modal.hidden = false;

  try {
    const data = await api(`/api/admin/users/${encodeURIComponent(id)}`);
    const u = data.user;
    const planEditId = `plan-edit-${u.id}`;
    body.innerHTML = `
      <section>
        <p class="section-title">Profile</p>
        <dl class="kvgrid">
          <dt>Email</dt><dd>${escapeHtml(u.email || "—")}</dd>
          <dt>Display name</dt><dd>${escapeHtml(u.display_name || "—")}</dd>
          <dt>Firebase uid</dt><dd class="mono">${escapeHtml(u.firebase_uid)}</dd>
          <dt>User id</dt><dd class="mono">${escapeHtml(u.id)}</dd>
          <dt>Joined</dt><dd>${fmtTime(u.created_at)}</dd>
          <dt>Last seen</dt><dd>${fmtTime(u.last_seen_at)}</dd>
          <dt>Last IP</dt><dd class="mono">${escapeHtml(u.last_ip || "—")}</dd>
          <dt>Last UA</dt><dd>${escapeHtml(u.last_ua || "—")}</dd>
        </dl>
      </section>

      <section>
        <p class="section-title">Plan</p>
        <p style="margin:0 0 10px;color:var(--text-secondary);font-size:13px">
          Effective tier · <span class="tag gold">${escapeHtml(u.effective_tier)}</span>
          ${u.is_lifetime ? '<span class="tag">lifetime</span>' : ""}
          ${u.plan_expires_at ? `· expires ${fmtTime(u.plan_expires_at)}` : ""}
        </p>
        <form class="plan-edit" data-id="${escapeHtml(u.id)}" id="${planEditId}">
          <label>Tier
            <select name="tier">
              <option value="free" ${u.plan_tier === "free" ? "selected" : ""}>Free</option>
              <option value="starter" ${u.plan_tier === "starter" ? "selected" : ""}>Starter</option>
              <option value="pro" ${u.plan_tier === "pro" ? "selected" : ""}>Pro</option>
              <option value="developer" ${u.plan_tier === "developer" ? "selected" : ""}>Developer</option>
            </select>
          </label>
          <label>Duration
            <select name="duration">
              <option value="1m">1 month</option>
              <option value="3m">3 months</option>
              <option value="6m">6 months</option>
              <option value="1y">1 year</option>
              <option value="lifetime">Lifetime</option>
            </select>
          </label>
          <label>Note
            <input type="text" name="note" placeholder="Optional reason" />
          </label>
          <button type="submit" class="btn-gold">Apply</button>
        </form>

        <p class="section-title" style="margin-top:18px">Plan history</p>
        ${
          (data.plan.history || []).length === 0
            ? `<div class="list-empty">No plan changes yet</div>`
            : `<div class="list">${(data.plan.history || [])
                .map(
                  (h) => `<div class="list-item compact">
                    <div class="cell">
                      <div class="cell-main">${escapeHtml(h.from_tier)} → ${escapeHtml(h.to_tier)} · ${escapeHtml(h.duration)}</div>
                      <div class="cell-sub">${escapeHtml(h.changed_by)} · ${escapeHtml(h.changed_ip || "—")} · ${escapeHtml(h.note || "")}</div>
                    </div>
                    <span class="spacer"></span>
                    <span class="cell-sub">${fmtRelative(h.created_at)}</span>
                  </div>`
                )
                .join("")}</div>`
        }
      </section>

      <section>
        <p class="section-title">API keys (${(data.keys || []).length})</p>
        ${
          (data.keys || []).length === 0
            ? `<div class="list-empty">No keys created</div>`
            : `<div class="list">${(data.keys || [])
                .map(
                  (k) => `<div class="list-item">
                    <div class="cell">
                      <div class="cell-main">${escapeHtml(k.name)}</div>
                      <div class="cell-sub">${escapeHtml(k.prefix)}…</div>
                    </div>
                    <span class="spacer"></span>
                    ${
                      k.is_active
                        ? '<span class="tag success">active</span>'
                        : '<span class="tag error">revoked</span>'
                    }
                    <span class="cell-sub">used ${fmtRelative(k.last_used_at)}</span>
                  </div>`
                )
                .join("")}</div>`
        }
      </section>

      <section>
        <p class="section-title">Recent calls (${(data.recent_calls || []).length})</p>
        <div class="list">${
          (data.recent_calls || [])
            .slice(0, 30)
            .map(
              (r) => `<div class="list-item compact">
                <div class="cell">
                  <div class="cell-main">${escapeHtml(r.route)}${r.model ? ` · ${escapeHtml(r.model)}` : ""}</div>
                  <div class="cell-sub">${escapeHtml(r.ip || "—")} · ${escapeHtml((r.ua || "").slice(0, 60))}</div>
                </div>
                <span class="spacer"></span>
                <span class="tag ${r.status >= 400 ? "error" : "success"}">${r.status}</span>
                <span class="cell-sub">${fmtRelative(r.created_at)}</span>
              </div>`
            )
            .join("") || `<div class="list-empty">No calls yet</div>`
        }</div>
      </section>

      <section>
        <p class="section-title">IP log (${(data.ip_log || []).length})</p>
        <div class="list">${
          (data.ip_log || [])
            .slice(0, 30)
            .map(
              (i) => `<div class="list-item compact">
                <div class="cell">
                  <div class="cell-main mono">${escapeHtml(i.ip)}</div>
                  <div class="cell-sub">${escapeHtml((i.ua || "").slice(0, 60))} · ${escapeHtml(i.reason)}</div>
                </div>
                <span class="spacer"></span>
                <span class="cell-sub">${fmtRelative(i.created_at)}</span>
              </div>`
            )
            .join("") || `<div class="list-empty">No IP entries</div>`
        }</div>
      </section>

      <section>
        <p class="section-title">Danger zone</p>
        <button class="btn-danger" id="user-delete-btn">Delete this user</button>
      </section>
    `;

    document
      .getElementById(planEditId)
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          await api(`/api/admin/users/${encodeURIComponent(u.id)}/plan`, {
            method: "POST",
            body: JSON.stringify({
              tier: fd.get("tier"),
              duration: fd.get("duration"),
              note: fd.get("note") || null,
            }),
          });
          toast("Plan updated.", "success");
          openUserModal(u.id);
          loadUsers(true);
        } catch (err) {
          toast(`Failed: ${err.message}`, "error");
        }
      });

    document.getElementById("user-delete-btn").addEventListener("click", async () => {
      if (!confirm(`Delete user ${u.email || u.id}? This cascades to keys + logs.`)) return;
      try {
        await api(`/api/admin/users/${encodeURIComponent(u.id)}`, { method: "DELETE" });
        toast("User deleted.", "success");
        modal.hidden = true;
        loadUsers(true);
      } catch (err) {
        toast(`Delete failed: ${err.message}`, "error");
      }
    });
  } catch (err) {
    if (err.message === "session_expired") {
      // showAuthScreen() already hid the modal — surface the reason via toast
      // so the user understands why they got bounced back to sign-in.
      toast("Session expired. Please sign in again.", "error");
      return;
    }
    body.innerHTML = `<div class="auth-error">Failed: ${escapeHtml(err.message)}</div>`;
  }
}

function bindUserModal() {
  document.getElementById("user-modal-close").addEventListener("click", closeUserModal);
  document.getElementById("user-modal").addEventListener("click", (e) => {
    if (e.target.id === "user-modal") closeUserModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !document.getElementById("user-modal").hidden) {
      closeUserModal();
    }
  });
}

// ── Feeds ─────────────────────────────────────────────────────────

async function loadFeeds() {
  try {
    const data = await api("/api/admin/feeds?limit=80");
    document.getElementById("feeds-calls").innerHTML =
      (data.api_calls || [])
        .map(
          (r) => `<div class="list-item compact">
            <div class="cell">
              <div class="cell-main">${escapeHtml(r.email || r.user_id || "—")}${r.model ? ` · ${escapeHtml(r.model)}` : ""}</div>
              <div class="cell-sub mono">${escapeHtml(r.ip || "—")}</div>
            </div>
            <span class="spacer"></span>
            <span class="tag ${r.status >= 400 ? "error" : "success"}">${r.status}</span>
            <span class="cell-sub">${fmtRelative(r.created_at)}</span>
          </div>`
        )
        .join("") || `<div class="list-empty">No calls yet</div>`;
    document.getElementById("feeds-keys").innerHTML =
      (data.key_creations || [])
        .map(
          (k) => `<div class="list-item compact">
            <div class="cell">
              <div class="cell-main">${escapeHtml(k.email || k.user_id)} · ${escapeHtml(k.name)}</div>
              <div class="cell-sub mono">${escapeHtml(k.key_prefix)}…</div>
            </div>
            <span class="spacer"></span>
            ${k.revoked_at ? '<span class="tag error">revoked</span>' : '<span class="tag success">active</span>'}
            <span class="cell-sub">${fmtRelative(k.created_at)}</span>
          </div>`
        )
        .join("") || `<div class="list-empty">No keys yet</div>`;
    document.getElementById("feeds-ips").innerHTML =
      (data.ip_log || [])
        .map(
          (i) => `<div class="list-item compact">
            <div class="cell">
              <div class="cell-main">${escapeHtml(i.email || i.user_id)} · <span class="mono">${escapeHtml(i.ip)}</span></div>
              <div class="cell-sub">${escapeHtml((i.ua || "").slice(0, 80))} · ${escapeHtml(i.reason)}</div>
            </div>
            <span class="spacer"></span>
            <span class="cell-sub">${fmtRelative(i.created_at)}</span>
          </div>`
        )
        .join("") || `<div class="list-empty">No IP entries</div>`;
  } catch (err) {
    toast(`Failed to load feeds: ${err.message}`, "error");
  }
}

// ── Audit ─────────────────────────────────────────────────────────

async function loadAudit() {
  try {
    const data = await api("/api/admin/audit?limit=200");
    function renderEvents(arr) {
      return arr
        .map(
          (e) => `<div class="list-item compact">
            <div class="cell">
              <div class="cell-main">${escapeHtml(e.result)}${e.reason ? ` · ${escapeHtml(e.reason)}` : ""}</div>
              <div class="cell-sub mono">${escapeHtml(e.ip || "—")} · ${escapeHtml((e.ua || "").slice(0, 80))}</div>
            </div>
            <span class="spacer"></span>
            <span class="tag ${e.result === "success" ? "success" : "error"}">${escapeHtml(e.result)}</span>
            <span class="cell-sub">${fmtRelative(e.created_at)}</span>
          </div>`
        )
        .join("");
    }
    document.getElementById("audit-passwords").innerHTML =
      renderEvents(data.password_log || []) || `<div class="list-empty">No password attempts</div>`;
    document.getElementById("audit-passkeys").innerHTML =
      renderEvents(data.passkey_log || []) || `<div class="list-empty">No passkey attempts</div>`;
    document.getElementById("audit-plans").innerHTML =
      (data.plan_changes || [])
        .map(
          (p) => `<div class="list-item compact">
            <div class="cell">
              <div class="cell-main">${escapeHtml(p.email || p.user_id)} · ${escapeHtml(p.from_tier)} → ${escapeHtml(p.to_tier)} (${escapeHtml(p.duration)})</div>
              <div class="cell-sub">${escapeHtml(p.changed_by)} · ${escapeHtml(p.changed_ip || "—")} · ${escapeHtml(p.note || "")}</div>
            </div>
            <span class="spacer"></span>
            <span class="cell-sub">${fmtRelative(p.created_at)}</span>
          </div>`
        )
        .join("") || `<div class="list-empty">No plan changes yet</div>`;
  } catch (err) {
    toast(`Failed to load audit: ${err.message}`, "error");
  }
}

// ── Passkeys ──────────────────────────────────────────────────────

async function loadPasskeys() {
  try {
    const data = await api("/api/admin/passkeys");
    const list = (data.passkeys || [])
      .map(
        (p) => `<div class="list-item">
          <div class="cell">
            <div class="cell-main">${escapeHtml(p.label || "Passkey")}</div>
            <div class="cell-sub mono">${escapeHtml(p.credential_id.slice(0, 24))}…</div>
          </div>
          <span class="spacer"></span>
          <span class="cell-sub">created ${fmtRelative(p.created_at)} · last used ${fmtRelative(p.last_used_at)}</span>
          <button class="btn-danger" data-id="${escapeHtml(p.id)}">Revoke</button>
        </div>`
      )
      .join("") || `<div class="list-empty">No passkeys registered</div>`;
    document.getElementById("passkeys-list").innerHTML = list;
    document.querySelectorAll('#passkeys-list [data-id]').forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Revoke this passkey?")) return;
        try {
          await api(`/api/admin/passkeys/${encodeURIComponent(btn.dataset.id)}`, {
            method: "DELETE",
          });
          toast("Passkey revoked.", "success");
          loadPasskeys();
        } catch (err) {
          toast(`Failed: ${err.message}`, "error");
        }
      });
    });
  } catch (err) {
    toast(`Failed to load passkeys: ${err.message}`, "error");
  }
}

function bindPasskeys() {
  document
    .getElementById("passkey-register")
    .addEventListener("click", async () => {
      try {
        await registerPasskey();
        toast("Passkey added.", "success");
        loadPasskeys();
      } catch (err) {
        toast(`Register failed: ${err.message}`, "error");
      }
    });
}

// ── Boot ──────────────────────────────────────────────────────────

async function boot() {
  try {
    const me = await api("/api/admin/me");
    document.getElementById("session-meta").textContent = `${
      me.session.method
    } · expires ${new Date(me.session.expires_at * 1000).toLocaleTimeString()}`;
    setRoute(location.hash.replace("#", "") || "overview");
  } catch (err) {
    if (err.message !== "session_expired") {
      showAuthScreen();
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  bindAuth();
  bindNav();
  bindUsers();
  bindUserModal();
  bindPasskeys();

  if (getSession()?.session_id) {
    showShell();
    boot();
  } else {
    showAuthScreen();
  }

  window.addEventListener("hashchange", () => {
    const route = location.hash.replace("#", "");
    if (routes.includes(route)) setRoute(route);
  });
});
