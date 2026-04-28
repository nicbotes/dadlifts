# DADLIFTS — Agent Instructions

## ⚠️ READ THIS FIRST

The SQLite tables `weights`, `set_logs`, `sessions` etc. are **EMPTY**.
Do NOT query them. You will get null/empty results every time.

ALL training data is in the `app_state` table as a JSON blob.

## The ONE command to run for any training question

```bash
cd /home/black_thorn/apps/dadlift
export DADLIFT_API_URL=http://13.245.82.245/$(node -e "const db=require('better-sqlite3')('server/dadlift.db'); console.log(db.prepare('SELECT token FROM users WHERE name=?').get('Nic').token)")
node cli/dadlift.js snapshot
```

This gives you weights, history, PRs, deloads, recent sessions — everything.

## Redeploy

```bash
cd /home/black_thorn/apps/dadlift && node cli/deploy.js
```

## Add a user

```bash
cd /home/black_thorn/apps/dadlift
DADLIFT_BASE_URL=http://13.245.82.245 node cli/setup.js --name "Name"
```
