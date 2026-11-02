// --- 1. AFFIRMATION & SCRIPTING SPARKS ---
const affirmations = [
  "I am so grateful now that my leadership, logistics brilliance, and creativity open effortless doors for me every single week. ✨",
  "Everything I touch turns to gold because I move at my own grounded, royal pace. 👑",
  "My home, my yard, and my mind are thriving sanctuaries of peace and abundance. 🌿",
  "Opportunities flow straight to me without burnout or people-pleasing. ⚖️"
];

const portalReminders = [
  "Pause, Clare! Unclench your jaw, drop your shoulders, and feel your next big win as already done. 👑",
  "11:11 Check-In: Are you working from Leo radiance right now, or trying to carry everyone else's load? Protect your peace! ⚖️",
  "Cosmic reminder: Even one tiny 5-minute task counts as momentum today. You're doing amazing, Queen! ✨"
];

// --- 2. REAL-TIME MOON PHASE CALCULATOR ---
const PHASES = [
  { max: 0.03386, emoji: "🌑", name: "New Moon", advice: "Fresh page. Set one intention and let it build." },
  { max: 0.22812, emoji: "🌒", name: "Waxing Crescent", advice: "Momentum season. Small consistent moves." },
  { max: 0.28345, emoji: "🌓", name: "First Quarter", advice: "Friction is information. Adjust and keep going." },
  { max: 0.47815, emoji: "🌔", name: "Waxing Gibbous", advice: "Almost there. Polish, don't pivot." },
  { max: 0.53348, emoji: "🌕", name: "Full Moon", advice: "Full moon glow. Celebrate what already bloomed." },
  { max: 0.72818, emoji: "🌖", name: "Waning Gibbous", advice: "Share the harvest. Gratitude mode." },
  { max: 0.78351, emoji: "🌗", name: "Last Quarter", advice: "Release what didn't work. No shame." },
  { max: 1.01,    emoji: "🌘", name: "Waning Crescent", advice: "Rest is productive. Recharge for the new cycle." }
];

function updateMoonPhase() {
  const now = new Date();
  const synodicMonth = 29.53058867;
  const knownNewMoon = new Date(Date.UTC(2000, 0, 6, 18, 14, 0));
  const diffDays = (now.getTime() - knownNewMoon.getTime()) / (1000 * 60 * 60 * 24);
  const phase = ((diffDays % synodicMonth) + synodicMonth) % synodicMonth;
  const frac = phase / synodicMonth;
  const p = PHASES.find(x => frac <= x.max) || PHASES[0];

  document.getElementById("moonEmoji").textContent = p.emoji;
  document.getElementById("moonPhaseName").textContent = p.name;
  document.getElementById("moonAdvice").textContent = p.advice;
}

// --- 3. LIVE CLOCK & 11:11 / 2:22 PORTAL WATCHER ---
let lastTriggeredMinute = "";
const PORTAL_TIMES = ["11:11", "2:22", "22:22"];

function updateClock() {
  const now = new Date();
  const hours24 = now.getHours();
  const hours12 = hours24 % 12 || 12;
  const mins = String(now.getMinutes()).padStart(2, "0");
  const ampm = hours24 >= 12 ? "PM" : "AM";
  document.getElementById("liveClock").textContent = `${hours12}:${mins} ${ampm}`;

  const portalKey = `${hours12}:${mins}`;
  if (PORTAL_TIMES.includes(portalKey) && lastTriggeredMinute !== portalKey) {
    lastTriggeredMinute = portalKey;
    showCosmicToast();
  }
}

function showCosmicToast() {
  const toast = document.getElementById("cosmicToast");
  const msg = portalReminders[Math.floor(Math.random() * portalReminders.length)];
  document.getElementById("toastMessage").textContent = msg;
  toast.classList.remove("hidden");
  fireConfetti();
}

// --- 4. CONFETTI BURST ---
function fireConfetti() {
  if (typeof confetti === "function") {
    confetti({
      particleCount: 70,
      spread: 65,
      origin: { y: 0.6 },
      colors: ["#f4b860", "#52b788", "#e5989b", "#9d4edd"]
    });
  }
}

// --- 5. STATE & LOCALSTORAGE ---
let tasks = JSON.parse(localStorage.getItem("clarissa_tasks")) || [
  { id: 1, text: "Water Priscilla & do a quick indoor plant check 🌿", col: "low" },
  { id: 2, text: "Review weekly route & logistics priorities 🚛", col: "top3" }
];

const TASK_COLS = ["dump", "high", "low", "top3", "done", "graveyard"];
const COL_LABELS = {
  dump: "🌪️ Brain Dump", high: "🔥 High-Spark", low: "🌿 Low-Spoon",
  top3: "🎯 Rule of 3", done: "🏆 Trophy", graveyard: "🪦 Graveyard"
};

function saveTasks() {
  localStorage.setItem("clarissa_tasks", JSON.stringify(tasks));
  renderKanban();
}

function moveTask(id, targetCol) {
  if (targetCol === "top3") {
    const currentTop3 = tasks.filter(t => t.col === "top3").length;
    if (currentTop3 >= 3) {
      showCosmicToast();
      return;
    }
  }

  tasks = tasks.map(t => {
    if (t.id !== id) return t;
    if (targetCol === "done") return { ...t, col: targetCol, doneAt: t.doneAt || Date.now() };
    const { doneAt, ...rest } = t;
    return { ...rest, col: targetCol };
  });
  if (targetCol === "done") {
    fireConfetti();
  }
  saveTasks();
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
}

function renderKanban() {
  TASK_COLS.forEach(col => {
    const container = document.getElementById(`col-${col}`);
    container.innerHTML = "";
    const colTasks = tasks.filter(t => t.col === col);

    const badge = document.getElementById(`count-${col}`);
    badge.textContent = col === "top3" ? `${colTasks.length}/3` : colTasks.length;

    colTasks.forEach(task => {
      const card = document.createElement("div");
      card.className = "task-card";

      const options = TASK_COLS.map(c =>
        `<option value="${c}" ${c === task.col ? "selected" : ""}>${COL_LABELS[c]}</option>`
      ).join("");

      const isOverdue = task.due && !["done", "graveyard"].includes(task.col) && task.due < new Date().toISOString().slice(0, 10);
      const badges = [];
      if (task.pri) badges.push(`<span class="pri-dot pri-${task.pri}" title="Priority"></span>`);
      if (task.time) badges.push(`<span class="task-badge">⏰ ${fmtTime(task.time)}</span>`);
      else if (task.due) badges.push(`<span class="task-badge ${isOverdue ? "overdue-badge" : ""}">📅 ${isOverdue ? "overdue ⚠️" : task.due.slice(5)}</span>`);
      card.innerHTML = `
        <span>${task.text}${badges.length ? `<span class="badge-row">${badges.join("")}</span>` : ""}</span>
        <div class="task-actions">
          <select class="move-select" onchange="moveTask(${task.id}, this.value)">${options}</select>
          <button onclick="deleteTask(${task.id})">🗑️</button>
        </div>
      `;
      container.appendChild(card);
    });
  });
}

// --- 6. DOPAMINE 10-MINUTE BREAK TIMER ---
let timerInterval = null;
let secondsLeft = 600;

function updateTimerDisplay() {
  const m = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const s = String(secondsLeft % 60).padStart(2, "0");
  document.getElementById("timerDisplay").textContent = `${m}:${s}`;
}

function startBreakTimer() {
  if (timerInterval) return;
  timerInterval = setInterval(() => {
    if (secondsLeft > 0) {
      secondsLeft--;
      updateTimerDisplay();
    } else {
      clearInterval(timerInterval);
      timerInterval = null;
      fireConfetti();
      document.getElementById("activeBreakLabel").textContent = "✨ Brain reset complete!";
    }
  }, 1000);
}

function resetBreakTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  secondsLeft = 600;
  updateTimerDisplay();
}

// --- 7. TAB SWITCHING ---
function switchTab(name) {
  document.querySelectorAll(".tab-btn").forEach(b =>
    b.classList.toggle("active", b.dataset.tab === name));
  document.querySelectorAll(".tab-panel").forEach(p =>
    p.classList.toggle("active", p.id === `panel-${name}`));
}

// --- 8. WEEK PANEL ---
const WEEK_KEYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function weekDayKey(d) {
  return (d.getDay() + 6) % 7; // Monday = 0
}

function weekItems(i) {
  return JSON.parse(localStorage.getItem(`ccc_week_${i}`)) || [];
}

function saveWeek(i, items) {
  localStorage.setItem(`ccc_week_${i}`, JSON.stringify(items));
  renderWeek();
}

function renderWeek() {
  const now = new Date();
  const todayIdx = weekDayKey(now);
  const grid = document.getElementById("weekGrid");
  grid.innerHTML = "";

  WEEK_KEYS.forEach((day, i) => {
    const box = document.createElement("div");
    box.className = "week-day" + (i === todayIdx ? " today-glow" : "");
    const items = weekItems(i);
    box.innerHTML = `
      <h3>${day}${i === todayIdx ? " · today" : ""}</h3>
      <div class="week-list">
        ${items.map((t, j) => `
          <div class="week-item"><span>${t}</span><button onclick="removeWeekItem(${i}, ${j})">✖</button></div>
        `).join("")}
      </div>
      ${weekTaskChips(i)}
      <form class="week-form" data-day="${i}">
        <input placeholder="Add..." />
        <button type="submit" class="mini-btn">➕</button>
      </form>
    `;
    grid.appendChild(box);
  });

  grid.querySelectorAll(".week-form").forEach(form => {
    form.addEventListener("submit", e => {
      e.preventDefault();
      const i = Number(form.dataset.day);
      const val = form.querySelector("input").value.trim();
      if (!val) return;
      saveWeek(i, [...weekItems(i), val]);
    });
  });
}

function removeWeekItem(i, j) {
  const items = weekItems(i).filter((_, idx) => idx !== j);
  saveWeek(i, items);
}

// --- 9. BILLS ---
let bills = JSON.parse(localStorage.getItem("ccc_bills")) || [];

function saveBills() {
  localStorage.setItem("ccc_bills", JSON.stringify(bills));
  renderBills();
}

function renderBills() {
  const list = document.getElementById("billsList");
  const summary = document.getElementById("billsSummary");
  list.innerHTML = "";

  const today = new Date().toISOString().slice(0, 10);
  const sorted = [...bills].sort((a, b) => (a.paid - b.paid) || (a.due < b.due ? -1 : 1));
  const unpaid = sorted.filter(b => !b.paid);
  const overdue = unpaid.filter(b => b.due < today);
  const total = unpaid.reduce((sum, b) => sum + Number(b.amount || 0), 0);

  summary.innerHTML = `Unpaid total: <strong>$${total.toFixed(2)}</strong>` +
    (overdue.length ? ` · <span class="overdue-note">${overdue.length} overdue ⚠️</span>` : " · all clear ✨");

  if (!sorted.length) {
    list.innerHTML = `<p class="helper-text">No bills tracked yet. Add your first one above.</p>`;
    return;
  }

  sorted.forEach(b => {
    const row = document.createElement("div");
    row.className = "line-item" + (b.paid ? " paid" : "") + (!b.paid && b.due < today ? " overdue" : "");
    row.innerHTML = `
      <input type="checkbox" ${b.paid ? "checked" : ""} onchange="toggleBillPaid(${b.id})" />
      <span>${b.name} · $${Number(b.amount).toFixed(2)}</span>
      <span class="due-tag">due ${b.due}${!b.paid && b.due < today ? " ⚠️" : ""}</span>
      <button onclick="deleteBill(${b.id})">🗑️</button>
    `;
    list.appendChild(row);
  });
}

function toggleBillPaid(id) {
  bills = bills.map(b => {
    if (b.id !== id) return b;
    if (!b.paid) return { ...b, paid: true, paidAt: Date.now() };
    const { paidAt, ...rest } = b;
    return { ...rest, paid: false };
  });
  const bill = bills.find(b => b.id === id);
  if (bill && bill.paid) fireConfetti();
  saveBills();
}

function deleteBill(id) {
  bills = bills.filter(b => b.id !== id);
  saveBills();
}

// --- 10. GENERIC SIMPLE LISTS (garden / social / jobs) ---
function wireSimpleList(formId, inputId, listId, storageKey) {
  const load = () => JSON.parse(localStorage.getItem(storageKey)) || [];
  const save = items => { localStorage.setItem(storageKey, JSON.stringify(items)); render(); };

  function render() {
    const items = load();
    const container = document.getElementById(listId);
    container.innerHTML = items.length
      ? items.map((t, i) => `
          <div class="line-item"><span>${t}</span><span class="due-tag"></span>
            <button onclick="window.__del_${listId}(${i})">🗑️</button></div>
        `).join("")
      : `<p class="helper-text">Nothing here yet.</p>`;
  }

  window[`__del_${listId}`] = i => save(load().filter((_, idx) => idx !== i));

  document.getElementById(formId).addEventListener("submit", e => {
    e.preventDefault();
    const input = document.getElementById(inputId);
    const val = input.value.trim();
    if (!val) return;
    save([...load(), val]);
    input.value = "";
  });

  render();
}

// --- 11. SELF CARE RITUALS ---
const SELFCARE_DEFAULTS = [
  "💧 Drink water",
  "🌿 Step outside for fresh air",
  "🎹 Play or listen to music",
  "😴 Phone down before midnight"
];

let selfcare = JSON.parse(localStorage.getItem("ccc_selfcare")) || null;
const todayStr = new Date().toISOString().slice(0, 10);

if (!selfcare) {
  selfcare = SELFCARE_DEFAULTS.map(t => ({ text: t, done: false }));
  localStorage.setItem("ccc_selfcare", JSON.stringify(selfcare));
}

if (localStorage.getItem("ccc_selfcare_day") !== todayStr) {
  selfcare = selfcare.map(item => ({ ...item, done: false }));
  localStorage.setItem("ccc_selfcare", JSON.stringify(selfcare));
  localStorage.setItem("ccc_selfcare_day", todayStr);
}

function saveSelfcare() {
  localStorage.setItem("ccc_selfcare", JSON.stringify(selfcare));
  renderSelfcare();
}

function renderSelfcare() {
  const container = document.getElementById("selfcareList");
  container.innerHTML = selfcare.map((item, i) => `
    <div class="check-item">
      <input type="checkbox" ${item.done ? "checked" : ""} onchange="toggleSelfcare(${i})" />
      <span class="${item.done ? "done-label" : ""}">${item.text}</span>
      <button onclick="removeSelfcare(${i})" style="margin-left:auto">🗑️</button>
    </div>
  `).join("");
}

function toggleSelfcare(i) {
  selfcare = selfcare.map((item, idx) => (idx === i ? { ...item, done: !item.done } : item));
  if (selfcare[i].done && selfcare.every(x => x.done)) fireConfetti();
  saveSelfcare();
}

function removeSelfcare(i) {
  selfcare = selfcare.filter((_, idx) => idx !== i);
  saveSelfcare();
}

// --- 12. INITIALIZE EVENT LISTENERS ---
document.addEventListener("DOMContentLoaded", () => {
  updateMoonPhase();
  updateClock();
  setInterval(updateClock, 10000);
  renderKanban();
  renderWeek();
  renderBills();
  renderSelfcare();

  wireSimpleList("gardenForm", "gardenInput", "gardenList", "ccc_garden");
  wireSimpleList("socialForm", "socialInput", "socialList", "ccc_social");
  wireSimpleList("jobsForm", "jobsInput", "jobsList", "ccc_jobs");

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // Restore saved Manifestation, Leo Win, and Libra state
  const maniInput = document.getElementById("manifestationInput");
  maniInput.value = localStorage.getItem("clarissa_manifestation") || affirmations[0];
  maniInput.addEventListener("input", e => localStorage.setItem("clarissa_manifestation", e.target.value));

  document.getElementById("shuffleAffirmationBtn").addEventListener("click", () => {
    const pick = affirmations[Math.floor(Math.random() * affirmations.length)];
    maniInput.value = pick;
    localStorage.setItem("clarissa_manifestation", pick);
  });

  const leoText = document.getElementById("leoWinText");
  const leoCheck = document.getElementById("leoWinCheck");
  leoText.value = localStorage.getItem("clarissa_leo_text") || "";
  leoCheck.checked = localStorage.getItem("clarissa_leo_check") === "true";

  leoText.addEventListener("input", e => localStorage.setItem("clarissa_leo_text", e.target.value));
  leoCheck.addEventListener("change", e => {
    localStorage.setItem("clarissa_leo_check", e.target.checked);
    if (e.target.checked) fireConfetti();
  });

  // Libra boundary select persistence
  const peaceSelect = document.getElementById("libraPeaceSelect");
  peaceSelect.value = localStorage.getItem("clarissa_peace") || "flowing";
  peaceSelect.addEventListener("change", e => localStorage.setItem("clarissa_peace", e.target.value));

  // Sensory checks persistence
  ["sense1", "sense2", "sense3"].forEach((id, idx) => {
    const box = document.getElementById(id);
    box.checked = localStorage.getItem(`clarissa_sense_${idx}`) === "true";
    box.addEventListener("change", e => localStorage.setItem(`clarissa_sense_${idx}`, e.target.checked));
  });

  // Add new task
  document.getElementById("taskForm").addEventListener("submit", e => {
    e.preventDefault();
    const input = document.getElementById("taskInput");
    const colSelect = document.getElementById("taskColumnSelect");
    const targetCol = colSelect.value;

    if (targetCol === "top3" && tasks.filter(t => t.col === "top3").length >= 3) {
      showCosmicToast();
      return;
    }

    tasks.push({
      id: Date.now(),
      text: input.value.trim(),
      col: targetCol,
      due: document.getElementById("taskDue").value || "",
      time: document.getElementById("taskTime").value || "",
      pri: document.getElementById("taskPri").value || ""
    });
    input.value = "";
    document.getElementById("taskDue").value = "";
    document.getElementById("taskTime").value = "";
    document.getElementById("taskPri").value = "";
    saveTasks();
  });

  // Dopamine menu buttons
  document.querySelectorAll(".dopa-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.getElementById("activeBreakLabel").textContent = btn.dataset.activity;
      resetBreakTimer();
      startBreakTimer();
    });
  });

  document.getElementById("startTimerBtn").addEventListener("click", startBreakTimer);
  document.getElementById("resetTimerBtn").addEventListener("click", resetBreakTimer);

  // Bills form
  document.getElementById("billForm").addEventListener("submit", e => {
    e.preventDefault();
    bills.push({
      id: Date.now(),
      name: document.getElementById("billName").value.trim(),
      amount: Number(document.getElementById("billAmount").value),
      due: document.getElementById("billDue").value,
      paid: false
    });
    document.getElementById("billForm").reset();
    saveBills();
  });

  // Self care form + reset
  document.getElementById("selfcareForm").addEventListener("submit", e => {
    e.preventDefault();
    const input = document.getElementById("selfcareInput");
    const val = input.value.trim();
    if (!val) return;
    selfcare = [...selfcare, { text: val, done: false }];
    input.value = "";
    saveSelfcare();
  });

  document.getElementById("resetSelfcareBtn").addEventListener("click", () => {
    selfcare = selfcare.map(item => ({ ...item, done: false }));
    saveSelfcare();
  });

  // Week clear
  document.getElementById("clearWeekBtn").addEventListener("click", () => {
    WEEK_KEYS.forEach((_, i) => localStorage.removeItem(`ccc_week_${i}`));
    renderWeek();
  });

  // Toast controls
  document.getElementById("testPortalBtn").addEventListener("click", showCosmicToast);
  document.getElementById("closeToastBtn").addEventListener("click", () => {
    document.getElementById("cosmicToast").classList.add("hidden");
  });
});

// --- 13. BLOCK SCHEDULING ---
let blocks = JSON.parse(localStorage.getItem("ccc_blocks")) || [];
const CAT_COLORS = { focus: "#9d4edd", admin: "#f4b860", body: "#52b788", joy: "#e5989b" };
const CAT_LABELS = { focus: "\U0001F52E Deep Focus", admin: "\U0001F4B8 Admin", body: "\U0001F33F Body & Care", joy: "\U0001F389 Joy" };
const DAY_START_MIN = 5 * 60;      // 5:00 AM
const DAY_SPAN_MIN = 19 * 60;      // through midnight

function blockDateKey() {
  return document.getElementById("blockDate").value || new Date().toISOString().slice(0, 10);
}

function toMin(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function toHHMM(min) {
  return `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

function slotIsFree(date, start, dur) {
  return !blocks.some(b =>
    b.date === date && start < toMin(b.start) + b.dur && start + dur > toMin(b.start));
}

function saveBlocks() {
  localStorage.setItem("ccc_blocks", JSON.stringify(blocks));
  renderBlocks();
  renderWins();
}

function renderBlocks() {
  const date = blockDateKey();
  const list = document.getElementById("blocksList");
  const timeline = document.getElementById("timeline");
  timeline.innerHTML = "";

  const dayBlocks = blocks
    .filter(b => b.date === date)
    .sort((a, b) => toMin(a.start) - toMin(b.start));

  dayBlocks.forEach(b => {
    const left = ((toMin(b.start) - DAY_START_MIN) / DAY_SPAN_MIN) * 100;
    const width = (b.dur / DAY_SPAN_MIN) * 100;
    if (width > 0) {
      const bar = document.createElement("div");
      bar.className = "tl-block" + (b.done ? " tl-done" : "");
      bar.style.left = `${Math.max(left, 0)}%`;
      bar.style.width = `${width}%`;
      bar.style.background = CAT_COLORS[b.cat] || "#9d4edd";
      bar.title = `${b.start} \u00b7 ${b.label}`;
      timeline.appendChild(bar);
    }
  });

  list.innerHTML = dayBlocks.length
    ? dayBlocks.map(b => `
        <div class="line-item block-item ${b.done ? "paid" : ""}">
          <input type="checkbox" ${b.done ? "checked" : ""} onchange="toggleBlock(${b.id})" />
          <span class="cat-dot" style="background:${CAT_COLORS[b.cat]}"></span>
          <span><strong>${b.start}</strong> \u00b7 ${b.label} <small>(${b.dur} min \u00b7 ${CAT_LABELS[b.cat]})</small></span>
          <span class="due-tag">${toHHMM(toMin(b.start) + b.dur)}</span>
          <button onclick="deleteBlock(${b.id})">\U0001F5D1\ufe0f</button>
        </div>
      `).join("")
    : `<p class="helper-text">No blocks on this day yet. Break down something big, or lay out the day hour by hour.</p>`;
}

function toggleBlock(id) {
  blocks = blocks.map(b => {
    if (b.id !== id) return b;
    if (!b.done) return { ...b, done: true, doneAt: Date.now() };
    const { doneAt, ...rest } = b;
    return { ...rest, done: false };
  });
  const b = blocks.find(x => x.id === id);
  if (b && b.done) fireConfetti();
  saveBlocks();
}

function deleteBlock(id) {
  blocks = blocks.filter(b => b.id !== id);
  saveBlocks();
}

function nextFreeSlot(date, durMin) {
  const isToday = date === new Date().toISOString().slice(0, 10);
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  let start = Math.ceil((isToday ? Math.max(nowMin, DAY_START_MIN) : DAY_START_MIN) / 15) * 15;
  for (let guard = 0; guard < 96; guard++) {
    if (slotIsFree(date, start, durMin) && start + durMin <= 24 * 60) return start;
    start += 15;
  }
  return DAY_START_MIN;
}

// --- 14. JOURNAL ---
const JOURNAL_PROMPTS = [
  "What drained you today, and what refilled you?",
  "Write the win you want to be reading about a year from now.",
  "What would future-you thank you for doing today?",
  "Where did you protect your peace today?",
  "What is one thing you are ready to release this moon cycle?",
  "Describe today in three words, then explain the weirdest one.",
  "What did your body need today? Did you give it?",
  "Who made your day lighter? Tell them, or write it here.",
  "What did you do today that your Leo Sun can be loud about?",
  "What small thing are you proud of that nobody clapped for?",
  "If today repeated for a week, would you be happy? What would you change?",
  "What is calling in? Script it as already yours."
];

let journal = JSON.parse(localStorage.getItem("ccc_journal")) || {};
let journalMood = "";
let journalOffset = 0; // 0 = today, 1 = yesterday...

function journalDateStr() {
  const d = new Date();
  d.setDate(d.getDate() - journalOffset);
  return d.toISOString().slice(0, 10);
}

function prettyDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function renderJournal() {
  const dateStr = journalDateStr();
  const entry = journal[dateStr] || { mood: "", text: "" };

  document.getElementById("journalDateLabel").textContent =
    journalOffset === 0 ? "Today" : prettyDate(dateStr);
  document.getElementById("journalInput").value = entry.text || "";
  journalMood = entry.mood || "";
  document.querySelectorAll(".mood-btn").forEach(b =>
    b.classList.toggle("active", b.dataset.mood === journalMood));

  const dayOfYear = Math.floor((new Date(dateStr + "T12:00:00") - new Date(dateStr.slice(0, 4), 0, 0)) / 86400000);
  document.getElementById("journalPrompt").textContent =
    JOURNAL_PROMPTS[dayOfYear % JOURNAL_PROMPTS.length];

  const dates = Object.keys(journal).sort().reverse();
  const list = document.getElementById("journalList");
  list.innerHTML = dates.length
    ? dates.map(d => `
        <div class="line-item journal-item">
          <span>${journal[d].mood || "\U0001F4D3"}</span>
          <span><strong>${prettyDate(d)}</strong> \u00b7 ${journal[d].text.slice(0, 90)}${journal[d].text.length > 90 ? "..." : ""}</span>
          <button onclick="loadJournalEntry('${d}')">Open</button>
        </div>
      `).join("")
    : `<p class="helper-text">No entries yet. Today is a great day to start.</p>`;
}

function loadJournalEntry(dateStr) {
  const now = new Date().toISOString().slice(0, 10);
  journalOffset = Math.round((new Date(now + "T12:00:00") - new Date(dateStr + "T12:00:00")) / 86400000);
  renderJournal();
}

function saveJournalEntry() {
  const dateStr = journalDateStr();
  const text = document.getElementById("journalInput").value;
  if (!text.trim()) return;
  journal[dateStr] = { mood: journalMood, text, savedAt: Date.now() };
  localStorage.setItem("ccc_journal", JSON.stringify(journal));
  renderJournal();
  fireConfetti();
}

// --- 15. TODAY'S WINS SCOREBOARD ---
function renderWins() {
  const today = new Date().toISOString().slice(0, 10);
  const list = document.getElementById("winsList");
  const wins = [];

  blocks.filter(b => b.date === today && b.done)
    .forEach(b => wins.push(`\U0001F9F1 Block done: ${b.label}`));

  tasks.filter(t => t.col === "done" && t.doneAt &&
      new Date(t.doneAt).toISOString().slice(0, 10) === today)
    .forEach(t => wins.push(`\U0001F3AF Crushed: ${t.text}`));

  const selfcareToday = JSON.parse(localStorage.getItem("ccc_selfcare")) || [];
  const kept = selfcareToday.filter(i => i.done).length;
  if (kept) wins.push(`\U0001F6C1 Self care kept: ${kept} ritual${kept > 1 ? "s" : ""}`);

  bills.filter(b => b.paid && b.paidAt &&
      new Date(b.paidAt).toISOString().slice(0, 10) === today)
    .forEach(b => wins.push(`\U0001F4B8 Handled: ${b.name} payment`));

  const countEl = document.getElementById("winsCount");
  countEl.textContent = `${wins.length} win${wins.length === 1 ? "" : "s"}`;
  countEl.classList.toggle("gold-badge", wins.length >= 3);

  list.innerHTML = wins.length
    ? wins.map(w => `<div class="win-row">${w}</div>`).join("")
    : `<p class="helper-text">Nothing banked yet today. One small block is all it takes to get on the board.</p>`;
}

// --- 16. INITIALIZE (BLOCKS / JOURNAL / WINS) ---
document.addEventListener("DOMContentLoaded", () => {
  const blockDate = document.getElementById("blockDate");
  blockDate.value = new Date().toISOString().slice(0, 10);
  blockDate.addEventListener("change", renderBlocks);

  document.getElementById("blockForm").addEventListener("submit", e => {
    e.preventDefault();
    const dur = Number(document.getElementById("blockDur").value);
    const date = blockDateKey();
    const requested = toMin(document.getElementById("blockStart").value || "09:00");
    const start = slotIsFree(date, requested, dur) ? requested : nextFreeSlot(date, dur);
    blocks.push({
      id: Date.now(),
      date,
      start: toHHMM(start),
      dur,
      label: document.getElementById("blockLabel").value.trim(),
      cat: document.getElementById("blockCat").value,
      done: false
    });
    document.getElementById("blockForm").reset();
    document.getElementById("blockStart").value = toHHMM(nextFreeSlot(date, 30));
    saveBlocks();
  });

  document.getElementById("breakdownForm").addEventListener("submit", e => {
    e.preventDefault();
    const label = document.getElementById("breakdownText").value.trim();
    const total = Number(document.getElementById("breakdownMinutes").value);
    const chunk = Number(document.getElementById("breakdownChunk").value);
    if (!label || !total) return;
    const date = blockDateKey();
    const count = Math.ceil(total / chunk);
    let remaining = total;
    let cursor = nextFreeSlot(date, Math.min(chunk, total));
    for (let i = 0; i < count; i++) {
      const dur = Math.min(chunk, remaining);
      let start = cursor;
      for (let guard = 0; guard < 96; guard++) {
        if (slotIsFree(date, start, dur) && start + dur <= 24 * 60) break;
        start += 15;
      }
      blocks.push({
        id: Date.now() + i,
        date,
        start: toHHMM(start),
        dur,
        label: `${label} \u00b7 part ${i + 1}/${count}`,
        cat: "focus",
        done: false
      });
      remaining -= dur;
      cursor = start + dur + 10; // 10-minute breather between chunks
    }
    document.getElementById("breakdownForm").reset();
    saveBlocks();
    fireConfetti();
  });

  document.getElementById("journalPrev").addEventListener("click", () => { journalOffset++; renderJournal(); });
  document.getElementById("journalNext").addEventListener("click", () => {
    if (journalOffset > 0) { journalOffset--; renderJournal(); }
  });
  document.getElementById("journalTodayBtn").addEventListener("click", () => { journalOffset = 0; renderJournal(); });
  document.getElementById("journalSaveBtn").addEventListener("click", saveJournalEntry);

  document.querySelectorAll(".mood-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      journalMood = journalMood === btn.dataset.mood ? "" : btn.dataset.mood;
      document.querySelectorAll(".mood-btn").forEach(b =>
        b.classList.toggle("active", b.dataset.mood === journalMood));
    });
  });

  renderBlocks();
  renderJournal();
  renderWins();
});
// --- 17. HOURLY TODAY SCHEDULE + REMINDERS ---
const PRI_EMOJI = { high: "\U0001F525", med: "\u26A1", low: "\U0001F33F" };

function fmtTime(hhmm) {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function todaysBlocks() {
  const today = new Date().toISOString().slice(0, 10);
  return blocks.filter(b => b.date === today);
}

function todaysTimedTasks() {
  const today = new Date().toISOString().slice(0, 10);
  return tasks.filter(t => t.due === today && t.time && !["done", "graveyard"].includes(t.col));
}

function todaysAnytimeTasks() {
  const today = new Date().toISOString().slice(0, 10);
  return tasks.filter(t => t.due === today && !t.time && !["done", "graveyard"].includes(t.col));
}

function weekTaskChips(i) {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const d = new Date(monday);
  d.setDate(monday.getDate() + i);
  const key = d.toISOString().slice(0, 10);
  const due = tasks.filter(t => t.due === key && !["done", "graveyard"].includes(t.col));
  const gcal = (typeof gcalEventsOn === "function") ? gcalEventsOn(key) : [];
  const chips = [
    ...gcal.map(ev => `<span class="week-task-chip gcal">\U0001F4C5 ${ev.title}</span>`),
    ...due.map(t => `<span class="week-task-chip">${t.pri ? PRI_EMOJI[t.pri] + " " : ""}${t.text}</span>`)
  ];
  if (!chips.length) return "";
  return `<div class="week-tasks">${chips.join("")}</div>`;
}

function renderHourly() {
  const grid = document.getElementById("hourlyGrid");
  if (!grid) return;
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const today = new Date().toISOString().slice(0, 10);
  const blocksToday = todaysBlocks();
  const timed = todaysTimedTasks();
  const anytime = todaysAnytimeTasks();
  const gcalToday = (typeof gcalEventsOn === "function") ? gcalEventsOn(today) : [];
  const anytimeAll = [
    ...gcalToday.filter(ev => ev.allDay).map(ev => `\U0001F4C5 ${ev.title} (all day)`),
    ...anytime.map(t => `${t.pri ? PRI_EMOJI[t.pri] + " " : ""}${t.text}`)
  ];
  let htmlOut = "";

  if (anytimeAll.length) {
    htmlOut += `<div class="hour-row anytime-row">
      <span class="hour-label">Anytime</span>
      <div class="hour-content">${anytimeAll.map(t =>
        `<span class="hour-chip">${t}</span>`).join("")}</div>
    </div>`;
  }

  for (let h = 5; h < 24; h++) {
    const isNow = nowMin >= h * 60 && nowMin < (h + 1) * 60;
    const cellBits = [];
    blocksToday.filter(b => Math.floor(toMin(b.start) / 60) === h).forEach(b => {
      cellBits.push(`<span class="hour-chip block-chip" style="background:${CAT_COLORS[b.cat]}22;border-color:${CAT_COLORS[b.cat]}">${b.done ? "\u2705 " : ""}${b.label} \u00b7 ${fmtTime(b.start)}</span>`);
    });
    timed.filter(t => Math.floor(toMin(t.time) / 60) === h).forEach(t => {
      cellBits.push(`<span class="hour-chip task-chip">${PRI_EMOJI[t.pri] || "\U0001F3AF"} ${t.text} \u00b7 ${fmtTime(t.time)}</span>`);
    });
    gcalToday.filter(ev => !ev.allDay && new Date(ev.start).getHours() === h).forEach(ev => {
      cellBits.push(`<span class="hour-chip gcal-chip">\U0001F4C5 ${ev.title} \u00b7 ${gcalRange(ev)}</span>`);
    });
    htmlOut += `<div class="hour-row ${isNow ? "now" : ""}">
      <span class="hour-label">${fmtTime(`${String(h).padStart(2, "0")}:00`).replace(":00", "")}</span>
      <div class="hour-content">${cellBits.join("")}</div>
    </div>`;
  }
  grid.innerHTML = htmlOut;
  renderNowBanner();
}

function renderNowBanner() {
  const banner = document.getElementById("nowBanner");
  if (!banner) return;
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const todayStr = new Date().toISOString().slice(0, 10);
  const gcalNow = (typeof gcalEventsOn === "function")
    ? gcalEventsOn(todayStr).find(ev => {
        if (ev.allDay) return false;
        const s = new Date(ev.start), e = new Date(ev.end);
        const sMin = s.getHours() * 60 + s.getMinutes(), eMin = e.getHours() * 60 + e.getMinutes();
        return nowMin >= sMin && nowMin < eMin;
      })
    : null;
  const current = gcalNow || todaysBlocks().find(b => nowMin >= toMin(b.start) && nowMin < toMin(b.start) + b.dur);
  let htmlOut;
  if (gcalNow) {
    const e = new Date(gcalNow.end);
    htmlOut = `\U0001F4C5 <strong>Right now (Google):</strong> ${gcalNow.title} \u00b7 until ${fmtTime(toHHMM(e.getHours() * 60 + e.getMinutes()))}`;
  } else if (current) {
    htmlOut = `\u23F0 <strong>Right now:</strong> ${current.label} \u00b7 until ${fmtTime(toHHMM(toMin(current.start) + current.dur))}`;
  } else {
    const upcoming = [
      ...todaysBlocks().map(b => ({ t: toMin(b.start), label: b.label, time: b.start })),
      ...todaysTimedTasks().map(t => ({ t: toMin(t.time), label: t.text, time: t.time }))
    ].filter(x => x.t > nowMin).sort((a, b) => a.t - b.t)[0];
    htmlOut = upcoming
      ? `\U0001F552 Free right now \u00b7 next up ${fmtTime(upcoming.time)}: ${upcoming.label}`
      : `\U0001F552 Open window \u00b7 nothing else scheduled today`;
  }
  banner.innerHTML = htmlOut;
  banner.classList.remove("hidden");
}

// reminders fire as an on-page toast (and a phone notification, once enabled)
let remindedToday = JSON.parse(localStorage.getItem("ccc_reminded")) || { date: "", ids: [] };

function cosmicAlert(title, msg) {
  const toast = document.getElementById("cosmicToast");
  document.getElementById("toastTitle").textContent = title;
  document.getElementById("toastMessage").textContent = msg;
  toast.classList.remove("hidden");
  fireConfetti();
}

function checkReminders() {
  const today = new Date().toISOString().slice(0, 10);
  const nowHHMM = `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`;
  if (remindedToday.date !== today) remindedToday = { date: today, ids: [] };

  const due = [
    ...todaysBlocks().map(b => ({ id: `b${b.id}`, time: b.start, label: b.label })),
    ...todaysTimedTasks().map(t => ({ id: `t${t.id}`, time: t.time, label: t.text }))
  ];

  due.forEach(item => {
    if (item.time === nowHHMM && !remindedToday.ids.includes(item.id)) {
      remindedToday.ids.push(item.id);
      localStorage.setItem("ccc_reminded", JSON.stringify(remindedToday));
      cosmicAlert("\u23F0 Time to start!", `${item.label} \u00b7 you planned this for ${fmtTime(item.time)}. Go get it, Queen!`);
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("Cosmic Command Center", { body: `Time to start: ${item.label}` });
      }
    }
  });
}

// --- 18. INITIALIZE (SCHEDULE / REMINDERS) ---
document.addEventListener("DOMContentLoaded", () => {
  renderHourly();
  setInterval(renderHourly, 60000);
  setInterval(checkReminders, 30000);
  checkReminders();

  const remindBtn = document.getElementById("remindToggle");
  if (remindBtn) {
    const markOn = () => { remindBtn.textContent = "\U0001F514 Reminders On"; };
    if (typeof Notification !== "undefined" && Notification.permission === "granted") markOn();
    remindBtn.addEventListener("click", () => {
      if (typeof Notification === "undefined") {
        cosmicAlert("\U0001F514 No Phone Alerts", "Your browser cannot do push reminders. The on-page bell still fires while the planner is open.");
        return;
      }
      Notification.requestPermission().then(p => {
        if (p === "granted") { markOn(); cosmicAlert("\U0001F514 Reminders On", "Your phone will buzz at each block and timed task. Cosmic punctuality, unlocked."); }
        else remindBtn.textContent = "\U0001F514 Enable Reminders";
      });
    });
  }
});