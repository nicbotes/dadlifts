# dadlift

Training tracker skill. Reads and updates barbell + calisthenics training data for Nic.

## What this skill does

Provides access to Nic's training data: working weights, session history, progression config, deload flags, calisthenics hold config, and analytics (volume, max weight, estimated 1RM over time).

Use this skill when asked anything about:
- Nic's training, lifts, weights, sessions
- Progress on deadlift / squat / bench / OHP
- Calisthenics: front lever, dead hang, handstand, HSPU, L-sit
- Whether a deload is flagged
- Progression increments and whether to slow them down
- "How am I doing" / "what's my training like"

## Setup

The CLI requires two environment variables:

```bash
DADLIFT_API_URL=https://your-vps-domain.com   # or http://localhost:3001
DADLIFT_API_KEY=your_secret_key_here
```

These should already be set on the OpenClaw server. If not, check `.env` on the VPS.

## CLI usage

```bash
node cli/dadlift.js <command> [args]
```

Or if installed globally / symlinked:

```bash
dadlift <command>
```

## Commands

### snapshot
**Start here for any training question.** Returns a complete JSON snapshot:
- Current working weights per lift
- Active progressions
- Flagged deloads
- Calisthenics hold config
- Last 10 sessions
- All-time lift summary (max weight, estimated 1RM, total sessions, fail count)
- 30-day recent data

```bash
node cli/dadlift.js snapshot
```

### weights
Current 8-rep working weight per lift.
```bash
node cli/dadlift.js weights
```

### set-weight
Update a working weight after cycle advance or manual correction.
```bash
node cli/dadlift.js set-weight deadlift 105
node cli/dadlift.js set-weight ohp 50
```
Lift IDs: `deadlift` `squat` `bench` `ohp` `rows`

### sessions
Recent training sessions. Default last 10.
```bash
node cli/dadlift.js sessions
node cli/dadlift.js sessions 20
```

### analytics
Per-session breakdown: volume (kg×reps), max weight, estimated 1RM.
Use this for trend analysis or charting progress.
```bash
node cli/dadlift.js analytics
```

### summary
All-time summary per lift: max ever, estimated 1RM, total sessions, fail count.
```bash
node cli/dadlift.js summary
```

### deloads
Show which lifts currently have a deload flagged (2 failed sets in one session).
```bash
node cli/dadlift.js deloads
```

### holds
Calisthenics config (target secs/reps, sets, increment) + hold analytics.
```bash
node cli/dadlift.js holds
```

### progressions
Current increment config per lift (base jump and AMRAP double jump).
```bash
node cli/dadlift.js progressions
```

### set-prog
Adjust progression increments when Nic is plateauing.
```bash
node cli/dadlift.js set-prog ohp 2.5 5
node cli/dadlift.js set-prog deadlift 5 10
```

### health
Check if the API is reachable.
```bash
node cli/dadlift.js health
```

## Data model

### Lifts
| ID | Name |
|---|---|
| `deadlift` | Deadlift |
| `squat` | Back Squat |
| `bench` | Bench Press |
| `ohp` | Overhead Press |
| `rows` | Bent-Over Row (rehab) |

### Calisthenics holds
| ID | Name | Status |
|---|---|---|
| `frontlever` | Front Lever | Advanced Tuck |
| `deadhang` | Dead Hang | Building to 60s |
| `handstand` | Wall Handstand | Wall-facing holds |
| `hspushup` | Wall HSPU | Negatives |
| `lsit` | L-Sit | Tucked |
| `muscleup` | Muscle-Up | PAUSED (rehab) |

## Programme context

Nic follows **Ivysaur 4-4-8**: 3 days/week, 2-week rotating cycle.
- 4-rep days (80% 1RM) and 8-rep days (72% 1RM) alternate
- AMRAP set on Day 3 each week triggers progression check
- 2 failed sets on the same lift = deload flagged = no increment next cycle
- All weights must be achievable with: 20kg bar + 2.5/5/10/20kg plates (min 5kg jumps)

## Example agent flows

**"How is my deadlift going?"**
```bash
node cli/dadlift.js snapshot
# Look at lift_summary.deadlift for all_time_est_1rm and sessions_logged
# Look at recent_30_days for recent_max
# Check active_deloads for current flags
```

**"Should I increase my OHP this cycle?"**
```bash
node cli/dadlift.js snapshot
# Check active_deloads — if ohp is listed, hold weight
# Check analytics for recent fail trend
# Check progressions for current inc
```

**"Update my squat to 95kg after advancing the cycle"**
```bash
node cli/dadlift.js set-weight squat 95
```

## First-time setup

Run this **once** to generate the API key, write it to `.env`, and restart the server:

```bash
node cli/setup.js --restart
```

The output JSON contains a `message` field — send this to Nic verbatim.
It contains the key he needs to paste into the app on first open.

Example output:
```json
{
  "key": "abc123...",
  "message": "🔑 DADLIFT key set.\n\nOpen the app → enter this key when prompted:\n\nabc123...\n\nYou only need to do this once. The app will stay authenticated.",
  "env_updated": "/path/to/.env",
  "restart_attempted": true
}
```

After Nic enters the key in the app once, it's saved to localStorage.
The app will stay authenticated permanently — even after closing, even after
adding to the home screen. The key only needs to be re-entered if he
clears browser data or switches devices (in which case run setup again).

## Rotating the key

If you need to rotate:
```bash
node cli/setup.js --restart
```
Then message Nic the new key. He pastes it into the app prompt (it will
show automatically once the old key stops working).
