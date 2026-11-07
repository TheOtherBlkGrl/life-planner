// --- GOOGLE CALENDAR SYNC (read-only, client-side OAuth) ---
// Auto-refreshes every 15 minutes once connected. "Force Sync" re-pulls instantly.
// Events merge into the Today hourly sheet, the Right Now banner, and the Week grid.

const GCAL = {
  token: null,
  calendars: JSON.parse(localStorage.getItem("ccc_gcal_cals")) || [],
  events: JSON.parse(localStorage.getItem("ccc_gcal_events")) || [],
  fetchedAt: Number(localStorage.getItem("ccc_gcal_at")) || 0,
  timer: null,
  reauthing: false
};

function gcalCfg() { return (window.PLANNER_CAL_CFG || {}).clientId || ""; }

function gcalHeaders() {
  return { Authorization: `Bearer ${GCAL.token}` };
}

async function gcalApi(url) {
  const res = await fetch(url, { headers: gcalHeaders() });
  if (res.status === 401) {
    // token expired: drop it, user clicks sync again (browser gesture) to re-auth silently
    GCAL.token = null;
    sessionStorage.removeItem("ccc_gcal_token");
    setSyncStatus("Auto-sync paused: sign-in expired, tap Force Sync to reconnect.");
    throw new Error("unauthorized");
  }
  if (!res.ok) throw new Error(`google api ${res.status}`);
  return res.json();
}

function setSyncStatus(text) {
  const el = document.getElementById("syncStatus");
  if (el) el.textContent = text;
}

function syncStatusText() {
  if (!GCAL.fetchedAt) return "";
  const mins = Math.round((Date.now() - GCAL.fetchedAt) / 60000);
  return mins <= 0 ? "synced just now" : `synced ${mins} min ago`;
}

function refreshSyncStatus() {
  setSyncStatus(syncStatusText());
  const n = GCAL.events.length;
  if (n) setSyncStatus(`${syncStatusText()} \u00b7 ${n} events loaded`);
}

// --- OAuth connect ---
function connectGcal() {
  const clientId = gcalCfg();
  if (!clientId) {
    cosmicAlert("📅 Calendar Sync Not Set Up Yet", "This needs a one-time Google Cloud OAuth client ID. Ask Fo: she has the walkthrough and will wire it in.");
    return;
  }
  const saved = sessionStorage.getItem("ccc_gcal_token");
  if (saved) { GCAL.token = saved; fetchAllCalendars(); return; }

  const client = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: "https://www.googleapis.com/auth/calendar.readonly",
    callback: (resp) => {
      if (resp.access_token) {
        GCAL.token = resp.access_token;
        sessionStorage.setItem("ccc_gcal_token", resp.access_token);
        fetchAllCalendars();
      }
    },
    error_callback: () => cosmicAlert("📅 Sign-In Closed", "No worries, the calendar stays local until you connect.")
  });
  client.requestAccessToken({ prompt: "" });
}

// --- calendar list + picker ---
async function fetchCalendarList() {
  const data = await gcalApi("https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader");
  // keep previous selections; anything NEW defaults ON (auto-include calendars shared with her)
  // except Google's own system calendars (holidays, birthdays, weather), which stay off
  const prevSel = JSON.parse(localStorage.getItem("ccc_gcal_sel")) || null;
  GCAL.calendars = data.items.map(c => {
    const known = prevSel && (c.id in prevSel);
    const def = known ? prevSel[c.id] : !c.id.includes("group.v.calendar.google.com");
    return { id: c.id, summary: c.summary || c.id, primary: !!c.primary, selected: def };
  });
  localStorage.setItem("ccc_gcal_cals", JSON.stringify(GCAL.calendars));
  localStorage.setItem("ccc_gcal_sel", JSON.stringify(Object.fromEntries(GCAL.calendars.map(c => [c.id, c.selected]))));
  renderCalPicker();
}

function renderCalPicker() {
  const box = document.getElementById("calPicker");
  if (!box) return;
  box.classList.remove("hidden");
  box.querySelector("div").innerHTML = GCAL.calendars.map(c =>
    `<label class="cal-pick"><input type="checkbox" data-cal="${c.id}" ${c.selected ? "checked" : ""} onchange="toggleCal('${c.id.replace(/'/g, "")}', this.checked)" /> ${c.summary}${c.primary ? " (primary)" : ""}</label>`
  ).join("");
}

function toggleCal(id, on) {
  GCAL.calendars = GCAL.calendars.map(c => (c.id === id ? { ...c, selected: on } : c));
  localStorage.setItem("ccc_gcal_sel", JSON.stringify(Object.fromEntries(GCAL.calendars.map(c => [c.id, c.selected]))));
  fetchAllCalendars();
}

// --- events ---
async function fetchAllCalendars() {
  if (!GCAL.token) { connectGcal(); return; }
  try {
    await fetchCalendarList(); // refresh the list every sync: new shares show up, picker stays visible
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const timeMin = monday.toISOString();
    const timeMax = new Date(monday.getTime() + 21 * 86400000).toISOString();

    const selected = GCAL.calendars.filter(c => c.selected);
    const all = [];
    for (const cal of selected) {
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=250`;
      const data = await gcalApi(url);
      (data.items || []).forEach(ev => {
        const allDay = !ev.start.dateTime;
        all.push({
          id: ev.id,
          calId: cal.id,
          title: ev.summary || "(no title)",
          start: allDay ? ev.start.date : ev.start.dateTime,
          end: allDay ? ev.end.date : (ev.end.dateTime || ev.start.dateTime),
          allDay,
          calName: cal.summary
        });
      });
    }
    GCAL.events = all;
    GCAL.fetchedAt = Date.now();
    localStorage.setItem("ccc_gcal_events", JSON.stringify(all));
    localStorage.setItem("ccc_gcal_at", String(GCAL.fetchedAt));
    document.getElementById("gcalSyncBtn").classList.remove("hidden");
    refreshSyncStatus();
    renderHourly();
    renderWeek();
    if (typeof renderCalEventPanels === "function") renderCalEventPanels();
    if (typeof renderBlocks === "function") renderBlocks();
  } catch (e) {
    if (e.message !== "unauthorized") setSyncStatus("sync failed, try Force Sync");
  }
}

function startAutoSync() {
  if (GCAL.timer) clearInterval(GCAL.timer);
  GCAL.timer = setInterval(() => {
    if (GCAL.token) { fetchAllCalendars(); return; }
    // token died (Google access tokens expire ~1h): re-auth silently, no popup
    if (GCAL.calendars.length && gcalCfg()) silentReauth();
  }, 15 * 60 * 1000); // every 15 minutes

  // catch the sleep/laptop-closed case: the moment she returns to the tab, refresh
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    if (GCAL.token) fetchAllCalendars();
    else if (GCAL.calendars.length && gcalCfg()) silentReauth();
  });
}

// silently mint a fresh token for an already-authorized session (prompt:"").
// if Google still demands a click, error_callback just updates the status text.
function silentReauth() {
  if (GCAL.reauthing) return;
  GCAL.reauthing = true;
  try {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: gcalCfg(),
      scope: "https://www.googleapis.com/auth/calendar.readonly",
      callback: (resp) => {
        GCAL.reauthing = false;
        if (resp.access_token) {
          GCAL.token = resp.access_token;
          sessionStorage.setItem("ccc_gcal_token", resp.access_token);
          fetchAllCalendars();
        }
      },
      error_callback: () => {
        GCAL.reauthing = false;
        setSyncStatus("Auto-sync paused: calendar sign-in expired, tap Force Sync.");
      }
    });
    client.requestAccessToken({ prompt: "" });
  } catch (e) {
    GCAL.reauthing = false;
  }
}

// --- helpers for the rest of the planner ---
function gcalEventsOn(dateStr) {
  return GCAL.events.filter(ev => (ev.allDay ? ev.start.slice(0, 10) === dateStr : ev.start.slice(0, 10) === dateStr));
}

function gcalRange(ev) {
  if (ev.allDay) return "";
  const s = new Date(ev.start);
  const e = new Date(ev.end);
  const fmt = d => `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${fmt(s)}\u2013${e.getDate() !== s.getDate() ? "+" : fmt(e)}`;
}

// --- init ---
document.addEventListener("DOMContentLoaded", () => {
  const connectBtn = document.getElementById("gcalConnectBtn");
  const syncBtn = document.getElementById("gcalSyncBtn");

  connectBtn.addEventListener("click", connectGcal);
  syncBtn.addEventListener("click", fetchAllCalendars);

  if (!gcalCfg()) {
    connectBtn.textContent = "📅 Connect Calendar (setup needed)";
    return;
  }
  if (GCAL.events.length) {
    syncBtn.classList.remove("hidden");
    refreshSyncStatus();
    renderHourly();
    renderWeek();
  }
  if (GCAL.calendars.length) renderCalPicker(); // picker visible from cache immediately, no reconnect needed
  startAutoSync();
});
