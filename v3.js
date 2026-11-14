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
  if (name === "hair") v3RenderHair();
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
  { name: "Protonix (pantoprazole ER) 20 mg", days: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"], note: "1 tablet 2x daily · auto refill on, next fill 12/7" },
  { name: "Zoloft (sertraline) 50 mg", days: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"], note: "1 tablet daily · new Rx 11/13, filling now" },
  { name: "Gallifrey (norethindrone/ethinyl estradiol) 5 mg", days: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"], note: "1 tablet daily · 1 refill left" },
  { name: "Atarax (hydroxyzine) 25 mg", days: [], prn: true, note: "as needed" },
  { name: "Roxicodone (oxycodone) 5 mg", days: [], prn: true, note: "pharmacy pickup only" },
  { name: "Norco (hydrocodone/APAP) 5-325 mg", days: [], prn: true, note: "pharmacy pickup only" },
  { name: "Reglan (metoclopramide) 5 mg", days: [], prn: true, note: "0 refills left, needs provider re-approval" },
  { name: "Hydrocortisone 2.5% cream", days: [], prn: true, note: "topical · 1 refill left" },
  { name: "Ferosul (ferrous sulfate) 325 mg", days: ["Sun","Mon","Wed","Fri"], note: "iron · OTC at any pharmacy · see label" }
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
      return '<div class="line-item"><span class="li-text"><strong>' + esc(m.name) + '</strong> <small>as needed</small>' + note + '</span>' +
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
    return '<div class="line-item"><span class="li-text"><strong>' + esc(m.name) + '</strong>' +
      ' <small>' + (m.days || []).join(" · ") + '</small>' + note + '<br><span class="med-dots">' + dots + '</span></span>' +
      '<span class="li-actions">' +
      (dueToday && !doneToday ? '<button class="mini-btn" onclick="v3MedDone(' + m.id + ')">✅ Taken</button>' : (dueToday ? '<small style="color:var(--taurus-emerald)">done today ✓</small>' : '<small style="color:var(--text-muted)">not today</small>')) +
      '<button class="mini-btn" onclick="v3MedEdit(' + m.id + ')">✏️</button>' +
      '<button class="mini-btn" onclick="v3MedCopy(' + m.id + ')">📄</button>' +
      '<button class="mini-btn" onclick="v3Confirm(\'Remove this med?\', () => { v3Save(\'ccc_meds\', v3Load(\'ccc_meds\').filter(x => x.id !== ' + m.id + ')); v3RenderMeds(); v3RenderSecTiles(); })">🗑️</button>' +
      '</span></div>';
  }).join("");

}
function v3MedDone(id) {
  const arr = v3Load("ccc_meds"); const m = arr.find(x => x.id === id); if (!m) return;
  m.log = m.log || {}; m.log[v3TodayStr()] = true;
  v3Save("ccc_meds", arr); v3RenderMeds(); v3RenderSecTiles();
  try { localStorage.setItem("ccc_med_garden_feed", JSON.stringify({ ts: Date.now(), med: m.name })); } catch (e) {}
  if (typeof flashMsg === "function") flashMsg("Logged. Good. 💊");
}
function v3MedEdit(id) {
  const arr = v3Load("ccc_meds"); const m = arr.find(x => x.id === id); if (!m || typeof openEditModal !== "function") return;
  openEditModal("Edit med", [
    { id: "name", label: "Name & dose", value: m.name },
    { id: "daysTxt", label: "Days (comma list; leave empty for as-needed)", value: (m.days || []).join(",") },
    { id: "note", label: "Note (directions, refills)", value: m.note || "" }
  ], v => {
    if (!v.name.trim()) { flashMsg("Name can't be empty"); return; }
    const want = v.daysTxt.split(/[\s,]+/).map(s => s.trim()).filter(s => V3_DOW.includes(s));
    const uniq = [...new Set(want)];
    if (uniq.length !== want.length) { flashMsg("A day appears twice"); return; }
    Object.assign(m, { name: v.name.trim(), days: uniq, prn: !uniq.length, note: v.note.trim() });
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
