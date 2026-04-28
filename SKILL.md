# dadlifts

Multi-user training tracker. Each user has their own unguessable URL token.
All data lives in one SQLite database, partitioned by token.

## Adding a new user

```bash
node cli/setup.js --name "Dave" --restart
```

Read the `message` field and send it to the user verbatim.
It contains their personal URL to add to their home screen.

## Querying a specific user

Set their token URL, then run commands:

```bash
export DADLIFT_API_URL=https://yourvps.com/their-token-here
node cli/dadlift.js snapshot       # start here
node cli/dadlift.js weights
node cli/dadlift.js set-weight deadlift 105
node cli/dadlift.js sessions
node cli/dadlift.js summary
node cli/dadlift.js deloads
node cli/dadlift.js progressions
node cli/dadlift.js set-prog ohp 2.5 5
node cli/dadlift.js health
```

To find a user's token, query the database directly:
```bash
sqlite3 server/dadlift.db "SELECT name, token FROM users;"
```

## Lift IDs
deadlift · squat · bench · ohp · rows

## Programme context
Ivysaur 4-4-8 — 3×/week, 2-week cycle.
2 failed sets on same lift = deload flag = hold weight next cycle.
All users start fresh from config.json defaults.

## Redeploying the app

When Nic says "redeploy", "update the app", "push the latest", or similar:

```bash
cd /home/black_thorn/apps/dadlift
node cli/deploy.js
```

Read the `message` field from the JSON output and send it to Nic.
See DEPLOY.md for troubleshooting if it fails.
