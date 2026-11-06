/* ===== v2.js: jewel-aura look + Schumann drone + Vault Hub, all real data, no pin lock ===== */

// --- aura switcher (persists in this browser only) ---
const V2_AURA_KEY = "ccc_v2_aura";
const V2_MIX_KEY = "ccc_v2_mix";
const V2_DEFAULT_AURA = "command";
const V2_MIX_VARS = ["--bg-deep", "--bg-card", "--bg-card-hover", "--leo-gold", "--taurus-emerald"];

function v2ApplyAura(name) {
  const root = document.documentElement;
  V2_MIX_VARS.forEach(v => root.style.removeProperty(v));
  if (name) root.dataset.aura = name; else delete root.dataset.aura;
  if (name === "custom") {
    const mix = v2ReadMix();
    if (mix) v2ApplyMix(mix);
    document.getElementById("auraMixer").classList.remove("hidden");
  } else {
    document.getElementById("auraMixer").classList.add("hidden");
  }
  document.querySelectorAll("#auraTuner .aura-btn").forEach(b =>
    b.classList.toggle("active", b.dataset.aura === name));
  try { localStorage.setItem(V2_AURA_KEY, name || V2_DEFAULT_AURA); } catch (e) {}
}
function v2ReadMix() {
  try { return JSON.parse(localStorage.getItem(V2_MIX_KEY)); } catch (e) { return null; }
}
function v2ApplyMix(mix) {
  const root = document.documentElement;
  if (!mix || !mix.deep) return;
  root.dataset.aura = "custom";
  root.style.setProperty("--bg-deep", mix.deep);
  root.style.setProperty("--bg-card", v2Shade(mix.deep, 14));
  root.style.setProperty("--bg-card-hover", v2Shade(mix.deep, 22));
  root.style.setProperty("--leo-gold", mix.gold);
  root.style.setProperty("--taurus-emerald", mix.emerald || "#38b28b");
}
function v2Shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, (n >> 16) + amt), g = Math.min(255, ((n >> 8) & 255) + amt), b = Math.min(255, (n & 255) + amt);
  return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
}
function v2SaveMix() {
  const mix = {
    deep: document.getElementById("mixDeep").value,
    card: document.getElementById("mixCard").value,
    gold: document.getElementById("mixGold").value
  };
  try { localStorage.setItem(V2_MIX_KEY, JSON.stringify(mix)); } catch (e) {}
  v2ApplyMix(mix);
}

// --- Schumann binaural drone: 136.1 Hz + 143.93 Hz, 7.83 Hz beat ---
let schCtx = null, schGain = null;
function v2ToggleSchumann() {
  const btn = document.getElementById("schumannBtn");
  if (schCtx) {
    try { schGain.gain.linearRampToValueAtTime(0.0001, schCtx.currentTime + 0.4); } catch (e) {}
    setTimeout(() => { try { schCtx.close(); } catch (e) {} }, 500);
    schCtx = null; schGain = null;
    btn.classList.remove("playing");
    btn.textContent = "\u2705 Schumann 7.83Hz";
    return;
  }
  schCtx = new (window.AudioContext || window.webkitAudioContext)();
  schGain = schCtx.createGain();
  schGain.gain.value = 0.0001;
  schGain.connect(schCtx.destination);
  [136.1, 143.93].forEach(freq => {
    const osc = schCtx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    osc.connect(schGain);
    osc.start();
  });
  schGain.gain.linearRampToValueAtTime(0.05, schCtx.currentTime + 1.5);
  btn.classList.add("playing");
  btn.textContent = "\u23F8 Schumann playing";
}

// --- vault hub: real counts, real pipeline, real telemetry, real backup ---
let v2LeadOpen = new Set();
function vaultRow(id) {
  if (v2LeadOpen.has(id)) v2LeadOpen.delete(id); else v2LeadOpen.add(id);
  v2RenderPipeline();
}
async function loadVaultHub() {
  try {
    if (!jobLeadsData) {
      const r = await fetch("job-leads.json?cb=" + Date.now());
      if (r.ok) jobLeadsData = await r.json();
    }
  } catch (e) {}
  if (!jobLeadsData) { try { jobLeadsData = JSON.parse(localStorage.getItem("ccc_job_leads_cache")); } catch (e) {} }
  const leads = (jobLeadsData && jobLeadsData.leads) || [];
  const dec = typeof jobLeadDecisions === "function" ? jobLeadDecisions() : {};
  const open = leads.filter(l => !dec[l.id]).length;
  const applied = leads.filter(l => dec[l.id] && dec[l.id].d === "apply").length;
  document.getElementById("hubLeads").textContent = open;
  document.getElementById("hubLeadsSub").textContent = applied + " applied \u00b7 " + leads.length + " screened";
  if (jobLeadsData && (jobLeadsData.updatedLocal || jobLeadsData.updated)) {
    document.getElementById("vaultUpdated").textContent = "updated " + (jobLeadsData.updatedLocal || jobLeadsData.updated);
  }
  let tasks = [];
  try { tasks = JSON.parse(localStorage.getItem("clarissa_tasks")) || []; } catch (e) {}
  let bills = [];
  try { bills = JSON.parse(localStorage.getItem("ccc_bills")) || []; } catch (e) {}
  let blocks = [];
  try { blocks = JSON.parse(localStorage.getItem("ccc_blocks")) || []; } catch (e) {}
  document.getElementById("hubTasks").textContent = tasks.filter(x => x.col !== "done" && x.col !== "graveyard").length;
  document.getElementById("hubBills").textContent = bills.length;
  document.getElementById("hubBlocks").textContent = blocks.length;
  v2RenderPipeline();
  v2RenderSite();
}
function v2RenderPipeline() {
  const tableEl = document.getElementById("vaultJobTable");
  if (!tableEl) return;
  const leads = (jobLeadsData && jobLeadsData.leads) || [];
  const dec = typeof jobLeadDecisions === "function" ? jobLeadDecisions() : {};
  const when = (jobLeadsData && (jobLeadsData.updatedLocal || jobLeadsData.updated)) || "";
  document.getElementById("vaultPipelineMeta").textContent =
    (when ? "updated " + when + " \u00b7 " : "") + leads.length + " screened";
  if (!leads.length) {
    tableEl.innerHTML = '<tr><td colspan="4" class="jt-sub">No leads loaded yet. Sweeps run 5:30am and 3pm daily.</td></tr>';
    return;
  }
  const rows = leads.slice().reverse().slice(0, 12).map(l => {
    const st = dec[l.id] ? dec[l.id].d : "open";
    const stCls = st === "apply" ? "st-apply" : st === "reject" ? "st-reject" : "st-open";
    const stTxt = st === "apply" ? "\u2705 Applied" : st === "reject" ? "\uD83D\uDC4B Passed" : "Awaiting call";
    let html = '<tr class="job-row" onclick="vaultRow(\'' + esc(l.id) + '\')">'
      + '<td class="jt-title"><a href="' + esc(l.url) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()">' + esc(l.title) + '</a>'
      + '<div class="jt-sub">' + esc(l.company) + ' \u00b7 ' + esc(l.location) + '</div></td>'
      + '<td>' + esc(l.pay || "Not posted") + '</td>'
      + '<td class="jt-status ' + stCls + '">' + stTxt + '</td>'
      + '</tr>';
    if (v2LeadOpen.has(l.id)) {
      html += '<tr class="jt-detail"><td colspan="3"><div class="jt-detail-inner">' + leadDetailsPanel(l) + '</div></td></tr>';
    }
    return html;
  }).join("");
  tableEl.innerHTML = '<thead><tr><th>Role</th><th>Pay</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody>';
}
function v2GetSite() {
  if (window.siteReportData) return window.siteReportData;
  try { if (typeof siteReportData !== "undefined" && siteReportData) return siteReportData; } catch (e) {}
  try { return JSON.parse(localStorage.getItem("ccc_site_report_cache")); } catch (e) { return null; }
}
function v2RenderSite() {
  const el = document.getElementById("vaultSiteBody");
  if (!el) return;
  const d = v2GetSite();
  if (!d || !d.last24h) {
    el.innerHTML = '<p class="helper-text">First report lands at the next sweep (5:30am &amp; 3pm).</p>';
    return;
  }
  const L = d.last24h || {}, S = d.sinceLaunch || {}, ro = L.resumeOpens || {};
  const row = (k, v) => '<div class="site-report-row"><span class="k">' + k + '</span><span>' + v + '</span></div>';
  let html = "";
  html += row("Last 24 hours", (L.visits != null ? L.visits : "\u2014") + " visits \u00b7 " + (L.uniqueVisitors != null ? L.uniqueVisitors : "\u2014") + " unique" + (L.topSource ? " \u00b7 mostly " + esc(L.topSource) : ""));
  if (ro.total != null || ro.detail) html += row("Resume opens", (ro.total != null ? ro.total : 0) + (ro.detail ? " \u00b7 " + esc(ro.detail) : ""));
  html += row("Save-as-PDF clicks", L.printClicks != null ? L.printClicks : 0);
  if (S.visits != null) html += row("Since launch" + (S.startDate ? " (" + esc(S.startDate) + ")" : ""), S.visits + " visits \u00b7 " + (S.pageViews != null ? S.pageViews : "\u2014") + " page views");
  el.innerHTML = html;
}

// --- data vault: full JSON backup of this browser's planner data ---
function v2Backup() {
  const dump = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (/^(ccc_|clarissa_)/.test(k)) dump[k] = localStorage.getItem(k);
  }
  const blob = new Blob([JSON.stringify({ exported: new Date().toISOString(), data: dump }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "planner-backup-" + (typeof localDateStr === "function" ? localDateStr() : "v2") + ".json";
  a.click();
  flashMsg("Backup downloaded \u2014 keep it somewhere safe.");
}
function v2Restore(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const data = parsed.data || parsed;
      const keys = Object.keys(data).filter(k => /^(ccc_|clarissa_)/.test(k));
      if (!keys.length) { flashMsg("That file doesn't look like a planner backup."); return; }
      if (!confirm("Restore " + keys.length + " saved items from this backup? This replaces the planner data currently in this browser.")) return;
      keys.forEach(k => localStorage.setItem(k, data[k]));
      flashMsg("Restored " + keys.length + " items. Reloading...");
      setTimeout(() => location.reload(), 900);
    } catch (e) {
      flashMsg("Couldn't read that file as a backup.");
    }
  };
  reader.readAsText(file);
}

// --- wire it up ---
document.addEventListener("DOMContentLoaded", () => {
  const saved = (function () { try { return localStorage.getItem(V2_AURA_KEY); } catch (e) { return null; } })();
  v2ApplyAura(saved === "custom" ? "command" : (saved || V2_DEFAULT_AURA));
  document.querySelectorAll("#auraTuner .aura-btn").forEach(b =>
    b.addEventListener("click", () => v2ApplyAura(b.dataset.aura)));
  document.getElementById("mixApply").addEventListener("click", v2SaveMix);
  ["mixDeep", "mixCard", "mixGold"].forEach(id => document.getElementById(id).addEventListener("input", v2SaveMix));
  document.getElementById("schumannBtn").addEventListener("click", v2ToggleSchumann);
  document.getElementById("portalBtn").addEventListener("click", () => {
    if (typeof showCosmicToast === "function") showCosmicToast();
  });
  v2RenderKPIs();
  setInterval(v2RenderKPIs, 30000);
    document.getElementById("vaultBackupBtn").addEventListener("click", v2Backup);
  document.getElementById("vaultRestoreInput").addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) v2Restore(e.target.files[0]);
  });
});


// --- command deck: live KPI tiles on Today (clickable shortcuts) ---
async function v2RenderKPIs() {
  const jobsEl = document.getElementById("kpiJobs");
  if (!jobsEl) return;
  if (!jobLeadsData) {
    try {
      const r = await fetch("job-leads.json?cb=" + Date.now());
      if (r.ok) jobLeadsData = await r.json();
    } catch (e) {}
  }
  if (!jobLeadsData) { try { jobLeadsData = JSON.parse(localStorage.getItem("ccc_job_leads_cache")); } catch (e) {} }
  const leads = (jobLeadsData && jobLeadsData.leads) || [];
  const dec = typeof jobLeadDecisions === "function" ? jobLeadDecisions() : {};
  const open = leads.filter(l => !dec[l.id]).length;
  const applied = leads.filter(l => dec[l.id] && dec[l.id].d === "apply").length;
  jobsEl.textContent = open;
  document.getElementById("kpiJobsSub").textContent = applied + " applied \u00b7 " + leads.length + " screened";
  let tasks = [];
  try { tasks = JSON.parse(localStorage.getItem("clarissa_tasks")) || []; } catch (e) {}
  document.getElementById("kpiTasks").textContent = tasks.filter(x => x.col !== "done" && x.col !== "graveyard").length;
  let bills = [];
  try { bills = JSON.parse(localStorage.getItem("ccc_bills")) || []; } catch (e) {}
  const unpaid = bills.filter(b => !b.paid);
  document.getElementById("kpiBills").textContent = unpaid.length;
  document.getElementById("kpiBillsSub").textContent = unpaid.length
    ? "next due " + (unpaid[0] && unpaid[0].due ? unpaid[0].due.slice(5) : "\u2014")
    : "all paid \u{1F389}";
  const S = (v2GetSite() || {}).sinceLaunch || {};
  document.getElementById("kpiSite").textContent = S.visits != null ? S.visits : "\u2014";
  document.getElementById("kpiSiteSub").textContent = S.pageViews != null ? S.pageViews + " views \u00b7 portfolio" : "portfolio traffic";
}
