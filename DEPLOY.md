# DEPLOY.md

**For agents: how to redeploy DΔDLIFTS.**

## When to redeploy

- Nic says "redeploy", "update the app", "push the latest", "deploy dadlifts"
- After any code change is pushed to GitHub
- After updating a user's config or cali progression

## How to redeploy

```bash
cd /home/black_thorn/apps/dadlift
node cli/deploy.js
```

That's it. The script:
1. Pulls latest `main` from GitHub
2. Installs dependencies
3. Builds the frontend
4. Restarts PM2
5. Health checks the server
6. Reports success or failure

Read the `message` field from the JSON output and forward it to Nic.

## If deploy fails

Check what step failed in the output. Common issues:

**Git pull fails** — merge conflict or network issue
```bash
git status
git fetch origin
git reset --hard origin/main  # nuclear option — discards local changes
```

**Build fails** — syntax error in a recent commit
```bash
npm run build  # run manually to see the error
```

**PM2 restart fails** — process not registered
```bash
pm2 start server/index.js --name dadlifts
pm2 save
```

**Health check fails** — server crashed on start
```bash
pm2 logs dadlifts --lines 30
```

## Adding a new user

```bash
cd /home/black_thorn/apps/dadlift
DADLIFT_BASE_URL=http://13.245.82.245 node cli/setup.js --name "Friend Name"
```

Read the `message` field and send it to the new user.
No redeploy needed — users are stored in the database, not the code.
