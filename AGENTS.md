# AGENTS.md

How AI agents should interact with this repository and the DADLIFT service.

---

## Overview

DADLIFT is a personal training tracker owned and used by Nic. The system runs on a VPS alongside OpenClaw. Agents can read training data, update weights and progressions, and advance calisthenics skill levels.

---

## Quick start for agents

### 1. Check if the service is running

```bash
node cli/dadlift.js health
```

If this fails, `DADLIFT_API_URL` is not set or the server is down.

### 2. Get a full training snapshot

```bash
node cli/dadlift.js snapshot
```

This is the single best starting point for any training-related question. Returns current weights, progressions, deloads, session history, all-time lift summaries, and estimated 1RMs.

### 3. Set the token URL

The CLI requires the full token URL (token is the auth):

```bash
export DADLIFT_API_URL=https://yourvps.com/your-token-here
```

This should already be configured on the OpenClaw server. If not, run:

```bash
node cli/setup.js --restart
```

---

## What agents can do

### Read training data
- Current working weights per lift
- Session history and set logs
- Deload flags
- Lift analytics (volume, max weight, estimated 1RM over time)
- Calisthenics hold config and progress
- All-time summaries

### Update training data
- Adjust working weights after a cycle advance
- Change progression increments if Nic is plateauing
- Clear deload flags after cycle reset

### Advance calisthenics progressions
Edit `CALI_CONFIG` in `src/App.jsx`. Each entry has:
- `currentLevel` — where Nic is right now
- `progression` — full roadmap
- `goal` — this phase target
- `note` — coaching cue shown in the app

After editing, push and redeploy:
```bash
git add src/App.jsx
git commit -m "cali: advance front lever to straddle"
git push
# on VPS:
git pull && npm run build && pm2 restart dadlift
```

### First-time setup / key rotation
```bash
node cli/setup.js --restart
# Read the "message" field from output and send to Nic
```

---

## What agents should NOT do

- **Do not wipe or delete the database** — `server/dadlift.db` is production data
- **Do not change `DADLIFT_URL_TOKEN`** without generating a new one via `cli/setup.js` and notifying Nic
- **Do not commit `.env` or `dadlift.db`** — both are gitignored for good reason
- **Do not change programme structure** (SCHED, LIFTS) without discussing with Nic first — this affects all historical data interpretation

---

## CLI reference

```
node cli/dadlift.js <command>

snapshot              Full training state (start here)
weights               Current working weights
set-weight <id> <kg>  Update a lift's working weight
sessions [n]          Recent training sessions
analytics             Per-session volume / max / 1RM
summary               All-time lift summary
deloads               Active deload flags
holds                 Calisthenics config + analytics
progressions          Progression increment config
set-prog <id> <kg>    Update progression increments
health                Check API is reachable
```

Lift IDs: `deadlift` `squat` `bench` `ohp` `rows`  
Hold IDs: `frontlever` `deadhang` `handstand` `hspushup` `lsit` `muscleup`

---

## API endpoints (if calling directly)

All endpoints are under `/:token/api/`. The token is the only auth.

| Method | Path | Description |
|---|---|---|
| GET | `/api/agent/snapshot` | Full snapshot for agents |
| GET | `/api/lifts/weights` | Current weights |
| PUT | `/api/lifts/weights/:id` | Update a weight |
| PUT | `/api/lifts/weights` | Bulk update weights |
| GET | `/api/lifts/progressions` | Progression config |
| PUT | `/api/lifts/progressions/:id` | Update progression |
| GET | `/api/lifts/deloads` | Deload flags |
| PUT | `/api/lifts/deloads/:id` | Set deload flag |
| DELETE | `/api/lifts/deloads` | Clear all deloads |
| GET | `/api/holds/config` | Hold config |
| PUT | `/api/holds/config/:id` | Update hold config |
| GET | `/api/lifts/analytics/lifts` | Per-session lift data |
| GET | `/api/lifts/analytics/summary` | All-time summaries |
| GET | `/api/holds/analytics` | Hold session data |
| GET | `/api/state/main` | Full UI state blob |
| PUT | `/api/state/main` | Save UI state |
| GET | `/api/health` | Health check |

---

## Programme context

Nic follows Ivysaur 4-4-8 (3×/week, 2-week cycle). He is 37, 95kg, 194cm.
Training goal: strong, mobile, healthy for his two young sons for the next 20 years.

Current lift baselines (8-rep working weights):
- Deadlift: 100kg
- Back Squat: 90kg
- Bench Press: 60kg
- OHP: 45kg
- Rows: rehab

Intermediate strength benchmarks (Kilgore 2023, 95kg male):
- Deadlift: 160kg 1RM
- Squat: 140kg 1RM
- Bench: 95kg 1RM
- OHP: 70kg 1RM

Deload rule: 2 failed sets on the same lift in one session → hold weight next cycle (no increment).
