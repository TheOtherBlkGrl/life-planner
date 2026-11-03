const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

function localDateStr(d = new Date()) {
  // the LOCAL calendar date (YYYY-MM-DD); toISOString() is UTC and rolls over at 4/5pm Pacific
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
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

// extra task destinations: each tab's own category list
const TAB_TASK_COLS = ["selfcare", "garden", "social", "marriage", "work", "jobs"];
const TAB_COL_LABELS = {
  selfcare: "🛁 Self Care", garden: "🌱 Garden", social: "👯 Social",
  marriage: "💍 Marriage", work: "🧰 Work", jobs: "💼 Job Hunt"
};
const MOVE_COLS = [...TASK_COLS, ...TAB_TASK_COLS];
const ALL_COL_LABELS = { ...COL_LABELS, ...TAB_COL_LABELS };

function saveTasks() {
  localStorage.setItem("clarissa_tasks", JSON.stringify(tasks));
  renderKanban();
  renderTabTasks();
}

function nextRepeatDue(due, repeat) {
  if (!due) return "";
  const d = new Date(due + "T12:00:00");
  const step = () => {
    if (repeat === "daily") d.setDate(d.getDate() + 1);
    else if (repeat === "weekly") d.setDate(d.getDate() + 7);
    else if (repeat === "weekdays") { do { d.setDate(d.getDate() + 1); } while (d.getDay() === 0 || d.getDay() === 6); }
    else if (repeat === "monthly") { const day = d.getDate(); d.setMonth(d.getMonth() + 1); if (d.getDate() < day) d.setDate(0); }
    else if (repeat === "quarterly") { const day = d.getDate(); d.setMonth(d.getMonth() + 3); if (d.getDate() < day) d.setDate(0); }
    else if (repeat === "yearly") { const day = d.getDate(); d.setFullYear(d.getFullYear() + 1); if (d.getDate() < day) d.setDate(0); }
  };
  step();
  while (d.getTime() <= Date.now()) step();  // skip past dates so the copy lands ahead
  return localDateStr(d);
}

function moveTask(id, targetCol) {
  if (!targetCol || !MOVE_COLS.includes(targetCol)) return;
  const before = tasks.find(t => t.id === id);
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
    if (before && before.repeat) {
      const top3Count = tasks.filter(t => t.col === "top3").length;
      const respawnCol = (before.col === "top3" && top3Count >= 3) ? "dump" : before.col;
      tasks.push({
        id: Date.now() + 1,
        text: before.text,
        col: respawnCol,
        due: nextRepeatDue(before.due, before.repeat),
        time: before.time || "",
        pri: before.pri || "",
        repeat: before.repeat
      });
    }
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

      const options = MOVE_COLS.map(c =>
        `<option value="${c}" ${c === task.col ? "selected" : ""}>${ALL_COL_LABELS[c]}</option>`
      ).join("");

      const isOverdue = task.due && !["done", "graveyard"].includes(task.col) && task.due < localDateStr();
      const badges = [];
      if (task.pri) badges.push(`<span class="pri-dot pri-${task.pri}" title="Priority"></span>`);
      if (task.repeat) badges.push(`<span class="task-badge repeat-badge" title="Repeats ${task.repeat}">🔁 ${task.repeat}</span>`);
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

// tasks filed into a tab's category list render on that tab
function renderTabTasks() {
  TAB_TASK_COLS.forEach(col => {
    const box = document.getElementById("taskCol-" + col);
    if (!box) return;
    box.innerHTML = "";
    const rows = tasks.filter(t => t.col === col);
    if (!rows.length) { box.style.display = "none"; return; }
    box.style.display = "";
    rows.forEach(task => {
      const card = document.createElement("div");
      card.className = "task-card";
      const options = MOVE_COLS.map(c =>
        `<option value="${c}" ${c === task.col ? "selected" : ""}>${ALL_COL_LABELS[c]}</option>`
      ).join("");
      const isOverdue = task.due && !["done", "graveyard"].includes(task.col) && task.due < localDateStr();
      const badges = [];
      if (task.pri) badges.push(`<span class="pri-dot pri-${task.pri}" title="Priority"></span>`);
      if (task.repeat) badges.push(`<span class="task-badge repeat-badge" title="Repeats ${task.repeat}">🔁 ${task.repeat}</span>`);
      if (task.time) badges.push(`<span class="task-badge">⏰ ${fmtTime(task.time)}</span>`);
      else if (task.due) badges.push(`<span class="task-badge ${isOverdue ? "overdue-badge" : ""}">📅 ${isOverdue ? "overdue ⚠️" : task.due.slice(5)}</span>`);
      card.innerHTML = `
        <span>${task.text}${badges.length ? `<span class="badge-row">${badges.join("")}</span>` : ""}</span>
        <div class="task-actions">
          <select class="move-select" onchange="moveTask(${task.id}, this.value)">${options}</select>
          <button onclick="deleteTask(${task.id})">🗑️</button>
        </div>
      `;
      box.appendChild(card);
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
  // hitting the dopamine timer pauses the focus clock: the break is sanctioned, no guilt
  if (focusSess && focusSess.running) {
    pauseFocusSess(true);
    const note = document.getElementById("focusNote");
    if (note) note.textContent = "\u{1F9F8} Break logged \u2014 clock paused, momentum protected.";
  }
  timerInterval = setInterval(() => {
    if (secondsLeft > 0) {
      secondsLeft--;
      updateTimerDisplay();
    } else {
      clearInterval(timerInterval);
      timerInterval = null;
      fireConfetti();
      document.getElementById("activeBreakLabel").textContent = "✨ Brain reset complete!";
      if (focusSess && focusSess.autoPaused) {
        resumeFocusSess();
        const note = document.getElementById("focusNote");
        if (note) note.textContent = "\u26A1 Break over \u2014 clock's back on. Keep going.";
      }
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

  const today = localDateStr();
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
      <span class="due-tag">due ${b.due}${!b.paid && b.due < today ? " ⚠️" : ""}</span>${b.repeat ? `<span class="task-badge repeat-badge" title="Repeats ${b.repeat}">🔁 ${b.repeat}</span>` : ""}
      <button onclick="deleteBill(${b.id})">🗑️</button>
    `;
    list.appendChild(row);
  });
}

function toggleBillPaid(id) {
  const before = bills.find(b => b.id === id);
  bills = bills.map(b => {
    if (b.id !== id) return b;
    if (!b.paid) return { ...b, paid: true, paidAt: Date.now() };
    const { paidAt, ...rest } = b;
    return { ...rest, paid: false };
  });
  const bill = bills.find(b => b.id === id);
  if (bill && bill.paid) {
    fireConfetti();
    if (before && before.repeat && !before.paid) {
      bills.push({
        id: Date.now() + 1,
        name: before.name,
        amount: before.amount,
        due: nextRepeatDue(before.due, before.repeat),
        paid: false,
        repeat: before.repeat
      });
    }
  }
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
const todayStr = localDateStr();

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
  wireSimpleList("marriageForm", "marriageInput", "marriageList", "ccc_marriage");
  wireSimpleList("workForm", "workInput", "workList", "ccc_work");
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
      pri: document.getElementById("taskPri").value || "",
      repeat: document.getElementById("taskRepeat").value || ""
    });
    input.value = "";
    document.getElementById("taskDue").value = "";
    document.getElementById("taskTime").value = "";
    document.getElementById("taskPri").value = "";
    document.getElementById("taskRepeat").value = "";
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
      paid: false,
      repeat: document.getElementById("billRepeat").value || ""
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

// calendar-event categories (tag any Google event from its detail popup)
const EV_CAT_META = {
  selfcare: { label: "Self Care", emoji: "\u{1F6C1}", color: "#4cc9f0" },
  garden:   { label: "Garden",    emoji: "\u{1F331}", color: "#74c69d" },
  social:   { label: "Social",    emoji: "\u{1F46F}", color: "#ff8fa3" },
  marriage: { label: "Marriage",  emoji: "\u{1F48D}", color: "#c9184a" },
  work:     { label: "Work",      emoji: "\u{1F9F0}", color: "#e07a5f" },
  focus:    { label: "Focus",     emoji: "\u{1F3AF}", color: "#9d4edd" },
  admin:    { label: "Admin",     emoji: "\u{1F4C2}", color: "#f4b860" },
  body:     { label: "Body",      emoji: "\u{1F4AA}", color: "#52b788" },
  joy:      { label: "Joy",       emoji: "\u2728",    color: "#e5989b" },
  bills:    { label: "Bills",     emoji: "\u{1F4B8}", color: "#ffd54f" },
  jobs:     { label: "Job Hunt",  emoji: "\u{1F4BC}", color: "#4895ef" }
};
let evCats = JSON.parse(localStorage.getItem("ccc_ev_cats")) || {};
const evCatKey = (calId, id) => `${calId}|${id}`;
function evCat(ev) {
  const stored = evCats[evCatKey(ev.calId, ev.id)];
  if (stored) return stored;
  // Tony's calendar (armyjkr@gmail.com) defaults to the Marriage category
  if (String(ev.calId || "").includes("armyjkr@gmail.com")) return "marriage";
  return "";
}
function setEvCat(calId, id, cat) {
  if (cat) evCats[evCatKey(calId, id)] = cat; else delete evCats[evCatKey(calId, id)];
  localStorage.setItem("ccc_ev_cats", JSON.stringify(evCats));
  renderHourly();
  renderWeek();
  if (typeof renderMonth === "function") renderMonth();
  if (typeof renderCalEventPanels === "function") renderCalEventPanels();
}
const CAT_LABELS = { focus: "🔮 Deep Focus", admin: "💸 Admin", body: "🌿 Body & Care", joy: "🎉 Joy" };
const DAY_START_MIN = 5 * 60;      // 5:00 AM
const DAY_SPAN_MIN = 19 * 60;      // through midnight

function blockDateKey() {
  return document.getElementById("blockDate").value || localDateStr();
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
          <button onclick="deleteBlock(${b.id})">🗑\ufe0f</button>
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
  const isToday = date === localDateStr();
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  let start = Math.ceil((isToday ? Math.max(nowMin, DAY_START_MIN) : DAY_START_MIN) / 15) * 15;
  for (let guard = 0; guard < 96; guard++) {
    if (slotIsFree(date, start, durMin) && start + durMin <= 24 * 60) return start;
    start += 15;
  }
  return DAY_START_MIN;
}

// --- FOCUS SESSION (task-driven Blocks page) ---
let focusSess = JSON.parse(localStorage.getItem("ccc_focus")) || null;
let focusLast = JSON.parse(localStorage.getItem("ccc_focus_last")) || null;

function focusElapsedMs() {
  if (!focusSess) return 0;
  return focusSess.elapsed + (focusSess.running ? Date.now() - focusSess.startedAt : 0);
}
function fmtClock(ms) {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
function saveFocusSess() {
  localStorage.setItem("ccc_focus", JSON.stringify(focusSess));
  renderFocusSess();
}
function refreshFocusPicker() {
  const sel = document.getElementById("focusTaskSelect");
  if (!sel) return;
  const open = tasks.filter(t => !["done", "graveyard"].includes(t.col));
  sel.innerHTML = `<option value="">\u2014 pull a task over \u2014</option>` +
    open.map(t => `<option value="${t.id}">${esc(t.text)}</option>`).join("");
}
function renderFocusSess() {
  const picker = document.getElementById("focusPickerBox");
  const active = document.getElementById("focusActiveBox");
  const note = document.getElementById("focusNote");
  if (!picker || !active) return;
  if (!focusSess) {
    picker.classList.remove("hidden");
    active.classList.add("hidden");
    if (note && focusLast) note.textContent = `Last session: ${focusLast.label} \u2014 ${fmtClock(focusLast.ms)} \u2713`;
    return;
  }
  picker.classList.add("hidden");
  active.classList.remove("hidden");
  document.getElementById("focusLabel").textContent = focusSess.label;
  document.getElementById("focusEst").value = focusSess.estMin;
  document.getElementById("focusToggleBtn").textContent = focusSess.running ? "\u23F8 Pause" : "\u25B6 Start";
  updateFocusClock();
  if (note && focusSess.autoPaused) note.textContent = "\u{1F9F8} Break logged \u2014 clock paused, momentum protected.";
}
function updateFocusClock() {
  if (!focusSess) return;
  const ms = focusElapsedMs();
  document.getElementById("focusClock").textContent = fmtClock(ms);
  const estMs = focusSess.estMin * 60000;
  const bar = document.getElementById("focusBar");
  const over = document.getElementById("focusOver");
  if (estMs > 0) {
    bar.style.width = `${Math.min(100, (ms / estMs) * 100)}%`;
    if (ms > estMs) {
      over.classList.remove("hidden");
      over.textContent = `+${fmtClock(ms - estMs)} over`;
    } else {
      over.classList.add("hidden");
    }
  }
}
function startFocusSess() {
  const sel = document.getElementById("focusTaskSelect");
  const custom = document.getElementById("focusCustomInput").value.trim();
  let label = custom;
  let taskId = null;
  if (sel && sel.value) {
    const t = tasks.find(x => x.id === Number(sel.value));
    if (t) { label = t.text; taskId = t.id; }
  }
  if (!label) return;
  focusSess = { taskId, label, estMin: 25, elapsed: 0, running: false, startedAt: 0, autoPaused: false };
  document.getElementById("focusCustomInput").value = "";
  saveFocusSess();
  resumeFocusSess();
}
function pauseFocusSess(auto) {
  if (!focusSess || !focusSess.running) return;
  focusSess.elapsed = focusElapsedMs();
  focusSess.running = false;
  focusSess.autoPaused = !!auto;
  saveFocusSess();
}
function resumeFocusSess() {
  if (!focusSess) return;
  focusSess.running = true;
  focusSess.startedAt = Date.now();
  focusSess.autoPaused = false;
  saveFocusSess();
}
function finishFocusSess() {
  if (!focusSess) return;
  const ms = focusElapsedMs();
  if (ms > 5000) {
    fireConfetti();
    focusLast = { label: focusSess.label, ms };
    localStorage.setItem("ccc_focus_last", JSON.stringify(focusLast));
  }
  focusSess = null;
  saveFocusSess();
}
function discardFocusSess() {
  focusSess = null;
  saveFocusSess();
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
  return localDateStr(d);
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
          <span>${journal[d].mood || "📓"}</span>
          <span><strong>${prettyDate(d)}</strong> \u00b7 ${journal[d].text.slice(0, 90)}${journal[d].text.length > 90 ? "..." : ""}</span>
          <button onclick="loadJournalEntry('${d}')">Open</button>
        </div>
      `).join("")
    : `<p class="helper-text">No entries yet. Today is a great day to start.</p>`;
}

function loadJournalEntry(dateStr) {
  const now = localDateStr();
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
  const today = localDateStr();
  const list = document.getElementById("winsList");
  const wins = [];

  blocks.filter(b => b.date === today && b.done)
    .forEach(b => wins.push(`🧱 Block done: ${b.label}`));

  tasks.filter(t => t.col === "done" && t.doneAt &&
      localDateStr(new Date(t.doneAt)) === today)
    .forEach(t => wins.push(`🎯 Crushed: ${t.text}`));

  const selfcareToday = JSON.parse(localStorage.getItem("ccc_selfcare")) || [];
  const kept = selfcareToday.filter(i => i.done).length;
  if (kept) wins.push(`🛁 Self care kept: ${kept} ritual${kept > 1 ? "s" : ""}`);

  bills.filter(b => b.paid && b.paidAt &&
      localDateStr(new Date(b.paidAt)) === today)
    .forEach(b => wins.push(`💸 Handled: ${b.name} payment`));

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
  blockDate.value = localDateStr();
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
const PRI_EMOJI = { high: "🔥", med: "\u26A1", low: "🌿" };

function fmtTime(hhmm) {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function todaysBlocks() {
  const today = localDateStr();
  return blocks.filter(b => b.date === today);
}

function todaysTimedTasks() {
  const today = localDateStr();
  return tasks.filter(t => t.due === today && t.time && !["done", "graveyard"].includes(t.col));
}

function todaysAnytimeTasks() {
  const today = localDateStr();
  return tasks.filter(t => t.due === today && !t.time && !["done", "graveyard"].includes(t.col));
}

function weekTaskChips(i) {
  const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const d = new Date(monday);
  d.setDate(monday.getDate() + i);
  const key = localDateStr(d);
  const due = tasks.filter(t => t.due === key && !["done", "graveyard"].includes(t.col));
  const gcal = (typeof gcalEventsOn === "function") ? gcalEventsOn(key) : [];
  const chips = [
    ...gcal.map(ev => `<span class="week-task-chip gcal gcal-detail" data-cal="${esc(ev.calId)}" data-eid="${esc(ev.id)}" data-cached="${encodeURIComponent(JSON.stringify(ev))}" title="Show details">📅 ${esc(ev.title)}</span>`),
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
  const today = localDateStr();
  const blocksToday = todaysBlocks();
  const timed = todaysTimedTasks();
  const anytime = todaysAnytimeTasks();
  const gcalToday = (typeof gcalEventsOn === "function") ? gcalEventsOn(today) : [];
  const DAY_START = 5 * 60, DAY_END = 24 * 60;
  const span = DAY_END - DAY_START;
  const pct = m => Math.max(0, Math.min(100, ((m - DAY_START) / span) * 100));
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

  // collect every timed thing on the chart
  const items = [];
  blocksToday.forEach(b => {
    const s = toMin(b.start);
    items.push({
      s, e: Math.min(s + b.dur, DAY_END),
      label: (b.done ? "\u2705 " : "") + b.label, sub: fmtTime(b.start),
      cls: "g-block", style: `background:${CAT_COLORS[b.cat]}22;border-color:${CAT_COLORS[b.cat]}`
    });
  });
  timed.forEach(t => {
    const s = toMin(t.time);
    items.push({
      s, e: Math.min(s + 60, DAY_END),
      label: `${PRI_EMOJI[t.pri] || "\u{1F3AF}"} ${t.text}`, sub: fmtTime(t.time),
      cls: "g-task", style: ""
    });
  });
  gcalToday.filter(ev => !ev.allDay).forEach(ev => {
    const sd = new Date(ev.start), ed = new Date(ev.end);
    const s = sd.getHours() * 60 + sd.getMinutes();
    let eM = ed.getHours() * 60 + ed.getMinutes();
    if (eM <= s) eM = DAY_END;
    const cat = evCat(ev);
    const catCol = cat ? EV_CAT_META[cat].color : "";
    items.push({
      s, e: Math.max(s + 15, Math.min(eM, DAY_END)),
      label: `${cat ? EV_CAT_META[cat].emoji : "\u{1F4C5}"} ${ev.title}`, sub: gcalRange(ev),
      cls: "g-gcal gcal-detail", style: cat ? `background:${catCol}22;border-color:${catCol}` : "",
      calId: ev.calId, eid: ev.id, ev
    });
  });

  // all-day / anytime lane sits on top
  const gcalChip = ev => `<span class="hour-chip gcal-detail" data-cal="${esc(ev.calId)}" data-eid="${esc(ev.id)}" data-cached="${encodeURIComponent(JSON.stringify(ev))}" title="Show details">\u{1F4C5} ${esc(ev.title)} (all day)</span>`;
  const anytimeAll = [
    ...gcalToday.filter(ev => ev.allDay).map(ev => ({ html: gcalChip(ev) })),
    ...anytime.map(t => ({ html: esc(`${t.pri ? PRI_EMOJI[t.pri] + " " : ""}${t.text}`) }))
  ];

  // greedy lane packing so overlapping items each get their own row
  items.sort((a, b) => a.s - b.s || a.e - b.e);
  const lanes = [];
  items.forEach(it => {
    let placed = false;
    for (const lane of lanes) {
      if (lane.every(o => o.e <= it.s + 0.01)) { lane.push(it); placed = true; break; }
    }
    if (!placed) lanes.push([it]);
  });

  const hourTicks = [];
  for (let h = 5; h < 24; h++) {
    hourTicks.push(`<span class="g-tick" style="left:${((h * 60 - DAY_START) / span * 100).toFixed(2)}%">${h === 12 ? "12p" : h > 12 ? (h - 12) + "p" : h + "a"}</span>`);
  }

  let htmlOut = "";
  if (anytimeAll.length) {
    htmlOut += `<div class="gantt-anytime"><span class="g-anytime-label">All day</span><div>${anytimeAll.map(t => t.html).join("")}</div></div>`;
  }
  htmlOut += `<div class="gantt-wrap"><div class="gantt-inner">`;
  htmlOut += `<div class="gantt-axis">${hourTicks.join("")}</div>`;

  const showNow = nowMin >= DAY_START && nowMin < DAY_END;
  if (!items.length && !anytimeAll.length) {
    htmlOut += `<div class="gantt-empty">No timed items today \u2014 the whole day is yours. Drop something in the quick-add above.</div>`;
  } else {
    while (lanes.length < 3) lanes.push([]);  // keep at least 3 rows so the chart reads as a chart
    lanes.forEach(lane => {
      htmlOut += `<div class="gantt-row">${lane.map(it => {
        const w = Math.max(pct(it.e) - pct(it.s), 4);
        const clickCls = it.eid ? " gcal-detail" : "";
        const clickAttrs = it.eid
          ? ` data-cal="${esc(it.calId)}" data-eid="${esc(it.eid)}" data-cached="${encodeURIComponent(JSON.stringify(it.ev))}"`
          : "";
        return `<div class="g-bar ${it.cls}${clickCls}" style="left:${pct(it.s).toFixed(2)}%;width:${w.toFixed(2)}%;${it.style}" title="${esc(it.label)} \u00b7 ${esc(it.sub)}"${clickAttrs}><span class="g-bar-title">${esc(it.label)}</span><span class="g-bar-time">${esc(it.sub)}</span></div>`;
      }).join("")}</div>`;
    });
  }
  if (showNow) {
    htmlOut += `<div class="gantt-nowline" style="left:${pct(nowMin).toFixed(2)}%"><span>${fmtTime(toHHMM(nowMin))}</span></div>`;
  }
  htmlOut += `</div></div>`;
  grid.innerHTML = htmlOut;
  renderNowBanner();
  renderBlockThumbs();
}

function renderBlockThumbs() {
  const strip = document.getElementById("blockThumbs");
  if (!strip) return;
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const today = localDateStr();
  const gcalToday = (typeof gcalEventsOn === "function") ? gcalEventsOn(today) : [];
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const DAY_END = 24 * 60;
  const thumbs = [];
  todaysBlocks().forEach(b => {
    const s = toMin(b.start);
    const e = Math.min(s + b.dur, DAY_END);
    const lab = (CAT_LABELS[b.cat] || "").split(" ");
    thumbs.push({
      s, e,
      emoji: lab[0] || "\u{1F3AF}",
      word: lab.slice(1).join(" "),
      title: (b.done ? "\u2705 " : "") + b.label,
      time: fmtTime(b.start) + " \u2013 " + fmtTime(toHHMM(e)),
      col: CAT_COLORS[b.cat] || "var(--cosmic-purple)"
    });
  });
  todaysTimedTasks().forEach(t => {
    const s = toMin(t.time);
    const e = Math.min(s + 60, DAY_END);
    thumbs.push({
      s, e,
      emoji: PRI_EMOJI[t.pri] || "\u{1F3AF}",
      word: "Task",
      title: t.text,
      time: fmtTime(t.time) + " \u2013 " + fmtTime(toHHMM(e)),
      col: "var(--cosmic-purple)"
    });
  });
  gcalToday.filter(ev => !ev.allDay).forEach(ev => {
    const sd = new Date(ev.start), ed = new Date(ev.end);
    const s = sd.getHours() * 60 + sd.getMinutes();
    let eM = ed.getHours() * 60 + ed.getMinutes();
    if (eM <= s) eM = DAY_END;
    const cat = evCat(ev);
    const meta = cat ? EV_CAT_META[cat] : null;
    thumbs.push({
      s, e: Math.max(s + 15, Math.min(eM, DAY_END)),
      emoji: meta ? meta.emoji : "\u{1F4C5}",
      word: meta ? meta.label : "Calendar",
      title: ev.title,
      time: gcalRange(ev),
      col: (meta ? meta.color : "") || "var(--cosmic-purple)",
      gcal: ev
    });
  });
  thumbs.sort((a, b) => a.s - b.s || a.e - b.e);
  if (!thumbs.length) { strip.classList.add("hidden"); strip.innerHTML = ""; return; }
  strip.innerHTML = thumbs.map(t => {
    const isNow = nowMin >= t.s && nowMin < t.e;
    const cls = "blk-thumb" + (t.gcal ? " gcal-detail" : "") + (isNow ? " blk-now" : "");
    const data = t.gcal ? ` data-cal="${esc(t.gcal.calId)}" data-eid="${esc(t.gcal.id)}" data-cached="${encodeURIComponent(JSON.stringify(t.gcal))}" title="Show details"` : "";
    const pct = Math.round(((nowMin - t.s) / Math.max(t.e - t.s, 1)) * 100);
    return `<div class="${cls}"${data} style="border-left:4px solid ${t.col}">
      <div class="bt-top"><span class="bt-emoji">${t.emoji}</span>${isNow ? `<span class="bt-now">now</span>` : ""}</div>
      <div class="bt-title">${esc(t.title)}</div>
      <div class="bt-time">${esc(t.time)}</div>
      ${t.word ? `<div class="bt-word">${esc(t.word)}</div>` : ""}
      ${isNow ? `<div class="bt-progress"><i style="width:${Math.max(2, Math.min(100, pct))}%"></i></div>` : ""}
    </div>`;
  }).join("");
  strip.classList.remove("hidden");
}

function renderNowBanner() {
  const banner = document.getElementById("nowBanner");
  if (!banner) return;
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const todayStr = localDateStr();
  const gcalToday = (typeof gcalEventsOn === "function") ? gcalEventsOn(todayStr) : [];
  const srcEmoji = ev => { const c = (typeof evCat === "function") ? evCat(ev) : ""; return c ? EV_CAT_META[c].emoji : "\u{1F4C5}"; };
  const cands = [];
  gcalToday.filter(ev => !ev.allDay).forEach(ev => {
    const s2 = new Date(ev.start), e2 = new Date(ev.end);
    const st = s2.getHours() * 60 + s2.getMinutes();
    cands.push({ t: st, e: Math.max(e2.getHours() * 60 + e2.getMinutes(), st + 15), label: `${srcEmoji(ev)} ${ev.title}` });
  });
  todaysBlocks().forEach(b => cands.push({ t: toMin(b.start), e: toMin(b.start) + b.dur, label: `\u{1F9F1} ${b.label}` }));
  todaysTimedTasks().forEach(t => cands.push({ t: toMin(t.time), e: toMin(t.time) + 60, label: `${PRI_EMOJI[t.pri] || "\u{1F3AF}"} ${t.text}` }));
  cands.sort((a, b) => a.t - b.t);
  const current = cands.find(c => nowMin >= c.t && nowMin < c.e);
  const next = cands.find(c => c.t > nowMin);
  let htmlOut;
  if (current && next) {
    htmlOut = `\u23F1 <strong>Right now:</strong> ${esc(current.label)} \u00b7 until ${fmtTime(toHHMM(current.e))} \u2192 next up ${fmtTime(toHHMM(next.t))}: ${esc(next.label)}`;
  } else if (current) {
    htmlOut = `\u23F1 <strong>Right now:</strong> ${esc(current.label)} \u00b7 until ${fmtTime(toHHMM(current.e))}`;
  } else if (next) {
    htmlOut = `\u23F3 <strong>Up next</strong> ${fmtTime(toHHMM(next.t))}: ${esc(next.label)}`;
  } else {
    let ahead = null;
    if (typeof gcalEventsOn === "function") {
      for (let d = 1; d <= 14 && !ahead; d++) {
        const dt = new Date(); dt.setDate(dt.getDate() + d);
        const evs = gcalEventsOn(localDateStr(dt)).slice().sort((a, b) => new Date(a.start) - new Date(b.start));
        if (evs.length) ahead = evs[0];
      }
    }
    if (ahead) {
      const sd = new Date(ahead.start);
      const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][sd.getDay()];
      const tpart = ahead.allDay ? "all day" : fmtTime(toHHMM(sd.getHours() * 60 + sd.getMinutes()));
      htmlOut = `\u{1F5D3} Open now \u00b7 next on the calendar ${wd} ${tpart}: ${srcEmoji(ahead)} ${esc(ahead.title)}`;
    } else {
      htmlOut = `\u23F3 Open window \u00b7 nothing on the schedule for the next two weeks`;
    }
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
  const today = localDateStr();
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
    const markOn = () => { remindBtn.textContent = "🔔 Reminders On"; };
    if (typeof Notification !== "undefined" && Notification.permission === "granted") markOn();
    remindBtn.addEventListener("click", () => {
      if (typeof Notification === "undefined") {
        cosmicAlert("🔔 No Phone Alerts", "Your browser cannot do push reminders. The on-page bell still fires while the planner is open.");
        return;
      }
      Notification.requestPermission().then(p => {
        if (p === "granted") { markOn(); cosmicAlert("🔔 Reminders On", "Your phone will buzz at each block and timed task. Cosmic punctuality, unlocked."); }
        else remindBtn.textContent = "🔔 Enable Reminders";
      });
    });
  }
});
// ---- event detail modal (click any calendar event anywhere in the planner) ----
function gcalDetailRange(ev) {
  // Google's live API nests times ({dateTime}/{date}); the sync cache stores flat strings
  const st = ev.start, en = ev.end || st;
  const sStr = typeof st === "string" ? st : (st && (st.dateTime || st.date));
  const eStr = typeof en === "string" ? en : (en && (en.dateTime || en.date));
  const isAllDay = ev.allDay != null ? !!ev.allDay : !!(st && st.date && !st.dateTime);
  const fmtD = d => d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const t = d => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const s = new Date(sStr), e = new Date(eStr);
  if (isAllDay) {
    const endDay = new Date(new Date(eStr).getTime() - 86400000);
    return eStr && endDay.toISOString().slice(0, 10) !== String(sStr).slice(0, 10)
      ? `${fmtD(s)} \u2013 ${fmtD(endDay)} (all day)` : `${fmtD(s)} (all day)`;
  }
  const sameDay = s.toDateString() === e.toDateString();
  return sameDay ? `${fmtD(s)} \u00b7 ${t(s)} \u2013 ${t(e)}` : `${fmtD(s)} ${t(s)} \u2013 ${fmtD(e)} ${t(e)}`;
}

function ensureEventModal() {
  if (document.getElementById("evDetailOverlay")) return;
  document.body.insertAdjacentHTML("beforeend", `
    <div id="evDetailOverlay" class="ev-overlay hidden">
      <div class="ev-modal">
        <button class="ev-close" aria-label="Close">\u2715</button>
        <div id="evDetailBody"></div>
      </div>
    </div>`);
  const ov = document.getElementById("evDetailOverlay");
  ov.addEventListener("click", e => { if (e.target === ov) ov.classList.add("hidden"); });
  ov.querySelector(".ev-close").addEventListener("click", () => ov.classList.add("hidden"));
  document.addEventListener("keydown", e => { if (e.key === "Escape") ov.classList.add("hidden"); });
}

function renderCalEventPanels() {
  ["selfcare", "garden", "social", "marriage", "work", "bills", "jobs"].forEach(cat => {
    const box = document.getElementById(`calEvents-${cat}`);
    if (!box) return;
    const meta = EV_CAT_META[cat];
    const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
    const today = localDateStr();
    const list = (typeof GCAL !== "undefined" ? GCAL.events : [])
      .filter(ev => evCat(ev) === cat && ev.start.slice(0, 10) >= today)
      .sort((a, b) => new Date(a.start) - new Date(b.start))
      .slice(0, 8);
    box.innerHTML = list.length ? list.map(ev => {
      const when = ev.allDay
        ? new Date(ev.start).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
        : `${new Date(ev.start).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} \u00b7 ${gcalRange(ev)}`;
      return `<span class="hour-chip gcal-detail" data-cal="${esc(ev.calId)}" data-eid="${esc(ev.id)}" data-cached="${encodeURIComponent(JSON.stringify(ev))}" title="Show details">${meta.emoji} ${esc(ev.title)}<small>${esc(when)}</small></span>`;
    }).join("") : `<span class="helper-text">Nothing tagged ${meta.label.toLowerCase()} yet. Open any \u{1F4C5} event and give it this category.</span>`;
  });
}
window.addEventListener("load", renderCalEventPanels);

async function showEventDetail(calId, eventId, cached) {
  ensureEventModal();
  const body = document.getElementById("evDetailBody");
  document.getElementById("evDetailOverlay").classList.remove("hidden");
  const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const row = (k, v) => v ? `<div class="ev-row"><span class="ev-k">${k}</span><span>${v}</span></div>` : "";
  const EV_CAT_ORDER = ["bills", "selfcare", "garden", "social", "work", "jobs", "marriage"];
  const catOptions = sel => `<option value="">\u2014 none \u2014</option>` +
    EV_CAT_ORDER.map(k => {
      const m = EV_CAT_META[k];
      const lab = k === "marriage" ? `${m.emoji} ${m.label} (Tony\u2019s calendar)` : `${m.emoji} ${m.label}`;
      return `<option value="${k}" ${k === sel ? "selected" : ""}>${lab}</option>`;
    }).join("");
  const paint = ev => {
    const who = (ev.attendees || []).map(a => esc(a.email)).join(", ");
    const sel = evCat({ calId, id: ev.id || eventId });
    body.innerHTML = `
      <h3 class="ev-title">${esc(ev.summary || ev.title || "(no title)")}</h3>
      ${row("Calendar", esc(ev._calName))}
      ${row("When", gcalDetailRange(ev))}
      ${row("Where", esc(ev.location))}
      ${row("Who", who)}
      <div class="ev-row"><span class="ev-k">Category</span><select id="evCatSelect" class="ev-cat-select">${catOptions(sel)}</select></div>
      ${ev.description ? `<div class="ev-desc">${esc(ev.description).replace(/\n/g, "<br>")}</div>` : ""}
      ${ev.htmlLink ? `<a class="ev-link" href="${ev.htmlLink}" target="_blank" rel="noopener">Open in Google Calendar \u2197</a>` : ""}`;
    const sel_el = body.querySelector("#evCatSelect");
    if (sel_el) sel_el.addEventListener("change", e2 => setEvCat(calId, ev.id || eventId, e2.target.value));
  };
  const note = html => body.insertAdjacentHTML("beforeend", `<div class="ev-note">${html}</div>`);
  const reconBtn = `<button class="ev-reconnect" data-reconnect>Connect calendar</button>`;

  if (cached && cached.title) paint({ ...cached, _calName: cached.calName });
  else body.innerHTML = `<p class="ev-loading">Loading event details...</p>`;

  const hasToken = typeof GCAL !== "undefined" && !!GCAL.token;
  if (hasToken && calId && eventId) {
    try {
      // recurring instances carry a _YYYYMMDD suffix; the base event holds the details
      const baseId = String(eventId).replace(/_\d{8}$/, "");
      const ev = await gcalApi(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events/${encodeURIComponent(baseId)}`);
      paint({ ...ev, _calName: (cached && cached.calName) || (ev.organizer && ev.organizer.email) });
    } catch (e) {
      note(`${cached ? "That\u2019s the basics from your last sync." : "Couldn\u2019t load details."} Your calendar session may have expired. ${reconBtn}, then tap the event again.`);
    }
  } else if (!hasToken) {
    note(`${cached ? "Showing basics from your last sync. " : ""}${reconBtn} for the full record, then tap the event again.`);
  } else {
    note("Couldn\u2019t identify this event. Try Force Sync, then tap it again.");
  }
}

let lastDetail = null;
document.addEventListener("click", e => {
  const btn = e.target.closest("[data-reconnect]");
  if (btn) {
    e.preventDefault();
    e.stopPropagation();
    if (typeof connectGcal !== "function") return;
    connectGcal();
    const started = Date.now();
    const poll = setInterval(() => {
      if (typeof GCAL !== "undefined" && GCAL.token) {
        clearInterval(poll);
        if (lastDetail) showEventDetail(lastDetail.cal, lastDetail.eid, lastDetail.cached);
      } else if (Date.now() - started > 20000) clearInterval(poll);
    }, 500);
    return;
  }
  const el = e.target.closest(".gcal-detail");
  if (!el) return;
  e.preventDefault();
  e.stopPropagation();
  const parsed = el.dataset.cached ? JSON.parse(decodeURIComponent(el.dataset.cached)) : null;
  lastDetail = { cal: el.dataset.cal, eid: el.dataset.eid, cached: parsed };
  showEventDetail(el.dataset.cal, el.dataset.eid, parsed);
});

// Focus Session wiring
document.addEventListener("click", e => {
  if (e.target.closest("#focusPullBtn")) startFocusSess();
  else if (e.target.closest("#focusToggleBtn")) {
    if (focusSess) (focusSess.running ? pauseFocusSess(false) : resumeFocusSess());
  } else if (e.target.closest("#focusFinishBtn")) finishFocusSess();
  else if (e.target.closest("#focusDiscardBtn")) discardFocusSess();
});
document.addEventListener("change", e => {
  if (e.target.id === "focusEst" && focusSess) {
    focusSess.estMin = Math.max(1, Number(e.target.value) || 25);
    saveFocusSess();
  }
});
if (typeof saveTasks === "function") { const _st = saveTasks; saveTasks = function (...a) { const r = _st.apply(this, a); refreshFocusPicker(); return r; }; }
setInterval(() => { if (focusSess && focusSess.running) updateFocusClock(); }, 1000);
refreshFocusPicker();
renderFocusSess();
