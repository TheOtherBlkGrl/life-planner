/* ===== v3.js: dashboard + three sections (Self / Maintenance / Schedule), fresh chrome =====
   New in v3: section nav, dashboard summary tiles, tarot, orisha council, chores, meds, hair.
   Reuses every engine below: app.js, astro.js, month.js, vault.js, v2.js (auras, KPIs, forecast, pipeline). */

const V3_VIEW_KEY = "ccc_v3_view";
const V3_SECTIONS = {
  dash:        [{ id: "today", label: "✨ Today" }],
  self:        [{ id: "selfcare", label: "🛁 Rituals" }, { id: "astro", label: "🔮 Sky" },
                { id: "tarot", label: "🃏 Tarot" }, { id: "orisha", label: "🕊️ Orisha" },
                { id: "journal", label: "📓 Journal" }],
  maintenance: [{ id: "garden", label: "🌱 Garden" }, { id: "chores", label: "🧺 Chores" },
                { id: "meds", label: "💊 Meds" }, { id: "hair", label: "💇 Hair" }],
  schedule:    [{ id: "tasks", label: "✅ Tasks" }, { id: "week", label: "🗓️ Week" },
                { id: "month", label: "📆 Month" }, { id: "bills", label: "💸 Bills" },
                { id: "blocks", label: "🧱 Blocks" }, { id: "work", label: "🧰 Work" },
                { id: "jobs", label: "💼 Job Hunt" }, { id: "social", label: "👯 Social" }],
  vault:       [{ id: "vault", label: "🗝️ Vault & Hub" }]
};
const V3_SEC_LABELS = { dash: "🪐 Dashboard", self: "🌙 Self", maintenance: "🌿 Maintenance",
                        schedule: "🗓️ Schedule", vault: "🗝️ Vault & Hub" };
const V3_SEC_OF_TAB = {};
Object.keys(V3_SECTIONS).forEach(s => V3_SECTIONS[s].forEach(t => { V3_SEC_OF_TAB[t.id] = s; }));

let v3Section = "dash";
let v3Tab = "today";

// --- nav wiring (overrides app.js's flat switchTab) ---
function v3BuildNav() {
  const main = document.getElementById("v3NavMain");
  if (!main) return;
  main.innerHTML = Object.keys(V3_SECTIONS).map(s =>
    '<button class="v3-sec-btn" data-sec="' + s + '">' + V3_SEC_LABELS[s] + '</button>').join("");
  main.querySelectorAll(".v3-sec-btn").forEach(b =>
    b.addEventListener("click", () => v3Go(b.dataset.sec, V3_SECTIONS[b.dataset.sec][0].id)));
  v3BuildSubnav();
}
function v3BuildSubnav() {
  const sub = document.getElementById("v3Subnav");
  if (!sub) return;
  sub.innerHTML = V3_SECTIONS[v3Section].map(t =>
    '<button class="v3-sub-btn" data-tab="' + t.id + '">' + t.label + '</button>').join("");
  sub.querySelectorAll(".v3-sub-btn").forEach(b =>
    b.addEventListener("click", () => switchTab(b.dataset.tab)));
}

function switchTab(name) {
  const sec = V3_SEC_OF_TAB[name] || "dash";
  v3Section = sec; v3Tab = name;
  document.querySelectorAll(".v3-sec-btn").forEach(b => b.classList.toggle("active", b.dataset.sec === sec));
  document.querySelectorAll(".v3-sub-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
  document.querySelectorAll(".tab-panel").forEach(p =>
    p.classList.toggle("active", p.id === "panel-" + name));
  v3BuildSubnav();
  try { sessionStorage.setItem(V3_VIEW_KEY, JSON.stringify({ s: sec, t: name })); } catch (e) {}
  // live-data views re-render when opened
  if (name === "week" && typeof renderWeek === "function") renderWeek();
  if (name === "tasks" && typeof renderKanban === "function") renderKanban();
  if (name === "tasks") {
    const cf = document.getElementById("conservatoryFrame");
    if (cf && !cf.getAttribute("src")) cf.setAttribute("src", cf.getAttribute("data-src"));
  }
  if (name === "today" && typeof renderWins === "function") renderWins();
  if (name === "jobs" && typeof loadJobLeads === "function") loadJobLeads();
  if (name === "jobs" && typeof loadSiteReport === "function") loadSiteReport();
  if (name === "vault" && typeof loadVaultHub === "function") loadVaultHub();
  if (name === "tarot") v3RenderTarot();
  if (name === "chores") v3RenderChores();
  if (name === "meds") v3RenderMeds();
  if (name === "today") v3RenderGardenSummary();
  if (name === "hair") v3RenderHair();
  if (name === "garden") { v3RenderSoil(); v3RenderSoilDeep(); renderSoilLog(); }
  if (name === "month" && typeof renderMonth === "function") renderMonth();
  if (name === "social") v3RenderSocial();
}

function v3Go(sec, tab) { switchTab(tab || V3_SECTIONS[sec][0].id); }

// --- dashboard: greeting + section summary tiles ---
function v3RenderDash() {
  const hello = document.getElementById("dashHello");
  const dateEl = document.getElementById("dashDate");
  if (hello) {
    const h = new Date().getHours();
    const word = h < 5 ? "Up late" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
    hello.innerHTML = word + ', <em>Clare</em>';
  }
  const ds = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  if (dateEl) dateEl.textContent = ds;
  const eb = document.getElementById("hsEyebrowDate");
  if (eb) eb.textContent = ds.toUpperCase();
  v3RenderSecTiles();
}

function v3RenderSecTiles() {
  const grid = document.getElementById("dashSections");
  if (!grid) return;
  let tasks = [], bills = [];
  try { tasks = JSON.parse(localStorage.getItem("clarissa_tasks")) || []; } catch (e) {}
  try { bills = JSON.parse(localStorage.getItem("ccc_bills")) || []; } catch (e) {}
  const open = tasks.filter(x => x.col !== "done" && x.col !== "graveyard");
  const unpaid = bills.filter(b => !b.paid).sort((a, b) => String(a.due || "9999").localeCompare(String(b.due || "9999")));
  const chores = v3Load("ccc_chores");
  const dueChores = chores.filter(c => v3ChoreDaysLeft(c) <= 0).length;
  const meds = v3Load("ccc_meds");
  const dueMeds = meds.filter(m => (m.days || []).includes(v3Dow3())).length;
  const sc = (() => { try { return JSON.parse(localStorage.getItem("ccc_selfcare")); } catch (e) { return null; } })();
  const scDone = sc && sc.items ? sc.items.filter(x => x.done).length : 0;
  const scTotal = sc && sc.items ? sc.items.length : 0;
  const tile = (sec, title, line, sub) =>
    '<button class="dash-sec-tile" data-sec="' + sec + '"><h3>' + title + '</h3>' +
    '<p class="dash-sec-line">' + line + '</p><p class="dash-sec-sub">' + sub + '</p></button>';
  grid.innerHTML =
    tile("self", "🌙 Self", scTotal ? "Rituals " + scDone + "/" + scTotal + " checked off" : "Rituals reset for today",
      "sky · tarot · orisha · journal") +
    tile("maintenance", "🌿 Maintenance",
      (dueChores ? dueChores + " chore" + (dueChores === 1 ? "" : "s") + " due" : "Chores caught up") +
      (dueMeds ? " · " + dueMeds + " med" + (dueMeds === 1 ? "" : "s") + " today" : ""),
      "garden · worms · houseplants · meds · hair") +
    tile("schedule", "🗓️ Schedule",
      open.length + " open task" + (open.length === 1 ? "" : "s") +
      (unpaid.length ? " · next bill " + (unpaid[0].due ? unpaid[0].due.slice(5) : "") : " · bills paid"),
      "tasks · calendar · bills · work · social");
  grid.querySelectorAll(".dash-sec-tile").forEach(b =>
    b.addEventListener("click", () => v3Go(b.dataset.sec)));
}

// --- tiny shared helpers for the new panels ---
function v3Load(key) { try { return JSON.parse(localStorage.getItem(key)) || []; } catch (e) { return []; } }
function v3Save(key, arr) { localStorage.setItem(key, JSON.stringify(arr)); }
function v3Dow3() { return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date().getDay()]; }
function v3TodayStr() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function v3Confirm(what, fn) {
  if (confirm(what)) fn();
}

// =========================== TAROT ===========================
const V3_TAROT = [
  ["0", "The Fool", "🌱", "beginnings · leap of faith · innocence", "A fresh start is asking for one brave step. Say yes before you have the whole map."],
  ["I", "The Magician", "🪄", "willpower · skill · manifestation", "Everything you need is on the table. Use the tools in front of you and claim it."],
  ["II", "The High Priestess", "🌙", "intuition · mystery · inner knowing", "You already know the answer. Be quiet long enough to hear yourself say it."],
  ["III", "The Empress", "🌹", "abundance · nurture · creation", "Tend what you're growing today, including yourself. Rich things take care."],
  ["IV", "The Emperor", "🛡️", "structure · authority · order", "Put a system around the chaos. One firm boundary buys you a calm week."],
  ["V", "The Hierophant", "🗝️", "tradition · guidance · learning", "Borrow a proven path today. Someone has already solved this; ask or read."],
  ["VI", "The Lovers", "💞", "choice · harmony · alignment", "A real choice is in front of you. Pick what aligns, not what's easy."],
  ["VII", "The Chariot", "🏎️", "drive · victory · momentum", "You're moving and it's working. Hold the reins and keep the pace."],
  ["VIII", "Strength", "🦁", "courage · patience · soft power", "Gentle and persistent beats loud today. Steady hands, big heart."],
  ["IX", "The Hermit", "🕯️", "reflection · solitude · wisdom", "Take an hour for you. The answer comes in the quiet, not the group chat."],
  ["X", "Wheel of Fortune", "🎡", "cycles · luck · turning point", "The wheel is turning your way. Ride it; don't steer against it."],
  ["XI", "Justice", "⚖️", "truth · balance · cause & effect", "Be honest in the hard conversation. Balance lands where the truth points."],
  ["XII", "The Hanged Man", "🙃", "pause · new angle · surrender", "Flip the problem upside down. The view from stillness is the answer."],
  ["XIII", "Death", "🦋", "endings · transformation · release", "Something is done. Let it finish so the next thing can start."],
  ["XIV", "Temperance", "🍷", "balance · patience · blending", "Mix, don't force. The middle path is the strong one today."],
  ["XV", "The Devil", "⛓️", "attachment · temptation · shadow", "Notice what has you gripped. Naming the chain is how it comes off."],
  ["XVI", "The Tower", "⚡", "upheaval · revelation · sudden change", "Shake-up energy. What falls was already loose; build on what's solid."],
  ["XVII", "The Star", "⭐", "hope · healing · renewal", "You're replenishing. Keep the faith and do the small beautiful thing."],
  ["XVIII", "The Moon", "🌘", "illusion · dreams · the unseen", "Not everything is what it looks like today. Verify before you leap."],
  ["XIX", "The Sun", "☀️", "joy · success · vitality", "Radiant day. Do the thing out loud and let yourself be seen."],
  ["XX", "Judgement", "📣", "awakening · reckoning · calling", "The summons is real. Answer the call you keep circling."],
  ["XXI", "The World", "🌍", "completion · wholeness · arrival", "A chapter is closing in the best way. Celebrate it, then dream bigger."]
];
function v3TarotOfDay() {
  const seed = Number(v3TodayStr().replace(/-/g, ""));
  const idx = seed % V3_TAROT.length;
  return V3_TAROT[idx];
}
function v3RenderTarot() {
  const area = document.getElementById("tarotCardArea");
  if (!area) return;
  const [num, name, glyph, keys, read] = v3TarotOfDay();
  const dateEl = document.getElementById("tarotDate");
  if (dateEl) dateEl.textContent = v3TodayStr();
  area.innerHTML =
    '<div class="tarot-card-face flipped"><span class="tc-num">' + num + '</span>' +
    '<span class="tc-glyph">' + glyph + '</span><span class="tc-name">' + esc(name) + '</span>' +
    '<span class="tc-keys">' + esc(keys) + '</span></div>' +
    '<div class="tarot-reading"><h4>' + esc(name) + ' — today\u2019s read</h4>' +
    '<p>' + esc(read) + '</p>' +
    '<p class="helper-text">Same card all day. Come back tomorrow for a fresh deal.</p></div>';
}
function v3TarotSpread() {
  const out = document.getElementById("tarotSpread");
  if (!out) return;
  const slots = ["Past", "Present", "What\u2019s coming"];
  const used = new Set();
  const pick = () => { let i; do { i = Math.floor(Math.random() * V3_TAROT.length); } while (used.has(i)); used.add(i); return V3_TAROT[i]; };
  out.innerHTML = slots.map((s, i) => {
    const [num, name, glyph, keys, read] = pick();
    return '<div class="tarot-reading"><div class="tarot-spread-label">' + s + '</div>' +
      '<div class="tarot-card-face" style="margin-top:8px"><span class="tc-num">' + num + '</span>' +
      '<span class="tc-glyph">' + glyph + '</span><span class="tc-name">' + esc(name) + '</span>' +
      '<span class="tc-keys">' + esc(keys) + '</span></div>' +
      '<p style="margin-top:8px">' + esc(read) + '</p></div>';
  }).join("");
}

// =========================== ORISHA ===========================
function v3RenderOrisha() {
  const el = document.getElementById("orishaPanel");
  if (!el) return;
  el.innerHTML =
    '<div class="orisha-card"><h3>Shangó · Sun in Leo</h3>' +
    '<p class="orisha-role">owner of thunder, fire &amp; the drum</p>' +
    '<p>Your Sun sits with Shangó: the king\u2019s confidence, the dance, the storm that clears the air. When you own a room, that\u2019s him moving through you.</p>' +
    '<p class="orisha-how"><strong>Work with him:</strong> lead loudly on the days your chart calls for fire — take the win publicly, dance in the kitchen, face the hard conversation head-on.</p></div>' +
    '<div class="orisha-card"><h3>Oshun · Taurus Rising &amp; Libra Moon</h3>' +
    '<p class="orisha-role">owner of the rivers, sweetness, love &amp; abundance</p>' +
    '<p>Oshun answers twice in your chart — your Rising and your Moon. She is beauty with strategy: sweetness that opens doors, abundance that flows where care flows.</p>' +
    '<p class="orisha-how"><strong>Work with her:</strong> fresh flowers or something golden near you, honey-slow self-care on hard days, and negotiation by charm before force.</p></div>' +
    '<div class="orisha-card"><h3>Your house of spirit</h3>' +
    '<p class="orisha-role">Leo fire · earth foundation · air heart</p>' +
    '<p>Fire on top (Leo Sun), earth underneath (Taurus Rising), a Libra heart balancing it all. Your council reflects it: a king, a river, and a set of scales between them.</p>' +
    '<p class="orisha-how"><strong>How to read this panel:</strong> it\u2019s a correspondence map, a lens for reflection — not a prescription. Your practice, your pace, your altar.</p></div>';
}

// =========================== CHORES ===========================
const V3_CHORE_INTERVAL = { daily: 1, weekly: 7, biweekly: 14, monthly: 30 };
function v3ChoreDaysLeft(c) {
  const iv = V3_CHORE_INTERVAL[c.freq] || 7;
  const last = c.last || null;
  if (!last) return -1; // never done = due now
  const days = Math.floor((Date.now() - new Date(last + "T12:00:00").getTime()) / 86400000);
  return iv - days;
}
function v3RenderChores() {
  const list = document.getElementById("choresList");
  if (!list) return;
  const chores = v3Load("ccc_chores").slice().sort((a, b) => v3ChoreDaysLeft(a) - v3ChoreDaysLeft(b));
  if (!chores.length) { list.innerHTML = '<p class="helper-text">No chores yet. Add the recurring ones — the list does the remembering.</p>'; return; }
  list.innerHTML = chores.map(c => {
    const left = v3ChoreDaysLeft(c);
    const dueTxt = left <= 0 ? (c.last ? "due (" + Math.abs(left) + "d over)" : "due now")
      : "next in " + left + "d";
    const freqLabel = { daily: "daily", weekly: "weekly", biweekly: "every 2 weeks", monthly: "monthly" }[c.freq] || c.freq;
    return '<div class="line-item' + (left <= 0 ? " overdue" : "") + '">' +
      '<span class="li-text"><strong>' + esc(c.text) + '</strong> <small>(' + freqLabel + ')</small>' +
      '<br><small class="chore-due' + (left <= 0 ? " overdue" : "") + '">' + dueTxt + '</small></span>' +
      '<span class="li-actions">' +
      '<button class="mini-btn" onclick="v3ChoreDone(' + c.id + ')">✅ Done</button>' +
      '<button class="mini-btn" onclick="v3ChoreEdit(' + c.id + ')">✏️</button>' +
      '<button class="mini-btn" onclick="v3ChoreCopy(' + c.id + ')">📄</button>' +
      '<button class="mini-btn" onclick="v3Confirm(\'Delete this chore?\', () => { v3SaveChores(v3Load(\'ccc_chores\').filter(x => x.id !== ' + c.id + ')); v3RenderChores(); })">🗑️</button>' +
      '</span></div>';
  }).join("");
}
function v3SaveChores(arr) { v3Save("ccc_chores", arr); }
function v3ChoreDone(id) {
  const arr = v3Load("ccc_chores"); const c = arr.find(x => x.id === id); if (!c) return;
  c.last = v3TodayStr(); v3SaveChores(arr); v3RenderChores(); v3RenderSecTiles();
  if (typeof flashMsg === "function") flashMsg("Chore logged ✨");
}
function v3ChoreEdit(id) {
  const arr = v3Load("ccc_chores"); const c = arr.find(x => x.id === id); if (!c || typeof openEditModal !== "function") return;
  openEditModal("Edit chore", [
    { id: "text", label: "Chore", value: c.text },
    { id: "freq", label: "Rhythm", type: "select", value: c.freq, options: [
      { v: "daily", t: "🔁 Daily" }, { v: "weekly", t: "🗓️ Weekly" },
      { v: "biweekly", t: "🔁 Every 2 weeks" }, { v: "monthly", t: "🗓️ Monthly" }] }
  ], v => {
    if (!v.text.trim()) { flashMsg("Chore text can't be empty"); return; }
    Object.assign(c, { text: v.text.trim(), freq: v.freq }); v3SaveChores(arr); v3RenderChores();
  });
}
function v3ChoreCopy(id) {
  const arr = v3Load("ccc_chores"); const c = arr.find(x => x.id === id); if (!c) return;
  arr.push({ ...c, id: Date.now() + 1, last: undefined }); v3SaveChores(arr); v3RenderChores();
  if (typeof flashMsg === "function") flashMsg("Copy added ✨");
}

// =========================== MEDS ===========================
const V3_DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// one-time seed: the 10 Kaiser prescriptions from the Nov 13 transfer sheet (2 Reglan rows merged)
const V3_KAISER_SEED_KEY = "ccc_meds_seeded_kaiser";
const V3_KAISER_MEDS = [
  { name: "Protonix (pantoprazole ER) 20 mg", days: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"], note: "1 tablet 2x daily · auto refill on, next fill 12/7", purpose: "Acid reflux (GERD) — reduces stomach acid", rx: "225634128237", doctor: "Fang Lan, MD", nextFill: "2026-12-07", perDose: 2 },
  { name: "Zoloft (sertraline) 50 mg", days: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"], note: "1 tablet daily · new Rx 11/13, filling now", purpose: "Depression and anxiety (SSRI)", rx: "257207492796", doctor: "Roya Noorishad, MD", perDose: 1 },
  { name: "Gallifrey (norethindrone/ethinyl estradiol) 5 mg", days: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"], note: "1 tablet daily · 1 refill left", purpose: "Birth control", rx: "257207379294", doctor: "S G Dolisca, MD", refillsLeft: 1, perDose: 1 },
  { name: "Atarax (hydroxyzine) 25 mg", days: [], prn: true, note: "as needed", purpose: "Anxiety, itching and allergic reactions (antihistamine)", rx: "257207492798", perDose: 1 },
  { name: "Reglan (metoclopramide) 5 mg", days: [], prn: true, note: "0 refills left, needs provider re-approval", purpose: "Nausea and stomach emptying (GI motility)", rx: "257206880712 · 257206722930 (two Rx)", doctor: "P W Ackerman, MD · B M Cullison, MD", refillsLeft: 0, perDose: 1 },
  { name: "Hydrocortisone 2.5% cream", days: [], prn: true, note: "topical · 1 refill left", purpose: "Skin inflammation (topical steroid)", rx: "225646186802", doctor: "Fang Lan, MD", refillsLeft: 1, perDose: 1 },
  { name: "Ferosul (ferrous sulfate) 325 mg", days: ["Sun","Mon","Wed","Fri"], note: "iron · OTC at any pharmacy · see label", purpose: "Iron supplement (anemia)", rx: "257107791660", doctor: "Jessame Ann Soriano, MD", perDose: 1 }
];
function v3SeedKaiserMeds() {
  try {
    if (localStorage.getItem(V3_KAISER_SEED_KEY)) return;
    const arr = v3Load("ccc_meds");
    const have = new Set(arr.map(x => (x.name || "").trim().toLowerCase()));
    V3_KAISER_MEDS.forEach((m, i) => { if (!have.has(m.name.toLowerCase())) arr.push({ id: Date.now() + i + 1, log: {}, ...m }); });
    v3Save("ccc_meds", arr);
    localStorage.setItem(V3_KAISER_SEED_KEY, "1");
  } catch (e) {}
}
v3SeedKaiserMeds();
// one-time migration (Nov 14): Roxicodone + Norco retired per Clarissa; fill detail fields the seed now carries
const V3_MEDS_MIGRATE_KEY = "ccc_meds_detail_migrate_1";
(function v3MigrateMeds() {
  try {
    if (localStorage.getItem(V3_MEDS_MIGRATE_KEY)) return;
    const arr = v3Load("ccc_meds");
    const keep = arr.filter(x => !/roxicodone|norco/i.test(x.name || ""));
    const byName = new Map(V3_KAISER_MEDS.map(x => [x.name, x]));
    keep.forEach(m => {
      const sd = byName.get(m.name);
      if (sd) ["purpose", "rx", "doctor", "nextFill", "perDose", "refillsLeft"].forEach(f => { if (m[f] === undefined && sd[f] !== undefined) m[f] = sd[f]; });
    });
    v3Save("ccc_meds", keep);
    localStorage.setItem(V3_MEDS_MIGRATE_KEY, "1");
  } catch (e) {}
})();
function v3RenderMeds() {
  const list = document.getElementById("medsList");
  if (!list) return;
  const meds = v3Load("ccc_meds");
  const today = v3TodayStr();
  const dow = v3Dow3();
  if (!meds.length) { list.innerHTML = '<p class="helper-text">No meds tracked yet. Add one with its days — iron is already on the Mon/Wed/Fri/Sun rhythm if you add it.</p>'; return; }
  list.innerHTML = meds.map(m => {
    const dueToday = (m.days || []).includes(dow);
    const doneToday = m.log && m.log[today];
    const note = m.note ? '<br><small style="color:var(--text-muted)">' + esc(m.note) + '</small>' : '';
    if (m.prn) {
      const taken = doneToday ? '<small style="color:var(--taurus-emerald)">logged today ✓</small>' : '<button class="mini-btn" onclick="v3MedDone(' + m.id + ')">✅ Took one</button>';
      return '<div class="line-item"><span class="li-text"><strong><span class="med-name-link" title="Tap for details" onclick="v3MedInfo(' + m.id + ')">' + esc(m.name) + '</span></strong> <small>as needed</small>' + note + '</span>' +
        '<span class="li-actions">' + taken +
        '<button class="mini-btn" onclick="v3MedEdit(' + m.id + ')">✏️</button>' +
        '<button class="mini-btn" onclick="v3MedCopy(' + m.id + ')">📄</button>' +
        '<button class="mini-btn" onclick="v3Confirm(\'Remove this med?\', () => { v3Save(\'ccc_meds\', v3Load(\'ccc_meds\').filter(x => x.id !== ' + m.id + ')); v3RenderMeds(); v3RenderSecTiles(); })">🗑️</button>' +
        '</span></div>';
    }
    const dots = V3_DOW.map(d => {
      const due = (m.days || []).includes(d);
      if (!due) return '<span class="med-dot"></span>';
      let dt = new Date(), hits = 0;
      for (let i = 0; i < 7; i++) { if (V3_DOW[dt.getDay()] === d) break; dt.setDate(dt.getDate() - 1); }
      const key = dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0");
      const on = m.log && m.log[key];
      return '<span class="med-dot ' + (on ? "on" : (d === dow && !doneToday ? "due" : "")) + '" title="' + d + '"></span>';
    }).join("");
    return '<div class="line-item"><span class="li-text"><strong><span class="med-name-link" title="Tap for details" onclick="v3MedInfo(' + m.id + ')">' + esc(m.name) + '</span></strong>' +
      ' <small>' + (m.days || []).join(" · ") + '</small>' + note + '<br><span class="med-dots">' + dots + '</span>' + v3MedBadge(m) + '</span>' +
      '<span class="li-actions">' +
      (dueToday && !doneToday ? '<button class="mini-btn" onclick="v3MedDone(' + m.id + ')">✅ Taken</button>' : (dueToday ? '<small style="color:var(--taurus-emerald)">done today ✓</small>' : '<small style="color:var(--text-muted)">not today</small>')) +
      '<button class="mini-btn" onclick="v3MedEdit(' + m.id + ')">✏️</button>' +
      '<button class="mini-btn" onclick="v3MedCopy(' + m.id + ')">📄</button>' +
      '<button class="mini-btn" onclick="v3Confirm(\'Remove this med?\', () => { v3Save(\'ccc_meds\', v3Load(\'ccc_meds\').filter(x => x.id !== ' + m.id + ')); v3RenderMeds(); v3RenderSecTiles(); })">🗑️</button>' +
      '</span></div>';
  }).join("");

}
function v3RenderGardenSummary() {
  const el = document.getElementById("gardenSummary");
  if (!el) return;
  let st = null;
  try { st = JSON.parse(localStorage.getItem("clarissa_botanical_conservatory_v5") || "null"); } catch (e) {}
  if (!st || !st.plants) { el.innerHTML = '<p class="helper-text">No garden yet \u2014 open 📋 Tasks and pot your first task.</p>'; return; }
  const stage = xp => xp < 25 ? "Stage 1 \u00b7 Prop 🫙" : xp < 55 ? "Stage 2 \u00b7 Terracotta 🪴" : xp < 85 ? "Stage 3 \u00b7 Lush 🌿" : "Stage 4 \u00b7 Showstopper ✨";
  const barColor = h => h < 30 ? "#e5989b" : h < 60 ? "var(--leo-gold)" : "var(--taurus-emerald)";
  const rows = Object.values(st.plants).map(p =>
    '<div style="display:flex;align-items:center;gap:.55rem;margin:.32rem 0;">' +
      '<div style="flex:1;min-width:0;">' +
        '<div style="font-size:.85rem;font-weight:600;">' + esc(p.name) + (p.gnats ? ' <span style="color:#e5989b">🦟 gnats</span>' : '') + '</div>' +
        '<div style="font-size:.72rem;opacity:.7;">' + stage(p.xp || 0) + '</div>' +
        '<div style="height:6px;border-radius:999px;background:rgba(255,255,255,.12);overflow:hidden;margin-top:.2rem;">' +
          '<div style="height:100%;width:' + Math.max(2, Math.min(100, p.hydration || 0)) + '%;background:' + barColor(p.hydration || 0) + ';border-radius:999px;"></div>' +
        '</div>' +
      '</div>' +
      '<span style="font-size:.78rem;opacity:.85;flex:none;">' + (p.hydration || 0) + '%</span>' +
    '</div>').join("");
  let feed = {};
  try { feed = JSON.parse(localStorage.getItem("ccc_med_feed_log") || "{}"); } catch (e) {}
  const doses = feed[v3TodayStr()] || 0;
  const lanes = { top3: 0, waiting: 0, archive: 0 };
  try { (JSON.parse(localStorage.getItem("clarissa_tasks") || "[]")).forEach(t => { if (lanes[t.col] !== undefined) lanes[t.col]++; }); } catch (e) {}
  let overdue = 0;
  try { (st.tasks || []).forEach(t => { if (t.overdue) overdue++; }); } catch (e) {}
  el.innerHTML = rows +
    '<div style="display:flex;gap:.8rem;flex-wrap:wrap;font-size:.78rem;opacity:.9;margin-top:.55rem;">' +
      '<span>💊 ' + doses + (doses === 1 ? ' dose' : ' doses') + ' fed the garden today</span>' +
      '<span>🎯 Focus ' + lanes.top3 + '</span>' +
      '<span>⏳ Waiting ' + lanes.waiting + '</span>' +
      '<span>🏆 ' + (st.harvests || 0) + ' harvests</span>' +
      (overdue ? '<span style="color:#e5989b">🦟 ' + overdue + ' overdue</span>' : '') +
    '</div>';
}
function v3MedDaysLeft(m) {
  if (typeof m.count !== "number" || m.prn || !(m.days || []).length) return null;
  const perDay = (m.perDose || 1) * (m.days.length / 7);
  return Math.ceil(m.count / perDay);
}
function v3MedBadge(m) {
  const dl = v3MedDaysLeft(m);
  if (dl === null || dl > 10) return "";
  return '<br><span style="color:var(--leo-gold);font-weight:700">⚠️ ' + (dl <= 0 ? "out of pills — refill now" : "~" + dl + " days of pills left") + '</span>';
}
function v3MedAdjust(id, delta) {
  const arr = v3Load("ccc_meds"); const m = arr.find(x => x.id === id); if (!m) return;
  m.count = Math.max(0, (typeof m.count === "number" ? m.count : 0) + delta);
  v3Save("ccc_meds", arr); v3RenderMeds(); v3RenderSecTiles(); v3MedInfo(id);
}
function v3MedInfo(id) {
  const m = v3Load("ccc_meds").find(x => x.id === id); if (!m) return;
  let ov = document.getElementById("cccModal"); if (ov) ov.remove();
  ov = document.createElement("div"); ov.id = "cccModal";
  ov.style.cssText = "position:fixed;inset:0;background:rgba(10,6,18,.72);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;";
  const row = (k, v) => '<div style="display:flex;gap:.6rem;font-size:.9rem;"><span style="opacity:.6;min-width:6.4rem;flex:none;">' + k + '</span><span>' + v + '</span></div>';
  const dl = v3MedDaysLeft(m);
  const countCell = typeof m.count === "number"
    ? '<span style="font-weight:700;">' + m.count + ' left</span>' +
      '<button class="mini-btn" onclick="v3MedAdjust(' + m.id + ', -1)">−1</button>' +
      '<button class="mini-btn" onclick="v3MedAdjust(' + m.id + ', 1)">+1</button>'
    : '<span style="opacity:.6;">not tracking yet</span> <button class="mini-btn" onclick="v3MedEdit(' + m.id + ')">Set starting count</button>';
  const sched = m.prn ? "as needed" : (((m.days || []).join(", ") || "—") + ((m.perDose || 1) > 1 ? " · " + m.perDose + " per dose" : ""));
  const dlLine = dl === null ? "" :
    '<div style="margin-top:.45rem;font-size:.88rem;' + (dl <= 10 ? "color:var(--leo-gold);font-weight:700;" : "opacity:.75;") + '">≈ ' + (dl <= 0 ? "0" : dl) + ' days of pills left at this schedule' + (dl <= 10 ? " — time to refill" : "") + '</div>';
  ov.innerHTML = '<div style="background:#1c1829;border:1px solid rgba(255,255,255,.15);border-radius:16px;padding:1.25rem;max-width:440px;width:100%;color:#f8f7ff;box-shadow:0 12px 48px rgba(0,0,0,.6);">' +
    '<h3 style="margin:0 0 .3rem;font-size:1.02rem;color:#f4b860;">' + esc(m.name) + '</h3>' +
    '<div style="display:flex;flex-direction:column;gap:.45rem;margin-top:.8rem;">' +
      row("For", m.purpose ? esc(m.purpose) : "—") +
      row("Schedule", esc(sched)) +
      row("Rx #", m.rx ? esc(String(m.rx)) : "—") +
      row("Prescriber", m.doctor ? esc(m.doctor) : "—") +
      row("Last filled", m.lastFill ? esc(m.lastFill) : "—") +
      row("Next fill", m.nextFill ? esc(m.nextFill) : "—") +
      row("Refills left", typeof m.refillsLeft === "number" ? String(m.refillsLeft) : "—") +
      row("Note", m.note ? esc(m.note) : "—") +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:.45rem;flex-wrap:wrap;margin-top:.7rem;">' + countCell + '</div>' +
    dlLine +
    '<div style="display:flex;gap:.6rem;margin-top:1.1rem;">' +
      '<button class="mini-btn" onclick="v3MedEdit(' + m.id + ')">✏️ Edit details</button>' +
      '<button class="mini-btn" onclick="document.getElementById(\'cccModal\').remove()">Close</button>' +
    '</div>' +
  '</div>';
  document.body.appendChild(ov);
  ov.addEventListener("click", e => { if (e.target === ov) ov.remove(); });
}
function v3MedDone(id) {
  const arr = v3Load("ccc_meds"); const m = arr.find(x => x.id === id); if (!m) return;
  m.log = m.log || {}; m.log[v3TodayStr()] = true;
  if (typeof m.count === "number") m.count = Math.max(0, m.count - (m.perDose || 1));
  v3Save("ccc_meds", arr); v3RenderMeds(); v3RenderSecTiles();
  try {
    localStorage.setItem("ccc_med_garden_feed", JSON.stringify({ ts: Date.now(), med: m.name }));
    const fl = JSON.parse(localStorage.getItem("ccc_med_feed_log") || "{}");
    fl[v3TodayStr()] = (fl[v3TodayStr()] || 0) + 1;
    localStorage.setItem("ccc_med_feed_log", JSON.stringify(fl));
  } catch (e) {}
  if (typeof flashMsg === "function") flashMsg("Logged. Good. 💊");
}
function v3MedEdit(id) {
  const arr = v3Load("ccc_meds"); const m = arr.find(x => x.id === id); if (!m || typeof openEditModal !== "function") return;
  const num = x => { const n = Number(x); return x === "" || isNaN(n) ? undefined : n; };
  openEditModal("Edit med", [
    { id: "name", label: "Name & dose", value: m.name },
    { id: "daysTxt", label: "Days (comma list; leave empty for as-needed)", value: (m.days || []).join(",") },
    { id: "purpose", label: "Prescribed for", value: m.purpose || "" },
    { id: "rx", label: "Rx number", value: m.rx || "" },
    { id: "doctor", label: "Prescriber", value: m.doctor || "" },
    { id: "lastFill", label: "Last filled (date)", type: "date", value: m.lastFill || "" },
    { id: "nextFill", label: "Next fill due (date)", type: "date", value: m.nextFill || "" },
    { id: "count", label: "Pills left (starting count)", type: "number", value: m.count == null ? "" : m.count },
    { id: "perDose", label: "Pills per dose", type: "number", value: m.perDose == null ? 1 : m.perDose },
    { id: "refillsLeft", label: "Refills left on this Rx", type: "number", value: m.refillsLeft == null ? "" : m.refillsLeft },
    { id: "note", label: "Note (directions, refills)", value: m.note || "" }
  ], v => {
    if (!v.name.trim()) { flashMsg("Name can't be empty"); return; }
    const want = v.daysTxt.split(/[\s,]+/).map(s => s.trim()).filter(s => V3_DOW.includes(s));
    const uniq = [...new Set(want)];
    if (uniq.length !== want.length) { flashMsg("A day appears twice"); return; }
    Object.assign(m, { name: v.name.trim(), days: uniq, prn: !uniq.length, note: v.note.trim(),
      purpose: v.purpose.trim(), rx: v.rx.trim(), doctor: v.doctor.trim(),
      lastFill: v.lastFill || undefined, nextFill: v.nextFill || undefined,
      count: num(v.count), perDose: num(v.perDose) || 1, refillsLeft: num(v.refillsLeft) });
    v3Save("ccc_meds", arr); v3RenderMeds(); v3RenderSecTiles();
  });
}
function v3MedCopy(id) {
  const arr = v3Load("ccc_meds"); const m = arr.find(x => x.id === id); if (!m) return;
  arr.push({ ...m, id: Date.now() + 1, log: {} }); v3Save("ccc_meds", arr); v3RenderMeds();
  if (typeof flashMsg === "function") flashMsg("Copy added ✨");
}

// =========================== HAIR ===========================
function v3RenderHair() {
  const list = document.getElementById("hairList");
  const nextEl = document.getElementById("hairNext");
  if (nextEl) {
    const cadence = Number(localStorage.getItem("ccc_hair_cadence") || 14);
    const entries = v3Load("ccc_hair").filter(e => e.type === "wash");
    let nextTxt = "Set a wash day cadence below and the next date shows up here.";
    if (entries.length) {
      const lastWash = entries.map(e => e.date).sort().slice(-1)[0];
      const next = new Date(lastWash + "T12:00:00"); next.setDate(next.getDate() + cadence);
      const days = Math.ceil((next - new Date(v3TodayStr() + "T12:00:00")) / 86400000);
      nextTxt = "Last wash " + lastWash + " · next wash " + next.toISOString().slice(0, 10) +
        (days <= 0 ? " (due!)" : " in " + days + "d");
    }
    nextEl.innerHTML = '<span class="chore-due">' + esc(nextTxt) + '</span>';
  }
  if (!list) return;
  const entries = v3Load("ccc_hair").slice().reverse();
  if (!entries.length) { list.innerHTML = '<p class="helper-text">No hair log yet. Add wash days, deep conditions, trims, and what you used.</p>'; return; }
  const typeLabel = { wash: "🚿 Wash", deep: "🫧 Deep condition", trim: "✂️ Trim", style: "💅 Styled", note: "📝 Note" };
  list.innerHTML = entries.map(e =>
    '<div class="line-item"><span class="li-text"><strong>' + (typeLabel[e.type] || "📝") + ' ' + esc(e.text || "") + '</strong>' +
    ' <small>' + esc(e.date) + '</small></span>' +
    '<span class="li-actions">' +
    '<button class="mini-btn" onclick="v3HairEdit(' + e.id + ')">✏️</button>' +
    '<button class="mini-btn" onclick="v3HairCopy(' + e.id + ')">📄</button>' +
    '<button class="mini-btn" onclick="v3Confirm(\'Delete this entry?\', () => { v3Save(\'ccc_hair\', v3Load(\'ccc_hair\').filter(x => x.id !== ' + e.id + ')); v3RenderHair(); })">🗑️</button>' +
    '</span></div>').join("");
}
function v3HairEdit(id) {
  const arr = v3Load("ccc_hair"); const e = arr.find(x => x.id === id); if (!e || typeof openEditModal !== "function") return;
  openEditModal("Edit hair entry", [
    { id: "type", label: "Type", type: "select", value: e.type, options: [
      { v: "wash", t: "🚿 Wash" }, { v: "deep", t: "🫧 Deep condition" }, { v: "trim", t: "✂️ Trim" },
      { v: "style", t: "💅 Styled" }, { v: "note", t: "📝 Note" }] },
    { id: "text", label: "Notes", value: e.text || "" },
    { id: "date", label: "Date", type: "date", value: e.date }
  ], v => {
    Object.assign(e, { type: v.type, text: v.text.trim(), date: v.date || e.date });
    v3Save("ccc_hair", arr); v3RenderHair();
  });
}
function v3HairCopy(id) {
  const arr = v3Load("ccc_hair"); const e = arr.find(x => x.id === id); if (!e) return;
  arr.push({ ...e, id: Date.now() + 1 }); v3Save("ccc_hair", arr); v3RenderHair();
  if (typeof flashMsg === "function") flashMsg("Copy added ✨");
}

// =========================== WIRING ===========================
document.addEventListener("DOMContentLoaded", () => {
  v3BuildNav();
  // restore last view
  let view = null;
  try { view = JSON.parse(sessionStorage.getItem(V3_VIEW_KEY)); } catch (e) {}
  v3Go(view && V3_SECTIONS[view.s] ? view.s : "dash", view && view.t ? view.t : "today");
  v3RenderDash();
  v3RenderGardenSummary();
  v3RenderOrisha();
  v3RenderTarot();
  v3RenderChores();
  v3RenderMeds();
  v3RenderHair();
  // new-panel forms
  const choreForm = document.getElementById("choreForm");
  if (choreForm) choreForm.addEventListener("submit", e => {
    e.preventDefault();
    const t = document.getElementById("choreInput").value.trim();
    if (!t) return;
    const arr = v3Load("ccc_chores");
    arr.push({ id: Date.now(), text: t, freq: document.getElementById("choreFreq").value });
    v3SaveChores(arr); document.getElementById("choreInput").value = ""; v3RenderChores(); v3RenderSecTiles();
  });
  const medForm = document.getElementById("medForm");
  if (medForm) medForm.addEventListener("submit", e => {
    e.preventDefault();
    const n = document.getElementById("medInput").value.trim();
    if (!n) return;
    const days = Array.from(document.querySelectorAll("#medDays .ccc-day-chip.on")).map(b => b.dataset.day);
    const arr = v3Load("ccc_meds");
    arr.push({ id: Date.now(), name: n, days: days.length ? days : V3_DOW.slice(), log: {} });
    v3Save("ccc_meds", arr); document.getElementById("medInput").value = ""; v3RenderMeds(); v3RenderSecTiles();
  });
  document.querySelectorAll("#medDays .ccc-day-chip").forEach(b =>
    b.addEventListener("click", () => b.classList.toggle("on")));
  const hairForm = document.getElementById("hairForm");
  if (hairForm) hairForm.addEventListener("submit", e => {
    e.preventDefault();
    const t = document.getElementById("hairInput").value.trim();
    if (!t) return;
    const arr = v3Load("ccc_hair");
    arr.push({ id: Date.now(), type: document.getElementById("hairType").value, text: t, date: v3TodayStr() });
    v3Save("ccc_hair", arr); document.getElementById("hairInput").value = ""; v3RenderHair();
  });
  const cadSel = document.getElementById("hairCadence");
  if (cadSel) {
    cadSel.value = localStorage.getItem("ccc_hair_cadence") || "14";
    cadSel.addEventListener("change", () => { localStorage.setItem("ccc_hair_cadence", cadSel.value); v3RenderHair(); });
  }
  const spreadBtn = document.getElementById("tarotSpreadBtn");
  if (spreadBtn) spreadBtn.addEventListener("click", v3TarotSpread);
  // dashboard tiles refresh on any data change we can see
  setInterval(v3RenderSecTiles, 60000);
});

// --- garden: soil updates, the 5-day sky translated into watering duty ---
async function v3RenderSoil() {
  const grid = document.getElementById("soilGrid");
  if (!grid) return;
  const btn = document.getElementById("soilRefreshBtn");
  if (btn) btn.addEventListener("click", v3RenderSoil);
  grid.innerHTML = '<p class="helper-text">Reading the sky over the beds\u2026</p>';
  try {
    const r = await fetch("https://api.open-meteo.com/v1/forecast?latitude=37.99&longitude=-121.81&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=America%2FLos_Angeles&forecast_days=5");
    if (!r.ok) throw new Error("sky feed " + r.status);
    const d = await r.json();
    const days = d.daily, names = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    let html = "", rainDays = 0;
    for (let i = 0; i < 5; i++) {
      const dt = new Date(days.time[i] + "T12:00:00");
      const label = i === 0 ? "Today" : names[dt.getDay()];
      const code = days.weather_code[i];
      const c = V2_FC_CODES[code] || ["\u2014", "\uD83C\uDF21\uFE0F"];
      const maxF = Math.round(days.temperature_2m_max[i] * 9 / 5 + 32);
      const minF = Math.round(days.temperature_2m_min[i] * 9 / 5 + 32);
      const mm = days.precipitation_sum ? (days.precipitation_sum[i] || 0) : 0;
      const prob = days.precipitation_probability_max ? days.precipitation_probability_max[i] : null;
      const wet = (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || (code >= 95 && code <= 99) || mm >= 2 || (prob != null && prob >= 50);
      if (wet) rainDays++;
      const badge = wet
        ? '<span class="soil-duty soil-rain">\uD83C\uDF02 Mother Nature waters</span>'
        : '<span class="soil-duty soil-dry">\uD83D\uDC8C hose duty</span>';
      const rainLine = prob != null ? ' \u00B7 ' + prob + '% rain' : (mm ? ' \u00B7 ' + Math.round(mm) + 'mm' : '');
      html += '<div class="fc-tile soil-tile' + (wet ? ' soil-wet' : '') + '">'
        + '<span class="fc-day">' + esc(label) + '</span>'
        + '<span class="fc-emoji">' + c[1] + '</span>'
        + '<span class="fc-temp">' + maxF + '\u00B0<small> / ' + minF + '\u00B0</small></span>'
        + '<span class="fc-cond">' + esc(c[0]) + rainLine + '</span>'
        + badge + '</div>';
    }
    const lead = rainDays === 0
      ? "No rain in the 5-day window: the watering rhythm is all yours this week."
      : rainDays + " rain day" + (rainDays === 1 ? "" : "s") + " ahead \u2014 Mother Nature handles the hose" + (rainDays === 1 ? " that day" : " those days") + ".";
    grid.innerHTML = '<p class="soil-lead">' + esc(lead) + '</p>' + html;
  } catch (e) {
    grid.innerHTML = '<p class="helper-text">Sky feed didn\u2019t load. Tap \u21BB Refresh to try again.</p>';
  }
}

// --- garden: Soil & Sky, real dirt data from Open-Meteo (moisture by depth, clay crack risk, rain ledger, soak windows) ---
async function v3RenderSoilDeep() {
  const mo = document.getElementById("soilMoisture");
  if (!mo) return;
  const btn = document.getElementById("soilDeepRefreshBtn");
  if (btn) btn.addEventListener("click", v3RenderSoilDeep);
  mo.innerHTML = '<p class="helper-text">Sounding the soil…</p>';
  const cm = document.getElementById("crackMeter");
  const rl = document.getElementById("rainLedger");
  const ww = document.getElementById("waterWindows");
  if (cm) cm.innerHTML = "";
  if (rl) rl.innerHTML = "";
  if (ww) ww.innerHTML = "";
  try {
    const url = "https://api.open-meteo.com/v1/forecast?latitude=37.99&longitude=-121.81"
      + "&hourly=soil_moisture_0_to_1cm,soil_moisture_3_to_9cm,soil_moisture_9_to_27cm,soil_moisture_27_to_81cm,soil_temperature_0_to_7cm,et0_fao_evapotranspiration,precipitation,temperature_2m,wind_speed_10m"
      + "&daily=precipitation_sum,et0_fao_evapotranspiration_sum"
      + "&past_days=7&forecast_days=5&timezone=America%2FLos_Angeles";
    const r = await fetch(url);
    if (!r.ok) throw new Error("soil feed " + r.status);
    const d = await r.json();
    const h = d.hourly, days = d.daily;
    const nowMs = Date.now();
    let nowIdx = 0;
    for (let i = 0; i < h.time.length; i++) {
      if (new Date(h.time[i]).getTime() <= nowMs) nowIdx = i;
    }
    const WKNAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const todayKey = h.time[nowIdx].slice(0, 10);
    const todayIdx = Math.max(days.time.indexOf(todayKey), 0);

    // moisture by depth, current hour
    const rows = [
      ["Surface crust, 0\u20131cm", h.soil_moisture_0_to_1cm[nowIdx]],
      ["Root zone, 3\u20139cm", h.soil_moisture_3_to_9cm[nowIdx]],
      ["Feeder roots, 9\u201327cm", h.soil_moisture_9_to_27cm[nowIdx]],
      ["Deep reserve, 27\u201381cm", h.soil_moisture_27_to_81cm[nowIdx]]
    ];
    let mHtml = '<div class="soil-sec">💧 Moisture by depth, right now</div>';
    for (const row of rows) {
      const v = row[1];
      const pct = v == null ? null : Math.round(v * 100);
      const cls = pct == null ? "soil-dry" : (pct < 20 ? "soil-dry" : (pct <= 32 ? "soil-good" : "soil-soggy"));
      const st = pct == null ? "" : (pct < 20 ? " · dry" : (pct <= 32 ? " · good soak" : " · soggy"));
      const w = pct == null ? 0 : Math.min(100, Math.round(pct * 2.5));
      mHtml += '<div class="soil-row"><span class="soil-label">' + esc(row[0]) + '</span>'
        + '<span class="soil-bar"><span class="soil-fill ' + cls + '" style="width:' + w + '%"></span></span>'
        + '<span class="soil-val">' + (pct == null ? "—" : pct + "%" + st) + '</span></div>';
    }
    const stF = h.soil_temperature_0_to_7cm[nowIdx] == null ? null : Math.round(h.soil_temperature_0_to_7cm[nowIdx] * 9 / 5 + 32);
    if (stF != null) {
      const wormNote = stF >= 55 && stF <= 77 ? "worm-friendly" : (stF > 77 ? "hot for the worms" : "chilly for the worms");
      mHtml += '<p class="soil-note">Soil temp ' + stF + "°F · " + wormNote + '. Under 20% is dry clay, over 32% is saturated.</p>';
    }
    mo.innerHTML = mHtml;

    // clay crack risk: days since last real rain + ET burn since then
    let lastRain = -1;
    for (let i = 0; i <= todayIdx; i++) {
      if ((days.precipitation_sum[i] || 0) >= 2) lastRain = i;
    }
    const daysSince = lastRain >= 0 ? todayIdx - lastRain : 8;
    let cumET = 0;
    for (let i = (lastRain >= 0 ? lastRain + 1 : 0); i <= todayIdx; i++) {
      cumET += ((days.et0_fao_evapotranspiration_sum ? days.et0_fao_evapotranspiration_sum[i] : 0) || 0);
    }
    const risk = Math.min(100, Math.round(daysSince * 9 + cumET * 7));
    const rLabel = risk < 25 ? "Soft & workable" : (risk < 50 ? "Drying out" : (risk < 75 ? "Cracking watch" : "Hardpan watch"));
    const rCls = risk < 25 ? "soil-good" : (risk < 50 ? "soil-dry" : (risk < 75 ? "soil-warn" : "soil-bad"));
    let cHtml = '<div class="soil-sec">🧱 Clay crack risk</div>'
      + '<div class="crack-meter"><span class="soil-fill ' + rCls + '" style="width:' + risk + '%"></span></div>'
      + '<p class="soil-note"><strong>' + risk + "/100 · " + esc(rLabel) + '</strong>'
      + (lastRain >= 0 ? " · last real rain " + (daysSince === 0 ? "today" : daysSince + (daysSince === 1 ? " day ago" : " days ago")) : " · no real rain in the past week")
      + " · " + cumET.toFixed(1) + "mm of sky-dry since then.</p>";
    for (let i = todayIdx + 1; i < days.time.length; i++) {
      if ((days.precipitation_sum[i] || 0) >= 2) {
        const nm = WKNAMES[new Date(days.time[i] + "T12:00:00").getDay()];
        cHtml += '<p class="soil-note">⛅ Mother Nature resets the clock ' + nm + " (about " + ((days.precipitation_sum[i] || 0) * 0.0394).toFixed(1) + "in).</p>";
        break;
      }
    }
    if (risk >= 50) cHtml += '<p class="soil-note">Gypsum season: spread before the next rain so it washes down into the clay.</p>';
    if (cm) cm.innerHTML = cHtml;

    // rain ledger
    let pastRain = 0, nextRain = 0;
    for (let i = 0; i <= todayIdx; i++) pastRain += (days.precipitation_sum[i] || 0);
    for (let i = todayIdx + 1; i < days.time.length; i++) nextRain += (days.precipitation_sum[i] || 0);
    if (rl) rl.innerHTML = '<div class="soil-sec">🌧️ Mother Nature’s ledger</div>'
      + '<div class="ledger-chips"><span class="soil-chip">past 7 days: ' + (pastRain * 0.0394).toFixed(2) + ' in</span>'
      + '<span class="soil-chip">5-day delivery: ' + (nextRain * 0.0394).toFixed(2) + ' in</span></div>';

    // soak windows: calm, cool, dry mornings in the next 48h
    const cand = [];
    for (let i = nowIdx + 1; i < Math.min(h.time.length, nowIdx + 49); i++) {
      const hr = new Date(h.time[i]).getHours();
      if (hr < 5 || hr > 10) continue;
      if ((h.precipitation[i] || 0) > 0) continue;
      if (h.wind_speed_10m[i] > 20) continue;
      const tF = Math.round(h.temperature_2m[i] * 9 / 5 + 32);
      const wM = Math.round(h.wind_speed_10m[i] * 0.621);
      const score = Math.max(0, tF - 60) * 1.5 + wM * 1.2 + ((h.et0_fao_evapotranspiration[i] || 0) * 30);
      cand.push({ i, hr, tF, wM, score });
    }
    cand.sort((a, b) => a.score - b.score);
    const picks = [];
    for (const c of cand) {
      if (picks.some(p => Math.abs(p.i - c.i) <= 2)) continue;
      picks.push(c);
      if (picks.length === 2) break;
    }
    let wHtml = '<div class="soil-sec">💦 Soak windows, next 48h</div>';
    if (!picks.length) {
      wHtml += '<p class="soil-note">No calm morning window in the next 48h — evening soak, or let the rain do it.</p>';
    } else {
      wHtml += '<div class="win-chips">' + picks.map(p => {
        const dt = new Date(h.time[p.i]);
        const dayL = dt.toDateString() === new Date().toDateString() ? "Today"
          : (dt.toDateString() === new Date(nowMs + 864e5).toDateString() ? "Tomorrow" : WKNAMES[dt.getDay()]);
        const loH = Math.max(5, p.hr - 1), hiH = Math.min(10, p.hr + 1);
        const l12 = loH % 12 === 0 ? 12 : loH % 12, h12v = hiH % 12 === 0 ? 12 : hiH % 12;
        return '<span class="soil-chip win">' + dayL + " " + l12 + "–" + h12v + " AM · " + p.tF + "°F · " + p.wM + " mph</span>";
      }).join("") + '</div>'
      + '<p class="soil-note">Windows matter most in Antioch summer heat; in cool months nearly any calm morning works.</p>';
    }
    if (ww) ww.innerHTML = wHtml;
  } catch (e) {
    mo.innerHTML = '<p class="helper-text">Soil feed didn’t load. Tap ↻ Refresh to try again.</p>';
  }
}

// --- garden: soil log, field notes that date themselves ---
function v3SaveSoilLog(arr) { v3Save("ccc_soil_log", arr); }
function renderSoilLog() {
  const list = document.getElementById("soilLogList");
  if (!list) return;
  const log = v3Load("ccc_soil_log").slice().sort((a, b) => b.d.localeCompare(a.d) || b.id - a.id);
  if (!log.length) { list.innerHTML = '<p class="helper-text">Empty for now. First crack, first fog, first rain — log it.</p>'; return; }
  list.innerHTML = log.map(n => {
    const dTxt = n.d.slice(5).replace("-", "/");
    return '<div class="line-item"><span class="li-text"><small>' + dTxt + '</small> ' + esc(n.t) + '</span>'
      + '<span class="li-actions">'
      + '<button class="mini-btn" onclick="soilLogEdit(' + n.id + ')">✏️</button>'
      + '<button class="mini-btn" onclick="soilLogCopy(' + n.id + ')">📄</button>'
      + '<button class="mini-btn" onclick="v3Confirm(\'Delete this soil note?\', () => { v3SaveSoilLog(v3Load(\'ccc_soil_log\').filter(x => x.id !== ' + n.id + ')); renderSoilLog(); })">🗑️</button>'
      + '</span></div>';
  }).join("");
}
function soilLogAdd(e) {
  e.preventDefault();
  const input = document.getElementById("soilLogInput");
  const t = (input.value || "").trim();
  if (!t) return;
  const d = new Date();
  const iso = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const arr = v3Load("ccc_soil_log");
  const id = arr.length ? Math.max.apply(null, arr.map(x => x.id || 0)) + 1 : 1;
  arr.push({ id, d: iso, t });
  v3SaveSoilLog(arr); input.value = ""; renderSoilLog();
  if (typeof flashMsg === "function") flashMsg("Soil note logged 🌱");
}
function soilLogEdit(id) {
  const arr = v3Load("ccc_soil_log"); const n = arr.find(x => x.id === id);
  if (!n || typeof openEditModal !== "function") return;
  openEditModal("Edit soil note", [{ id: "text", label: "Note", value: n.t }], v => {
    if (!v.text.trim()) { flashMsg("Note can’t be empty"); return; }
    n.t = v.text.trim(); v3SaveSoilLog(arr); renderSoilLog();
  });
}
function soilLogCopy(id) {
  const arr = v3Load("ccc_soil_log"); const n = arr.find(x => x.id === id); if (!n) return;
  const d = new Date();
  const iso = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  arr.push({ id: Math.max.apply(null, arr.map(x => x.id || 0)) + 1, d: iso, t: n.t });
  v3SaveSoilLog(arr); renderSoilLog();
}
document.addEventListener("DOMContentLoaded", () => {
  const f = document.getElementById("soilLogForm");
  if (f) f.addEventListener("submit", soilLogAdd);
});


/* ===== Social: The Friend Wall (v3) ===== */
let __socOrder = [];
let __socCalLoose = [];
function __socSplit(text) {
  const m = String(text || "").match(/^(.+?)\s+(?:-{1,2}|\u2013|\u2014|:)\s+(.+)$/);
  return m ? { who: m[1].trim(), rest: m[2].trim() } : null;
}
function __socKey(who) { return String(who || "").trim().toLowerCase(); }
function __socLoad(key) {
  let arr;
  try { arr = JSON.parse(localStorage.getItem(key)) || []; } catch (e) { arr = []; }
  if (arr.length && typeof arr[0] === "string") {
    arr = arr.map(s => { const p = __socSplit(s); return p ? { t: p.rest, who: p.who } : { t: s }; });
    localStorage.setItem(key, JSON.stringify(arr));
  }
  return arr.filter(x => x && typeof x === "object" && x.t);
}
function __socPeople() {
  try { return JSON.parse(localStorage.getItem("ccc_social_people")) || {}; } catch (e) { return {}; }
}
function __socInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
}
function __socFmtDate(d) {
  if (!d) return "";
  try { return new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }); }
  catch (e) { return d; }
}
function __socBdayText(b) {
  if (!b) return "";
  let y, mo, dd, m = b.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) { y = +m[1]; mo = +m[2]; dd = +m[3]; }
  else { m = b.match(/^(\d{1,2})[\/-](\d{1,2})$/); if (!m) return ""; y = new Date().getFullYear(); mo = +m[1]; dd = +m[2]; }
  const now = new Date();
  let d = new Date(y, mo - 1, dd);
  const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (d < todayMid) d = new Date(y + 1, mo - 1, dd);
  const days = Math.round((d - todayMid) / 864e5);
  const when = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return "\uD83C\uDF38 " + (days <= 30 ? "blooms in " + days + (days === 1 ? " day" : " days") : "next bloom " + when);
}
function __socBday(b) {
  const t = __socBdayText(b);
  return t ? `<div class="fc-bday">${t}</div>` : "";
}
function __socBdayDays(b) {
  if (!b) return null;
  let y, mo, dd, m = b.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) { y = +m[1]; mo = +m[2]; dd = +m[3]; }
  else { m = b.match(/^(\d{1,2})[\/-](\d{1,2})$/); if (!m) return null; y = new Date().getFullYear(); mo = +m[1]; dd = +m[2]; }
  const now = new Date();
  let d = new Date(y, mo - 1, dd);
  const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (d < todayMid) d = new Date(y + 1, mo - 1, dd);
  return Math.round((d - todayMid) / 864e5);
}
const SOC_TIERS = [
  { id: "inner", n: "01", label: "Inner Circle", emoji: "\uD83C\uDF3B" },
  { id: "close", n: "02", label: "Close", emoji: "\uD83C\uDF3F" },
  { id: "kindred", n: "03", label: "Kindred", emoji: "\uD83C\uDF31" },
  { id: "new", n: "04", label: "Nursery", emoji: "\uD83C\uDF30" }
];
function __socTierOf(c) {
  const id = c.tier || (c.isTony ? "inner" : "kindred");
  return SOC_TIERS.find(t => t.id === id) || SOC_TIERS[2];
}
function __socTouchDate(c) {
  let best = c.lastTouch || "";
  (c.past || []).forEach(p => { if (p.date && p.date > best) best = p.date; });
  return best;
}
function __socMoist(c) {
  const t = __socTouchDate(c);
  if (!t) return { pct: 0, days: null, touch: "" };
  const days = Math.max(0, Math.round((new Date(localDateStr() + "T12:00:00") - new Date(t + "T12:00:00")) / 864e5));
  return { pct: Math.max(0, 100 - Math.round(days * 100 / 21)), days, touch: t };
}
function __socCards() {
  const today = localDateStr();
  const people = __socPeople();
  const cards = {};
  const loose = [];
  const ensure = k => {
    if (!cards[k]) cards[k] = { key: k, name: "", emoji: "", bday: "", favs: "", tier: "", lastTouch: "", plans: [], cal: [], isTony: k === "tony" };
    return cards[k];
  };
  const tony = ensure("tony");
  tony.plans = __socLoad("ccc_marriage").map((it, i) => ({ ...it, i, src: "marriage" }));
  __socLoad("ccc_social").forEach((it, i) => {
    const k = __socKey(it.who);
    if (!k) { loose.push({ ...it, i }); return; }
    const c = ensure(k);
    if (!c.name) c.name = String(it.who).trim();
    c.plans.push({ ...it, i, src: "social" });
  });
  Object.keys(people).forEach(k => {
    if (!people[k] || !people[k].name) return;
    const c = ensure(k);
    if (!c.name) c.name = people[k].name;
  });
  Object.values(cards).forEach(c => {
    const m = people[c.key] || {};
    if (c.isTony) { c.name = m.name || "Tony"; c.emoji = m.emoji || "💍"; }
    else { c.name = m.name || c.name || c.key; c.emoji = m.emoji || ""; }
    c.bday = m.bday || ""; c.favs = m.favs || "";
    c.tier = m.tier || (c.isTony ? "inner" : ""); c.lastTouch = m.lastTouch || "";
    const up = [], undated = [], past = [];
    c.plans.forEach(p => {
      if (p.date && p.date >= today) up.push(p);
      else if (p.date) past.push(p);
      else undated.push(p);
    });
    up.sort((a, b) => (a.date < b.date ? -1 : 1));
    past.sort((a, b) => (a.date > b.date ? -1 : 1));
    c.up = up; c.undated = undated; c.past = past;
    c.nextDate = up.length ? up[0].date : "";
  });
  const calloose = [];
  let evPeople = {};
  try { evPeople = JSON.parse(localStorage.getItem("ccc_ev_person")) || {}; } catch (e) {}
  (typeof GCAL !== "undefined" && GCAL.events || [])
    .filter(ev => evCat(ev) === "social" || evCat(ev) === "marriage")
    .filter(ev => ev.start.slice(0, 10) >= today)
    .sort((a, b) => new Date(a.start) - new Date(b.start))
    .forEach(ev => {
      const cat = evCat(ev);
      const title = String(ev.title || "").toLowerCase();
      let target = null;
      const assigned = evPeople[evCatKey(ev.calId, ev.id)];
      if (assigned && cards[assigned]) target = cards[assigned];
      else for (const k of Object.keys(cards)) {
        const c = cards[k];
        if (title.includes(k) || (c.name && title.includes(c.name.toLowerCase()))) { target = c; break; }
      }
      if (target) target.cal.push(ev); else calloose.push(ev);
    });
  return { cards, loose, calloose };
}
function __socCardHtml(c, isNext, compact, flat) {
  const src = p => (p.src === "marriage" ? 1 : 0);
  const stop = "event.stopPropagation();";
  const acts = p => `<span class="fc-acts"><button title="Edit" onclick="${stop}__fcEdit(${src(p)},${p.i})">\u270F\uFE0F</button><button title="Copy" onclick="${stop}__fcCopy(${src(p)},${p.i})">\u29C9</button><button title="Delete" onclick="${stop}__fcDel(${src(p)},${p.i})">\uD83D\uDDD1\uFE0F</button></span>`;
  const plan = (p, up) => `<div class="fc-plan${up ? " up" : ""}"><span>${esc(p.t)}</span>${p.date ? `<span class="fc-when">${__socFmtDate(p.date)}</span>` : ""}${acts(p)}</div>`;
  const items = [];
  c.up.forEach(p => items.push(plan(p, true)));
  c.undated.forEach(p => items.push(plan(p, false)));
  c.cal.forEach(ev => items.push(`<div class="fc-plan fc-cal"><span>\uD83D\uDCC3 ${esc(ev.title)}</span><span class="fc-when">${__socFmtDate(ev.start.slice(0, 10))}</span></div>`));
  const limit = compact ? 4 : items.length;
  const shown = items.slice(0, limit).join("");
  const extra = items.length - limit;
  const more = compact && extra > 0 ? `<button class="fc-more" onclick="${stop}v3OpenFriend(${c.idx})">+${extra} more</button>` : "";
  const mo = __socMoist(c);
  const tier = __socTierOf(c);
  const status = mo.pct >= 55 ? { cls: "st-ok", txt: "\uD83D\uDCA7 Hydrated" } : (mo.pct >= 30 ? { cls: "st-mid", txt: "\uD83D\uDFE1 Drying" } : { cls: "st-dry", txt: "\uD83C\uDF35 Thirsty" });
  const mval = Math.round(mo.pct / 10);
  const mword = mo.pct >= 55 ? "Hydrated / Ideal" : (mo.pct >= 30 ? "Drying out" : "Needs water");
  const touchLab = "Last touch" + (mo.days === null ? " (never)" : (mo.days === 0 ? " (today)" : " (" + mo.days + "d ago)"));
  const touchVal = mo.touch ? __socFmtDate(mo.touch) : "\u2014";
  const calNext = c.cal.length ? c.cal[0].start.slice(0, 10) : "";
  let nextVal = "\u2014", nextReal = "";
  if (c.nextDate && calNext) { nextReal = (c.nextDate < calNext ? c.nextDate : calNext); }
  else if (c.nextDate || calNext) { nextReal = c.nextDate || calNext; }
  if (nextReal) nextVal = __socFmtDate(nextReal);
  else { const bd = __socBdayDays(c.bday); if (bd !== null) { const d = new Date(); d.setDate(d.getDate() + bd); nextVal = d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); } }
  const bloom = __socBdayText(c.bday);
  const nudge = c.up.length ? "" : (mo.pct <= 29 ? `<div class="fc-nudge">Soil's dry \u2014 reach out soon \uD83D\uDCA7</div>` : ((c.plans.length || c.cal.length) ? `<div class="fc-nudge">It's been a minute \u2014 plan something? \u2728</div>` : `<div class="fc-nudge">Nothing on the books yet \u2014 add a plan? \u2728</div>`));
  const mem = c.past.length ? `<div class="fc-mem">\u2728 Last: ${esc(c.past[0].t)}${c.past[0].date ? " \u00B7 " + __socFmtDate(c.past[0].date) : ""}</div>` : "";
  return `<div class="friend-card${c.isTony ? " tony" : ""}${isNext ? " next" : ""}${flat ? " flat" : ""}${mo.pct <= 29 ? " dry" : ""} tc-${tier.id}"${flat ? "" : ` onclick="v3OpenFriend(${c.idx})"`}>
    <div class="fc-top"><div class="fc-box">${c.emoji ? esc(c.emoji) : __socInitials(c.name)}</div>
      <div class="fc-who"><div class="fc-name">${esc(c.name)}${c.isTony ? " \uD83D\uDC8D" : ""}</div>${c.favs ? `<div class="fc-sub">${esc(c.favs)}</div>` : ""}</div>
      <span class="fc-pill ${status.cls}">${status.txt}</span></div>
    <div class="fc-chips">${bloom ? `<span class="fc-chip-gold">${bloom}</span>` : ""}<span class="fc-chip-plum">${tier.emoji} ${tier.label}</span></div>
    <div class="fc-tiles"><div class="fc-tile"><div class="fc-tile-label">${touchLab}</div><div class="fc-tile-val">${touchVal}</div></div><div class="fc-tile"><div class="fc-tile-label">Next plan</div><div class="fc-tile-val${nextReal ? " green" : ""}">${nextVal}</div></div></div>
    <div class="fc-meter-row"><span class="fc-meter-label">\uD83D\uDFE9 Connection meter:</span><span class="fc-meter-val ${mo.pct >= 55 ? "wet" : (mo.pct >= 30 ? "mid" : "dry")}">${mval} / 10 (${mword})</span></div>
    <div class="fw-moist-track"><i class="${mo.pct >= 55 ? "wet" : (mo.pct >= 30 ? "mid" : "dry")}" style="width:${mo.pct}%"></i></div>
    <div class="fc-body">${shown}${more}${nudge}${mem}</div>
    <div class="fc-actions"><button class="fc-btn fc-btn-green" onclick="${stop}__fcWater(${c.idx})">\uD83D\uDCA7 Water</button><button class="fc-btn fc-btn-gold" onclick="${stop}__fcCardEdit(${c.idx})">\u270E Details</button></div>
  </div>`;
}
function v3OpenFriend(idx) {
  const c = __socOrder[idx];
  if (!c) return;
  let ov = document.getElementById("fcOverlay");
  if (ov) ov.remove();
  ov = document.createElement("div");
  ov.id = "fcOverlay";
  ov.className = "fc-overlay";
  ov.innerHTML = `<div class="fc-overlay-panel">
    <button class="fc-close" title="Close" onclick="document.getElementById('fcOverlay').remove()">\u2715</button>
    <div class="fc-overlay-inner">${__socCardHtml(c, false, false, true)}</div>
  </div>`;
  ov.addEventListener("click", e => { if (e.target === ov) ov.remove(); });
  document.body.appendChild(ov);
}
document.addEventListener("keydown", e => {
  if (e.key === "Escape") { const o = document.getElementById("fcOverlay"); if (o) o.remove(); }
});
function v3RenderSocial() {
  const wall = document.getElementById("friendWall");
  if (!wall) return;
  const { cards, loose, calloose } = __socCards();
  Object.values(cards).forEach(c => { c.empty = !c.plans.length && !c.cal.length; });
  const order = Object.values(cards).sort((a, b) => {
    if (a.isTony) return -1;
    if (b.isTony) return 1;
    if (a.empty !== b.empty) return (a.empty ? 1 : -1);
    if (a.nextDate && b.nextDate) return (a.nextDate < b.nextDate ? -1 : 1);
    if (a.nextDate) return -1;
    if (b.nextDate) return 1;
    return String(a.name).localeCompare(String(b.name));
  });
  __socOrder = order;
  __socCalLoose = calloose;
  order.forEach((c, i) => { c.idx = i; });
  const nearest = order.find(c => c.up.length);
  const groups = SOC_TIERS.map(t => ({ t, in: order.filter(c => __socTierOf(c).id === t.id) })).filter(g => g.in.length);
  wall.innerHTML = groups.map(g =>
    `<div class="fw-tier"><div class="fw-tier-head"><span class="fw-tier-badge">TIER ${g.t.n}</span><strong>${g.t.emoji} ${g.t.label}</strong><span class="fw-tier-count">${g.in.length} ON THIS SLOPE</span></div><div class="friend-wall">` +
    g.in.map(c => __socCardHtml(c, nearest && c.key === nearest.key, true)).join("") +
    `</div></div>`
  ).join("") || `<p class="helper-text">The hillside is empty. Add your first plan above ("Dana - brunch Sunday") and Dana gets a card.</p>`;
  const lp = document.getElementById("loosePlans");
  if (lp) lp.innerHTML = loose.length
    ? `<div class="fc-strip-title">\u2728 Loose plans</div>` + loose.map(p =>
        `<div class="fc-plan"><span>${esc(p.t)}</span><span class="fc-acts"><button title="Edit" onclick="__fcEdit(0,${p.i})">\u270F\uFE0F</button><button title="Copy" onclick="__fcCopy(0,${p.i})">\u29C9</button><button title="Delete" onclick="__fcDel(0,${p.i})">\uD83D\uDDD1\uFE0F</button></span></div>`).join("")
      + `<p class="helper-text">Edit one and give it a person, and it gets a card.</p>`
    : "";
  const cl = document.getElementById("calLoose");
  if (cl) cl.innerHTML = calloose.length
    ? `<div class="fc-strip-title">\uD83D\uDCC5 From your calendar</div>` + calloose.map((ev, i) =>
        `<div class="fc-plan fc-cal"><span>\uD83D\uDCC3 ${esc(ev.title)}</span><span class="fc-when">${__socFmtDate(ev.start.slice(0, 10))}</span><span class="fc-acts"><button title="Give to someone" onclick="__fcAssign(${i})">\uD83D\uDC64</button></span></div>`).join("")
    : "";
}
function __fcSavePlan(isMarriage, idx, patch) {
  const key = isMarriage ? "ccc_marriage" : "ccc_social";
  const arr = __socLoad(key);
  if (!arr[idx]) return;
  Object.assign(arr[idx], patch);
  localStorage.setItem(key, JSON.stringify(arr));
  v3RenderSocial();
}
window.__fcEdit = (isMarriage, idx) => {
  const arr = __socLoad(isMarriage ? "ccc_marriage" : "ccc_social");
  const it = arr[idx];
  if (!it) return;
  const fields = [
    { id: "t", label: "Plan", value: it.t },
    { id: "date", label: "Date (YYYY-MM-DD, blank = no date)", value: it.date || "" }
  ];
  if (!isMarriage && !__socKey(it.who)) fields.splice(1, 0, { id: "who", label: "Person (gives it a card)", value: "" });
  openEditModal("Edit plan", fields, v => {
    const patch = { t: String(v.t).trim() };
    if (!patch.t) { flashMsg("Can't be empty"); return; }
    const date = String(v.date || "").trim();
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) { flashMsg("Date needs YYYY-MM-DD"); return; }
    patch.date = date || "";
    if (fields.some(f => f.id === "who")) patch.who = String(v.who || "").trim();
    __fcSavePlan(isMarriage, idx, patch);
    flashMsg("Updated \u2728");
  });
};
window.__fcCopy = (isMarriage, idx) => {
  const key = isMarriage ? "ccc_marriage" : "ccc_social";
  const arr = __socLoad(key);
  if (!arr[idx]) return;
  arr.splice(idx + 1, 0, { ...arr[idx], t: arr[idx].t + " (copy)" });
  localStorage.setItem(key, JSON.stringify(arr));
  v3RenderSocial();
  flashMsg("Copy added \u2728");
};
window.__fcDel = (isMarriage, idx) => {
  const key = isMarriage ? "ccc_marriage" : "ccc_social";
  const arr = __socLoad(key);
  if (!arr[idx]) return;
  arr.splice(idx, 1);
  localStorage.setItem(key, JSON.stringify(arr));
  v3RenderSocial();
};
window.__fcCardEdit = idx => {
  const c = __socOrder[idx];
  if (!c) return;
  const pk = c.key;
  const people = __socPeople();
  const m = people[pk] || {};
  const tierOpts = SOC_TIERS.map(t => ({ v: t.id, t: t.emoji + " " + t.label }));
  openEditModal("Card details", [
    { id: "name", label: "Name", value: c.name },
    { id: "emoji", label: "Avatar emoji (optional, e.g. \uD83C\uDF38)", value: m.emoji || "" },
    { id: "bday", label: "Birthday (MM-DD or YYYY-MM-DD)", value: m.bday || "" },
    { id: "favs", label: "Favorites (one line)", value: m.favs || "" },
    { id: "tier", label: "Hillside tier", type: "select", options: tierOpts, value: c.tier || (c.isTony ? "inner" : "kindred") }
  ], v => {
    const name = String(v.name).trim() || c.name;
    people[pk] = { ...m, name, emoji: String(v.emoji || "").trim(), bday: String(v.bday || "").trim(), favs: String(v.favs || "").trim(), tier: String(v.tier || "kindred") };
    if (pk !== "tony") {
      const arr = __socLoad("ccc_social");
      let changed = false;
      arr.forEach(it => { if (__socKey(it.who) === pk && it.who !== name) { it.who = name; changed = true; } });
      if (changed) localStorage.setItem("ccc_social", JSON.stringify(arr));
    }
    localStorage.setItem("ccc_social_people", JSON.stringify(people));
    v3RenderSocial();
    flashMsg("Card updated \u2728");
  });
};
document.addEventListener("DOMContentLoaded", () => {
  const f = document.getElementById("socialFormV3");
  if (f) f.addEventListener("submit", e => {
    e.preventDefault();
    const input = document.getElementById("socialInputV3");
    const val = input.value.trim();
    if (!val) return;
    const p = __socSplit(val);
    if (!p) { flashMsg("Try: Dana - brunch Sunday"); return; }
    if (__socKey(p.who) === "tony") {
      const arr = __socLoad("ccc_marriage");
      arr.push({ t: p.rest });
      localStorage.setItem("ccc_marriage", JSON.stringify(arr));
    } else {
      const arr = __socLoad("ccc_social");
      arr.push({ t: p.rest, who: p.who });
      localStorage.setItem("ccc_social", JSON.stringify(arr));
    }
    input.value = "";
    v3RenderSocial();
    flashMsg("Added to the wall \u2728");
  });
  const fab = document.getElementById("friendAddBtn");
  if (fab) fab.addEventListener("click", () => {
    openEditModal("Add someone to the wall", [
      { id: "name", label: "Name", value: "" },
      { id: "emoji", label: "Avatar emoji (optional)", value: "" },
      { id: "bday", label: "Birthday (MM-DD or YYYY-MM-DD, optional)", value: "" },
      { id: "favs", label: "Favorites (one line, optional)", value: "" },
      { id: "tier", label: "Hillside tier", type: "select", options: SOC_TIERS.map(t => ({ v: t.id, t: t.emoji + " " + t.label })), value: "kindred" }
    ], v => {
      const name = String(v.name).trim();
      if (!name) { flashMsg("Need a name"); return; }
      const key = __socKey(name);
      const people = __socPeople();
      if (people[key]) { flashMsg("Already on the wall"); return; }
      people[key] = { name, emoji: String(v.emoji || "").trim(), bday: String(v.bday || "").trim(), favs: String(v.favs || "").trim(), tier: String(v.tier || "kindred"), lastTouch: "" };
      localStorage.setItem("ccc_social_people", JSON.stringify(people));
      v3RenderSocial();
      flashMsg(name + " is on the wall \u2728");
    });
  });
  v3RenderSocial();
});
window.__fcAssign = i => {
  const ev = __socCalLoose[i];
  if (!ev) return;
  const { cards } = __socCards();
  const opts = Object.values(cards).sort((a, b) => {
    if (a.isTony) return -1;
    if (b.isTony) return 1;
    return String(a.name).localeCompare(String(b.name));
  }).map(c => ({ v: c.key, t: c.name }));
  openEditModal("Give this event to someone", [
    { id: "who", label: "Person", type: "select", options: opts, value: opts.length ? opts[0].v : "" }
  ], v => {
    let store = {};
    try { store = JSON.parse(localStorage.getItem("ccc_ev_person")) || {}; } catch (e) {}
    store[evCatKey(ev.calId, ev.id)] = v.who;
    localStorage.setItem("ccc_ev_person", JSON.stringify(store));
    v3RenderSocial();
    flashMsg("Assigned \u2728");
  });
};
window.__fcWater = idx => {
  const c = __socOrder[idx];
  if (!c) return;
  const people = __socPeople();
  people[c.key] = { ...(people[c.key] || { name: c.name }), lastTouch: localDateStr() };
  localStorage.setItem("ccc_social_people", JSON.stringify(people));
  v3RenderSocial();
  flashMsg("Watered \uD83D\uDCA7");
};
