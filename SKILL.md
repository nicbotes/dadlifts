# dadlift

Training tracker skill. Reads and updates Nic's barbell + calisthenics training data.

## How the security works

The entire app — frontend and all API routes — lives under a single long random token in the URL:

```
https://yourvps.com/xK9mP2vQr8nL4jTwY6bZ.../
https://yourvps.com/xK9mP2vQr8nL4jTwY6bZ.../api/...
```

Any other path returns 404. No login screen, no headers, no passwords.
Nic adds the URL to his home screen once and it just works forever.

## First-time setup

Run once on the VPS (OpenClaw handles this):

```bash
node cli/setup.js --restart
```

Read the `message` field from the JSON output and send it to Nic verbatim.
It contains the URL he needs to save to his home screen.

To rotate: run setup again and message Nic the new URL.

## CLI usage

Set the token URL as an env var, then run commands:

```bash
export DADLIFT_API_URL=https://yourvps.com/your-token-here
node cli/dadlift.js <command>
```

## Commands

### snapshot ← start here
Full training picture. Use this first for any training question.
```bash
node cli/dadlift.js snapshot
```
Returns: current weights, progressions, active deloads, hold config,
last 10 sessions, all-time lift summary, estimated 1RM, 30-day recent data.

### weights
```bash
node cli/dadlift.js weights
node cli/dadlift.js set-weight deadlift 105
node cli/dadlift.js set-weight ohp 50
```
Lift IDs: `deadlift` `squat` `bench` `ohp` `rows`

### sessions
```bash
node cli/dadlift.js sessions
node cli/dadlift.js sessions 20
```

### analytics
Volume / max weight / estimated 1RM per session (trend data).
```bash
node cli/dadlift.js analytics
node cli/dadlift.js summary
```

### deloads
```bash
node cli/dadlift.js deloads
```

### holds
Calisthenics config + analytics.
```bash
node cli/dadlift.js holds
```

### progressions
```bash
node cli/dadlift.js progressions
node cli/dadlift.js set-prog ohp 2.5 5
node cli/dadlift.js set-prog deadlift 5 10
```

### health
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

Nic follows Ivysaur 4-4-8: 3 days/week, 2-week rotating cycle.
- 4-rep days (80% 1RM) and 8-rep days (72% 1RM) alternate
- 2 failed sets on the same lift in one session = deload flagged = no increment next cycle
- Plates: 20kg bar + 2.5/5/10/20kg (minimum 5kg jumps)

## Example agent flows

**"How is my deadlift going?"**
→ `node cli/dadlift.js snapshot` → check `lift_summary.deadlift`

**"Should I increase OHP this cycle?"**
→ `node cli/dadlift.js snapshot` → check `active_deloads` for ohp, check recent fail trend

**"Update squat to 95kg"**
→ `node cli/dadlift.js set-weight squat 95`

**"Slow down bench progression, Nic is plateauing"**
→ `node cli/dadlift.js set-prog bench 2.5 5`

## Calisthenics progression updates
Edit `CALI_CONFIG` in `src/App.jsx`, push to git, redeploy.
Tell Claude: "move front lever to straddle" → done in 30 seconds.
