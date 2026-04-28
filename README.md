# D∆DLIFTS 🏋️

Personal training tracker. Barbell + calisthenics. Built between sets, for the boys.

Runs on a VPS alongside OpenClaw. The agent can read and update training data directly.

---

## What it is

A home screen PWA for tracking the [Ivysaur 4-4-8](https://www.liftosaur.com/programs/ivysaur-4-4-8) barbell programme alongside a calisthenics skill progression stack. SQLite backend, Express API, React frontend.

**Barbell:** Deadlift · Back Squat · Bench Press · OHP · Bent-Over Row  
**Calisthenics:** Front Lever · Dead Hang · Wall Handstand · Wall HSPU · L-Sit  

---

## Architecture

```
iPhone (Safari PWA)
        │
        │  HTTPS — token in URL
        ▼
   Express API  ──── SQLite (dadlift.db)
        │                    ▲
        │                    │
   OpenClaw ─────────────────┘
   (same VPS)          direct DB or API
```

The entire app — frontend and API — is served under a single long random URL token. No login screen. No auth headers. Nic saves the URL to his home screen once and it just works.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite |
| API | Express 4 + better-sqlite3 |
| Database | SQLite (WAL mode) |
| Auth | 256-bit random token in URL path |
| Deploy | PM2 + nginx on VPS |

---

## Setup

### 1. Clone and install

```bash
git clone git@github.com:nicbotes/dadlift.git
cd dadlift
npm install
```

### 2. Generate token and configure

OpenClaw handles this, but manually:

```bash
node cli/setup.js --restart
```

This generates a 256-bit URL token, writes it to `.env`, and restarts PM2.
The output contains the URL to save to the home screen.

```bash
# .env (auto-generated, never commit)
DADLIFT_URL_TOKEN=xK9mP2vQr8nL4jTwY6bZ...
PORT=3001
```

### 3. Configure frontend build

```bash
cp .env.local.example .env.local
# Set VITE_API_BASE to the full token URL:
# VITE_API_BASE=https://yourvps.com/your-token-here
```

### 4. Build and run

```bash
npm run build               # builds frontend to dist/
npm run server              # starts Express (serves dist/ + API)

# or with PM2:
pm2 start server/index.js --name dadlift
pm2 save
```

### 5. nginx config

```nginx
server {
    listen 443 ssl;
    server_name yourvps.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

All routes proxy to Express. Express only responds to `/:token/*` — everything else returns 404.

### 6. Add to home screen

Open the token URL in Safari on iPhone → Share → Add to Home Screen.

---

## Calisthenics progression

Progressions are defined in `CALI_CONFIG` at the top of `src/App.jsx`.

To advance a skill level (e.g. front lever tuck → straddle):

1. Tell Claude which skill to advance
2. Claude updates `currentLevel`, `goal`, `note`, `defSecs` in `CALI_CONFIG`
3. Push to git and redeploy

```bash
git pull && npm run build && pm2 restart dadlift
```

---

## Programme notes

- **Ivysaur 4-4-8** — 3 days/week, 2-week rotating cycle
- Heavy days (4 reps @ 80% 1RM) and light days (8 reps @ 72% 1RM) alternate
- AMRAP set on Day 3 triggers progression check
- **Deload rule:** 2 failed sets on the same lift in one session = hold weight next cycle
- **Plates:** 20kg bar, 2.5/5/10/20kg plates. Minimum 5kg jumps.
- **Benchmarks:** Kilgore (2023) + OpenPowerlifting 2025 data, scaled to 95kg male

---

## Data

SQLite database at `server/dadlift.db` (gitignored).

Key tables:
- `weights` — current working weight per lift
- `progressions` — increment config per lift
- `deloads` — flagged deload states
- `sessions` — each training day
- `set_logs` — individual set results
- `hold_config` — calisthenics configuration
- `hold_logs` — calisthenics set results
- `app_state` — UI state blob

---

## Agent access

See [AGENTS.md](./AGENTS.md) and [SKILL.md](./SKILL.md).

---

*Built between sets. For the boys.*
