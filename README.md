# DADLIFT

Training tracker. Barbell (Ivysaur 4-4-8) + calisthenics.  
Built between sets, for the boys.

## Architecture

```
React frontend  →  Express API  →  SQLite
                         ↑
                     OpenClaw
```

- **Frontend** — React/Vite, home screen PWA
- **API** — Express on VPS, bearer token auth
- **DB** — SQLite via better-sqlite3, agent-readable
- **OpenClaw** — hits `/api/agent/snapshot` or queries DB directly

## Setup

### 1. Install
```bash
npm install
```

### 2. Configure server
```bash
cp .env.example .env
# Edit .env — set DADLIFT_API_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Configure frontend
```bash
cp .env.local.example .env.local
# Edit .env.local — set VITE_API_URL and VITE_API_KEY
```

### 4. Run
```bash
# Server (VPS)
npm run server

# Frontend dev
npm run dev

# Build for production
npm run build
```

### 5. VPS deployment
```bash
# Run server with PM2
pm2 start server/index.js --name dadlift
pm2 save
```

Nginx proxies `/api/*` to `localhost:3001`, static files served from `dist/`.

## API Routes

| Method | Path | Description |
|---|---|---|
| GET | `/api/agent/snapshot` | Full training state for OpenClaw |
| GET/PUT | `/api/lifts/weights` | Working weights |
| GET/PUT | `/api/lifts/progressions` | Increment config |
| GET/PUT/DELETE | `/api/lifts/deloads` | Deload flags |
| GET/PUT | `/api/holds/config` | Calisthenics config |
| GET | `/api/lifts/analytics/summary` | Lift history summary |
| GET | `/api/state/main` | Full UI state blob |
| PUT | `/api/state/main` | Save UI state blob |

## Calisthenics progression
Edit `CALI_CONFIG` in `src/App.jsx` to advance to next skill level.
Tell Claude: "move front lever to straddle" → push → done.
