# 🍺 Beer Tracker — Implementation Plan & Reference

A fourth mode in DADLIFTS for cutting down on beer. Built around three things the
research says actually move the needle: **honest volume tracking**, **finding the cue**
(when and why), and **replacing the routine** rather than white-knuckling it.

This document is the plan *and* the record of what shipped. Every section marked ✅ is
implemented on this branch; ⏳ items are deliberate follow-ups.

---

## 1. Goals

| Goal | How the tracker serves it |
|------|---------------------------|
| Drink less beer | Daily ml, standard drinks, grams of alcohol, kcal; 7/30-day trends; weekly budget |
| Build dry streaks | Current / longest streak, dry-day %, 14-day strip, milestone progress bar |
| Find the cue | Every entry carries a **time** and a **trigger** (bored / after work / thirsty / social / stress / craving); insights surface the *danger window* (3-hour band), heaviest weekday, and top trigger with a tailored swap |
| Rewire the loop | **Urge log**: record a craving you beat and what you did instead. Resist rate and "best swap" make the replacement routine visible and rewarded (celebration burst on every beaten urge, none on a beer) |
| Stay safe | Withdrawal timeline, symptoms and red flags; daily-pattern and heavy-day flags that tell you to taper rather than stop cold |
| Own the data | CSV + JSON export in the app, server export endpoints, CLI export, SQL view, and the existing full-state Export/Import carries the log |

---

## 2. Research basis (what the numbers mean)

* **Alcohol maths.** grams = ml × ABV% × 0.789. A standard drink is configurable:
  UK unit 8 g, WHO 10 g (default), South Africa 12 g, US 14 g. Beer kcal ≈ 7 kcal/g
  alcohol + ~3.5 g carbs/100 ml × 4 kcal.
* **Low-risk guidelines (flags).** ≤ 112 g/week (UK CMO 14 units, WHO-aligned) spread over
  3+ days; ≥ 60 g in one day is WHO "heavy episodic" drinking; 4+ consecutive drinking days
  triggers the daily-pattern caution.
* **Withdrawal timeline** (daily/heavy drinkers): 6–12 h mild symptoms → 12–24 h peak →
  24–48 h seizure window → 48–72 h delirium tremens risk → day 5–7 resolution →
  weeks–months post-acute (sleep, mood, cravings in waves). Red flags route to emergency care.
* **Neuroadaptation / dopamine.** Alcohol spikes dopamine then drops the baseline; chronic
  use lowers the set-point (tolerance). Abstinence restores it over weeks–months.
  Milestones shown at 1, 3, 7, 14, 30, 60, 90, 180, 365 days draw on: NIAAA/WHO guidance,
  Mehta et al. 2018 (BMJ Open, one-month abstinence: liver, insulin resistance, BP),
  Volkow et al. PET work on D2 receptor recovery, Durazzo & Meyerhoff brain-volume imaging,
  Šrámek et al. 2000 (cold-water immersion raising dopamine ~250%). Wording in the app is
  hedged ("studies report") on purpose.
* **Behaviour change.** Cue → routine → reward (keep cue and reward, swap routine);
  implementation intentions ("when I get home, I…"); urge surfing (cravings crest in
  ~20–30 min) with a built-in 20-minute timer; the 500 ml water + 15 min "thirst rule".

---

## 3. Data model ✅

Everything lives in the per-user `app_state` blob, like the rest of the app.

```jsonc
{
  "beerLog": [
    { "id": "mve61ld7h5kv", "ts": "2026-10-18T16:00:00.000Z", "tzOff": -120,
      "ml": 440, "abv": 5, "trigger": "winddown", "note": "", "resisted": false, "swap": null },
    { "id": "mve61ldpmcfo", "ts": "2026-10-18T18:35:41.053Z", "tzOff": -120,
      "ml": 0,  "abv": 5, "trigger": "bored", "resisted": true, "swap": "walk" }
  ],
  "beerCfg": {
    "sizeMl": 440, "abv": 5, "stdDrinkG": 10, "weeklyBudgetMl": 0,
    "costPerUnit": 0, "rolloverHour": 4, "startDate": "2026-10-18", "tzOff": -120
  },
  "beerInsights": { /* output of computeBeerInsights — precalculated on every save */ },
  "beerTab": 0,
  "enabledModes": { "0": true, "1": true, "2": true, "3": true }
}
```

Design choices:

* `ts` is UTC; `tzOff` is the device offset at log time, so local hour and local day
  are reproducible on the server and in exports.
* `rolloverHour` (default 04:00) makes a 01:00 beer count for the previous evening.
* An urge is an entry with `ml = 0, resisted = true`. One log, one timeline, one export.
* `beerInsights` is written on every save so the agent snapshot, the JSON export and any
  SQL consumer get the numbers without recomputing. The UI recomputes on render so
  "hours since last beer" stays live.

---

## 4. Shared insights module ✅ — `src/beer.mjs`

Pure functions, no DOM/Node APIs. Imported by the React app and dynamically imported
by the Express server (`.mjs` so CommonJS can `import()` it on any modern Node).

`computeBeerInsights(log, cfg, now?)` returns:

| Block | Contents |
|-------|----------|
| `streak` | current, longest, daysSinceLastDrink, hoursSinceLastDrink, lastDrinkAt, currentDrinkingRun, longestDrinkingRun, dryDays30 / trackedDays30 / dryPct30, dryDaysAll / dryPctAll |
| `today`, `week`, `month`, `allTime` | ml, g, stdDrinks, kcal, count, drinkingDays, dryDays, trackedDays, avgMlPerDay, vsPrevPct |
| `daily30`, `last14`, `weekly8` | series for charts (with `tracked` and guideline flags) |
| `timeOfDay` | byHour[24], eight 3-hour bands, `dangerBand`, avgFirstDrinkHour |
| `dayOfWeek` | ml / days / count per weekday, `worst` |
| `triggers` | per-trigger count, ml, urges; `top`; tailored `hint` |
| `urges` | total, last7, resistRateAll, resistRate7, bySwap, bestSwap |
| `flags` | binge day(s), over weekly guideline, daily run, frequent, over budget, rising |
| `wins` | positive reinforcement strings |
| `milestones`, `nextMilestone` | recovery timeline vs days since last drink |
| `budget`, `money` | only when configured |

Also exported: `beerLogToCsv`, `beerExportJson`, `makeEntry`, `normalizeBeerLog`,
`normalizeBeerCfg`, `dayKey`, `localHour`, constants (`TRIGGERS`, `SWAPS`, `MILESTONES`,
`WITHDRAWAL`, `RED_FLAGS`, `LOW_RISK`).

---

## 5. UI ✅ — `src/Beer.jsx`, wired in `src/App.jsx`

Mode 3 (🍺, teal `#0D9488`). Tab labels become **LOG / INSIGHTS**. Swipe works as before.

**LOG**
1. Hero: dry-day count + hours since last beer + progress bar to the next milestone.
   If you drank today it flips to amber with today's ml / std drinks / kcal and a
   no-judgement reset message.
2. Up to two wins and the top flag.
3. Quick log: size chips (330 / 440 / 500 / pint, ±50), trigger chips with a hint for
   the chosen trigger, when (NOW / −1h / −2h / −3h / time picker, a future time = last
   night), big amber **LOG** button.
4. Urge card: 20-minute surf timer, swap chips, big teal **I BEAT IT** button with a
   celebration burst; shows best swap and this week's resist rate.
5. Today's entries (delete with ×) and a 14-day strip (teal dry / amber beer / grey
   untracked).

**INSIGHTS**
Streak tiles → volume tiles with trends, guideline comparison, optional budget bar and
money → 30-day and 8-week bar charts → flags → time-of-day bands with the danger window
and a concrete "put the swap before it" line → weekday bars → trigger bars with the top
trigger's hint → urges tiles and "what worked" → brain-rewiring timeline → collapsible
**Rewire playbook** (dopamine), **Withdrawal & safety**, **Settings** → export (CSV file,
JSON file, copy JSON) → workouts show/hide (now includes the beer tracker).

---

## 6. Server (legacy, unused) — `server/routes/beer.js`, `server/index.js`, `server/db.js`

> The backend is no longer used; these routes remain in the repo but nothing calls them.

| Route | Purpose |
|-------|---------|
| `GET /:token/api/beer` | log + cfg + fresh insights |
| `GET /:token/api/beer/insights` | insights only |
| `POST /:token/api/beer/log` | append a beer (`ml, abv, ts, trigger, note`) or an urge (`resisted:true, swap`); recomputes and stores `beerInsights` |
| `DELETE /:token/api/beer/log/:id` | remove an entry |
| `PUT /:token/api/beer/cfg` | partial config update |
| `GET /:token/api/beer/export.csv` / `.json` | downloads |
| `GET /:token/api/agent/snapshot` | now includes a `beer` block |

`v_beer_log` SQL view unpacks the log with `json_each`, so direct SQLite queries return
rows (consistent with the existing `v_weights` view).

---

## 7. CLI (legacy, unused) — `cli/dadlift.js`

```bash
node cli/dadlift.js beer                       # insights
node cli/dadlift.js beer-log 440 winddown      # log a beer now
node cli/dadlift.js beer-log 330 social --at 2026-10-17T20:30:00+02:00
node cli/dadlift.js beer-resist walk bored     # urge beaten
node cli/dadlift.js beer-delete <id>
node cli/dadlift.js beer-export > beer.csv     # or: beer-export json
```

---

## 8. Export ✅

* **CSV** columns: id, ts_utc, local_time, day, hour, type (beer / urge_beaten), ml, abv,
  grams_alcohol, std_drinks, kcal, trigger, swap, note.
* **JSON**: cfg + normalised log + precalculated insights.
* Works in standalone (GitHub Pages / localStorage) mode without a server, via Blob
  download; falls back to clipboard if downloads are blocked.
* The main Export/Import (barbell Stats tab) carries `beerLog`, `beerCfg`, `beerInsights`.

---

## 9. Verification done on this branch

* Unit-style run of `computeBeerInsights` on synthetic data (streaks, rollover at 01:00,
  danger window, trigger ranking, resist rate, money, CSV).
* Server smoke test: POST beer, POST urge, GET insights, GET export.csv, snapshot `beer` block.
* CLI smoke test of `beer`, `beer-log`, `beer-resist`, `beer-export`.
* Headless Playwright run of the standalone build: switch mode, log 500 ml "after work"
  at −1 h, beat an urge with "walk", reload (persisted), open Insights, expand all
  collapsibles, download CSV, toggle list shows the beer tracker, main export contains
  the beer data. Zero console errors.

---

## 10. Rollout

1. Merge to `main` → `.github/workflows/pages.yml` builds the standalone PWA and
   publishes it to GitHub Pages. This is the only deploy path.
2. Existing users: `normalizeState` adds empty `beerLog`, default `beerCfg` and enables
   mode 3. Nothing else changes.

---

## 11. Notifications ✅ (Web Push, no backend)

Two pushes a day, sent by `.github/workflows/beer-notify.yml`:
**~17:00 SAST nudge** (something to do instead of a beer) and **~19:30 SAST check-in**
(stayed dry or had beer?). Setup: DEPLOY.md.

* **Sender** — the workflow runs on two UTC crons (`55 14`, `25 17`) or manually
  (`workflow_dispatch` with nudge/checkin) and runs `scripts/send-beer-push.cjs`, which
  signs with `VAPID_PRIVATE_KEY` and sends `{ "kind": "nudge" | "checkin" }` to every
  device in `PUSH_SUBSCRIPTIONS`. Nothing personal leaves the phone. Missing secrets →
  notice and green exit; expired devices → warning; all failed → red run. Device keys are
  never logged.
* **Copy** — `composeBeerNudge(insights, ctx, seed)` and `composeBeerCheckin(insights,
  seed)` in `src/beer.mjs`. Nudge titles follow progress (day N dry, near a milestone,
  fresh start, already had one); bodies pair a drink swap (sparkling water from the
  fridge, the thirst rule) or a personal line (best swap, top trigger) with a movement
  option from the enabled modes. Rotates daily; never names the same swap twice.
* **Message context** — `saveNudgeContext()` in `src/push.js` runs on every app open and
  save. It computes today + 6 days of `{ nudge, checkin }` (future days assume no new beer,
  so the streak keeps counting) and stores them in Cache Storage
  (`dadlifts-nudge-v1/nudge-context.json`). After a check-in, that day's check-in push
  becomes a short "Checked in ✓" line.
* **Service worker** — `public/sw.js`: on `push`, reads today's message from the cache
  (generic fallback if the app hasn't been opened for a week) and always shows a
  notification, as iOS requires. Tap opens `?beer=log` or `?beer=checkin`. No fetch
  handler, so pages are never cached; old caches except the message cache are cleared.
* **App** — *Notifications* card on the LOG tab: previews of today's two messages,
  TURN ON (permission + subscribe with the public key in `src/push.js`), the device key
  with COPY KEY and setup steps, local SAMPLE 5PM / SAMPLE 7:30, TURN OFF, and a plain
  reason when push can't work (not https, iPhone not on the Home Screen, blocked).

### Evening check-in ✅ (19:30)

* **Notification** — `composeBeerCheckin(insights, seed)`: "Evening check-in · Day N dry?"
  or "Evening check-in · 440ml logged" ("Anything since?"). Tag `beer-checkin` so it never
  replaces the nudge. Tap opens `?beer=checkin`.
* **Card** — on the LOG tab after `checkinTime` (until the 04:00 rollover), or when the
  notification is tapped. **Stayed dry** (or **That's all** if beer was already logged)
  records the evening; **Had beer** takes count × size, "last one around" time (entries are
  spaced 20 min apart ending then) and an optional trigger, then logs them all.
  Works without push.
* **Data** — `beerCheckins: { "YYYY-MM-DD": "dry" | "drank" }` in the blob. Insights gain
  `checkins.today`, `confirmedDry7`, `confirmedDry30`, and a win for 2+ confirmed dry
  evenings a week. Included in the beer JSON export and the full-state export.

## 12. Follow-ups ⏳ (not in this branch)

* **Smarter timing**: move the nudge 30 min before the measured danger window
  (`beer.timeOfDay.dangerBand`) instead of a fixed time.
* **Sleep / mood check-in** each morning (1–5) to correlate with the previous night's ml.
* **Weekly review card**: auto-generated Monday summary from `weekly8` + flags.
* **Concurrency**: the app writes the whole blob on save; an agent `beer-log` while the
  app is open and stale could be overwritten on the next app save. Same caveat as the
  existing weight sync. Fix is a server-side merge on `PUT /api/state/main` for
  append-only arrays.
* **Other drinks**: the model already carries `ml` + `abv` per entry; a wine/spirits
  preset is a UI chip, not a schema change.
