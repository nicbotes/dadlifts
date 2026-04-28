# dadlifts

Multi-user training tracker for Nic and friends.
Token-per-user URLs, one SQLite database, one server.

## When to use this skill

- Anything about training, lifts, weights, sessions, progress
- "How is my deadlift going", "what did I lift last session"
- "Add a friend", "give Dave a link"
- "Redeploy", "update the app", "push the latest"
- Calisthenics progression updates

---

## Commands

### snapshot — start here for any training question
```bash
export DADLIFT_API_URL=https://yourvps.com/their-token
node cli/dadlift.js state
```

### update a weight
```bash
node cli/dadlift.js set-weight deadlift 105
node cli/dadlift.js set-weight squat 80
```

### update progression increments
```bash
node cli/dadlift.js set-prog ohp 2.5 5
```

### health check
```bash
node cli/dadlift.js health
```

### add a new user
```bash
DADLIFT_BASE_URL=http://13.245.82.245 node cli/setup.js --name "Dave"
# Read the message field and send to Dave
```

### redeploy (after code changes)
```bash
node cli/deploy.js
# Read the message field and report back to Nic
```

---

## Key facts about the data

All user data lives in **`app_state`** as a single JSON blob — not in
the structured tables. Always read from `app_state`. See AGENTS.md
for the full blob structure and how to parse it.

To find a user's token:
```bash
node -e "const db=require('better-sqlite3')('server/dadlift.db'); console.log(db.prepare('SELECT name,token FROM users').all())"
```

---

## Lift IDs
`deadlift` · `squat` · `bench` · `ohp` · `rows`

## Hold IDs
`frontlever` · `deadhang` · `handstand` · `hspushup` · `lsit` · `muscleup`

## Schedule (dayIdx 0-5)
- 0: W1·D1 — Bench 4×4, Squat 4×8, OHP 4×8
- 1: W1·D2 — Bench 4×8, Deadlift 4×4, OHP 4×4
- 2: W1·D3 — Bench 3×4+AMRAP, Squat 3×4+AMRAP, OHP 4×8
- 3: W2·D1 — Bench 4×8, Deadlift 4×8, OHP 4×4
- 4: W2·D2 — Bench 4×4, Squat 4×8, OHP 4×8
- 5: W2·D3 — Bench 4×8, Deadlift 3×4+AMRAP, OHP 3×4+AMRAP

Deload rule: 2 failed sets on same lift in one session = hold weight next cycle.

---

## Redeploying

When Nic says "redeploy", "update the app", "push the latest":
```bash
cd /home/black_thorn/apps/dadlift
node cli/deploy.js
```
Forward the `message` field from the output to Nic.
See DEPLOY.md for troubleshooting.
