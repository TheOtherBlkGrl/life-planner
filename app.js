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

  tasks = tasks.map(t => (t.id === id ? { ...t, col: targetCol } : t));
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

      card.innerHTML = `
        <span>${task.text}</span>
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
  bills = bills.map(b => (b.id === id ? { ...b, paid: !b.paid } : b));
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

    tasks.push({ id: Date.now(), text: input.value.trim(), col: targetCol });
    input.value = "";
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
