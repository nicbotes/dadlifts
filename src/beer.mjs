// ── BEER TRACKER — shared pure module ────────────────────────────────────────
// Used by the React app (import), the Express server (dynamic import) and the
// CLI. No DOM, no Node APIs — just data in, insights out.
//
// Data lives in the app_state blob:
//   beerLog:      [{ id, ts, tzOff, ml, abv, trigger, note, resisted, swap }]
//   beerCfg:      { ...makeDefaultBeerCfg() }
//   beerInsights: computeBeerInsights(beerLog, beerCfg)  — precalculated on save
//
// Entry semantics
//   ml > 0, resisted false  → a beer was drunk
//   ml = 0, resisted true   → an urge was logged and beaten (swap = what you did instead)
//
// Times: ts is ISO-8601 UTC. tzOff is the device's getTimezoneOffset() in
// minutes at log time, so local hour / local day are reproducible anywhere.

export const BEER_COLOR = "#0D9488";
export const ETHANOL_DENSITY = 0.789;            // g per ml of pure ethanol
export const KCAL_PER_G_ALCOHOL = 7;
export const BEER_CARB_G_PER_100ML = 3.5;        // typical lager — ~4 kcal/g

// Quick-log sizes. "PINT" is 500ml, the usual South African pint.
export const SIZES = [
  { ml:330, label:"330" },
  { ml:440, label:"440" },
  { ml:500, label:"PINT" },
];

export const TRIGGERS = {
  bored:    { label:"Bored",      emoji:"😴", hint:"Boredom is a dopamine dip looking for a quick fix. Give it a slow one: walk, cook, train, call someone." },
  winddown: { label:"After work", emoji:"🏁", hint:"The cue is 'work is over'. Keep the ritual, swap the routine: shower, change clothes, big glass of something cold that isn't beer." },
  thirsty:  { label:"Thirsty",    emoji:"💧", hint:"Thirst rule: 500ml water or sparkling first, wait 15 minutes, then decide." },
  social:   { label:"Social",     emoji:"🍻", hint:"Decide the number before you arrive. Alternate with water. First drink alcohol-free so the 'first sip' ritual is satisfied." },
  stress:   { label:"Stress",     emoji:"😣", hint:"Alcohol dampens stress for 90 minutes and raises cortisol for the next day. Breathe 5 min, lift, or walk it out." },
  craving:  { label:"Craving",    emoji:"🧠", hint:"A craving is a wave: it crests in ~20–30 min then passes whether or not you drink. Start the surf timer." },
};

export const SWAPS = {
  walk:    { label:"Walk",          emoji:"🚶" },
  water:   { label:"Water / fizz",  emoji:"💧" },
  train:   { label:"Train",         emoji:"🏋️" },
  cold:    { label:"Cold shower",   emoji:"🚿" },
  tea:     { label:"Tea / coffee",  emoji:"☕" },
  call:    { label:"Call someone",  emoji:"📞" },
  cook:    { label:"Cook / eat",    emoji:"🍳" },
  read:    { label:"Read / music",  emoji:"🎧" },
  breathe: { label:"Breathe 5 min", emoji:"🧘" },
  sleep:   { label:"Go to bed",     emoji:"🛏️" },
};

export const STD_DRINK_OPTIONS = [
  { g:8,  label:"UK unit · 8g" },
  { g:10, label:"WHO · 10g" },
  { g:12, label:"SA · 12g" },
  { g:14, label:"US · 14g" },
];

// Recovery milestones — days since last drink. Wording is deliberately hedged:
// figures are what the cited studies report for abstinence after regular use.
// What a dry stretch does for a regular, habit-level drinker (not dependence).
// Hedged on purpose: these are what studies report on average.
export const MILESTONES = [
  { days:1,  title:"24 hours", note:"Better sleep tonight. Even 2–3 beers cut deep and REM sleep, which is a big part of why the morning after feels flat." },
  { days:3,  title:"3 days",   note:"The after-work cue starts to weaken when it isn't followed by a beer. Energy, hydration and training recovery are back to normal." },
  { days:7,  title:"1 week",   note:"Proof the evening doesn't need a beer. Expect a craving or two around now; they pass in 20–30 minutes." },
  { days:14, title:"2 weeks",  note:"Two weeks of proper sleep shows up in mood, focus and the gym. The habit loop is loosening." },
  { days:30, title:"1 month",  note:"Dry-month studies report better sleep, energy and blood pressure, and most people drinking less for months afterwards." },
  { days:66, title:"66 days",  note:"The typical time for a new routine to become automatic. A beer is now a choice, not a reflex." },
];

// Signs a habit is turning into something more. Calm, honest, and the point is
// to catch it early — not a diagnosis.
export const CHECK_SIGNS = [
  "You drink most days, or can't unwind without one.",
  "You need more than you used to for the same effect.",
  "You've tried to cut down and it didn't stick.",
  "Mornings bring shakes, sweats or anxiety that a drink settles.",
  "It's causing friction at home, at work or with your health.",
];

// Pace — the body clears roughly one standard drink (~10g) an hour; a 500ml 5%
// beer is ~20g. Faster than about one an hour and it stacks.
export const PACE = { targetMin: 60, fastMin: 45 };

export const LOW_RISK = {
  weeklyG: 112,       // UK CMO / WHO-aligned: ≤14 units (8g) ≈ 112g pure alcohol per week
  bingeG: 60,         // WHO heavy episodic drinking: ≥60g on one occasion
  dailyRunCaution: 4, // 4+ consecutive drinking days → daily-pattern caution
};

// ── DEFAULTS / NORMALISATION ─────────────────────────────────────────────────
// When the afternoon nudge lands (SAST). Must match the first cron in
// .github/workflows/beer-notify.yml, which fires a few minutes earlier.
export const NUDGE_TIME = "16:35";

export function makeDefaultBeerCfg() {
  return {
    sizeMl: 440,         // default quick-log size
    abv: 5,              // % alcohol by volume
    stdDrinkG: 10,       // grams of alcohol per "standard drink"
    weeklyBudgetMl: 0,   // 0 = aiming dry; >0 = tapering budget
    costPerUnit: 0,      // optional, currency-agnostic; 0 hides money stats
    rolloverHour: 4,     // a beer at 01:00 belongs to the previous day
    startDate: null,     // ISO date tracking started (set on first log)
    tzOff: 0,            // device getTimezoneOffset() — kept fresh on save
    notifyTime: NUDGE_TIME, // daily nudge, local time in notifyTz (fixed: set by the workflow schedule)
    notifyTz: "Africa/Johannesburg", // IANA zone the nudge time is read in (SAST)
    nudgeOn: true,       // afternoon nudge
    checkinTime: "19:30",// evening check-in: did you stay dry or have beer?
    checkinOn: true,
  };
}

export function normalizeBeerCfg(raw) {
  var cfg = Object.assign(makeDefaultBeerCfg(), raw || {});
  var num = function(v, d) { var n = Number(v); return Number.isFinite(n) ? n : d; };
  cfg.sizeMl = Math.max(50, num(cfg.sizeMl, 440));
  cfg.abv = Math.min(20, Math.max(0, num(cfg.abv, 5)));
  cfg.stdDrinkG = Math.max(1, num(cfg.stdDrinkG, 10));
  cfg.weeklyBudgetMl = Math.max(0, num(cfg.weeklyBudgetMl, 0));
  cfg.costPerUnit = Math.max(0, num(cfg.costPerUnit, 0));
  cfg.rolloverHour = Math.min(12, Math.max(0, Math.round(num(cfg.rolloverHour, 4))));
  cfg.tzOff = num(cfg.tzOff, 0);
  if (cfg.startDate && !/^\d{4}-\d{2}-\d{2}$/.test(String(cfg.startDate))) cfg.startDate = null;
  cfg.notifyTime = NUDGE_TIME; // the workflow decides when it's sent; older saves said 17:00
  if (!cfg.notifyTz || typeof cfg.notifyTz !== "string") cfg.notifyTz = "Africa/Johannesburg";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(cfg.checkinTime))) cfg.checkinTime = "19:30";
  cfg.nudgeOn = cfg.nudgeOn !== false;
  cfg.checkinOn = cfg.checkinOn !== false;
  return cfg;
}

export function normalizeBeerLog(raw) {
  if (!Array.isArray(raw)) return [];
  var out = [];
  raw.forEach(function(e) {
    if (!e || typeof e !== "object") return;
    var ts = e.ts ? new Date(e.ts) : null;
    if (!ts || isNaN(ts.getTime())) return;
    var ml = Math.max(0, Number(e.ml) || 0);
    var resisted = !!e.resisted || ml === 0;
    out.push({
      id: e.id || (ts.getTime().toString(36) + Math.random().toString(36).slice(2, 6)),
      ts: ts.toISOString(),
      tzOff: Number.isFinite(Number(e.tzOff)) ? Number(e.tzOff) : 0,
      ml: resisted ? 0 : ml,
      abv: Number.isFinite(Number(e.abv)) ? Number(e.abv) : undefined,
      trigger: e.trigger && TRIGGERS[e.trigger] ? e.trigger : (e.trigger || null),
      swap: resisted && e.swap ? e.swap : null,
      note: e.note ? String(e.note).slice(0, 200) : "",
      resisted: resisted,
    });
  });
  out.sort(function(a, b) { return a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0; });
  return out;
}

// Evening check-ins: { "YYYY-MM-DD": "dry" | "drank" } keyed by beer day.
// "dry" = you confirmed a dry evening; "drank" = you logged at check-in.
export function normalizeBeerCheckins(raw) {
  var out = {};
  if (!raw || typeof raw !== "object") return out;
  Object.keys(raw).sort().slice(-400).forEach(function(k) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(k) && (raw[k] === "dry" || raw[k] === "drank")) out[k] = raw[k];
  });
  return out;
}

export function makeEntry(fields, cfg) {
  cfg = normalizeBeerCfg(cfg);
  var now = fields && fields.ts ? new Date(fields.ts) : new Date();
  var tzOff = fields && Number.isFinite(Number(fields.tzOff)) ? Number(fields.tzOff) : cfg.tzOff;
  var resisted = !!(fields && fields.resisted);
  return normalizeBeerLog([{
    id: now.getTime().toString(36) + Math.random().toString(36).slice(2, 6),
    ts: now.toISOString(),
    tzOff: tzOff,
    ml: resisted ? 0 : (fields && fields.ml != null ? Number(fields.ml) : cfg.sizeMl),
    abv: fields && fields.abv != null ? Number(fields.abv) : cfg.abv,
    trigger: fields && fields.trigger || null,
    swap: fields && fields.swap || null,
    note: fields && fields.note || "",
    resisted: resisted,
  }])[0];
}

// ── TIME HELPERS ─────────────────────────────────────────────────────────────
// "Local" = the device-local wall clock at log time, reconstructed from tzOff.
function localDate(iso, tzOff) {
  return new Date(new Date(iso).getTime() - (tzOff || 0) * 60000);
}
function pad2(n) { return (n < 10 ? "0" : "") + n; }
function keyOf(d) { return d.getUTCFullYear() + "-" + pad2(d.getUTCMonth() + 1) + "-" + pad2(d.getUTCDate()); }

// Day key with rollover: subtract rolloverHour so 01:00 counts as "last night".
export function dayKey(iso, tzOff, rolloverHour) {
  var d = localDate(iso, tzOff);
  d = new Date(d.getTime() - (rolloverHour || 0) * 3600000);
  return keyOf(d);
}
export function localHour(iso, tzOff) { return localDate(iso, tzOff).getUTCHours(); }
export function localDow(iso, tzOff, rolloverHour) {
  var d = localDate(iso, tzOff);
  d = new Date(d.getTime() - (rolloverHour || 0) * 3600000);
  return d.getUTCDay(); // 0 = Sunday
}
function addDaysKey(key, n) {
  var p = key.split("-").map(Number);
  var d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + n));
  return keyOf(d);
}
function daysBetweenKeys(a, b) {
  var pa = a.split("-").map(Number), pb = b.split("-").map(Number);
  return Math.round((Date.UTC(pb[0], pb[1] - 1, pb[2]) - Date.UTC(pa[0], pa[1] - 1, pa[2])) / 86400000);
}

// ── ALCOHOL MATHS ────────────────────────────────────────────────────────────
export function gramsAlcohol(ml, abv) { return ml * (abv / 100) * ETHANOL_DENSITY; }
export function kcalBeer(ml, abv) {
  return gramsAlcohol(ml, abv) * KCAL_PER_G_ALCOHOL + (ml / 100) * BEER_CARB_G_PER_100ML * 4;
}

// ── INSIGHTS ─────────────────────────────────────────────────────────────────
// All numbers precalculated so the UI, the agent snapshot and the export never
// have to re-derive them. `now` is optional (ISO or Date) for deterministic tests.
export function computeBeerInsights(rawLog, rawCfg, now, rawCheckins) {
  var cfg = normalizeBeerCfg(rawCfg);
  var log = normalizeBeerLog(rawLog);
  var nowD = now ? new Date(now) : new Date();
  var nowIso = nowD.toISOString();
  var tz = cfg.tzOff;
  var roll = cfg.rolloverHour;
  var todayKey = dayKey(nowIso, tz, roll);

  var drinks = log.filter(function(e) { return !e.resisted && e.ml > 0; });
  var urges = log.filter(function(e) { return e.resisted; });

  // Per-day aggregation (drinks only)
  var byDay = {};
  drinks.forEach(function(e) {
    var k = dayKey(e.ts, e.tzOff, roll);
    var abv = e.abv != null ? e.abv : cfg.abv;
    if (!byDay[k]) byDay[k] = { ml:0, g:0, kcal:0, count:0 };
    byDay[k].ml += e.ml;
    byDay[k].g += gramsAlcohol(e.ml, abv);
    byDay[k].kcal += kcalBeer(e.ml, abv);
    byDay[k].count += 1;
  });

  var firstKey = log.length ? dayKey(log[0].ts, log[0].tzOff, roll) : null;
  var startKey = cfg.startDate || firstKey || todayKey;
  if (daysBetweenKeys(startKey, todayKey) < 0) startKey = todayKey;
  var trackedDays = daysBetweenKeys(startKey, todayKey) + 1;

  // Streaks — a dry day has no drinks. Today counts (in progress) if dry so far.
  var currentStreak = 0;
  for (var k = todayKey; daysBetweenKeys(startKey, k) >= 0; k = addDaysKey(k, -1)) {
    if (byDay[k]) break;
    currentStreak++;
  }
  var longestStreak = 0, run = 0, drinkingRun = 0, longestDrinkingRun = 0;
  for (var i = 0; i < trackedDays; i++) {
    var kk = addDaysKey(startKey, i);
    if (byDay[kk]) { run = 0; drinkingRun++; longestDrinkingRun = Math.max(longestDrinkingRun, drinkingRun); }
    else { run++; drinkingRun = 0; longestStreak = Math.max(longestStreak, run); }
  }
  // Current consecutive drinking days ending today or yesterday
  var currentDrinkingRun = 0;
  for (var k2 = byDay[todayKey] ? todayKey : addDaysKey(todayKey, -1); byDay[k2]; k2 = addDaysKey(k2, -1)) currentDrinkingRun++;

  var lastDrink = drinks.length ? drinks[drinks.length - 1] : null;
  var hoursSinceLast = lastDrink ? Math.max(0, (nowD.getTime() - new Date(lastDrink.ts).getTime()) / 3600000) : null;
  var daysSinceLast = lastDrink ? daysBetweenKeys(dayKey(lastDrink.ts, lastDrink.tzOff, roll), todayKey) : trackedDays;

  // Windows
  // Only days on/after the start date count as tracked — untracked days are neither dry nor drinking.
  function window(days) {
    var out = { ml:0, g:0, kcal:0, drinkingDays:0, dryDays:0, trackedDays:0, count:0 };
    for (var i = 0; i < days; i++) {
      var k = addDaysKey(todayKey, -i);
      if (daysBetweenKeys(startKey, k) < 0) continue;
      out.trackedDays++;
      var d = byDay[k];
      if (d) { out.ml += d.ml; out.g += d.g; out.kcal += d.kcal; out.count += d.count; out.drinkingDays++; }
      else out.dryDays++;
    }
    out.stdDrinks = out.g / cfg.stdDrinkG;
    out.avgMlPerDay = out.trackedDays ? out.ml / out.trackedDays : 0;
    return out;
  }
  function windowBefore(days, offset) {
    var out = { ml:0, g:0, count:0, drinkingDays:0 };
    for (var i = offset; i < offset + days; i++) {
      var d = byDay[addDaysKey(todayKey, -i)];
      if (d) { out.ml += d.ml; out.g += d.g; out.count += d.count; out.drinkingDays++; }
    }
    return out;
  }
  var today = byDay[todayKey] || { ml:0, g:0, kcal:0, count:0 };
  var w7 = window(7), w30 = window(30), prev7 = windowBefore(7, 7), prev30 = windowBefore(30, 30);
  var allTime = { ml:0, g:0, kcal:0, count:drinks.length, drinkingDays:Object.keys(byDay).length };
  Object.keys(byDay).forEach(function(k) { allTime.ml += byDay[k].ml; allTime.g += byDay[k].g; allTime.kcal += byDay[k].kcal; });
  allTime.dryDays = Math.max(0, trackedDays - allTime.drinkingDays);
  allTime.stdDrinks = allTime.g / cfg.stdDrinkG;

  function fmtL(ml) { return ml >= 1000 ? (Math.round(ml / 100) / 10) + "L" : Math.round(ml) + "ml"; }
  function pctChange(cur, prev) {
    if (!prev && !cur) return 0;
    if (!prev) return null; // from zero — undefined %
    return Math.round(((cur - prev) / prev) * 100);
  }

  // Daily series — last 30 days, oldest first (for bar chart)
  var daily30 = [];
  for (var j = 29; j >= 0; j--) {
    var dk = addDaysKey(todayKey, -j);
    var dd = byDay[dk];
    daily30.push({ day:dk, ml: dd ? Math.round(dd.ml) : 0, g: dd ? Math.round(dd.g) : 0, count: dd ? dd.count : 0, tracked: daysBetweenKeys(startKey, dk) >= 0 });
  }
  var last14 = daily30.slice(-14);

  // Time-of-day — drinks by local hour, and 3-hour bands
  var byHour = Array(24).fill(0);
  var mlByHour = Array(24).fill(0);
  drinks.forEach(function(e) { var h = localHour(e.ts, e.tzOff); byHour[h]++; mlByHour[h] += e.ml; });
  var bands = [];
  for (var b = 0; b < 8; b++) {
    var c = 0, m = 0;
    for (var h2 = b * 3; h2 < b * 3 + 3; h2++) { c += byHour[h2]; m += mlByHour[h2]; }
    bands.push({ from:b * 3, to:b * 3 + 3, count:c, ml:Math.round(m) });
  }
  var dangerBand = null;
  bands.forEach(function(bd) { if (bd.count > 0 && (!dangerBand || bd.count > dangerBand.count)) dangerBand = bd; });
  var firstDrinkHours = [];
  Object.keys(byDay).forEach(function(k) {
    var first = null;
    drinks.forEach(function(e) { if (dayKey(e.ts, e.tzOff, roll) === k) { var h = localHour(e.ts, e.tzOff); if (first === null || h < first) first = h; } });
    if (first !== null) firstDrinkHours.push(first);
  });
  var avgFirstDrinkHour = firstDrinkHours.length ? firstDrinkHours.reduce(function(a, x) { return a + x; }, 0) / firstDrinkHours.length : null;

  // Day of week — ml and drinking-day counts
  var dowNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  var byDow = dowNames.map(function(n) { return { dow:n, ml:0, days:0, count:0 }; });
  Object.keys(byDay).forEach(function(k) {
    var p = k.split("-").map(Number);
    var dow = new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay();
    byDow[dow].ml += byDay[k].ml; byDow[dow].days++; byDow[dow].count += byDay[k].count;
  });
  byDow.forEach(function(x) { x.ml = Math.round(x.ml); });
  var worstDow = null;
  byDow.forEach(function(x) { if (x.ml > 0 && (!worstDow || x.ml > worstDow.ml)) worstDow = x; });

  // Triggers
  var byTrigger = {};
  Object.keys(TRIGGERS).forEach(function(t) { byTrigger[t] = { count:0, ml:0, urges:0, beaten:0 }; });
  drinks.forEach(function(e) { var t = e.trigger && byTrigger[e.trigger] ? e.trigger : "other"; if (!byTrigger[t]) byTrigger[t] = { count:0, ml:0, urges:0, beaten:0 }; byTrigger[t].count++; byTrigger[t].ml += e.ml; });
  urges.forEach(function(e) { var t = e.trigger && byTrigger[e.trigger] ? e.trigger : "other"; if (!byTrigger[t]) byTrigger[t] = { count:0, ml:0, urges:0, beaten:0 }; byTrigger[t].urges++; byTrigger[t].beaten++; });
  var topTrigger = null;
  // Untagged beers sit under "other", which is not a trigger, so it can't be the top one
  Object.keys(byTrigger).forEach(function(t) { if (t !== "other" && byTrigger[t].count > 0 && (!topTrigger || byTrigger[t].count > byTrigger[topTrigger].count)) topTrigger = t; });

  // Urges / swaps — "resist rate" = urges beaten ÷ (urges beaten + drinking occasions)
  var bySwap = {};
  urges.forEach(function(e) { var s = e.swap || "none"; if (!bySwap[s]) bySwap[s] = 0; bySwap[s]++; });
  var bestSwap = null;
  Object.keys(bySwap).forEach(function(s) { if (s !== "none" && (!bestSwap || bySwap[s] > bySwap[bestSwap])) bestSwap = s; });
  var urges7 = urges.filter(function(e) { return daysBetweenKeys(dayKey(e.ts, e.tzOff, roll), todayKey) < 7; }).length;
  var resistRateAll = (urges.length + drinks.length) ? urges.length / (urges.length + drinks.length) : null;
  var resistRate7 = (urges7 + w7.count) ? urges7 / (urges7 + w7.count) : null;

  // Pace — per drinking day: how many, over how long, minutes per beer
  var dayLabel = function(k) { var p = k.split("-").map(Number); var d = new Date(Date.UTC(p[0], p[1] - 1, p[2])); return dowNames[d.getUTCDay()] + " " + p[2] + " " + ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][p[1] - 1]; };
  var sessions = Object.keys(byDay).sort().map(function(k) {
    var ds = drinks.filter(function(e) { return dayKey(e.ts, e.tzOff, roll) === k; });
    var first = new Date(ds[0].ts).getTime(), last = new Date(ds[ds.length - 1].ts).getTime();
    var span = Math.round((last - first) / 60000);
    return { day: k, label: dayLabel(k), count: ds.length, ml: Math.round(byDay[k].ml), spanMin: span, minPerBeer: ds.length >= 2 ? Math.round(span / (ds.length - 1)) : null };
  });
  var sess30 = sessions.filter(function(x) { return daysBetweenKeys(x.day, todayKey) < 30; });
  var multi30 = sess30.filter(function(x) { return x.minPerBeer != null; });
  var fastest = null;
  multi30.forEach(function(x) { if (!fastest || x.minPerBeer < fastest.minPerBeer) fastest = x; });
  var biggest = null;
  sess30.forEach(function(x) { if (!biggest || x.count > biggest.count) biggest = x; });
  var pace = {
    sessions30: sess30.length,
    avgBeersPerSession: sess30.length ? r1x(sess30.reduce(function(a, x) { return a + x.count; }, 0) / sess30.length) : null,
    avgMinPerBeer: multi30.length ? Math.round(multi30.reduce(function(a, x) { return a + x.minPerBeer; }, 0) / multi30.length) : null,
    fastest: fastest, biggest: biggest,
    fastSessions30: multi30.filter(function(x) { return x.minPerBeer < PACE.fastMin; }).length,
    recent: sessions.slice(-5).reverse(),
    targetMin: PACE.targetMin, fastMin: PACE.fastMin,
  };
  function r1x(x) { return Math.round(x * 10) / 10; }

  // Flags — calm and specific: what happened, what to do about it
  var flags = [];
  var bingeDays = Object.keys(byDay).filter(function(k) { return byDay[k].g >= LOW_RISK.bingeG; });
  var binge30 = bingeDays.filter(function(k) { return daysBetweenKeys(k, todayKey) < 30; });
  if (binge30.length === 1) flags.push({ level:"mid", key:"binge", text:"Big session on " + dayLabel(binge30[0]) + ": " + fmtL(byDay[binge30[0]].ml) + " (≈" + Math.round(byDay[binge30[0]].g / cfg.stdDrinkG) + " std drinks). Nights like this, not the odd beer, are the thing to cut first." });
  if (binge30.length > 1) flags.push({ level:"mid", key:"binge", text: binge30.length + " big sessions in the last 30 days (60g+ of alcohol in a day, about 3 × 500ml). These are the thing to cut first." });
  if (pace.fastest && pace.fastest.minPerBeer < PACE.fastMin) flags.push({ level:"mid", key:"pace", text:"Fast pace: on " + pace.fastest.label + " it was a beer every " + pace.fastest.minPerBeer + " min. Slow to one an hour, with water between, and the night stops at 2 instead of 6." });
  if (w7.g > LOW_RISK.weeklyG) flags.push({ level:"mid", key:"weekly", text:"Last 7 days: " + Math.round(w7.g) + "g of alcohol, over the 112g low-risk weekly guideline (about 5 × 500ml)." });
  if (currentDrinkingRun >= LOW_RISK.dailyRunCaution) flags.push({ level:"mid", key:"daily", text: currentDrinkingRun + " days in a row with beer. Break the run with a dry day tomorrow; runs are how a habit settles in." });
  if (w7.drinkingDays >= 5 && !flags.some(function(f) { return f.key === "daily"; })) flags.push({ level:"mid", key:"frequent", text: w7.drinkingDays + " of the last 7 days had beer. Aim for at least 3 dry days a week, back-to-back if you can." });
  if (cfg.weeklyBudgetMl > 0 && w7.ml > cfg.weeklyBudgetMl) flags.push({ level:"mid", key:"budget", text:"Over your weekly budget by " + Math.round(w7.ml - cfg.weeklyBudgetMl) + "ml." });
  if (w7.ml > 0 && prev7.ml > 0 && w7.ml > prev7.ml * 1.25) flags.push({ level:"mid", key:"rising", text:"Up " + pctChange(w7.ml, prev7.ml) + "% on the week before. Catch the slide early." });

  // Wins — positive reinforcement is the point
  var wins = [];
  if (currentStreak >= 1 && lastDrink) wins.push("Day " + currentStreak + " dry" + (currentStreak >= 3 ? ". The after-work cue is already weaker." : "."));
  if (!lastDrink && trackedDays >= 1) wins.push("No beer logged since you started tracking. Keep the log honest and the streak real.");
  if (w7.ml > 0 && prev7.ml > 0 && w7.ml < prev7.ml) wins.push("Down " + Math.abs(pctChange(w7.ml, prev7.ml)) + "% on last week.");
  if (w7.ml === 0 && prev7.ml > 0) wins.push("A full dry week after " + Math.round(prev7.ml) + "ml the week before.");
  if (urges7 > 0) wins.push(urges7 + " urge" + (urges7 > 1 ? "s" : "") + " beaten this week. Each one weakens the habit a little.");
  if (longestStreak > 0 && currentStreak === longestStreak && currentStreak >= 3) wins.push("This is your longest streak yet.");

  // Milestones against days since last drink (or tracked days if never drank)
  var milestoneProgress = MILESTONES.map(function(m) { return { days:m.days, title:m.title, note:m.note, reached: daysSinceLast >= m.days }; });
  var nextMilestone = milestoneProgress.find(function(m) { return !m.reached; }) || null;

  // Money — only if configured. "Unit" = cfg.sizeMl.
  var money = cfg.costPerUnit > 0 ? {
    perUnitMl: cfg.sizeMl,
    spent30: Math.round((w30.ml / cfg.sizeMl) * cfg.costPerUnit),
    spentAll: Math.round((allTime.ml / cfg.sizeMl) * cfg.costPerUnit),
    // What the current dry streak has saved vs your average over the 30 days before it started
    savedStreak: currentStreak > 0 ? Math.round(((windowBefore(30, currentStreak).ml / 30) * currentStreak / cfg.sizeMl) * cfg.costPerUnit) : 0,
  } : null;

  // Budget
  var budget = cfg.weeklyBudgetMl > 0 ? { weeklyMl: cfg.weeklyBudgetMl, usedMl: Math.round(w7.ml), leftMl: Math.round(Math.max(0, cfg.weeklyBudgetMl - w7.ml)), pct: Math.min(100, Math.round((w7.ml / cfg.weeklyBudgetMl) * 100)) } : null;

  // Weekly series — last 8 rolling weeks (oldest first)
  var weekly8 = [];
  for (var wk = 7; wk >= 0; wk--) { var wd = windowBefore(7, wk * 7); weekly8.push({ weeksAgo:wk, ml:Math.round(wd.ml), g:Math.round(wd.g), drinkingDays:wd.drinkingDays }); }

  // Check-ins — confirmed dry evenings (a day only counts if no beer was logged)
  var checkins = normalizeBeerCheckins(rawCheckins);
  var confirmedDry7 = 0, confirmedDry30 = 0;
  for (var ci = 0; ci < 30; ci++) {
    var ck = addDaysKey(todayKey, -ci);
    if (checkins[ck] === "dry" && !byDay[ck]) { confirmedDry30++; if (ci < 7) confirmedDry7++; }
  }
  if (confirmedDry7 >= 2) wins.push("Confirmed dry " + confirmedDry7 + " evening" + (confirmedDry7 > 1 ? "s" : "") + " this week.");

  function r1(x) { return Math.round(x * 10) / 10; }
  return {
    generatedAt: nowIso,
    todayKey: todayKey,
    startDate: startKey,
    trackedDays: trackedDays,
    cfg: cfg,
    streak: {
      current: currentStreak,
      longest: longestStreak,
      daysSinceLastDrink: daysSinceLast,
      hoursSinceLastDrink: hoursSinceLast == null ? null : r1(hoursSinceLast),
      lastDrinkAt: lastDrink ? lastDrink.ts : null,
      currentDrinkingRun: currentDrinkingRun,
      longestDrinkingRun: longestDrinkingRun,
      dryDays30: w30.dryDays,
      trackedDays30: w30.trackedDays,
      dryPct30: w30.trackedDays ? Math.round((w30.dryDays / w30.trackedDays) * 100) : 0,
      dryDaysAll: allTime.dryDays,
      dryPctAll: trackedDays ? Math.round((allTime.dryDays / trackedDays) * 100) : 0,
    },
    today: { ml:Math.round(today.ml), g:r1(today.g), stdDrinks:r1(today.g / cfg.stdDrinkG), kcal:Math.round(today.kcal), count:today.count },
    week: { ml:Math.round(w7.ml), g:r1(w7.g), stdDrinks:r1(w7.stdDrinks), kcal:Math.round(w7.kcal), count:w7.count, drinkingDays:w7.drinkingDays, dryDays:w7.dryDays, trackedDays:w7.trackedDays, avgMlPerDay:Math.round(w7.avgMlPerDay), vsPrevPct:pctChange(w7.ml, prev7.ml), prevMl:Math.round(prev7.ml) },
    month: { ml:Math.round(w30.ml), g:r1(w30.g), stdDrinks:r1(w30.stdDrinks), kcal:Math.round(w30.kcal), count:w30.count, drinkingDays:w30.drinkingDays, dryDays:w30.dryDays, trackedDays:w30.trackedDays, avgMlPerDay:Math.round(w30.avgMlPerDay), vsPrevPct:pctChange(w30.ml, prev30.ml), prevMl:Math.round(prev30.ml) },
    allTime: { ml:Math.round(allTime.ml), g:r1(allTime.g), stdDrinks:r1(allTime.stdDrinks), kcal:Math.round(allTime.kcal), count:allTime.count, drinkingDays:allTime.drinkingDays, dryDays:allTime.dryDays },
    daily30: daily30,
    last14: last14,
    weekly8: weekly8,
    timeOfDay: { byHour:byHour, bands:bands, dangerBand:dangerBand, avgFirstDrinkHour: avgFirstDrinkHour == null ? null : r1(avgFirstDrinkHour) },
    dayOfWeek: { byDow:byDow, worst:worstDow },
    triggers: { byTrigger:byTrigger, top:topTrigger, hint: topTrigger && TRIGGERS[topTrigger] ? TRIGGERS[topTrigger].hint : null },
    urges: { total:urges.length, last7:urges7, resistRateAll: resistRateAll == null ? null : Math.round(resistRateAll * 100), resistRate7: resistRate7 == null ? null : Math.round(resistRate7 * 100), bySwap:bySwap, bestSwap:bestSwap },
    flags: flags,
    wins: wins,
    milestones: milestoneProgress,
    nextMilestone: nextMilestone,
    budget: budget,
    money: money,
    guidelines: LOW_RISK,
    checkins: { today: checkins[todayKey] || null, confirmedDry7: confirmedDry7, confirmedDry30: confirmedDry30 },
    pace: pace,
  };
}

// ── EXPORT ───────────────────────────────────────────────────────────────────
export function beerLogToCsv(rawLog, rawCfg) {
  var cfg = normalizeBeerCfg(rawCfg);
  var log = normalizeBeerLog(rawLog);
  var head = ["id","ts_utc","local_time","day","hour","type","ml","abv","grams_alcohol","std_drinks","kcal","trigger","swap","note"];
  function q(v) { v = v == null ? "" : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  var rows = log.map(function(e) {
    var abv = e.abv != null ? e.abv : cfg.abv;
    var g = e.resisted ? 0 : gramsAlcohol(e.ml, abv);
    var ld = localDate(e.ts, e.tzOff);
    var local = ld.toISOString().replace("Z", "").replace("T", " ").slice(0, 16);
    return [e.id, e.ts, local, dayKey(e.ts, e.tzOff, cfg.rolloverHour), localHour(e.ts, e.tzOff),
      e.resisted ? "urge_beaten" : "beer", e.ml, e.resisted ? "" : abv,
      Math.round(g * 10) / 10, Math.round((g / cfg.stdDrinkG) * 100) / 100, e.resisted ? 0 : Math.round(kcalBeer(e.ml, abv)),
      e.trigger || "", e.swap || "", e.note || ""].map(q).join(",");
  });
  return head.join(",") + "\n" + rows.join("\n") + (rows.length ? "\n" : "");
}

export function beerExportJson(rawLog, rawCfg, now, rawCheckins) {
  return {
    exportedAt: new Date().toISOString(),
    cfg: normalizeBeerCfg(rawCfg),
    log: normalizeBeerLog(rawLog),
    checkins: normalizeBeerCheckins(rawCheckins),
    insights: computeBeerInsights(rawLog, rawCfg, now, rawCheckins),
  };
}

// ── DAILY NUDGE ──────────────────────────────────────────────────────────────
// Composes the afternoon (16:35) push notification. Pure and deterministic: the same insights,
// context and seed always give the same message, so it is testable and the
// copy rotates day to day without repeating.
//   ins:  computeBeerInsights() output
//   ctx:  { enabledModes, barbellDay, kbBellKg }  (all optional)
//   seed: integer, e.g. days since epoch in the user's zone
var NUDGE_DRINKS = [
  "Having one tonight? Pick the number now. 330 not 500, water between each.",
  "Sparkling water's in the fridge. Crack one before the beer thought finishes.",
  "Thirsty? 500ml of fizz first, wait 15 minutes, then decide.",
  "Ice, lemon, sparkling water. Same ritual, no dip tomorrow.",
  "Something cold in your hand is the habit. It doesn't have to be beer.",
  "Fridge check: sparkling water front and centre, beer at the back.",
];
var NUDGE_MOVES_GENERIC = [
  "A 20-minute walk now buys hours of steady dopamine.",
  "Train first. Exercise lifts dopamine for hours; beer gives you 90 minutes and a dip.",
  "Cold shower, then decide. It spikes dopamine without the crash.",
];

export function composeBeerNudge(ins, ctx, seed) {
  ctx = ctx || {};
  var n = Math.abs(Math.floor(Number(seed) || 0));
  var modes = ctx.enabledModes || {};
  var moves = NUDGE_MOVES_GENERIC.slice();
  if (modes[0] && ctx.barbellDay) moves.push("Barbell " + ctx.barbellDay + " is up next. Lift it tonight instead.");
  if (modes[2]) moves.push("20-minute kettlebell circuit" + (ctx.kbBellKg ? " with the " + ctx.kbBellKg + "kg bell" : "") + ". Done before a beer would be.");
  if (modes[1]) moves.push("10 minutes of handstand practice. Skill work beats a beer on the couch.");

  var s = ins && ins.streak ? ins.streak : null;
  var drankToday = !!(ins && ins.today && ins.today.ml > 0);
  var title;
  if (!s || (!s.lastDrinkAt && (!ins.urges || !ins.urges.total))) title = "Afternoon check-in 🍺→💧";
  else if (drankToday) title = "One's enough tonight";
  else if (s.current >= 1) {
    title = "Day " + s.current + " dry 🔥";
    var nm = ins.nextMilestone;
    if (nm) { var left = nm.days - s.daysSinceLastDrink; if (left > 0 && left <= 3) title += " · " + left + " to " + nm.title; }
  }
  else title = "Fresh start 🌱 Tonight is day 1";

  var first;
  if (drankToday) first = "Switch to water now and make tonight's count stop here.";
  else {
    var personal = [];
    if (ins && ins.urges && ins.urges.bestSwap && SWAPS[ins.urges.bestSwap]) personal.push("Last time " + SWAPS[ins.urges.bestSwap].label.toLowerCase() + " beat the urge. Do it again.");
    if (ins && ins.triggers && ins.triggers.top === "winddown") personal.push("Work's done. Shower, change, cold fizz. Keep the ritual, swap the beer.");
    if (ins && ins.triggers && ins.triggers.top === "bored") personal.push("Bored is a dopamine dip. Fill it with something slow: walk, cook, lift.");
    var pool = NUDGE_DRINKS.concat(personal);
    first = pool[n % pool.length];
  }
  // Don't repeat the swap the first line already named (e.g. "walk" twice)
  var avoid = ins && ins.urges && ins.urges.bestSwap && SWAPS[ins.urges.bestSwap] && first.indexOf("Last time") === 0
    ? SWAPS[ins.urges.bestSwap].label.toLowerCase().split(" ")[0] : null;
  var start = (n * 7 + 3) % moves.length, second = moves[start];
  for (var i = 0; avoid && i < moves.length && second.toLowerCase().indexOf(avoid) >= 0; i++) second = moves[(start + i + 1) % moves.length];
  return { title: title, body: first + " " + second, tag: "beer-nudge", url: "?beer=log" };
}

// Local wall-clock parts in an IANA zone (server side; Intl is built into Node).
export function zonedParts(date, timeZone) {
  var f = new Intl.DateTimeFormat("en-CA", { timeZone: timeZone || "Africa/Johannesburg", year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", hourCycle:"h23" });
  var p = {};
  f.formatToParts(date).forEach(function(x) { p[x.type] = x.value; });
  var day = p.year + "-" + p.month + "-" + p.day;
  var mins = Number(p.hour) * 60 + Number(p.minute);
  var dayNum = Math.floor(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day)) / 86400000);
  return { day: day, minutes: mins, dayNum: dayNum };
}

// Is a scheduled notification due? Fires once per local day, in the hour after
// its time, so a server restart at 17:20 still sends but one at 23:00 does not.
//   kind: "nudge" (notifyTime) | "checkin" (checkinTime)
export function scheduleDue(cfg, kind, now, lastSentDay) {
  cfg = normalizeBeerCfg(cfg);
  var z = zonedParts(now || new Date(), cfg.notifyTz);
  var on = kind === "checkin" ? cfg.checkinOn : cfg.nudgeOn;
  var hm = (kind === "checkin" ? cfg.checkinTime : cfg.notifyTime).split(":").map(Number);
  var at = hm[0] * 60 + hm[1];
  var due = on && z.minutes >= at && z.minutes < at + 60 && lastSentDay !== z.day;
  return { due: due, day: z.day, dayNum: z.dayNum };
}
export function nudgeDue(cfg, now, lastSentDay) { return scheduleDue(cfg, "nudge", now, lastSentDay); }

// The 7:30pm check-in: did you stay dry, or have beer? Tap → log the ml.
export function composeBeerCheckin(ins, seed) {
  var n = Math.abs(Math.floor(Number(seed) || 0));
  var s = ins && ins.streak ? ins.streak : { current: 0 };
  var todayMl = ins && ins.today ? ins.today.ml : 0;
  var title, body;
  if (todayMl > 0) {
    title = "Evening check-in · " + todayMl + "ml logged";
    body = ["Anything since? Log it now while you remember, then switch to water.",
            "Add any you haven't logged yet. Honest numbers make the insights work."][n % 2];
  } else {
    title = s.current >= 1 ? "Evening check-in · Day " + s.current + " dry?" : "Evening check-in 🍺?";
    body = ["Stayed dry? Tap to confirm it. Had a beer? Log the ml. Honest data beats a perfect streak.",
            "Did you hold the line tonight? Confirm dry, or log what you had. No judgement either way.",
            "Quick one: dry or not? Ten seconds to log it keeps the streak and the stats real."][n % 3];
  }
  return { title: title, body: body, tag: "beer-checkin", url: "?beer=checkin" };
}

// ── IMPORT PAST ENTRIES (merge, never replace) ───────────────────────────────
// Accepts: an array of entries · { entries, startDate } · the beer JSON export
// ({ log, cfg }) · a full app link containing #beer-import=<base64url JSON>.
function fromBase64Url(s) {
  var b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  b64 += "===".slice((b64.length + 3) % 4);
  var bin = atob(b64), bytes = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function parseBeerImport(text) {
  var raw = String(text || "").trim();
  var m = raw.match(/#?beer-import=([A-Za-z0-9_-]+)/);
  if (m) raw = fromBase64Url(m[1]);
  var v = JSON.parse(raw);
  var entries = Array.isArray(v) ? v : (v && (v.entries || v.log || v.beerLog)) || [];
  var startDate = v && !Array.isArray(v) ? (v.startDate || (v.cfg && v.cfg.startDate) || null) : null;
  if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(String(startDate))) startDate = null;
  var checkins = v && !Array.isArray(v) ? normalizeBeerCheckins(v.checkins) : {};
  return { entries: normalizeBeerLog(entries), startDate: startDate, checkins: checkins };
}

// Same beer twice (same id, or same time + ml + type) is only kept once,
// so opening an import link again adds nothing.
export function mergeBeerLogs(existing, incoming) {
  var cur = normalizeBeerLog(existing);
  var ids = {}, sigs = {};
  function sig(e) { return e.ts + "|" + e.ml + "|" + (e.resisted ? 1 : 0); }
  cur.forEach(function(e) { ids[e.id] = 1; sigs[sig(e)] = 1; });
  var added = 0, skipped = 0;
  normalizeBeerLog(incoming).forEach(function(e) {
    if (ids[e.id] || sigs[sig(e)]) { skipped++; return; }
    ids[e.id] = 1; sigs[sig(e)] = 1; cur.push(e); added++;
  });
  return { log: normalizeBeerLog(cur), added: added, skipped: skipped };
}

// Apply an import to the beer part of app state. Moves the tracking start date
// back to the earliest imported day, so the dry days in between count.
export function applyBeerImport(state, imp) {
  var cfg = normalizeBeerCfg(state.beerCfg);
  var merged = mergeBeerLogs(state.beerLog, imp.entries);
  var earliest = imp.startDate || null;
  merged.log.forEach(function(e) {
    var k = dayKey(e.ts, e.tzOff, cfg.rolloverHour);
    if (!earliest || k < earliest) earliest = k;
  });
  if (earliest && (!cfg.startDate || earliest < cfg.startDate)) cfg.startDate = earliest;
  var checkins = Object.assign({}, normalizeBeerCheckins(imp.checkins), normalizeBeerCheckins(state.beerCheckins));
  return { beerLog: merged.log, beerCfg: cfg, beerCheckins: checkins, added: merged.added, skipped: merged.skipped };
}
