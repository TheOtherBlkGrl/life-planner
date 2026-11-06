// --- CLOUD VAULT (PIN-encrypted backup to her own Google Drive) ---
// One encrypted file, command-vault.json, lives in her Drive (app-created file only).
// The PIN never leaves the device and never reaches Google: data is AES-GCM encrypted
// in-browser before upload, key derived with PBKDF2. Same PIN anywhere = same data.
const VAULT_FILE = "command-vault.json";
const VAULT_STORE_KEY = "ccc_vault_store";   // salt + iters + check (not secret)
const VAULT_KEY_KEY = "ccc_vault_key";       // raw AES key, b64, device-local
const VAULT_SEEN_KEY = "ccc_vault_seen";     // last cloud timestamp applied or pushed
const VAULT_FILEID_KEY = "ccc_vault_fileid"; // Drive file id cache
const VAULT_SCOPE = "https://www.googleapis.com/auth/drive.file";
const VAULT_ITERS = 310000;
const VAULT_EXCLUDE = new Set([
  "ccc_job_leads_cache", "ccc_selfcare_day", "ccc_reminded", "ccc_focus",
  "ccc_gcal_events", "ccc_gcal_at"
]);

const b64e = u8 => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
const b64d = b => { const s = atob(b); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };
const te = new TextEncoder(), td = new TextDecoder();

function vaultWants(k) {
  return /^(ccc_|clarissa_)/.test(k) && !k.startsWith("ccc_vault_") && !VAULT_EXCLUDE.has(k);
}

async function vaultDeriveKey(pin, saltU8, iters) {
  const base = await crypto.subtle.importKey("raw", te.encode(pin), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt: saltU8, iterations: iters, hash: "SHA-256" },
    base, { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

async function vaultEnc(key, plaintext, aad) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: te.encode(aad) }, key, te.encode(plaintext));
  return b64e(new Uint8Array(ct)) + "." + b64e(iv);
}

async function vaultDec(key, blob, aad) {
  const [ctB, ivB] = blob.split(".");
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64d(ivB), additionalData: te.encode(aad) }, key, b64d(ctB));
  return td.decode(pt);
}

function vaultSnapshot() {
  const snap = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (vaultWants(k)) snap[k] = localStorage.getItem(k);
  }
  return snap;
}

function vaultApply(snap) {
  const prev = {};
  for (const k of Object.keys(snap)) prev[k] = localStorage.getItem(k);
  try { localStorage.setItem("ccc_vault_prev", JSON.stringify(prev)); } catch (e) {}
  for (const k of Object.keys(snap)) if (snap[k] != null) localStorage.setItem(k, snap[k]);
}

function vaultUnlocked() { return !!localStorage.getItem(VAULT_KEY_KEY); }

function setVaultStatus(text) {
  const el = document.getElementById("vaultStatus");
  if (el) el.textContent = text;
  const btn = document.getElementById("vaultBtn");
  if (btn) btn.textContent = vaultUnlocked() ? "🔄 Sync now" : (localStorage.getItem(VAULT_STORE_KEY) ? "🔓 Unlock" : "☁️ Set up cloud backup");
}

// --- token (Drive file scope, separate from calendar's) ---
function vaultEnsureToken(interactive) {
  return new Promise(resolve => {
    const saved = sessionStorage.getItem("ccc_vault_token");
    if (saved) return resolve(saved);
    if (!window.google || !google.accounts) return resolve(null);
    const client = google.accounts.oauth2.initTokenClient({
      client_id: (window.PLANNER_CAL_CFG || {}).clientId || "",
      scope: VAULT_SCOPE,
      callback: resp => {
        if (resp && resp.access_token) { sessionStorage.setItem("ccc_vault_token", resp.access_token); resolve(resp.access_token); }
        else resolve(null);
      },
      error_callback: () => resolve(null)
    });
    try { client.requestAccessToken(interactive ? {} : { prompt: "" }); } catch (e) { resolve(null); }
  });
}

async function vaultApi(url, opts) {
  const token = await vaultEnsureToken(false);
  if (!token) throw new Error("no google session: tap Sync now to reconnect");
  const res = await fetch(url, { ...opts, headers: { ...(opts.headers || {}), Authorization: `Bearer ${token}` } });
  if (res.status === 401) { sessionStorage.removeItem("ccc_vault_token"); throw new Error("google session expired, tap Sync now"); }
  if (!res.ok) throw new Error(`drive api ${res.status}`);
  const ct = res.headers.get("content-type") || "";
  return ct.includes("json") ? res.json() : res.text();
}

async function vaultFileMeta() {
  const q = encodeURIComponent(`name = '${VAULT_FILE}' and trashed = false`);
  const r = await vaultApi(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc`);
  return (r.files || [])[0] || null;
}

// --- push: encrypt + upload whole snapshot ---
let vaultPushTimer = null;
function vaultMarkDirty() {
  if (!vaultUnlocked()) return;
  localStorage.setItem("ccc_vault_dirty", "1");
  clearTimeout(vaultPushTimer);
  vaultPushTimer = setTimeout(vaultPush, 3000);
}

async function vaultPush() {
  if (!vaultUnlocked()) { setVaultStatus("Locked: unlock the vault to back up"); return; }
  setVaultStatus("Backing up…");
  try {
    const keyB64 = localStorage.getItem(VAULT_KEY_KEY);
    const store = JSON.parse(localStorage.getItem(VAULT_STORE_KEY) || "null");
    if (!keyB64 || !store) throw new Error("vault is locked");
    const key = await crypto.subtle.importKey("raw", b64d(keyB64), "AES-GCM", true, ["encrypt"]);
    const payload = {
      v: 1, salt: store.salt, iters: store.iters, check: store.check,
      data: await vaultEnc(key, JSON.stringify(vaultSnapshot()), "data"),
      updated_at: new Date().toISOString()
    };
    let meta = await vaultFileMeta();
    const body = JSON.stringify(payload);
    if (meta) {
      await vaultApi(`https://www.googleapis.com/upload/drive/v3/files/${meta.id}?uploadType=media`,
        { method: "PATCH", headers: { "Content-Type": "application/json" }, body });
    } else {
      const boundary = "vault" + Date.now();
      const md = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name: VAULT_FILE, mimeType: "application/json" })}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${boundary}--`;
      const r = await vaultApi("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
        { method: "POST", headers: { "Content-Type": `multipart/related; boundary=${boundary}` }, body: md });
      localStorage.setItem(VAULT_FILEID_KEY, r.id);
    }
    localStorage.setItem(VAULT_SEEN_KEY, payload.updated_at);
    localStorage.removeItem("ccc_vault_dirty");
    setVaultStatus(`Backed up just now · ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`);
  } catch (e) {
    setVaultStatus(`Backup paused: ${e.message}`);
  }
}

// --- pull: fetch + decrypt + apply if newer ---
async function vaultCheckCloud() {
  const meta = await vaultFileMeta();
  if (!meta) return null;
  const raw = await vaultApi(`https://www.googleapis.com/drive/v3/files/${meta.id}?alt=media`);
  const payload = typeof raw === "string" ? JSON.parse(raw) : raw;
  return { meta, payload };
}

async function vaultPullAndApply() {
  const cloud = await vaultCheckCloud();
  if (!cloud) {
    if (vaultUnlocked()) { await vaultPush(); return; }
    setVaultStatus("No vault in Drive yet"); return;
  }
  const seen = localStorage.getItem(VAULT_SEEN_KEY) || "";
  if (cloud.payload.updated_at && cloud.payload.updated_at > seen) {
    if (!vaultUnlocked()) { setVaultStatus("Backup found: unlock with your PIN"); localStorage.setItem("ccc_vault_cloud", JSON.stringify({ updated_at: cloud.payload.updated_at })); return; }
    await vaultApplyCloud(cloud.payload);
  } else if (localStorage.getItem("ccc_vault_dirty")) {
    await vaultPush();
  } else {
    setVaultStatus("Up to date · backed up " + vaultAgo(cloud.payload.updated_at));
  }
}

function vaultAgo(iso) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins <= 0) return "just now";
  if (mins < 60) return mins + " min ago";
  const h = Math.round(mins / 60);
  return h < 24 ? h + " hr ago" : Math.round(h / 24) + " days ago";
}

// --- boot ---
async function vaultBoot() {
  setVaultStatus(vaultUnlocked() ? "Checking for backup…" : "");
  if (!vaultUnlocked()) { setVaultStatus(""); return; }
  try {
    await vaultPullAndApply();
  } catch (e) {
    setVaultStatus(`Cloud check paused: ${e.message}`);
  }
}

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && vaultUnlocked()) {
    clearTimeout(vaultPushTimer);
    vaultPushTimer = setTimeout(() => vaultPullAndApply().catch(e => setVaultStatus(`Cloud check paused: ${e.message}`)), 800);
  }
});

async function vaultApplyCloud(payload) {
  const keyB64 = localStorage.getItem(VAULT_KEY_KEY);
  if (!keyB64) throw new Error("vault is locked");
  let key;
  try {
    key = await crypto.subtle.importKey("raw", b64d(keyB64), "AES-GCM", true, ["encrypt", "decrypt"]);
    const snap = JSON.parse(await vaultDec(key, payload.data, "data"));
    vaultApply(snap);
  } catch (e) {
    setVaultStatus("Backup was encrypted with a different PIN. Use Forgot PIN to reset if this device has the newer data.");
    throw e;
  }
  localStorage.setItem(VAULT_SEEN_KEY, payload.updated_at);
  localStorage.removeItem("ccc_vault_dirty");
  setVaultStatus("Backup restored from Drive");
  setTimeout(() => location.reload(), 600);
}

// --- PIN modals (self-contained) ---
function vaultModal(title, bodyHtml, onSave, saveLabel) {
  let ov = document.getElementById("vaultModal");
  if (ov) ov.remove();
  ov = document.createElement("div");
  ov.id = "vaultModal";
  ov.style.cssText = "position:fixed;inset:0;background:rgba(10,6,18,.78);backdrop-filter:blur(4px);z-index:10000;display:flex;align-items:center;justify-content:center;padding:1rem;";
  ov.innerHTML = `<div style="background:#1c1829;border:1px solid rgba(255,255,255,.15);border-radius:16px;padding:1.25rem;max-width:400px;width:100%;color:#f8f7ff;box-shadow:0 12px 48px rgba(0,0,0,.6);">
    <h3 style="margin:0 0 1rem;font-size:1.02rem;color:#f4b860;">${title}</h3>
    <div id="vaultModalBody" style="display:flex;flex-direction:column;gap:.65rem;">${bodyHtml}</div>
    <div style="display:flex;gap:.6rem;margin-top:1.1rem;">
      <button id="vaultModalSave" style="flex:1;background:#9d4edd;color:#fff;border:none;border-radius:999px;padding:.6rem;cursor:pointer;font-weight:600;">${saveLabel || "Save"}</button>
      <button id="vaultModalCancel" style="background:transparent;color:#f8f7ff;border:1px solid rgba(255,255,255,.25);border-radius:999px;padding:.6rem 1rem;cursor:pointer;">Cancel</button>
    </div>
    <div id="vaultModalErr" style="color:#e5989b;font-size:.82rem;min-height:1.2em;margin-top:.4rem;"></div>
  </div>`;
  document.body.appendChild(ov);
  ov.querySelector("#vaultModalCancel").onclick = () => ov.remove();
  ov.querySelector("#vaultModalSave").onclick = () => onSave(ov);
  ov.querySelector("input") && ov.querySelector("input").focus();
  ov.addEventListener("keydown", e => { if (e.key === "Enter" && e.target.tagName === "INPUT") onSave(ov); });
  return ov;
}

function promptPinModal(mode, cb) {
  // mode: "setup" | "unlock"
  const setup = mode === "setup";
  const body = setup
    ? `<div><label style="font-size:.78rem;opacity:.75;display:block;margin-bottom:.25rem;">Choose a PIN (4+ characters)</label>
       <input type="password" id="vp1" inputmode="numeric" style="width:100%;background:#110f1a;border:1px solid rgba(255,255,255,.14);border-radius:10px;color:#f8f7ff;padding:.55rem .6rem;box-sizing:border-box;"></div>
       <div><label style="font-size:.78rem;opacity:.75;display:block;margin-bottom:.25rem;">Repeat it</label>
       <input type="password" id="vp2" inputmode="numeric" style="width:100%;background:#110f1a;border:1px solid rgba(255,255,255,.14);border-radius:10px;color:#f8f7ff;padding:.55rem .6rem;box-sizing:border-box;"></div>
       <p style="font-size:.78rem;opacity:.7;margin:0;">This PIN never leaves this device. It encrypts your backup, so write it down: there's no recovery without it (resetting wipes the cloud copy).</p>`
    : `<div><label style="font-size:.78rem;opacity:.75;display:block;margin-bottom:.25rem;">Vault PIN</label>
       <input type="password" id="vp1" inputmode="numeric" style="width:100%;background:#110f1a;border:1px solid rgba(255,255,255,.14);border-radius:10px;color:#f8f7ff;padding:.55rem .6rem;box-sizing:border-box;"></div>
       <button type="button" id="vaultReset" style="background:none;border:none;color:#e5989b;font-size:.8rem;cursor:pointer;text-decoration:underline;padding:0;">Forgot PIN? Reset (overwrites cloud backup with this device's data)</button>`;
  vaultModal(setup ? "☁️ Create your vault PIN" : "🔓 Unlock your vault", body, async ov => {
    const pin = ov.querySelector("#vp1").value;
    if (pin.length < 4) { ov.querySelector("#vaultModalErr").textContent = "PIN needs at least 4 characters."; return; }
    if (setup) {
      const pin2 = ov.querySelector("#vp2").value;
      if (pin !== pin2) { ov.querySelector("#vaultModalErr").textContent = "PINs don't match."; return; }
      ov.remove();
      await vaultSetupWithPin(pin);
    } else {
      const store = JSON.parse(localStorage.getItem(VAULT_STORE_KEY) || "null");
      if (!store) { ov.querySelector("#vaultModalErr").textContent = "No vault found on this device. Set one up first."; return; }
      try {
        const key = await vaultDeriveKey(pin, b64d(store.salt), store.iters);
        const check = await vaultDec(key, store.check, "check");
        if (check !== "command-vault-check") throw new Error("bad");
        localStorage.setItem(VAULT_KEY_KEY, b64e(new Uint8Array(await crypto.subtle.exportKey("raw", key))));
        ov.remove();
        setVaultStatus("Unlocked. Checking for backup…");
        await vaultPullAndApply();
      } catch (e) {
        ov.querySelector("#vaultModalErr").textContent = "Wrong PIN for this vault.";
      }
    }
  }, setup ? "Create vault" : "Unlock");
  const ov = document.getElementById("vaultModal");
  const rbtn = ov && ov.querySelector("#vaultReset");
  if (rbtn) rbtn.onclick = () => {
    if (!confirm("Reset the vault PIN? Your cloud backup gets overwritten by THIS device's data the next time it backs up. Any newer data on another device would be lost.")) return;
    localStorage.removeItem(VAULT_KEY_KEY); localStorage.removeItem(VAULT_STORE_KEY);
    localStorage.removeItem(VAULT_SEEN_KEY); localStorage.removeItem(VAULT_FILEID_KEY);
    localStorage.removeItem("ccc_vault_cloud"); localStorage.removeItem("ccc_vault_dirty");
    ov.remove();
    promptPinModal("setup", null);
  };
}

async function vaultSetupWithPin(pin) {
  const salt = b64e(crypto.getRandomValues(new Uint8Array(16)));
  const key = await vaultDeriveKey(pin, b64d(salt), VAULT_ITERS);
  const check = await vaultEnc(key, "command-vault-check", "check");
  localStorage.setItem(VAULT_STORE_KEY, JSON.stringify({ salt, iters: VAULT_ITERS, check }));
  localStorage.setItem(VAULT_KEY_KEY, b64e(new Uint8Array(await crypto.subtle.exportKey("raw", key))));
  setVaultStatus("Connecting to Google Drive…");
  const token = await vaultEnsureToken(true);
  if (!token) { setVaultStatus("Need your Google OK: tap Sync now when ready"); localStorage.setItem("ccc_vault_dirty", "1"); return; }
  await vaultPush();
}

// --- button + boot ---
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("vaultBtn");
  if (btn) btn.onclick = () => {
    if (vaultUnlocked()) { setVaultStatus("Syncing…"); vaultPullAndApply().catch(e => setVaultStatus(`Sync paused: ${e.message}`)); }
    else promptPinModal(localStorage.getItem(VAULT_STORE_KEY) ? "unlock" : "setup", null);
  };
  setVaultStatus("");
  vaultBoot();
});

// hook saves: any planner change marks dirty and pushes a few seconds later
(function () {
  const orig = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k, v) {
    orig.call(this, k, v);
    if (vaultWants(k)) vaultMarkDirty();
  };
})();
