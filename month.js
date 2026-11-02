// --- MONTH VIEW: Sun-Sat grid, tasks due + calendar events per day ---
let monthOffset = 0;

function localKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function gcalEventsLocal(key) {
  const evs = (typeof GCAL !== "undefined" && GCAL.events) || [];
  return evs.filter(ev => {
    const d = ev.allDay ? new Date(`${ev.start}T12:00:00`) : new Date(ev.start);
    return localKey(d) === key;
  });
}

function renderMonth() {
  const grid = document.getElementById("monthGrid");
  if (!grid) return;
  const base = new Date();
  base.setDate(1);
  base.setMonth(base.getMonth() + monthOffset);
  const y = base.getFullYear(), m = base.getMonth();
  document.getElementById("monthTitle").textContent =
    base.toLocaleString("en-US", { month: "long", year: "numeric" });

  const start = new Date(y, m, 1 - new Date(y, m, 1).getDay()); // Sunday-first
  const todayKey = localKey(new Date());
  let html = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    .map(d => `<div class="month-dow">${d}</div>`).join("");

  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = localKey(d);
    const out = d.getMonth() !== m;
    const chips = [];
    gcalEventsLocal(key).slice(0, 3).forEach(ev =>
      chips.push(`<span class="month-chip gcal gcal-detail" data-cal="${ev.calId.replace(/"/g, "&quot;")}" data-eid="${ev.id.replace(/"/g, "&quot;")}" data-cached="${encodeURIComponent(JSON.stringify(ev))}" title="Show details${ev.title.replace(/"/g, "&quot;")}">📅 ${ev.title}</span>`));
    tasks.filter(t => t.due === key && !["done", "graveyard"].includes(t.col)).slice(0, 3).forEach(t =>
      chips.push(`<span class="month-chip">${t.pri ? PRI_EMOJI[t.pri] + " " : ""}${t.text}</span>`));
    html += `<div class="month-cell${out ? " out" : ""}${key === todayKey ? " today" : ""}">
      <span class="month-day">${d.getDate()}</span>
      ${chips.length ? `<div class="month-chips">${chips.join("")}</div>` : ""}
    </div>`;
  }
  grid.innerHTML = html;
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll('.tab-btn[data-tab="month"]').forEach(b => b.addEventListener("click", renderMonth));
  const prev = document.getElementById("monthPrev");
  const next = document.getElementById("monthNext");
  const today = document.getElementById("monthToday");
  if (prev) prev.addEventListener("click", () => { monthOffset--; renderMonth(); });
  if (next) next.addEventListener("click", () => { monthOffset++; renderMonth(); });
  if (today) today.addEventListener("click", () => { monthOffset = 0; renderMonth(); });
});
