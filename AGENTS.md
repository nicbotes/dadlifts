# AGENTS.md

How AI agents should interact with DADLIFTS.

---

## Quick start

### 1. Check the service is running
```bash
node cli/dadlift.js health
```

### 2. Read a user's full training state
```bash
# Set the user's token URL
export DADLIFT_API_URL=https://yourvps.com/their-token-here

# Get everything — weights, session log, deloads, fail log, hold config
node cli/dadlift.js state
```

This is the single best starting point. All meaningful training data
is in the `app_state` blob — not in the structured tables.

---

## Data architecture — important

All app data is stored as a single JSON blob in the `app_state` table
under the key `main`. The structured tables (`weights`, `sessions`,
`set_logs` etc.) exist but are not currently populated by the app.

**Always read from `app_state`**, not from individual tables.

### Reading state directly from SQLite
```bash
node -e "
const db = require('better-sqlite3')('server/dadlift.db');
const row = db.prepare(\"SELECT value FROM app_state WHERE token=? AND key='main'\").get('TOKEN_HERE');
console.log(JSON.stringify(JSON.parse(row.value), null, 2));
"
```

### State blob structure
```json
{
  "mode": 0,
  "dayIdx": 1,
  "cycle": 1,
  "weights": {
    "deadlift": 100,
    "squat": 80,
    "bench": 60,
    "ohp": 45,
    "rows": null
  },
  "progs": {
    "deadlift": { "inc": 5, "incD": 10 },
    "squat":    { "inc": 5, "incD": 10 },
    "bench":    { "inc": 5, "incD": 10 },
    "ohp":      { "inc": 5, "incD": 5  }
  },
  "liftSets": {
    "0": { "bench": ["done","done","done","done"], "squat": ["done","fail","idle","idle"], ... },
    "1": { ... },
    ...
  },
  "deloads": {
    "squat": true,
    "deadlift": false
  },
  "sessionLog": [
    {
      "cycle": 1,
      "dayIdx": 0,
      "lifts": {
        "bench":    { "weight": 65, "volume": 1040, "maxWeight": 65, "orm": 75 },
        "squat":    { "weight": 90, "volume": 2430, "maxWeight": 90, "orm": 115 },
        "ohp":      { "weight": 45, "volume": 1440, "maxWeight": 45, "orm": 55 }
      }
    }
  ],
  "failLog": {
    "0-squat-3":    { "weight": 90, "reps": 7 },
    "1-deadlift-1": { "weight": 110, "reps": 3 }
  },
  "holdCfg": {
    "frontlever": { "secs": 7,  "sets": 5, "inc": 1, "reps": 0 },
    "deadhang":   { "secs": 30, "sets": 4, "inc": 5, "reps": 0 },
    "handstand":  { "secs": 20, "sets": 4, "inc": 5, "reps": 0 },
    "hspushup":   { "secs": 0,  "sets": 4, "inc": 0, "reps": 3 },
    "lsit":       { "secs": 10, "sets": 4, "inc": 2, "reps": 0 }
  },
  "holdSets": { ... }
}
```

---

## Reading specific data from the blob

### Current working weights
```javascript
state.weights  // { deadlift: 100, squat: 80, bench: 60, ohp: 45 }
```

### Deload flags (which lifts failed 2+ sets)
```javascript
state.deloads  // { squat: true, deadlift: false, ... }
// true = hold weight next cycle, don't increment
```

### Session history (volume, max weight, est 1RM per session)
```javascript
state.sessionLog  // array of sessions, each with lifts{}
// sessionLog[i].lifts.deadlift.orm  = estimated 1RM that session
// sessionLog[i].lifts.deadlift.volume = kg × reps moved
// sessionLog[i].lifts.deadlift.weight = working weight used
```

### Failed sets with actual achieved weight/reps
```javascript
state.failLog
// keys: "dayIdx-liftId-setIdx"
// e.g. "1-deadlift-1": { weight: 110, reps: 3 }
// means: day 1, deadlift, set 2 — got 110kg × 3 reps (target was 4)
```

### Current day and cycle
```javascript
state.dayIdx  // 0-5 (index into SCHED array)
state.cycle   // cycle number (increments on END CYCLE)
// SCHED: [W1D1, W1D2, W1D3, W2D1, W2D2, W2D3]
```

### Today's set completion
```javascript
state.liftSets[state.dayIdx]
// { bench: ["done","done","fail","idle"], squat: [...], ... }
// "done" = completed, "fail" = failed, "idle" = not yet done
```

---

## What agents can do

### Read training data
Read `app_state` as above. Use the CLI `state` command or query SQLite directly.

### Update working weights
```bash
node cli/dadlift.js set-weight deadlift 105
```
This updates the `weights` table. The app will pick up the new weight
on next load (state merge: structured tables take precedence over blob).

### Advance calisthenics progression
Edit `CALI_CONFIG` in `src/App.jsx` then redeploy:
```bash
node cli/deploy.js
```

### Add a new user
```bash
DADLIFT_BASE_URL=http://13.245.82.245 node cli/setup.js --name "Dave"
```

### Redeploy the app
```bash
node cli/deploy.js
```
See DEPLOY.md for full details.

---

## What agents should NOT do

- **Do not modify `app_state` directly** — the app owns this blob
- **Do not delete users or their state** — no undo
- **Do not change the schedule (SCHED)** without discussing with Nic
- **Do not commit `.env` or `dadlift.db`** — gitignored for good reason

---

## Finding all users
```bash
node -e "
const db = require('better-sqlite3')('server/dadlift.db');
console.log(db.prepare('SELECT name, token, created_at FROM users').all());
"
```

---

## Programme context

Ivysaur 4-4-8 — 3 days/week, 2-week rotating cycle (6 sessions total).
- Heavy days: 4×4 @ 80% 1RM
- Light days: 4×8 @ 72% 1RM
- AMRAP set on Day 3 of each week
- Deload rule: 2 failed sets on same lift = hold weight next cycle
- Plates: 20kg bar + 2.5/5/10/20kg (min 5kg jumps)

Nic's current weights (from state):
- Deadlift: 100kg (8-rep) → ~110kg (4-rep)
- Squat: 80kg (8-rep) → ~90kg (4-rep) — recalibrated for form
- Bench: 60kg (8-rep) → ~65kg (4-rep)
- OHP: 45kg (8-rep) → ~50kg (4-rep)

Benchmarks (Kilgore 2023, 95kg male):
- Deadlift: Beginner 115kg · Intermediate 160kg (goal) · Advanced 205kg
- Squat:    Beginner 100kg · Intermediate 140kg (goal) · Advanced 180kg
- Bench:    Beginner 73kg  · Intermediate 95kg  (goal) · Advanced 115kg
- OHP:      Beginner 50kg  · Intermediate 70kg  (goal) · Advanced 90kg
