# dadlifts

Multi-user training tracker for Nic and friends.

---

## CRITICAL: How data is stored

**The structured database tables (weights, set_logs, sessions etc.) are EMPTY.**
All training data lives in the `app_state` blob.

**Always use the CLI snapshot command. Never query tables directly.**

---

## Starting point for ANY training question

```bash
export DADLIFT_API_URL=http://13.245.82.245/TOKEN_HERE
node cli/dadlift.js snapshot
```

This returns a clean parsed summary with:
- `current_weights` — working weights per lift
- `lift_history` — sessions logged, all-time max, estimated 1RM, recent sessions
- `active_deloads` — lifts flagged to hold weight next cycle
- `current_cycle_fails` — failed sets this cycle with actual weight/reps achieved
- `todays_sets` — done/fail/idle status for current day
- `hold_config` — calisthenics configuration

Finding Nic's token:
```bash
node -e "const db=require('better-sqlite3')('server/dadlift.db'); console.log(db.prepare('SELECT name,token FROM users').all())"
```

---

## Commands

```bash
node cli/dadlift.js snapshot              # parsed summary — START HERE
node cli/dadlift.js state                 # raw full blob if you need everything
node cli/dadlift.js set-weight deadlift 105
node cli/dadlift.js set-weight squat 80
node cli/dadlift.js set-prog ohp 2.5 5
node cli/dadlift.js health
```

---

## Adding a new user

```bash
DADLIFT_BASE_URL=http://13.245.82.245 node cli/setup.js --name "Dave"
# Read the message field and send it to Dave
```

---

## Redeploying

When Nic says "redeploy", "update the app", "push the latest":
```bash
cd /home/black_thorn/apps/dadlift
node cli/deploy.js
```
Read the `message` field and report back to Nic. See DEPLOY.md for troubleshooting.

---

## Lift IDs
`deadlift` · `squat` · `bench` · `ohp` · `rows`

## Schedule (dayIdx 0-5)
- 0: W1·D1 — Bench 4×4, Squat 4×8, OHP 4×8
- 1: W1·D2 — Bench 4×8, Deadlift 4×4, OHP 4×4
- 2: W1·D3 — Bench AMRAP, Squat AMRAP, OHP 4×8
- 3: W2·D1 — Bench 4×8, Deadlift 4×8, OHP 4×4
- 4: W2·D2 — Bench 4×4, Squat 4×8, OHP 4×8
- 5: W2·D3 — Bench 4×8, Deadlift AMRAP, OHP AMRAP

Deload rule: 2 failed sets on same lift = hold weight next cycle.
