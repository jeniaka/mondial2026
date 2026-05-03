# Mondial 2026

A World Cup 2026 companion web app for ~30 Israeli football fans — predictions pool, live scores, and friends leaderboard.

**Cost: $0 / month forever — see MONDIAL2026_SPEC.md §1.5**

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11+ `http.server` (ThreadingHTTPServer) |
| Database | MongoDB Atlas M0 (free, 512MB) |
| Frontend | Vanilla JS (ES2020), hand-written CSS, no build step |
| Auth | Google OAuth 2.0 (Authorization Code flow) |
| Email | Brevo HTTP API (300/day free) |
| Sports data | Football-Data.org REST API v4 (free tier) |
| Hosting | Render free tier (750 hrs/mo, auto TLS) |
| Cron | GitHub Actions scheduled workflows (free for public repos) |

## Local dev

```bash
cp .env.example .env
# fill in credentials in .env
pip install -r requirements.txt
python server.py
# open http://localhost:8000
```

## Environment variables

See `.env.example` for the full list. All required vars are validated at startup — the server exits immediately if any are missing.

| Variable | Description |
|----------|-------------|
| `MONGO_URI` | MongoDB Atlas connection string |
| `SESSION_SECRET` | 32+ random bytes for signing cookies |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `BREVO_API_KEY` | Brevo HTTP API key (`xkeysib-...`) |
| `FOOTBALL_DATA_TOKEN` | football-data.org free tier token |
| `INTERNAL_TOKEN` | Protects `/internal/*` endpoints; must match GitHub Actions secret |

## Deployment

### Render
1. New Web Service → connect `jeniaka/mondial2026`
2. Build: `pip install -r requirements.txt`
3. Start: `python server.py`
4. Plan: **Free** — never upgrade
5. Add all env vars from `.env.example`
6. Region: Frankfurt (closest to Israel)

### MongoDB Atlas
- Reuse `Cluster0.k1ogcwd.mongodb.net`
- Database: `mondial2026`
- Network Access: `0.0.0.0/0` (Render IPs are dynamic)

### GitHub Actions secrets
Set in repo Settings → Secrets → Actions:
- `RENDER_BASE_URL` = `https://mondial2026.onrender.com`
- `INTERNAL_TOKEN` = same value as Render env var

### Fallback hosts (if Render changes free tier)
Fly.io (3 free shared VMs), Koyeb (1 free web service), Cyclic.sh — all free, no card required.

## Full specification
See [MONDIAL2026_SPEC.md](./MONDIAL2026_SPEC.md) for the complete design document.
