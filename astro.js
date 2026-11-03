// --- ASTRO ENGINE: real ephemeris math (low-precision, sign-accurate) ---
const SIGNS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const SIGN_GLYPH = ["\u2648","\u2649","\u264A","\u264B","\u264C","\u264D","\u264E","\u264F","\u2650","\u2651","\u2652","\u2653"];
const PLANET_GLYPH = { Sun: "\u2609", Moon: "\u263D", Mercury: "\u263F", Venus: "\u2640", Mars: "\u2642", Jupiter: "\u2643", Saturn: "\u2644", Uranus: "\u2645", Neptune: "\u2646", Pluto: "\u2647" };

// Schlyter day number: d = ms/86400000 - 10956.0
function schlyterD(ms) { return ms / 86400000 - 10956.0; }

function rev(x) { return ((x % 360) + 360) % 360; }

function eccAnom(M, e) {
  M = rev(M);
  let E = M + (e / 2) * (1 + Math.cos(M * Math.PI / 180));
  for (let k = 0; k < 20; k++) {
    E = E - (E - e * Math.sin(E * Math.PI / 180) - M) / (1 - e * Math.cos(E * Math.PI / 180));
  }
  return E;
}

function helioRect(d, el) {
  const N = rev(el.N[0] + el.N[1] * d);
  const i = el.i;
  const w = rev(el.w[0] + el.w[1] * d);
  const a = el.a;
  const e = el.e[0] + el.e[1] * d;
  const M = el.M[0] + el.M[1] * d;
  const E = eccAnom(M, e);
  const xv = a * (Math.cos(E * Math.PI / 180) - e);
  const yv = a * Math.sqrt(1 - e * e) * Math.sin(E * Math.PI / 180);
  const v = Math.atan2(yv, xv) * 180 / Math.PI;
  const r = Math.sqrt(xv * xv + yv * yv);
  const Nw = (N + w) * Math.PI / 180;
  const iv = i * Math.PI / 180;
  const vv = v * Math.PI / 180;
  return [
    r * (Math.cos(Nw) * Math.cos(vv) - Math.sin(Nw) * Math.sin(vv) * Math.cos(iv)),
    r * (Math.sin(Nw) * Math.cos(vv) + Math.cos(Nw) * Math.sin(vv) * Math.cos(iv)),
    r * Math.sin(vv) * Math.sin(iv)
  ];
}

function sunLon(d) {
  const w = 282.9404 + 4.70935e-5 * d;
  const e = 0.016709 - 1.151e-9 * d;
  const M = 356.0470 + 0.9856002585 * d;
  const E = eccAnom(M, e);
  const xv = Math.cos(E * Math.PI / 180) - e;
  const yv = Math.sqrt(1 - e * e) * Math.sin(E * Math.PI / 180);
  return rev(Math.atan2(yv, xv) * 180 / Math.PI + w);
}

function moonLon(d) {
  const el = { N: [125.1228, -0.0529538083], i: 5.1454, w: [318.0634, 0.1643573223], a: 60.2666, e: [0.0549, 0], M: [115.3654, 13.0649929509] };
  const [xh, yh] = helioRect(d, el);
  return rev(Math.atan2(yh, xh) * 180 / Math.PI);
}

const ELS = {
  Mercury: { N: [48.3313, 3.24587e-5], i: 7.0047, w: [29.1241, 1.01444e-5], a: 0.387098, e: [0.205635, 5.59e-10], M: [168.6562, 4.0923344368] },
  Venus:   { N: [76.6799, 2.46590e-5], i: 3.3946, w: [54.3910, 2.13867e-5], a: 0.723330, e: [0.006773, -1.32e-9], M: [48.0052, 1.6021302244] },
  Mars:    { N: [49.5574, 2.11081e-5], i: 1.8497, w: [286.5016, 2.92961e-5], a: 1.523688, e: [0.093405, 9.2e-9], M: [18.6021, 0.5240207766] },
  Jupiter: { N: [100.4542, 2.76854e-5], i: 1.3030, w: [273.8777, 1.64505e-5], a: 5.20256, e: [0.048498, 4.35e-9], M: [19.8950, 0.0830853001] },
  Saturn:  { N: [113.6634, 2.38980e-5], i: 2.4886, w: [339.3939, 1.08667e-5], a: 9.55475, e: [0.055546, -9.499e-9], M: [316.9670, 0.0334442282] },
  Uranus:  { N: [74.0005, 1.3978e-5], i: 0.7733, w: [96.6612, 3.0565e-5], a: 19.18171, e: [0.047318, 7.45e-9], M: [142.5902, 0.0117258064] },
  Neptune: { N: [131.7806, 3.0173e-5], i: 1.7700, w: [272.8461, -6.027e-6], a: 30.05826, e: [0.008606, 2.15e-9], M: [260.2471, 0.0059951470] },
  Pluto:   { N: [110.3063, 3.39e-6], i: 17.1412, w: [113.7633, 0], a: 39.48169, e: [0.248808, 0], M: [256.5940, 0.003979] }
};

function planetLon(d, name) {
  const [xs, ys] = helioRect(d, ELS[name]);
  const lonS = sunLon(d);
  const M = 356.0470 + 0.9856002585 * d;
  const rS = 1.00014 - 0.01671 * Math.cos(M * Math.PI / 180) - 0.00014 * Math.cos(2 * M * Math.PI / 180);
  const xg = xs + rS * Math.cos(lonS * Math.PI / 180);
  const yg = ys + rS * Math.sin(lonS * Math.PI / 180);
  return rev(Math.atan2(yg, xg) * 180 / Math.PI);
}

function allPositions(ms) {
  const d = schlyterD(ms);
  const out = { Sun: { lon: sunLon(d) }, Moon: { lon: moonLon(d) } };
  for (const name of Object.keys(ELS)) {
    const lon = planetLon(d, name);
    const lonNext = planetLon(d + 0.5, name);
    const move = rev(lonNext - lon);
    out[name] = { lon, retro: move > 300 };
  }
  return out;
}

function signStr(lon) {
  const idx = Math.floor(lon / 30) % 12;
  return `${SIGN_GLYPH[idx]} ${SIGNS[idx]} ${Math.floor(lon % 30)}\u00B0`;
}

// --- HER NATAL CHART: born Aug 1, 1987 (12:00 UT anchor; Sun/Moon verified) ---
const NATAL_D = -4534.5;
const NATAL = (() => {
  const d = NATAL_D;
  const n = { Sun: sunLon(d), Moon: moonLon(d) };
  for (const name of Object.keys(ELS)) n[name] = planetLon(d, name);
  n.Asc = 45; // Taurus rising, degree approximate
  return n;
})();
const NATAL_LABEL = { Sun: "your Leo Sun", Moon: "your Libra Moon", Asc: "your Taurus Rising" };

const ASPECTS = [
  { name: "conjunction", angle: 0, orb: 8, cls: "conj" },
  { name: "sextile", angle: 60, orb: 4, cls: "soft" },
  { name: "square", angle: 90, orb: 6, cls: "hard" },
  { name: "trine", angle: 120, orb: 6, cls: "soft" },
  { name: "opposition", angle: 180, orb: 8, cls: "hard" }
];

const ASPECT_GLYPH = { conjunction: "\u260C", sextile: "\u2736", square: "\u25A1", trine: "\u25B3", opposition: "\u260D" };

function sepDeg(a, b) {
  let s = Math.abs(a - b) % 360;
  return s > 180 ? 360 - s : s;
}

function findAspects(ms) {
  const sky = allPositions(ms);
  const hits = [];
  for (const p of Object.keys(sky)) {
    for (const natalName of ["Sun", "Moon", "Asc"]) {
      const sep = sepDeg(sky[p].lon, NATAL[natalName]);
      for (const a of ASPECTS) {
        const diff = Math.abs(sep - a.angle);
        if (diff <= a.orb) {
          hits.push({ planet: p, natal: natalName, aspect: a.name, cls: a.cls, orb: diff, retro: sky[p].retro });
          break;
        }
      }
    }
  }
  hits.sort((x, y) => x.orb - y.orb);
  return hits;
}

const PLANET_ADVICE = {
  Sun: { conj: "Main-character day: put your name on the visible thing.", hard: "Ego vs. reality check: separate what you want from what is expected of you.", soft: "Charisma runs high: use it on the call, the pitch, the ask." },
  Moon: { conj: "Feelings are loud and useful today: they are pointing at something real.", hard: "Mood pressure: keep a sensory reset on hand and do not decide anything heavy on an empty stomach.", soft: "Emotional flow: good day for honest conversations and cozy focus." },
  Mercury: { conj: "Razor-sharp mind: write, plan, negotiate.", hard: "Comms friction: reread messages before sending and confirm times twice.", soft: "Conversations open doors: reach out to the person you have been meaning to." },
  Venus: { conj: "Magnetism high: good day for money moves and beauty.", hard: "Money and relationship tension: no impulse buys, check the bill list before swiping.", soft: "Pleasure and pay mix: negotiate, order the good coffee, take the long bath." },
  Mars: { conj: "Engine full: attack the hardest block first.", hard: "Friction high: your patience is a finite resource, budget it. Move your body to burn the extra.", soft: "Momentum without burnout: start the thing you have been circling." },
  Jupiter: { conj: "Doors swing open: say yes to the bigger room.", hard: "Overpromise risk: enthusiasm is high, verify details before committing.", soft: "Luck compounds: apply for the stretch role, ask for the extra ten percent." },
  Saturn: { conj: "Structure day: build the system, not just the sprint.", hard: "Reality check: slow is smooth, smooth is fast. Do the boring admin.", soft: "Discipline pays quietly: lock in the routine that will carry you." },
  Uranus: { conj: "Plot-twist potential: leave slack in the schedule.", hard: "Disruption energy: expect the plan to bend, do not panic-pivot.", soft: "Breakthrough weather: the weird idea is the good one." },
  Neptune: { conj: "Dream fuel: script it in the manifestation box.", hard: "Fog warning: read the fine print, sleep on any big decision.", soft: "Intuition runs high: trust the first instinct, make art, rest well." },
  Pluto: { conj: "Depth mode: transformation is on the table.", hard: "Power-struggle energy: do not wrestle what you can walk away from.", soft: "Quiet power: your follow-through intimidates exactly the right people." }
};

const MOON_SIGN_ADVICE = {
  Aries: "Fast, fiery moon: short sprints beat long meetings. Start things, finish later.",
  Taurus: "Steady moon: perfect for deep focus blocks and slow, thorough work.",
  Gemini: "Chatty moon: schedule the calls and catch-ups, expect interruptions.",
  Cancer: "Soft, homey moon: lower the bar on output, raise the bar on care.",
  Leo: "Showtime moon: visible wins, creative work, do the thing you want applause for.",
  Virgo: "Detail moon: admin, lists, cleaning. Your inner Virgo has receipts.",
  Libra: "Harmony moon: decisions feel harder, collaboration feels easier. Book the one-on-ones.",
  Scorpio: "Deep moon: good for hard truths and deep work, bad for small talk.",
  Sagittarius: "Big-picture moon: zoom out, plan the quarter, say yes to adventure.",
  Capricorn: "Boss moon: structure, deadlines, hard conversations. You are built for this one.",
  Aquarius: "Oddball moon: experiment, automate, break your own routine.",
  Pisces: "Dreamy moon: protect focus, watch the fine print, make space for art."
};

function moonPhaseName(ms) {
  const d = schlyterD(ms);
  const elong = rev(moonLon(d) - sunLon(d));
  if (elong < 22.5 || elong >= 337.5) return ["🌑", "New Moon"];
  if (elong < 67.5) return ["🌒", "Waxing Crescent"];
  if (elong < 112.5) return ["🌓", "First Quarter"];
  if (elong < 157.5) return ["🌔", "Waxing Gibbous"];
  if (elong < 202.5) return ["🌕", "Full Moon"];
  if (elong < 247.5) return ["🌖", "Waning Gibbous"];
  if (elong < 292.5) return ["🌗", "Last Quarter"];
  return ["🌘", "Waning Crescent"];
}

function noonLocalMs(offsetDays) {
  const n = new Date();
  n.setHours(12, 0, 0, 0);
  return n.getTime() + offsetDays * 86400000;
}

function aspectLine(h) {
  const ret = h.retro ? " \u211E" : "";
  const key = PLANET_ADVICE[h.planet] ? h.planet : "Sun";
  const advice = PLANET_ADVICE[key][h.cls];
  return {
    head: `${PLANET_GLYPH[h.planet]} ${h.planet}${ret} ${ASPECT_GLYPH[h.aspect]} ${h.aspect} ${NATAL_LABEL[h.natal]}`,
    detail: `orb ${h.orb.toFixed(1)}\u00B0 \u00b7 ${advice}`
  };
}

function renderAstro() {
  const skyBox = document.getElementById("skyNow");
  const adviceBox = document.getElementById("astroAdvice");
  const weekBox = document.getElementById("astroWeek");
  if (!skyBox) return;

  const now = noonLocalMs(0);
  const sky = allPositions(now);
  const [phaseEmoji, phaseName] = moonPhaseName(now);

  skyBox.innerHTML = `
    <div class="astro-moonline">${phaseEmoji} <strong>${phaseName}</strong> \u00b7 Moon in ${signStr(sky.Moon.lon)}</div>
    <div class="astro-skyrow">${Object.keys(sky).map(p =>
      `<span class="sky-chip">${PLANET_GLYPH[p]} ${p} ${sky[p].retro ? "\u211E" : ""} in ${signStr(sky[p].lon)}</span>`).join("")}</div>`;

  const hits = findAspects(now);
  const hard = hits.filter(h => h.cls === "hard");
  const soft = hits.filter(h => h.cls === "soft");

  const lines = [];
  if (hard.length) lines.push(`\u26A0\uFE0F ${aspectLine(hard[0]).detail.replace(/^[^:]*\u00b7 /, "")}`);
  if (soft.length) lines.push(`\u2728 ${aspectLine(soft[0]).detail.replace(/^[^:]*\u00b7 /, "")}`);
  const moonSign = SIGNS[Math.floor(sky.Moon.lon / 30) % 12];
  lines.push(`🌙 ${MOON_SIGN_ADVICE[moonSign]}`);
  if (hard.length >= 2) lines.push("Multiple pressure aspects: keep today's schedule loose and stack low-spoon wins in the gaps.");
  adviceBox.innerHTML = lines.map(l => `<div class="astro-advice-line">${l}</div>`).join("");

  // week ahead
  const cards = [];
  for (let i = 0; i < 7; i++) {
    const ms = noonLocalMs(i);
    const s = allPositions(ms);
    const dayHits = findAspects(ms);
    const [pe, pn] = moonPhaseName(ms);
    const mSign = SIGNS[Math.floor(s.Moon.lon / 30) % 12];
    const notable = dayHits.slice(0, 2).map(h =>
      `${PLANET_GLYPH[h.planet]}${h.retro ? "\u211E" : ""} ${ASPECT_GLYPH[h.aspect]} ${NATAL_LABEL[h.natal].replace("your ", "")}`);
    const preps = [];
    if (notable.length) preps.push(notable.join(", "));
    const dayHard = dayHits.filter(h => h.cls === "hard").length;
    preps.push(dayHard >= 2 ? "light load, heavy rest" : (dayHard === 1 ? "one friction point, plan around it" : "green light day"));
    const date = new Date(ms);
    cards.push(`
      <div class="astro-day-card${i === 0 ? " astro-today" : ""}">
        <div class="astro-day-head">${date.toLocaleDateString("en-US", { weekday: "short" })} ${date.getDate()}</div>
        <div class="astro-day-moon">${pe} ${mSign}</div>
        <div class="astro-day-note">${preps.join(" \u00b7 ")}</div>
      </div>`);
  }
  weekBox.innerHTML = cards.join("");
}

// --- 3-DAY HOROSCOPE: yesterday / today / tomorrow, rolls over at local midnight ---
const HORO_ELEM = { Aries: "fire", Leo: "fire", Sagittarius: "fire", Taurus: "earth", Virgo: "earth", Capricorn: "earth", Gemini: "air", Libra: "air", Aquarius: "air", Cancer: "water", Scorpio: "water", Pisces: "water" };
const HORO_ELEM_LINE = {
  fire: "a fire kind of day: momentum favors moving first",
  earth: "an earth kind of day: steady hands win",
  air: "an air kind of day: talk, ideas and errands move fast",
  water: "a water kind of day: lead with feel, back it with facts"
};

function horoReadingFor(ms) {
  const sky = allPositions(ms);
  const [pe, pn] = moonPhaseName(ms);
  const moonSign = SIGNS[Math.floor(sky.Moon.lon / 30) % 12];
  const elemLine = HORO_ELEM_LINE[HORO_ELEM[moonSign]];
  const parts = [`${pe} <strong>${pn}</strong> \u00b7 Moon in ${moonSign}, making it ${elemLine}.`];
  const hits = findAspects(ms);
  if (!hits.length) {
    parts.push("No strong transits touch your chart today, so the day is mostly yours to steer.");
  } else {
    for (const h of hits.slice(0, 2)) {
      const line = aspectLine(h);
      parts.push(`<span class="horo-aspect ${h.cls}">${line.head}</span><br>${line.detail}`);
    }
    if (hits.slice(0, 2).some(h => h.cls === "hard")) {
      parts.push("Take the friction as information, not a stop sign.");
    } else {
      parts.push("Easy sky. Cash in on it.");
    }
  }
  return parts.join(" ");
}

function localDayKey() {
  const d = new Date();
  return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
}

function renderHoroscopes() {
  const box = document.getElementById("horo3day");
  if (!box) return;
  window._horoDayKey = localDayKey();
  const defs = [
    { off: -1, label: "Yesterday", cls: "" },
    { off: 0, label: "Today", cls: " horo-today" },
    { off: 1, label: "Tomorrow", cls: "" }
  ];
  box.innerHTML = defs.map(({ off, label, cls }) => {
    const ms = noonLocalMs(off);
    const date = new Date(ms);
    return `
      <div class="horo-card${cls}">
        <div class="horo-head">${label} \u00b7 ${date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</div>
        <div class="horo-body">${horoReadingFor(ms)}</div>
      </div>`;
  }).join("");
}

document.addEventListener("DOMContentLoaded", () => {
  renderAstro();
  renderHoroscopes();
  setInterval(() => {
    if (localDayKey() !== window._horoDayKey) { renderAstro(); renderHoroscopes(); }
  }, 60 * 1000);
  setInterval(renderAstro, 10 * 60 * 1000);
});
