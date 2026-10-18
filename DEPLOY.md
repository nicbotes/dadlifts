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

## HTTPS — required for the beer notifications (5pm nudge, 7:30pm check-in)

Push notifications only work when the app is opened over **https://**. Phones
block them on plain `http://13.245.82.245/...`. On iPhone the app must also be
added to the Home Screen and opened from the icon (iOS 16.4 or later).

One-time setup on the VPS:

1. **Get a hostname.** Free option: create `dadlifts` at https://www.duckdns.org
   and point it at `13.245.82.245` → `dadlifts.duckdns.org`. Any domain with an
   A record works.
2. **Open port 443** in the EC2 security group (inbound TCP 443 from anywhere).
3. **Get a certificate** (nginx is already the reverse proxy). First find the
   live copy of `deploy/nginx-dadlifts.conf` and set its `server_name`:
   ```bash
   CONF=$(grep -rl "proxy_pass http://127.0.0.1:3001" /etc/nginx/ | head -1); echo "$CONF"
   sudo sed -i 's/server_name _;/server_name dadlifts.duckdns.org;/' "$CONF"
   sudo nginx -t && sudo systemctl reload nginx
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d dadlifts.duckdns.org --redirect
   ```
   Certbot adds the 443 block, the http→https redirect and auto-renewal.
4. **Deploy** so the server has `web-push`: `node cli/deploy.js`.
5. **New links.** Each user's link becomes `https://dadlifts.duckdns.org/<token>/`.
   Their data is on the server, so nothing is lost. On iPhone, delete the old
   Home Screen icon and add the https one. Use the https base for new users:
   `DADLIFT_BASE_URL=https://dadlifts.duckdns.org node cli/setup.js --name "Name"`.
6. **Turn it on.** Open the app → 🍺 → LOG → *Notifications* → TURN ON → TEST NUDGE / TEST CHECK-IN.

Notes:
- Signing (VAPID) keys are generated on first start and stored in the
  `server_kv` table. If the database is lost, everyone re-taps TURN ON.
  To pin keys instead, set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (and
  optionally `VAPID_SUBJECT`) in `.env`.
- `PUSH_SCHEDULER=off` disables the daily send loop.
- `node cli/dadlift.js beer-nudge [checkin]` previews today's message;
  `beer-nudge-send [checkin]` sends it now.
- The evening check-in card also appears in the app after 19:30 without
  notifications, so it works before HTTPS is set up.

## Adding a new user

```bash
cd /home/black_thorn/apps/dadlift
DADLIFT_BASE_URL=http://13.245.82.245 node cli/setup.js --name "Friend Name"
```

Read the `message` field and send it to the new user.
No redeploy needed — users are stored in the database, not the code.
