# Mondial 2026 — World Cup Companion App

> **Claude Code build specification — Zero-Cost Edition**
> This document is the single source of truth for building the app.
> Read it end-to-end before writing any code.
> Build in the phased order. Do not skip phases. Do not stop until every acceptance criterion is checked.
> Commit after every phase. `git push` after every phase. No exceptions.
>
> **TWO RULES THAT OVERRIDE EVERYTHING ELSE:**
> 1. **THE APP COSTS ZERO DOLLARS — FOREVER.** Build, run, and maintain. Every component, every API, every service tier must be free indefinitely. Read section 1.5 before picking anything.
> 2. **HEBREW MUST BE PERFECT.** This app is for Israeli users (≈30 friends). Every Hebrew string is reviewed against the rules in section 10. No machine translation. No Google Translate output. No paraphrasing. The Hebrew strings in this spec are the authoritative copy — use them exactly.

---

## 0. ABSOLUTE GROUND RULES — READ FIRST

These rules override every other instinct you have. If something in this doc seems to conflict with these rules, these rules win.

1. **DO NOT STOP UNTIL DONE.** Every phase must be 100% complete before moving on.
2. **NO PLACEHOLDERS.** No `// TODO`, no `# fill this in`, no stub functions returning `None`. Every function must do its job.
3. **`git push` IS MANDATORY.** After every phase: `git add -A && git commit -m "Phase N: ..." && git push origin main`. If you forget to push, the user has to remind you and that is a failure.
4. **TEST AS YOU GO.** After implementing a feature, read the code back and verify it actually does what the spec says. Don't claim "done" without checking.
5. **NO FRAMEWORKS.** Use raw Python `http.server` and vanilla JS. No Flask, no FastAPI, no React, no Next.js, no Vue, no Tailwind build step. CSS is hand-written. JS is hand-written.
6. **HEBREW MUST BE PERFECT.** This app is for Israeli users. Hebrew text must be grammatically correct, naturally phrased, and properly RTL. Do not machine-translate. Use the Hebrew strings provided in this document verbatim.
7. **ALL COUNTRY FLAGS MUST BE CORRECT.** Use the FIFA country code system (3-letter ISO). Use the flag CDN specified in section 9. Never invent flag URLs.
8. **NO localStorage / sessionStorage HACKS for user data.** All persistent state lives in MongoDB. Use `localStorage` only for the UI language toggle (`lang=he|en`) and theme (`theme=warm`).
9. **WARM COLOR PALETTE ONLY.** No blues, no greens, no purples. Palette is defined in section 8 and is non-negotiable.
10. **MOBILE FIRST.** The app must look perfect on a phone in portrait. Tablet and desktop are bonus.
11. **ZERO-COST DISCIPLINE.** Before adding any dependency, service, library, or upgrade — verify it's free forever for our usage scale (≤30 users). If unsure, don't add it. Section 1.5 governs.

---

## 1. PROJECT OVERVIEW

### What we're building
A World Cup 2026 (Mondial 2026) companion web app for ~30 Israeli football fans who will use it as a friends-only prediction pool. The app shows live scores in a Score365-style feed, lets users sign in with Google, invite friends, and run a private prediction pool ("Mundial pool") where friends predict scores and compete on a leaderboard.

### Who it's for
- **Scale: maximum 30 users**, ever. This is the explicit design budget.
- Primary: Israeli football fans (the owner + ~29 friends)
- Language: Hebrew (default, RTL) and English (toggle)
- All users are personally known to the owner. Not a public app. No app store.

### Inspiration
- **Score365** — for the live scores feed UX, match cards, live game pin behavior
- **Mundial pool** culture in Israel — for the prediction/betting model

### Out of scope (forever, not just v1)
- Real-money betting
- Native mobile apps (web PWA only)
- Push notifications via APNS/FCM (we use in-app + email)
- Live video streams
- A separate admin panel
- Anything that requires payment to build, run, or maintain

---

## 1.5. ZERO-COST ARCHITECTURE — THIS IS THE DESIGN BUDGET

The owner's directive is verbatim: *"I don't want to spend even 1 dollar in this. It's for use for my friends. We will be not more than 30 people. The MD would make sure all parts of the app and the long maintenance is free end to end."*

Every architectural choice in this spec was made under this constraint. **Do not substitute components without re-validating cost.**

### The free-tier stack (all verified free for ≤30 users, indefinitely)

| Component                    | Service                | Free tier limit                                        | Our load (30 users)                | Headroom |
|------------------------------|------------------------|--------------------------------------------------------|------------------------------------|----------|
| Hosting                      | **Render Web Service** Free | 750 hours/month, sleeps after 15 min idle           | 1 always-on instance, never sleeps during World Cup | OK with keep-alive ping |
| Cron jobs                    | **GitHub Actions** scheduled workflows | 2,000 minutes/month free for public repos | ~2 min/day = 60 min/month       | Massive |
| Database                     | **MongoDB Atlas M0** (free) | 512MB storage, shared CPU, no time limit         | <50MB realistic                    | 10× headroom |
| Auth                         | **Google OAuth 2.0**   | Unlimited free                                         | 30 logins                          | Infinite |
| Email                        | **Brevo** free tier    | 300 emails/day forever                                 | <30/day during tournament          | 10× headroom |
| Sports data                  | **Football-Data.org** free | 10 requests/minute, free forever, registration only | 1 req/2 min via cron = 0.5/min   | 20× headroom |
| Country flags                | **flagcdn.com**        | Free CDN, no key, no rate limit                        | Direct from browser                | Infinite |
| Fonts                        | **Google Fonts**       | Free CDN forever                                       | 2 font families                    | Infinite |
| Source control               | **GitHub** public repo | Unlimited free                                         | One repo                           | Infinite |
| Domain                       | **`*.onrender.com`** subdomain | Free with Render account                       | One subdomain                      | OK |
| TLS certificate              | **Render auto-managed** Let's Encrypt | Free, auto-renew                       | One cert                           | OK |
| Error logging                | **stdout → Render logs** | 7-day retention free                                 | Whatever fits                      | OK |
| Uptime monitoring (optional) | **UptimeRobot** free   | 50 monitors, 5-min interval                            | 1 monitor                          | Infinite |
| Image storage (avatars)      | **Google profile picture URL** (we don't host images) | N/A | Use Google's CDN URL directly | Infinite |

**Total monthly cost: $0.00. Confirmed every line.**

### Render free tier — the one tricky part

Render's free Web Service tier sleeps after **15 minutes of inactivity** (cold start ~30s when next request comes). This is the only "gotcha" in the stack. For a friends-only app this is *acceptable*, but we mitigate it:

1. **GitHub Actions keep-alive ping**: a workflow runs every 14 minutes during World Cup window (June 1 – July 22, 2026) and hits `GET /healthz`. This keeps the instance warm during the tournament.
2. **Outside tournament window**: let it sleep. A 30-second cold start on the rare visit is fine. (The schedule reverts post-tournament.)
3. **GitHub Actions free quota check**: 14-min interval × 24 hours × 52 days ≈ 5,350 invocations, ~10s each ≈ 900 minutes/month — well under the 2,000-minute free quota.

If Render ever changes its free tier policy, fallback hosts (also free, no card required): **Fly.io** (3 shared-cpu-1x VMs free), **Koyeb** (1 web service free), **Cyclic.sh**. Document fallback steps in README, do not implement now.

### MongoDB Atlas free M0 — the storage budget

512MB total. Our schema for 30 users + 104 matches + ~30×104 predictions:

- `users`: 30 docs × ~1KB = 30KB
- `matches`: 104 docs × ~2KB = 208KB
- `predictions`: 3,120 docs × ~0.3KB = ~1MB
- `groups`: 5 docs × 1KB = 5KB
- `invitations`: 60 docs × 0.5KB = 30KB
- `notifications`: 30 users × ~200 lifetime notifications × 0.5KB = 3MB

**Total: under 5MB** — 100× headroom. The free tier never expires.

### Brevo free tier — the email budget

300 emails/day, free forever, no card required. Our usage:

- Group invitations: ≤30 over the entire setup (one-time)
- Daily digest (opt-in): ≤30 emails/day, only sent if users opt in
- Match reminders: ≤30/day on a match day if all users opt in

Even peak day: well under 100. **10× headroom on free tier.** Domain `mytasks.bar` (already verified DKIM/DMARC) reused for sender identity — no DNS work.

### Football-Data.org free — the sports data budget

10 requests/minute. Our cron pulls every 2 minutes during the tournament = 720 requests/day, 0.5 per minute. **20× headroom.** Live polling on the client never hits Football-Data directly — it always hits our cached MongoDB layer. Free tier requires only an email signup, no card.

### What we explicitly DO NOT use (and why)

| Service                           | Why we avoid                                                       |
|-----------------------------------|--------------------------------------------------------------------|
| API-Football (RapidAPI)           | Free tier = 100 calls/day total. Insufficient. Paid starts at ~$25/mo. |
| SportRadar                        | Paid. Score365 uses this. Out of budget.                          |
| AWS / GCP / Azure                 | Free tiers expire after 12 months and require credit card.        |
| Heroku                            | No free tier as of 2022.                                           |
| Vercel/Netlify for backend        | Serverless functions free tier is fine, but we'd need to refactor away from `http.server`. Render is simpler. |
| Redis Cloud / Upstash             | We don't need Redis. In-process dict + MongoDB is enough.         |
| Sentry                            | Free tier exists but error volume is low; stdout is sufficient.   |
| Cloudflare Workers                | Would require a rewrite. Not justified.                            |
| Custom domain                     | Costs $10-15/year. `mondial2026.onrender.com` is free and fine.   |
| Push notification services (OneSignal, etc.) | Free tiers exist but add complexity; in-app + email is enough. |
| Object storage (S3, R2)           | We don't host images. Google profile pics come from Google's CDN. |
| Paid CDN                          | Render serves static files; flagcdn.com handles flags free.       |
| Stripe / payment processors       | No money involved.                                                  |

### Long-term maintenance — also zero cost

- **No paid licenses anywhere.** All dependencies are MIT/BSD/Apache.
- **Auto-renewing TLS** via Render — no manual cert work.
- **MongoDB Atlas backup** — M0 includes daily snapshots free.
- **Source control free forever** on GitHub.
- **Domain stays free** as long as we use `*.onrender.com`.
- **Brevo free tier never expires** for transactional email under 300/day.
- **Football-Data free tier never expires** for the documented limits.

The only future expense risk: **if a service revokes its free tier**. Mitigation: every component has a documented fallback (also free) in this spec. We never get locked in.

### Cost-discipline rule for the build

When Claude Code is implementing and is tempted to add a library, service, or dependency:

> **STOP. Is it on the approved list in section 2? If not — don't add it. Ask in the chat first.**

Approved deps are in `requirements.txt` (section 2). Approved external services are in the table above. Anything else is a violation of the design budget.

---

## 2. TECH STACK (LOCKED — DO NOT SUBSTITUTE)

| Layer        | Technology                                              | Why this one                                       |
|--------------|---------------------------------------------------------|----------------------------------------------------|
| Backend      | Python 3.11+ standard library `http.server`             | No framework runtime cost; user's preference       |
| Database     | MongoDB Atlas M0 (`pymongo`)                            | Free 512MB forever, no card                        |
| Frontend     | Vanilla JS (ES2020), hand-written CSS, no build step    | No build infra needed; nothing to host             |
| Auth         | Google OAuth 2.0 (Authorization Code flow)              | Free, all 30 users have Google accounts            |
| Email        | Brevo HTTP API (`https://api.brevo.com/v3/smtp/email`)  | 300/day free forever; SMTP ports blocked on Render |
| Sports data  | Football-Data.org REST API v4                           | 10 rpm free forever; covers WC                     |
| Hosting      | Render (free tier, Python web service)                  | Free 750 hrs/mo; auto TLS                          |
| Cron         | GitHub Actions scheduled workflow                       | 2,000 min/mo free for public repos                 |
| Repo         | GitHub `jeniaka/mondial2026` (public)                   | Free; required for free GitHub Actions             |
| Domain       | `mondial2026.onrender.com` (no custom domain)           | Free, no purchase                                  |
| Cache        | In-process dict + TTL                                   | No Redis needed                                    |
| Sessions     | HTTP-only signed cookies (HMAC-SHA256)                  | No session store needed                            |

### Python dependencies (`requirements.txt` — LOCKED)
```
pymongo==4.6.1
dnspython==2.4.2
requests==2.31.0
python-dotenv==1.0.0
```

That's it. Four dependencies, all permissive licenses, all free. No Flask, no FastAPI, no Jinja, no SQLAlchemy. We use the standard library.

**If you find yourself wanting another dependency: stop. Ask first. The answer is almost certainly no.**

### Why "public" GitHub repo
GitHub Actions free minutes are unlimited on public repos and capped at 2,000/mo on private. To stay free forever for keep-alive pings + scheduled syncs, the repo must be public. Implication: no secrets in code (use env vars in Render and GitHub Actions Secrets). Document this in README.

---

## 3. PHASED BUILD ORDER (FOLLOW EXACTLY)

You will build the app in 11 phases. After each phase: commit, push, verify the acceptance criteria, then move to the next phase. Do not interleave phases.

| Phase | Name                                  | Goal                                                              |
|-------|---------------------------------------|-------------------------------------------------------------------|
| 1     | Repo + skeleton + Render deploy       | Hello-world endpoint live on Render                               |
| 2     | MongoDB + sessions + Google OAuth     | Login flow works end-to-end                                       |
| 3     | i18n (Hebrew/English) + theme + Hebrew QA pass | Language toggle works, RTL rendering correct, **Hebrew reviewed** |
| 4     | Football-Data integration + cache     | Backend can fetch fixtures, standings, live scores                |
| 5     | Matches feed UI (Score365-style)      | User sees today/upcoming/yesterday matches with correct flags     |
| 6     | Live match pin / detail page          | Tapping a live match opens live detail; pinning works             |
| 7     | Friends + invitations                 | User can invite friends by email and accept invites               |
| 8     | Prediction pool (bets)                | User can submit predictions; scoring runs after each match        |
| 9     | Leaderboard + group standings         | Per-group leaderboard with user avatars and points                |
| 10    | Notifications menu + polish           | In-app notifications bell, email digest, final QA pass            |
| 11    | GitHub Actions cron + keep-alive      | Scheduled sync + keep-alive workflow live and verified            |

---

## 4. REPOSITORY LAYOUT

Create exactly this layout. No extra directories. No `src/`, no `app/`, no `dist/`.

```
mondial2026/
├── server.py              # Main HTTP server, request router
├── db.py                  # MongoDB client + collection helpers
├── auth.py                # Google OAuth + session cookies
├── sports.py              # Football-Data.org client + cache
├── scoring.py             # Prediction scoring rules
├── mail.py                # Brevo HTTP API wrapper
├── i18n.py                # Server-side translation lookup (rare; mostly client)
├── config.py              # Reads env vars, exposes constants
├── requirements.txt
├── render.yaml            # Render deployment config
├── README.md
├── .gitignore
├── .env.example           # Template, never commit real .env
├── .github/
│   └── workflows/
│       ├── keepalive.yml  # 14-min ping during tournament
│       └── sync.yml       # 2-min match sync during tournament
├── data/
│   ├── countries.json     # FIFA code -> {name_en, name_he, flag}
│   └── tournament.json    # Static tournament structure (groups, hosts)
└── static/
    ├── index.html         # Single-page app shell
    ├── login.html         # Login page (separate so unauth users see it)
    ├── manifest.json      # PWA manifest
    ├── service-worker.js  # Offline shell (basic)
    ├── css/
    │   ├── base.css       # Reset, typography, theme variables
    │   ├── layout.css     # Header, nav, containers
    │   ├── components.css # Match cards, leaderboard, modals
    │   └── rtl.css        # RTL-specific overrides
    ├── js/
    │   ├── app.js         # Main app entry, router
    │   ├── api.js         # Fetch wrappers for our backend
    │   ├── i18n.js        # Translation runtime
    │   ├── views/
    │   │   ├── matches.js
    │   │   ├── match_detail.js
    │   │   ├── friends.js
    │   │   ├── predictions.js
    │   │   ├── leaderboard.js
    │   │   └── notifications.js
    │   └── components/
    │       ├── match_card.js
    │       ├── flag.js
    │       ├── countdown.js
    │       └── modal.js
    ├── lang/
    │   ├── he.json
    │   └── en.json
    └── img/
        ├── logo.svg
        └── icons/         # PWA icons
```

---

## 5. ENVIRONMENT VARIABLES

These are the env vars the app reads at startup. Read them in `config.py`. Crash hard at startup if any required var is missing — print a clear message saying which one.

| Variable                   | Required | Example / Notes                                                |
|----------------------------|----------|----------------------------------------------------------------|
| `PORT`                     | Yes      | Set by Render automatically                                    |
| `MONGO_URI`                | Yes      | `mongodb+srv://USER:PASS@cluster0.k1ogcwd.mongodb.net/`        |
| `MONGO_DB`                 | Yes      | `mondial2026`                                                  |
| `SESSION_SECRET`           | Yes      | 32+ random bytes, used to sign cookies                         |
| `GOOGLE_CLIENT_ID`         | Yes      | From Google Cloud Console                                      |
| `GOOGLE_CLIENT_SECRET`     | Yes      | From Google Cloud Console                                      |
| `OAUTH_REDIRECT_URI`       | Yes      | `https://mondial2026.onrender.com/auth/google/callback`        |
| `BREVO_API_KEY`            | Yes      | Starts with `xkeysib-`                                         |
| `BREVO_SENDER_EMAIL`       | Yes      | `noreply@mytasks.bar` (already verified)                       |
| `BREVO_SENDER_NAME`        | Yes      | `Mondial 2026`                                                 |
| `FOOTBALL_DATA_TOKEN`      | Yes      | From football-data.org                                         |
| `APP_BASE_URL`             | Yes      | `https://mondial2026.onrender.com`                             |
| `INTERNAL_TOKEN`           | Yes      | 32+ random bytes; protects `/internal/*` from public; matches GitHub Actions secret |
| `ADMIN_EMAILS`             | No       | Comma-separated, e.g. `evgeny.keidar@keshet-d.com`             |
| `LOG_LEVEL`                | No       | `INFO` (default) or `DEBUG`                                    |
| `TZ`                       | No       | `Asia/Jerusalem` (default)                                     |

`.env.example`:
```
PORT=8000
MONGO_URI=mongodb+srv://USER:PASS@cluster0.k1ogcwd.mongodb.net/
MONGO_DB=mondial2026
SESSION_SECRET=replace-with-32-bytes-of-randomness
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
OAUTH_REDIRECT_URI=http://localhost:8000/auth/google/callback
BREVO_API_KEY=xkeysib-xxx
BREVO_SENDER_EMAIL=noreply@mytasks.bar
BREVO_SENDER_NAME=Mondial 2026
FOOTBALL_DATA_TOKEN=xxx
APP_BASE_URL=http://localhost:8000
INTERNAL_TOKEN=replace-with-random-bytes
ADMIN_EMAILS=evgeny.keidar@keshet-d.com
LOG_LEVEL=INFO
TZ=Asia/Jerusalem
```

### GitHub Actions Secrets (set in repo settings)
- `RENDER_BASE_URL` = `https://mondial2026.onrender.com`
- `INTERNAL_TOKEN` = same value as the Render env var

---

## 6. DATABASE SCHEMA (MongoDB)

Database name: `mondial2026`. All collection names are plural and lowercase.

### `users`
```json
{
  "_id": ObjectId,
  "google_sub": "1234567890",
  "email": "user@example.com",
  "email_lower": "user@example.com",
  "name": "Evgeny Keidar",
  "picture": "https://lh3.googleusercontent.com/...",
  "locale_pref": "he",
  "is_admin": false,
  "created_at": ISODate,
  "last_login_at": ISODate,
  "notif_prefs": {
    "match_start": true,
    "match_end": true,
    "goal_in_pinned": true,
    "friend_invite": true,
    "leaderboard_change": true,
    "email_digest": "daily"
  },
  "pinned_matches": ["2026-fixture-id-1", "..."]
}
```

Indexes:
- `email_lower` unique
- `google_sub` unique

### `groups` (prediction pools)
```json
{
  "_id": ObjectId,
  "name": "חברים מהעבודה",
  "owner_id": ObjectId,
  "join_code": "ABCD12",
  "scoring_rules": "default",
  "created_at": ISODate,
  "members": [
    { "user_id": ObjectId, "joined_at": ISODate, "role": "owner|member" }
  ]
}
```

Indexes:
- `join_code` unique
- `members.user_id`

### `invitations`
```json
{
  "_id": ObjectId,
  "group_id": ObjectId,
  "from_user_id": ObjectId,
  "to_email": "friend@example.com",
  "to_email_lower": "friend@example.com",
  "token": "long-random-string",
  "status": "pending|accepted|expired",
  "created_at": ISODate,
  "expires_at": ISODate,
  "accepted_at": ISODate
}
```

Indexes:
- `token` unique
- `to_email_lower`

### `predictions` (bets)
```json
{
  "_id": ObjectId,
  "user_id": ObjectId,
  "group_id": ObjectId,
  "match_id": "fd-12345",
  "home_score": 2,
  "away_score": 1,
  "knockout_advances": null,
  "submitted_at": ISODate,
  "locked_at": ISODate,
  "points_awarded": null,
  "scored_at": null
}
```

Indexes:
- `(user_id, group_id, match_id)` unique
- `(group_id, match_id)`

### `matches` (cached fixture data)
```json
{
  "_id": "fd-12345",
  "competition": "WC2026",
  "stage": "GROUP_STAGE|LAST_16|QUARTER_FINALS|SEMI_FINALS|FINAL|THIRD_PLACE",
  "group": "A",
  "matchday": 1,
  "kickoff_utc": ISODate,
  "venue": "MetLife Stadium",
  "city": "East Rutherford",
  "country_host": "USA",
  "home": { "fifa": "ARG", "name_en": "Argentina", "name_he": "ארגנטינה" },
  "away": { "fifa": "BRA", "name_en": "Brazil",    "name_he": "ברזיל" },
  "status": "SCHEDULED|LIVE|IN_PLAY|PAUSED|FINISHED|POSTPONED|CANCELLED",
  "minute": 67,
  "score": {
    "home": 1, "away": 1,
    "ht_home": 0, "ht_away": 1,
    "ft_home": null, "ft_away": null,
    "et_home": null, "et_away": null,
    "pen_home": null, "pen_away": null,
    "winner": null
  },
  "events": [
    { "minute": 23, "type": "GOAL", "team": "ARG", "scorer": "Messi" }
  ],
  "last_synced_at": ISODate
}
```

Indexes:
- `kickoff_utc`
- `status`
- `(stage, matchday)`

### `notifications`
```json
{
  "_id": ObjectId,
  "user_id": ObjectId,
  "type": "match_start|match_end|goal|friend_invite|leaderboard_change|prediction_reminder",
  "title_he": "המשחק התחיל",
  "title_en": "The match has started",
  "body_he": "ארגנטינה נגד ברזיל זה עתה התחיל",
  "body_en": "Argentina vs Brazil just kicked off",
  "link": "/match/fd-12345",
  "read": false,
  "created_at": ISODate
}
```

Indexes:
- `(user_id, read, created_at)`

### Storage budget recap
30 users × all data ≈ 5MB. M0 free tier is 512MB. We have **100× headroom**. No archival needed. No paid upgrade ever needed.

---

## 7. ROUTING / API SURFACE

The server is a single `http.server.BaseHTTPRequestHandler` subclass with a hand-rolled router (`(method, regex) -> handler`). Same pattern as mytasks.bar.

### Public pages (HTML)
| Path                      | What it serves                                          |
|---------------------------|---------------------------------------------------------|
| `GET /`                   | If logged in → `static/index.html`. If not → redirect to `/login`. |
| `GET /login`              | `static/login.html`                                     |
| `GET /healthz`            | Returns `{"ok":true,"ts":"..."}` for keep-alive ping.   |
| `GET /invite/<token>`     | Invite landing page; sets a cookie so post-login we land in the group |
| `GET /static/*`           | Static file server (CSS/JS/images/lang)                 |
| `GET /manifest.json`      | PWA manifest                                            |
| `GET /service-worker.js`  | PWA service worker                                      |

### Auth endpoints
| Path                              | Description                                |
|-----------------------------------|--------------------------------------------|
| `GET  /auth/google/start`         | Generates state, redirects to Google       |
| `GET  /auth/google/callback`      | Exchanges code, creates/updates user, sets cookie, redirects |
| `POST /auth/logout`               | Clears cookie, redirects to `/login`       |
| `GET  /auth/me`                   | Returns current user JSON or 401           |

### Match data endpoints (auth required)
| Path                                  | Description                                    |
|---------------------------------------|------------------------------------------------|
| `GET /api/matches?day=today`          | Today's matches (also `yesterday`, `tomorrow`) |
| `GET /api/matches?from=ISO&to=ISO`    | Date range                                     |
| `GET /api/matches/live`               | Currently in-play matches                      |
| `GET /api/matches/<id>`               | One match (with events, lineups if available) |
| `GET /api/standings/<group>`          | Group standings (group A..L for 2026)          |
| `GET /api/tournament`                 | Static tournament metadata                     |
| `POST /api/matches/<id>/pin`          | Pin/unpin (toggle)                             |
| `GET /api/matches/pinned`             | List pinned matches                            |

### Friends / groups endpoints
| Path                                | Description                                 |
|-------------------------------------|---------------------------------------------|
| `GET  /api/groups`                  | Groups the user belongs to                  |
| `POST /api/groups`                  | Create new group                            |
| `GET  /api/groups/<id>`             | Group details + members                     |
| `POST /api/groups/<id>/invite`      | Invite by email                             |
| `POST /api/groups/<id>/leave`       | Leave the group                             |
| `POST /api/groups/<id>/kick`        | Owner kicks a member                        |
| `POST /api/invites/accept`          | Accept (via token)                          |

### Predictions endpoints
| Path                                                | Description                              |
|-----------------------------------------------------|------------------------------------------|
| `GET  /api/groups/<id>/predictions/<match_id>`      | All members' predictions for a match (revealed only after kickoff) |
| `POST /api/groups/<id>/predictions/<match_id>`      | Submit/update prediction (locked at kickoff) |
| `GET  /api/groups/<id>/leaderboard`                 | Group leaderboard                        |
| `GET  /api/groups/<id>/my-predictions`              | All my predictions in this group         |

### Notifications endpoints
| Path                              | Description                              |
|-----------------------------------|------------------------------------------|
| `GET  /api/notifications`         | List, paginated                          |
| `POST /api/notifications/read`    | Mark one or many as read                 |
| `POST /api/notifications/prefs`   | Update user's notification prefs         |
| `GET  /api/notifications/unread-count` | Just the badge count                |

### Internal / cron (called by GitHub Actions only)
| Path                              | Description                              |
|-----------------------------------|------------------------------------------|
| `POST /internal/sync-matches`     | Pull from Football-Data, update matches, fire notifications. Protected by `X-Internal-Token: $INTERNAL_TOKEN`. |
| `POST /internal/score-predictions`| For finished matches not yet scored, run scoring rules and update `predictions.points_awarded`. |
| `POST /internal/email-digest`     | Send daily digest emails to opted-in users. Runs once at 09:00 IST. |

---

## 8. DESIGN SYSTEM — "WARM MONDIAL"

This is the section you will reference every time you write CSS or render a UI element. **No deviation.** Every page must feel like it belongs to the same app.

### Mood
Punchy, festive, warm. Think a Mediterranean evening, a stadium under floodlights, a glass of red wine. Confident and energetic, never childish.

### Color palette (CSS variables — put these in `base.css`)

```css
:root {
  /* Primary warmth */
  --mn-cream:        #FFF6E5;
  --mn-paper:        #FFFFFF;
  --mn-ink:          #2A1810;
  --mn-ink-soft:     #6B4A3A;
  --mn-line:         #F0DCC0;

  /* Accent — the "punch" */
  --mn-flame:        #E8542C;
  --mn-flame-deep:   #B83A18;
  --mn-amber:        #F2A93B;
  --mn-amber-deep:   #C7821A;
  --mn-rose:         #C2185B;

  /* Status */
  --mn-green:        #6B8E23;
  --mn-yellow:       #DDA52F;
  --mn-red:          #8B1E1E;

  /* Surfaces in dark mode (auto via prefers-color-scheme) */
  --mn-night:        #1B0F08;
  --mn-night-paper:  #2C1A10;
  --mn-night-ink:    #FFE9C7;

  /* Shadows */
  --mn-shadow-sm:    0 1px 2px rgba(72, 30, 8, 0.08);
  --mn-shadow-md:    0 4px 12px rgba(72, 30, 8, 0.12);
  --mn-shadow-lg:    0 12px 32px rgba(72, 30, 8, 0.18);

  /* Radii */
  --mn-r-sm: 8px;
  --mn-r-md: 14px;
  --mn-r-lg: 22px;
  --mn-r-pill: 999px;

  /* Type scale */
  --mn-fs-xs: 12px;
  --mn-fs-sm: 14px;
  --mn-fs-md: 16px;
  --mn-fs-lg: 20px;
  --mn-fs-xl: 28px;
  --mn-fs-xxl: 40px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --mn-cream:    var(--mn-night);
    --mn-paper:    var(--mn-night-paper);
    --mn-ink:      var(--mn-night-ink);
    --mn-ink-soft: #C8A47A;
    --mn-line:     #4A2D1C;
  }
}
```

### Typography
- Hebrew: `"Heebo", "Assistant", system-ui, sans-serif` — Heebo loads from Google Fonts (weights 400, 600, 700, 800).
- English (and numbers): `"Inter", "Heebo", system-ui, sans-serif` — Inter for English, fall back to Heebo for mixed content.
- Numbers in scores and leaderboard: tabular figures (`font-variant-numeric: tabular-nums`).

In `index.html` `<head>`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;700;800&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
```

### Reusable components (all defined in `components.css`)

#### Match card
- Rounded `--mn-r-md`
- Card background `--mn-paper`
- 1px border `--mn-line`
- Shadow `--mn-shadow-sm`
- Padding `14px 16px`
- Layout: `[home flag] [home name]   [score]   [away name] [away flag]`
- Live state: top-left ribbon with pulsing red dot, label "LIVE" / "שידור חי", border becomes `var(--mn-flame)`, background gradient `linear-gradient(180deg, #FFF6E5 0%, #FFFFFF 50%)`
- Pinned state: small filled flame icon top-right
- Tap target: entire card; `cursor: pointer`; on hover transform `translateY(-1px)`

#### Live pulsing dot
```css
.mn-live-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--mn-flame);
  box-shadow: 0 0 0 0 rgba(232, 84, 44, 0.7);
  animation: mn-pulse 1.4s infinite;
}
@keyframes mn-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(232, 84, 44, 0.7); }
  70%  { box-shadow: 0 0 0 10px rgba(232, 84, 44, 0); }
  100% { box-shadow: 0 0 0 0 rgba(232, 84, 44, 0); }
}
```

#### Buttons
- `.btn-primary`: filled `var(--mn-flame)`, white text, radius `--mn-r-pill`, padding `10px 20px`, weight 700.
- `.btn-secondary`: bordered `var(--mn-flame)`, transparent fill, flame text.
- `.btn-ghost`: no border, `--mn-ink-soft` text, hover background `rgba(232, 84, 44, 0.06)`.
- All buttons: `transition: transform 120ms ease, background 120ms ease;` and `:active { transform: scale(0.97); }`.

#### Inputs
Background `--mn-paper`, border `1px solid --mn-line`, radius `--mn-r-sm`, padding `10px 12px`, focus border `--mn-flame`, focus ring `0 0 0 3px rgba(232, 84, 44, 0.18)`.

#### Bottom nav (mobile primary navigation)
Five tabs, each tab is icon (28px) + label (12px). Active tab: flame color + small flame underline. Inactive: `--mn-ink-soft`. Background `--mn-paper`, top border `--mn-line`, height 64px, fixed at bottom with `safe-area-inset-bottom` padding.

Tabs:
1. `matches` — calendar icon — Hebrew "משחקים" / English "Matches"
2. `live` — broadcast icon — "שידור חי" / "Live"
3. `pool` — trophy icon — "ניחושים" / "Pool"
4. `friends` — users icon — "חברים" / "Friends"
5. `me` — person icon — "פרופיל" / "Profile"

#### Header
- Sticky top, height 56px
- Left (LTR) / right (RTL): app logo + "Mondial 2026" wordmark
- Right (LTR) / left (RTL): notifications bell with red badge + language toggle (HE/EN pill) + avatar
- Tapping bell opens the notifications drawer

#### Modal
- Backdrop `rgba(42, 24, 16, 0.55)`, blur 4px
- Modal `--mn-paper`, radius `--mn-r-lg`, max-width 420px, centered
- Close button top-right (or top-left in RTL)
- Animated entrance: `opacity 0 -> 1 + translateY(8px) -> 0` over 180ms

#### Skeleton loading
Shimmering bar, `--mn-line` to `--mn-paper` gradient, 1200ms loop.

### Iconography
Use [Lucide icons](https://lucide.dev) inline as SVG (free, MIT licensed). Stroke 2, currentColor. Common icons: `flame`, `users`, `trophy`, `bell`, `calendar`, `radio`, `chevron-right`, `chevron-left`, `pin`, `pin-off`, `medal`, `globe`, `x`, `check`, `arrow-right`, `arrow-left`. Inline them — do not load lucide.js at runtime.

### Motion
- Page transitions: 200ms cross-fade
- Cards entering the list: stagger by 30ms, fade + 6px Y rise
- Button presses: 100ms scale to 0.97
- Live data updates: brief flame-tint flash on the changed cell

### Accessibility
- All interactive elements: `:focus-visible` with `outline: 2px solid var(--mn-flame); outline-offset: 2px;`
- `prefers-reduced-motion: reduce` disables all animations except essential state changes
- Color contrast: every text/background pair must meet WCAG AA
- All icon-only buttons: `aria-label`

---

## 9. COUNTRY FLAGS — DO THIS RIGHT

Flags are a credibility test. Wrong flags = trash app. Follow this exactly.

### Flag source
Use the **`flagcdn.com`** PNG service. Free, no API key, no rate limit. URL pattern:
```
https://flagcdn.com/w80/<lowercase-iso2>.png        (small)
https://flagcdn.com/w160/<lowercase-iso2>.png       (medium)
https://flagcdn.com/w320/<lowercase-iso2>.png       (large)
```

Football-Data.org returns FIFA 3-letter codes (ARG, BRA, FRA…). We map FIFA codes to ISO2 codes for flagcdn. The mapping table is in `data/countries.json` and is committed to the repo. Do not look up flags at runtime.

### Tricky cases
- **England, Scotland, Wales, Northern Ireland** — flagcdn supports regional codes `gb-eng`, `gb-sct`, `gb-wls`, `gb-nir`. Never use the Union Jack for England.
- **Kosovo** = `xk`
- **Ivory Coast** — FIFA `CIV`, ISO2 `ci`. Hebrew "חוף השנהב".
- **South Korea** — FIFA `KOR`, ISO2 `kr`. Hebrew "קוריאה הדרומית".
- **DR Congo** — FIFA `COD`, ISO2 `cd`. Hebrew "הרפובליקה הדמוקרטית של קונגו".

The full list of FIFA members is in section 28 (Appendix A — Country dictionary).

### Flag component (`static/js/components/flag.js`)
```js
export function flagImg(fifa, size = 'sm') {
  const c = window.COUNTRIES[fifa];
  if (!c) return `<span class="mn-flag-placeholder" aria-hidden="true"></span>`;
  const widths = { sm: 'w40', md: 'w80', lg: 'w160' };
  const w = widths[size] || 'w40';
  const url = `https://flagcdn.com/${w}/${c.iso2}.png`;
  const name = currentLang() === 'he' ? c.name_he : c.name_en;
  return `<img class="mn-flag mn-flag-${size}" src="${url}" alt="${name}" loading="lazy" width="${w.slice(1)}">`;
}
```

CSS for flags:
```css
.mn-flag { display: inline-block; border-radius: 3px; box-shadow: 0 1px 2px rgba(0,0,0,0.15); object-fit: cover; }
.mn-flag-sm { width: 24px; height: 16px; }
.mn-flag-md { width: 36px; height: 24px; }
.mn-flag-lg { width: 64px; height: 42px; }
.mn-flag-placeholder { display: inline-block; width: 24px; height: 16px; background: var(--mn-line); border-radius: 3px; }
```

### Acceptance test for flags
After Phase 5, manually verify in dev: open the matches page and confirm every flag matches the country name. If a flag is missing, the placeholder shows; do not show a broken image icon. Test at least 20 different countries.

---

## 10. INTERNATIONALIZATION (HEBREW + ENGLISH) — HEBREW QUALITY IS A FIRST-CLASS CONSTRAINT

> **This entire section is non-negotiable. The owner has explicitly stated Hebrew quality matters most. Any Hebrew bug is a release blocker.**

### Storage
- Default language for all new users: Hebrew (`he`)
- Saved per user in `users.locale_pref`
- Also saved in `localStorage.lang` for instant page load
- On login, the cookie response writes the user's preferred lang into a `lang` cookie

### Toggle UI
A small pill in the header showing the *other* language (so tapping shows what you'd switch to). When in Hebrew mode it shows `EN`. When in English mode it shows `עב`.

### RTL handling — the rules
- `<html lang="he" dir="rtl">` when Hebrew, `<html lang="en" dir="ltr">` when English.
- All layout uses logical properties (`margin-inline-start`, `padding-inline-end`) — **never** `margin-left`/`margin-right`.
- Icons that have direction (chevrons, arrows) are flipped via CSS `transform: scaleX(-1)` in RTL — handled in `rtl.css`.
- Flexbox orderings flip naturally via logical properties; do not use `flex-direction: row-reverse` as a hack.
- LTR fragments inside Hebrew sentences (email addresses, scores like "2-1", times like "21:00") **must** be wrapped in `<bdi>` to prevent BiDi mangling.
- Punctuation: Hebrew sentences end in `.` (period). Question marks `?` and `!` go at the end (logically, the right side visually) — handled automatically by the browser when `dir="rtl"` is set on the parent.
- Use straight quotes `"` not smart curly quotes — Hebrew typography convention.

### HEBREW CONTENT RULES — REVIEW EACH ONE BEFORE COMMITTING

These are the rules the Hebrew copy in this spec follows. If you ever add or modify a Hebrew string, it must comply with **all** of these.

#### 1. No machine translation, ever
Do not paste Hebrew through Google Translate, DeepL, ChatGPT, or any auto-translation tool. The Hebrew strings in this spec were written by a fluent speaker. If you need a new string not in this spec, **stop and ask the owner** — do not invent Hebrew on the fly.

#### 2. Word order matters
- Number + noun: the number comes **before** the noun. ✅ "3 נקודות". ❌ "נקודות 3".
- Verb + subject: Hebrew is flexible, but for UI commands use imperative + subject if any. ✅ "שלח ניחוש" (send prediction). ❌ "ניחוש שלח".
- Possession with smichut (construct state): "טבלת ניחושים" (table-of predictions), not "טבלה של ניחושים".

#### 3. Use modern Israeli Hebrew, not biblical or formal
- ✅ "המשחק התחיל" (the match has started). ❌ "המשחק החל" (overly formal).
- ✅ "ההזמנה נשלחה" (invitation was sent). ❌ "ההזמנה נשלוחה" (incorrect form).
- ✅ "אין משחקים היום" (no matches today). ❌ "אין שום משחקים היום" (literally "no any matches today" — redundant).

#### 4. Match the standard Israeli football lexicon
- "Match" → "משחק" (not "תחרות").
- "Live" → "שידור חי" (not "חי" alone).
- "Goal" → "גול" (loanword, standard).
- "Half-time" → "מחצית" (full word; not "חצי זמן").
- "Penalty" → "פנדל" / "פנדלים" plural (loanword, standard).
- "Score" → "תוצאה" (not "ניקוד" — that's "scoring", different).
- "Pool/league of predictions" → "קבוצת ניחושים" or just "ניחושים".
- "Prediction" → "ניחוש".
- "Leaderboard" → "טבלת ניחושים" or "טבלת המובילים" (we use "טבלת ניחושים" for clarity).
- "Round of 16" → "שמינית הגמר".
- "Quarter-final" → "רבע גמר".
- "Semi-final" → "חצי גמר".
- "Final" → "גמר".
- "Group stage" → "שלב הבתים" (literal: "stage of the houses" — standard Israeli usage).
- "Group A" → "בית A" (use the Latin letter, NOT "בית א'" — Israeli football media uses Latin letters for group names).

#### 5. Country names — use the official Israeli media spelling
The list in Appendix A is canonical. Spelling rules:
- ארה"ב for USA (with gershayim ״, the abbreviation mark — not regular quotes)
- "כדורגל" not "פוטבול"
- "צפון מקדוניה" (with space)
- "חוף השנהב" not "קוט ד'ואר"
- "קוריאה הדרומית" / "קוריאה הצפונית" (with definite article, "ה")
- "הרפובליקה הדמוקרטית של קונגו" — full official name
- "ניו זילנד" with space, no hyphen
- For countries like "צרפת", "גרמניה", "ספרד" — these don't take "ה" prefix even though they would in some other contexts.

#### 6. Verbs in UI commands — imperative masculine singular
Hebrew has gender-marked verbs. For UI commands, use imperative masculine singular form (Israeli UI convention, not gender-neutral "let's").
- ✅ "שלח" (send, imperative masc. sing.)
- ✅ "שמור" (save)
- ✅ "בטל" (cancel)
- ✅ "סגור" (close)
- ✅ "צור קבוצה" (create a group)
- ✅ "הזמן חברים" (invite friends)

#### 7. Time and number formatting in Hebrew
- 24-hour time: "21:00", "08:30" — same digits as English; do not Hebraize digits.
- Date: prefer DD/MM format ("11/06/2026") or written form "11 ביוני 2026".
- Day of week names: יום ראשון, יום שני, יום שלישי, יום רביעי, יום חמישי, יום שישי, שבת.
- "Today" / "tomorrow" / "yesterday": היום / מחר / אתמול.
- Counting "X minutes ago": Hebrew has masculine/feminine number agreement. "Minute" (דקה) is feminine. Use feminine numbers: "לפני דקה אחת" (1), "לפני שתי דקות" (2), "לפני שלוש דקות" (3), "לפני 5 דקות" (5+, use digits).

#### 8. Pluralization rules
Hebrew: 1 = singular, 2 = dual form (sometimes), 3+ = plural.
- 0: use plural masculine: "0 נקודות" or "אפס נקודות"
- 1: singular: "נקודה אחת"
- 2: "שתי נקודות" (feminine; "נקודה" is feminine)
- 3+: "X נקודות" using digits

We avoid the dual form complexity in UI — for any number, the rule is:
- `n === 1` → "נקודה אחת"
- `n === 0` → "אפס נקודות"
- otherwise → "{n} נקודות"

#### 9. Mixed direction inside a sentence
When a Hebrew sentence contains LTR content (URL, score, English name, time):
- Wrap the LTR fragment in `<bdi>{value}</bdi>` so the BiDi algorithm renders it correctly.
- Example: `המשחק יחל בשעה <bdi>21:00</bdi>.`
- Example: `<bdi>{from_name}</bdi> מזמין אותך לקבוצה <bdi>{group_name}</bdi>.`

#### 10. Vowels (niqqud) — NOT used
Modern Israeli digital UI never uses vowels (niqqud). All Hebrew strings in this spec are written without niqqud. Do not add them.

#### 11. Final letters
Five Hebrew letters have special final forms (sofit) used at word ends: ך ם ן ף ץ. The Hebrew strings in this spec are correct on this. If you ever generate Hebrew text programmatically, do not naively concatenate — final letters appear only at the actual end of a word.

#### 12. Hebrew QA gate (REQUIRED IN PHASE 3)
Phase 3 cannot be marked complete until:
- [ ] Every Hebrew string in `he.json` is rendered on a real page in the running app
- [ ] The owner (Evgeny) has personally read each visible Hebrew string and approved
- [ ] No leftover English or Hebraized-English ("מנדטורי", "סבמיט") in the Hebrew UI
- [ ] No untranslated keys leaking through (i.e., raw `predictions.submit` showing as text)
- [ ] All RTL layouts checked: header, bottom nav, match card, modal, drawer, leaderboard table
- [ ] Mixed-direction strings (with scores, times) render without BiDi confusion
- [ ] On Android Chrome, iOS Safari, and desktop Firefox — all three must look right

If any item fails, **do not move to Phase 4.** Fix and re-verify.

### `static/lang/he.json` — Hebrew strings (verbatim, authoritative)

Use these exactly. Do not paraphrase. Do not "improve". If you need a string that isn't here, ask.

```json
{
  "app": {
    "title": "מונדיאל 2026",
    "tagline": "המונדיאל בכיס שלך"
  },
  "nav": {
    "matches": "משחקים",
    "live": "שידור חי",
    "pool": "ניחושים",
    "friends": "חברים",
    "profile": "פרופיל"
  },
  "auth": {
    "sign_in": "התחברות",
    "sign_in_with_google": "התחברות עם חשבון Google",
    "sign_out": "התנתקות",
    "welcome_back": "ברוך שובך",
    "first_time_welcome": "ברוך הבא למונדיאל 2026",
    "tagline_subtitle": "עקוב אחרי המשחקים, נחש תוצאות עם החברים, וזכה בכבוד הגדול",
    "continue": "המשך",
    "loading": "טוען..."
  },
  "matches": {
    "today": "היום",
    "yesterday": "אתמול",
    "tomorrow": "מחר",
    "upcoming": "משחקים קרובים",
    "live_now": "משחקים שמתקיימים כעת",
    "no_matches_today": "אין משחקים היום",
    "no_live_matches": "אין משחקים פעילים כרגע",
    "kickoff_at": "פתיחה ב-{time}",
    "halftime": "מחצית",
    "full_time": "סיום משחק",
    "extra_time": "הארכה",
    "penalties": "פנדלים",
    "minute": "דקה {n}",
    "stage_group": "שלב הבתים — בית {group}",
    "stage_round_of_16": "שמינית הגמר",
    "stage_quarter": "רבע גמר",
    "stage_semi": "חצי גמר",
    "stage_final": "גמר",
    "stage_third_place": "המקום השלישי",
    "vs": "נגד",
    "pin_match": "הצמד משחק",
    "unpin_match": "הסר הצמדה",
    "watch_live": "צפייה במשחק חי",
    "match_postponed": "המשחק נדחה",
    "match_cancelled": "המשחק בוטל",
    "venue": "אצטדיון",
    "events": "אירועים",
    "lineups": "הרכבים",
    "stats": "סטטיסטיקה",
    "no_events_yet": "אין אירועים בינתיים"
  },
  "events": {
    "goal": "גול",
    "own_goal": "גול עצמי",
    "penalty_scored": "גול מפנדל",
    "penalty_missed": "פנדל שהוחמץ",
    "yellow_card": "כרטיס צהוב",
    "red_card": "כרטיס אדום",
    "second_yellow": "צהוב שני",
    "substitution": "חילוף",
    "var_review": "VAR — בחינה חוזרת",
    "kickoff": "שריקת פתיחה",
    "half_time": "סיום מחצית ראשונה",
    "second_half_start": "פתיחת מחצית שנייה",
    "full_time": "שריקת סיום"
  },
  "predictions": {
    "your_prediction": "הניחוש שלך",
    "submit": "שלח ניחוש",
    "edit": "ערוך ניחוש",
    "locked": "הניחוש נעול",
    "locks_at": "הניחוש ננעל ב-{time}",
    "locks_in": "ננעל בעוד {time}",
    "no_prediction_yet": "טרם ניחשת",
    "submitted": "ניחוש נקלט",
    "exact_score": "תוצאה מדויקת",
    "correct_outcome": "תוצאה נכונה (לא מדויקת)",
    "wrong": "ניחוש שגוי",
    "points": "{n} נקודות",
    "one_point": "נקודה אחת",
    "no_points": "אפס נקודות",
    "tiebreaker_advances": "מי עולה לשלב הבא?",
    "rules_title": "כללי הניקוד",
    "rules_body": "תוצאה מדויקת = 3 נקודות. תוצאה נכונה (ניצחון, תיקו או הפסד) אך לא מדויקת = נקודה אחת. ניחוש שגוי = אפס נקודות. בשלבי הנוקאאוט, ניחוש נכון של הקבוצה שעולה לשלב הבא מזכה בנקודת בונוס.",
    "see_others_after_kickoff": "ניחושי החברים יתגלו עם שריקת הפתיחה",
    "submit_before": "יש לשלוח ניחוש לפני שריקת הפתיחה"
  },
  "groups": {
    "my_groups": "הקבוצות שלי",
    "create_group": "צור קבוצה",
    "create_group_title": "פתיחת קבוצת ניחושים",
    "group_name": "שם הקבוצה",
    "group_name_placeholder": "למשל, חברים מהעבודה",
    "join_group": "הצטרפות לקבוצה",
    "join_code": "קוד הצטרפות",
    "invite_friends": "הזמן חברים",
    "invite_by_email": "הזמן באמצעות אימייל",
    "members": "חברי הקבוצה",
    "leave_group": "עזיבת הקבוצה",
    "kick_member": "הסר חבר",
    "you": "אתה",
    "owner": "מנהל הקבוצה",
    "no_groups_yet": "עדיין אין לך קבוצות",
    "no_groups_cta": "פתח קבוצה משלך והזמן חברים, או הצטרף לקבוצה קיימת באמצעות קוד הצטרפות",
    "invite_sent": "ההזמנה נשלחה",
    "invite_pending_for": "ממתין להצטרפות: {email}",
    "share_link": "שתף את הקישור",
    "share_link_copied": "הקישור הועתק"
  },
  "leaderboard": {
    "title": "טבלת ניחושים",
    "rank": "מקום",
    "player": "שחקן",
    "predictions_made": "ניחושים",
    "exact": "מדויק",
    "correct": "תוצאה נכונה",
    "total_points": "סה\"כ נקודות",
    "you_label": "(אתה)",
    "no_data_yet": "הטבלה תתעדכן לאחר המשחקים הראשונים",
    "tiebreaker_note": "במקרה של שוויון נקודות — מספר תוצאות מדויקות"
  },
  "notifications": {
    "title": "התראות",
    "mark_all_read": "סמן הכול כנקרא",
    "no_notifications": "אין התראות חדשות",
    "settings": "הגדרות התראות",
    "match_start": "תחילת משחק",
    "match_end": "סיום משחק",
    "goal_in_pinned": "גול במשחק מוצמד",
    "friend_invite": "הזמנה מחבר",
    "leaderboard_change": "שינוי בטבלת הניחושים",
    "prediction_reminder": "תזכורת לניחוש",
    "email_digest": "סיכום יומי במייל",
    "email_digest_options": {
      "off": "כבוי",
      "daily": "יומי",
      "matchdays_only": "רק בימי משחק"
    },
    "save_prefs": "שמור העדפות",
    "match_started": "המשחק התחיל",
    "match_ended": "המשחק הסתיים",
    "n_minutes_to_kickoff": "פתיחה בעוד {n} דקות"
  },
  "profile": {
    "title": "הפרופיל שלי",
    "language": "שפה",
    "language_he": "עברית",
    "language_en": "English",
    "stats": "הסטטיסטיקה שלי",
    "total_predictions": "סך ניחושים",
    "exact_predictions": "ניחושים מדויקים",
    "current_rank": "מקום נוכחי",
    "edit_profile": "עריכת פרופיל",
    "delete_account": "מחיקת חשבון",
    "delete_confirm": "האם אתה בטוח? פעולה זו אינה הפיכה.",
    "deleted": "החשבון נמחק"
  },
  "common": {
    "save": "שמור",
    "cancel": "בטל",
    "close": "סגור",
    "confirm": "אישור",
    "delete": "מחק",
    "back": "חזור",
    "next": "המשך",
    "loading": "טוען...",
    "error_generic": "אירעה שגיאה. נסה שוב.",
    "error_network": "אין חיבור לאינטרנט",
    "retry": "נסה שוב",
    "search": "חיפוש",
    "yes": "כן",
    "no": "לא",
    "today": "היום",
    "tomorrow": "מחר",
    "yesterday": "אתמול"
  },
  "errors": {
    "must_login": "יש להתחבר כדי להמשיך",
    "group_not_found": "הקבוצה לא נמצאה",
    "invite_invalid": "ההזמנה אינה תקפה או שפגה",
    "match_locked": "לא ניתן לשנות ניחוש לאחר תחילת המשחק",
    "score_invalid": "התוצאה שהזנת אינה תקפה",
    "rate_limited": "נשלחו יותר מדי בקשות. נסה שוב בעוד רגע."
  }
}
```

### `static/lang/en.json` — English mirror

```json
{
  "app": {
    "title": "Mondial 2026",
    "tagline": "The World Cup in your pocket"
  },
  "nav": {
    "matches": "Matches",
    "live": "Live",
    "pool": "Pool",
    "friends": "Friends",
    "profile": "Profile"
  },
  "auth": {
    "sign_in": "Sign in",
    "sign_in_with_google": "Sign in with Google",
    "sign_out": "Sign out",
    "welcome_back": "Welcome back",
    "first_time_welcome": "Welcome to Mondial 2026",
    "tagline_subtitle": "Follow every match, predict scores with friends, and chase the bragging rights.",
    "continue": "Continue",
    "loading": "Loading..."
  },
  "matches": {
    "today": "Today",
    "yesterday": "Yesterday",
    "tomorrow": "Tomorrow",
    "upcoming": "Upcoming matches",
    "live_now": "Live now",
    "no_matches_today": "No matches today",
    "no_live_matches": "No live matches right now",
    "kickoff_at": "Kickoff at {time}",
    "halftime": "Half time",
    "full_time": "Full time",
    "extra_time": "Extra time",
    "penalties": "Penalties",
    "minute": "{n}'",
    "stage_group": "Group stage — Group {group}",
    "stage_round_of_16": "Round of 16",
    "stage_quarter": "Quarter-final",
    "stage_semi": "Semi-final",
    "stage_final": "Final",
    "stage_third_place": "Third-place play-off",
    "vs": "vs",
    "pin_match": "Pin match",
    "unpin_match": "Unpin",
    "watch_live": "Watch live",
    "match_postponed": "Postponed",
    "match_cancelled": "Cancelled",
    "venue": "Venue",
    "events": "Events",
    "lineups": "Lineups",
    "stats": "Stats",
    "no_events_yet": "No events yet"
  },
  "events": {
    "goal": "Goal",
    "own_goal": "Own goal",
    "penalty_scored": "Penalty scored",
    "penalty_missed": "Penalty missed",
    "yellow_card": "Yellow card",
    "red_card": "Red card",
    "second_yellow": "Second yellow",
    "substitution": "Substitution",
    "var_review": "VAR review",
    "kickoff": "Kickoff",
    "half_time": "Half time",
    "second_half_start": "Second half",
    "full_time": "Full time"
  },
  "predictions": {
    "your_prediction": "Your prediction",
    "submit": "Submit",
    "edit": "Edit prediction",
    "locked": "Prediction locked",
    "locks_at": "Locks at {time}",
    "locks_in": "Locks in {time}",
    "no_prediction_yet": "No prediction yet",
    "submitted": "Prediction saved",
    "exact_score": "Exact score",
    "correct_outcome": "Correct outcome",
    "wrong": "Wrong",
    "points": "{n} points",
    "one_point": "1 point",
    "no_points": "0 points",
    "tiebreaker_advances": "Who advances?",
    "rules_title": "Scoring rules",
    "rules_body": "Exact score = 3 points. Correct outcome (win, draw, or loss) but not exact = 1 point. Wrong outcome = 0 points. In knockout rounds, predicting the team that advances earns a 1-point bonus.",
    "see_others_after_kickoff": "Friends' predictions reveal at kickoff",
    "submit_before": "Submit your prediction before kickoff"
  },
  "groups": {
    "my_groups": "My groups",
    "create_group": "Create group",
    "create_group_title": "Create a prediction group",
    "group_name": "Group name",
    "group_name_placeholder": "e.g., Friends from work",
    "join_group": "Join a group",
    "join_code": "Join code",
    "invite_friends": "Invite friends",
    "invite_by_email": "Invite by email",
    "members": "Members",
    "leave_group": "Leave group",
    "kick_member": "Remove member",
    "you": "You",
    "owner": "Owner",
    "no_groups_yet": "You don't have any groups yet",
    "no_groups_cta": "Create one and invite your friends, or join an existing group with a code.",
    "invite_sent": "Invitation sent",
    "invite_pending_for": "Pending: {email}",
    "share_link": "Share link",
    "share_link_copied": "Link copied"
  },
  "leaderboard": {
    "title": "Leaderboard",
    "rank": "Rank",
    "player": "Player",
    "predictions_made": "Predictions",
    "exact": "Exact",
    "correct": "Correct",
    "total_points": "Total",
    "you_label": "(you)",
    "no_data_yet": "Leaderboard updates after the first matches",
    "tiebreaker_note": "Tiebreaker — number of exact predictions"
  },
  "notifications": {
    "title": "Notifications",
    "mark_all_read": "Mark all as read",
    "no_notifications": "No notifications",
    "settings": "Notification settings",
    "match_start": "Match start",
    "match_end": "Match end",
    "goal_in_pinned": "Goal in pinned match",
    "friend_invite": "Friend invitation",
    "leaderboard_change": "Leaderboard change",
    "prediction_reminder": "Prediction reminder",
    "email_digest": "Email digest",
    "email_digest_options": {
      "off": "Off",
      "daily": "Daily",
      "matchdays_only": "Match days only"
    },
    "save_prefs": "Save preferences",
    "match_started": "Match started",
    "match_ended": "Match ended",
    "n_minutes_to_kickoff": "Kickoff in {n} minutes"
  },
  "profile": {
    "title": "My profile",
    "language": "Language",
    "language_he": "עברית",
    "language_en": "English",
    "stats": "My stats",
    "total_predictions": "Total predictions",
    "exact_predictions": "Exact predictions",
    "current_rank": "Current rank",
    "edit_profile": "Edit profile",
    "delete_account": "Delete account",
    "delete_confirm": "Are you sure? This cannot be undone.",
    "deleted": "Account deleted"
  },
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "close": "Close",
    "confirm": "Confirm",
    "delete": "Delete",
    "back": "Back",
    "next": "Next",
    "loading": "Loading...",
    "error_generic": "Something went wrong. Try again.",
    "error_network": "No internet connection",
    "retry": "Retry",
    "search": "Search",
    "yes": "Yes",
    "no": "No",
    "today": "Today",
    "tomorrow": "Tomorrow",
    "yesterday": "Yesterday"
  },
  "errors": {
    "must_login": "Please sign in to continue",
    "group_not_found": "Group not found",
    "invite_invalid": "Invitation is invalid or expired",
    "match_locked": "Predictions are locked once the match starts",
    "score_invalid": "Score is invalid",
    "rate_limited": "Too many requests. Try again in a moment."
  }
}
```

### Translation runtime (`static/js/i18n.js`)
```js
let _strings = null;
let _lang = 'he';

export async function setLang(lang) {
  if (lang !== 'he' && lang !== 'en') lang = 'he';
  _lang = lang;
  const r = await fetch(`/static/lang/${lang}.json`);
  _strings = await r.json();
  document.documentElement.setAttribute('lang', lang);
  document.documentElement.setAttribute('dir', lang === 'he' ? 'rtl' : 'ltr');
  localStorage.setItem('lang', lang);
}

export function t(key, params = {}) {
  if (!_strings) return key;
  const parts = key.split('.');
  let v = _strings;
  for (const p of parts) v = v?.[p];
  if (typeof v !== 'string') return key;
  return v.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? '');
}

export function currentLang() { return _lang; }
```

### Hebrew QA reminder before each merge
Re-read section 10 every time you touch a Hebrew string. The owner cares about this more than any other quality dimension.

---

## 11. AUTHENTICATION (Google OAuth — free)

### Flow
1. User on `/login` taps "התחברות עם חשבון Google" → browser navigates to `/auth/google/start`.
2. Server generates a random `state` (and `nonce`), stores `state` in a short-lived signed cookie, redirects to Google's OAuth endpoint with `client_id`, `scope=openid email profile`, `redirect_uri`, `state`, `prompt=select_account`.
3. Google bounces back to `/auth/google/callback?code=...&state=...`. Server verifies state, exchanges code for tokens at `https://oauth2.googleapis.com/token`, fetches `https://www.googleapis.com/oauth2/v3/userinfo`.
4. Server upserts the `users` document keyed on `google_sub`. Sets `last_login_at`. If first login, applies defaults (locale `he`, all notif prefs on, empty pinned list).
5. Server sets a session cookie `mn_sess` (HTTP-only, Secure in production, SameSite=Lax). Cookie value: base64(JSON({user_id, iat})) + "." + base64(HMAC-SHA256(payload, SESSION_SECRET)).
6. Server redirects to `/` (or `/invite/<token>` if there's a pending invite cookie).

### Cookie format
```
mn_sess=<base64 payload>.<base64 hmac>
```

`auth.py` exports:
- `make_session(user_id) -> cookie_value`
- `verify_session(cookie_value) -> user_id or None`
- `current_user(handler) -> user dict or None`
- `require_user(handler) -> user dict` (raises a 401 by sending response if no user)

Cookie expires after 30 days. Refresh on every request (sliding session).

### Logout
`POST /auth/logout` clears the cookie and returns 204.

### CSRF
Session cookie is `SameSite=Lax`. Additionally require all POST/DELETE requests to send `X-Requested-With: fetch` header (auto-set by our `api.js` client).

### Google Cloud Console setup (document this in README)
1. Create project "Mondial 2026" — free
2. OAuth consent screen: External, app name "Mondial 2026", support email, scopes: `openid`, `email`, `profile`
3. Create OAuth Client ID (Web application)
4. Authorized redirect URIs:
   - `http://localhost:8000/auth/google/callback` (dev)
   - `https://mondial2026.onrender.com/auth/google/callback` (prod)
5. **Add the 30 friends as "Test users"** in OAuth consent screen — keeps the app in "Testing" mode forever, free, no app verification needed for closed user group.
6. Copy Client ID + Client Secret into Render env vars.

### Acceptance criteria
- [ ] Visiting `/` while logged out redirects to `/login`
- [ ] Login button initiates Google OAuth flow
- [ ] Successful login lands on `/` showing today's matches
- [ ] User document is created on first login with all defaults
- [ ] Refreshing the page keeps the user logged in
- [ ] Logout clears the cookie and redirects to `/login`
- [ ] Tampering with the session cookie is rejected with 401

---

## 12. SPORTS DATA — Football-Data.org (free tier, locked)

### Setup
- Sign up at football-data.org for a free account (email only, no card)
- Add the token to env var `FOOTBALL_DATA_TOKEN`
- Header: `X-Auth-Token: <token>`
- Base URL: `https://api.football-data.org/v4`
- Rate limit: 10 requests per minute on the free tier — never exceed

### Endpoints we use
- `GET /competitions/WC/matches` — all 2026 World Cup fixtures
- `GET /competitions/WC/matches?status=LIVE`
- `GET /competitions/WC/matches?status=SCHEDULED`
- `GET /competitions/WC/matches?status=FINISHED`
- `GET /competitions/WC/standings`
- `GET /matches/{id}`

If Football-Data.org doesn't support the `WC` code at the time of build, override with env var `FOOTBALL_DATA_COMPETITION` (default `WC`).

### Caching strategy — preserve our free quota

We have 10 rpm. Cache aggressively in-process AND in MongoDB:

| Data                              | TTL            |
|-----------------------------------|----------------|
| All fixtures (no live ones)       | 30 minutes     |
| Today's fixtures                  | 5 minutes      |
| Live matches list                 | 30 seconds     |
| Single live match details         | 20 seconds     |
| Single non-live match details     | 10 minutes     |
| Standings                         | 15 minutes     |

**The cron is the only thing that hits Football-Data.org.** All user-facing endpoints serve from the `matches` MongoDB collection. This means:
- 30 users browsing live → 0 calls to Football-Data
- Cron polls every 2 min during tournament → 30 calls/hour, ≤720/day
- Quota: 10 rpm × 60 min × 24 h = 14,400/day theoretical max — we use 5%

### Sync job (`POST /internal/sync-matches`)
Runs from GitHub Actions (see section 26.5).

The sync job:
1. Fetches all WC matches updated in the last 7 days
2. Upserts into `matches` collection
3. For status transition (SCHEDULED → IN_PLAY): fires `match_start` notification to users who pinned/predicted this match
4. For new events: if pinned by a user, fire `goal_in_pinned` notification on GOAL events
5. For transition to FINISHED: fires `match_end` notification, then enqueues scoring

**Idempotency:** safe to run twice. Use the events array length as a watermark.

### Mapping Football-Data → our schema
Football-Data team object includes `tla` (3-letter code). We trust `tla` for FIFA code mapping. If `tla` is not in our `countries.json`, log a warning and serve a placeholder flag — never crash.

### Acceptance criteria for Phase 4
- [ ] `sports.py` exposes `get_fixtures()`, `get_live()`, `get_match()`, `get_standings()` with caching
- [ ] `/internal/sync-matches` runs in under 10 seconds and respects rate limits
- [ ] On 429, gracefully fall back to MongoDB-cached data
- [ ] `data/countries.json` resolves the `tla` for every team in the fixtures response
- [ ] Logs include latency per upstream call when LOG_LEVEL=DEBUG

---

## 13. MATCHES FEED (Score365-style)

### Layout (Phase 5)
```
[ Header bar: logo | bell | lang toggle | avatar ]
[ Day strip: « יום ה' | יום ו' | היום | יום א' | יום ב' »  ]
[ "שידור חי" section: live match cards (only if any live) ]
[ "משחקים — היום" section: today's matches grouped by stage ]
[ "מחר" section: collapsed, tap to expand ]
[ Bottom nav ]
```

Day strip behavior:
- 7 days back, 14 days forward
- Tapping a day scrolls that day's section into view
- Sticky and horizontally scrollable
- Today highlighted with a flame underline

### Match card composition

For LIVE:
```
┌─────────────────────────────────────────────────────────────┐
│  [LIVE 67']                                       [pin]     │
│                                                              │
│  🇦🇷 Argentina                                          1   │
│  🇧🇷 Brazil                                             1   │
│                                                              │
│  East Rutherford · MetLife Stadium                           │
└─────────────────────────────────────────────────────────────┘
```

For SCHEDULED:
```
┌─────────────────────────────────────────────────────────────┐
│  Group A · 21:00                                  [pin]     │
│                                                              │
│  🇫🇷 France                                                  │
│  🇩🇪 Germany                                                 │
│                                                              │
│  Mexico City · Estadio Azteca                                │
└─────────────────────────────────────────────────────────────┘
```

For FINISHED:
```
┌─────────────────────────────────────────────────────────────┐
│  Final  · FT                                                 │
│                                                              │
│  🇦🇷 Argentina                                          ●3   │
│  🇫🇷 France                                              2    │
│                                                              │
│  East Rutherford · MetLife Stadium                           │
└─────────────────────────────────────────────────────────────┘
```

### Live indicator
- Top-left ribbon, flame background, white text
- "LIVE 67'" or "שידור חי · 67'"
- Pulsing red dot

### Score formatting
- Always two-character width
- Penalties: "1-1 (4-3)" with a small "Pens" pill
- Half-time: "0-1" with "HT" pill
- FT: just the score

### Pin button
- Small flame icon top-right (top-left in RTL)
- Outlined when not pinned, filled when pinned
- `POST /api/matches/<id>/pin` toggles
- Optimistic UI

### Polling (mind the free DB quota — keep it light)
While the feed is open, poll `/api/matches/live` every 30 seconds. Pause when `document.hidden`. Use `requestIdleCallback` if available. Each poll is one MongoDB query — 30 users × 1 query/30s = 1 query/sec, trivial for M0.

### Acceptance criteria for Phase 5
- [ ] Feed shows today's matches by default
- [ ] Day strip scrolls horizontally; tap jumps to it
- [ ] Live matches show pulsing dot and live ribbon
- [ ] Scheduled matches show kickoff time in user's local time (Asia/Jerusalem default)
- [ ] All flags are correct for at least 20 sampled fixtures
- [ ] Tapping a card opens match detail
- [ ] Pin toggle works and persists across reloads
- [ ] No layout shift when live data updates

---

## 14. MATCH DETAIL / LIVE PIN

### Route
`/match/<id>` — full-screen match page. URL is shareable.

### Sections
1. **Header**: back button, "Match" title, share icon
2. **Hero**: large flags + names + huge scoreline. Live ribbon if applicable.
3. **Status strip**: stage, group/round, kickoff time, venue
4. **Tabs**: "Events", "Lineups", "Stats" (lineups/stats may be unavailable from Football-Data free tier — show "Not available" gracefully)
5. **Events timeline**
6. **Prediction widget** (section 15)
7. **Pin button** (sticky bottom)

### Live behavior
- Polling every 15 seconds
- Subtle flame flash on score block when it changes
- Toast at bottom: "GOAL — Argentina 67'" on new event

### Acceptance criteria for Phase 6
- [ ] URL `/match/<id>` works directly (deep link)
- [ ] Live polling updates score and events
- [ ] Pin button works
- [ ] Predictions widget appears when user is in any group
- [ ] Lineups/stats degrade gracefully
- [ ] Page is fully RTL when language is Hebrew

---

## 15. PREDICTION POOL (BETS)

### Concept
Users join groups (max 30 members per group, our scale cap). In each group, members submit a predicted score for every World Cup match.

### Rules (canonical scoring)
| Outcome of prediction                                                      | Points |
|----------------------------------------------------------------------------|--------|
| Exact score match                                                          | 3      |
| Correct outcome (W/D/L from home perspective) but wrong score              | 1      |
| Wrong outcome                                                              | 0      |
| **Knockout bonus**: predicting the team that advances                      | +1     |

For knockout matches: user submits regular-time score AND ticks "advances" if they think home team progresses.

Tiebreakers: total points → exact predictions count → correct outcomes count → earliest registration.

### Lock time
Predictions lock at *kickoff time* (server-side check). Show countdown.

### UI flow
- **Group home**: list of upcoming matches with my prediction next to each
- **Match prediction modal**: two flag rows with score steppers (-/+, range 0..15), "Submit" CTA
- **Match detail (post-kickoff)**: table of all members' predictions

### Privacy
A member's prediction is hidden until kickoff. Server enforces.

### Acceptance criteria for Phase 8
- [ ] Submitting a prediction creates/updates the document
- [ ] Submitting after kickoff returns 423 with clear message
- [ ] After kickoff, all group members see all predictions
- [ ] When match transitions to FINISHED, scoring runs and points are stamped
- [ ] Re-running scoring is idempotent
- [ ] Prediction modal supports both LTR and RTL

---

## 16. SCORING ENGINE (`scoring.py`)

```python
def score_prediction(prediction: dict, match: dict) -> int:
    if match.get("status") != "FINISHED":
        return None

    ph, pa = prediction["home_score"], prediction["away_score"]
    score = match.get("score", {})
    fh = score.get("ft_home", score.get("home"))
    fa = score.get("ft_away", score.get("away"))
    if fh is None or fa is None:
        return None

    points = 0
    if ph == fh and pa == fa:
        points = 3
    elif (ph - pa) == 0 and (fh - fa) == 0:
        points = 1
    elif (ph - pa) > 0 and (fh - fa) > 0:
        points = 1
    elif (ph - pa) < 0 and (fh - fa) < 0:
        points = 1

    is_knockout = match.get("stage") in {
        "LAST_16", "QUARTER_FINALS", "SEMI_FINALS", "FINAL", "THIRD_PLACE"
    }
    if is_knockout and prediction.get("knockout_advances") is not None:
        actual_winner = score.get("winner")
        predicted_advances = prediction["knockout_advances"]
        if (
            (actual_winner == "HOME_TEAM" and predicted_advances == "HOME") or
            (actual_winner == "AWAY_TEAM" and predicted_advances == "AWAY")
        ):
            points += 1

    return points
```

`/internal/score-predictions`:
- Optional query param `match_id`
- Otherwise: scan finished matches with no scoring run yet, score all, fire `leaderboard_change` notifications for users whose rank changed by ≥3 places.

---

## 17. FRIENDS / GROUPS / INVITATIONS

### Creating a group
- Modal with name input
- Server creates `groups` doc, generates 6-char `join_code`
- Owner auto-added with role `owner`
- Returns share URL `https://mondial2026.onrender.com/invite/<token>`

### Inviting by email
- Modal: email input + "Send"
- Server creates `invitations` doc, sends Brevo email
- Email subject (Hebrew): `{from_name} מזמין אותך לקבוצת ניחושים — {group_name}`
- Token expires in 14 days
- Limit: max 20 pending invites per group at a time (well within Brevo's 300/day)

### Accepting an invite
- Logged-in user taps the link → `/invite/<token>` page
- Server validates token, shows group preview
- "Join" button → POSTs `/api/invites/accept`
- If logged out: stash token in cookie, redirect to login, then back

### Email template (`mail.py`)

#### Hebrew (default)
Subject: `{from_name} מזמין אותך לקבוצת ניחושים — {group_name}`

Body (HTML):
```html
<!doctype html>
<html dir="rtl" lang="he">
<head>
  <meta charset="utf-8">
</head>
<body style="background:#FFF6E5;font-family:'Heebo',Arial,sans-serif;color:#2A1810;margin:0;padding:0;">
  <div style="max-width:520px;margin:24px auto;background:#FFFFFF;border-radius:14px;padding:24px;">
    <div style="text-align:center;font-size:28px;font-weight:800;color:#E8542C;margin-bottom:8px;">
      מונדיאל 2026
    </div>
    <p>שלום,</p>
    <p>
      <bdi>{from_name}</bdi> מזמין אותך להצטרף לקבוצת ניחושים בשם
      <strong><bdi>{group_name}</bdi></strong>.
    </p>
    <p>נחשו את תוצאות המונדיאל יחד, צברו נקודות, וזכו בכבוד הגדול.</p>
    <p style="text-align:center;margin:28px 0;">
      <a href="{accept_url}" style="display:inline-block;background:#E8542C;color:#FFFFFF;text-decoration:none;padding:12px 28px;border-radius:999px;font-weight:700;">
        הצטרפות לקבוצה
      </a>
    </p>
    <p style="font-size:13px;color:#6B4A3A;">
      או הדבק את הקישור הבא בדפדפן:<br>
      <span style="word-break:break-all;" dir="ltr"><bdi>{accept_url}</bdi></span>
    </p>
    <p style="font-size:12px;color:#6B4A3A;margin-top:24px;">
      ההזמנה תפוג בעוד 14 ימים. אם הודעה זו הגיעה אליך בטעות, ניתן להתעלם ממנה.
    </p>
  </div>
</body>
</html>
```

#### English mirror
Subject: `{from_name} invited you to predict the World Cup — {group_name}`

Same structure, English copy, LTR.

### Brevo HTTP API call
```python
def send_email(to_email, to_name, subject, html_body):
    r = requests.post(
        "https://api.brevo.com/v3/smtp/email",
        headers={
            "api-key": os.environ["BREVO_API_KEY"],
            "content-type": "application/json",
            "accept": "application/json",
        },
        json={
            "sender": {
                "email": os.environ["BREVO_SENDER_EMAIL"],
                "name": os.environ["BREVO_SENDER_NAME"],
            },
            "to": [{"email": to_email, "name": to_name}],
            "subject": subject,
            "htmlContent": html_body,
        },
        timeout=10,
    )
    if r.status_code >= 300:
        return False, f"brevo_error_{r.status_code}: {r.text[:300]}"
    return True, None
```

### Acceptance criteria for Phase 7
- [ ] Creating a group works
- [ ] Inviting by email sends a real Brevo email (test to your own gmail)
- [ ] Email renders properly in Gmail (Hebrew RTL works)
- [ ] Following invite link in logged-out browser flows correctly
- [ ] Accepting adds user to the group
- [ ] Token cannot be reused after acceptance

---

## 18. LEADERBOARD

### Per-group page
- Title: group name
- Stats banner: total predictions, top-3 avatars
- Table:
```
| #  | Player        | Predictions | Exact | Correct | Total |
|----|---------------|-------------|-------|---------|-------|
| 1  | Evgeny (you)  | 18          | 5     | 9       | 24    |
```

- Current user row highlighted with `var(--mn-rose)` left/right border
- "You" badge on user's row
- Sortable columns

### Acceptance criteria for Phase 9
- [ ] Leaderboard reflects current scoring data
- [ ] User's own row highlighted
- [ ] Tapping a player shows stats popover
- [ ] Renders correctly in RTL
- [ ] Updates within 30s after a match is scored

---

## 19. NOTIFICATIONS

### Types
1. Match start
2. Match end
3. Goal in pinned match
4. Friend invite
5. Leaderboard change (rank shifts ≥3 places)
6. Prediction reminder (60 min before, if no submission)

### Delivery
- **In-app**: bell with unread badge, drawer
- **Email digest**: optional daily, opt-in (capped well within Brevo 300/day)
- **Browser push**: out of scope

### Bell drawer
- Slide-in (right edge in LTR, left in RTL)
- 360px wide on tablet+, full-screen on mobile
- Newest first
- Each item tappable; navigates to `link`
- "Mark all as read" + "Settings"

### Settings UI
On Profile tab → "התראות":
- 5 toggles
- Email digest dropdown (off / daily / matchdays_only)
- "שמור העדפות"

### Quiet hours
Optional toggle: 22:00–08:00 IST. During quiet hours: no email digests, badge updates silently.

### Acceptance criteria for Phase 10
- [ ] Bell drawer opens with correct unread count
- [ ] Tapping a notification marks it read and navigates
- [ ] Notification prefs save and persist
- [ ] Email digest sends through Brevo at 09:00 IST (triggered by GitHub Actions)
- [ ] No notifications during quiet hours if enabled

---

## 20. TOURNAMENT STRUCTURE — 2026 SPECIFIC FACTS

The 2026 World Cup is the first 48-team World Cup, hosted jointly by Canada, Mexico, and the United States.
- **Group stage**: 12 groups of 4 teams (groups A–L). Top 2 + 8 best 3rd-place teams advance.
- **Knockouts**: Round of 32 → Round of 16 → Quarter-finals → Semi-finals → Third-place play-off → Final.
- 104 total matches. Tournament: June 11 – July 19, 2026.
- 16 host cities: Atlanta, Boston, Dallas, Guadalajara, Houston, Kansas City, Los Angeles, Mexico City, Miami, Monterrey, New York/New Jersey, Philadelphia, San Francisco Bay Area, Seattle, Toronto, Vancouver.

### `data/tournament.json` (committed)
```json
{
  "competition": "WC2026",
  "starts_on": "2026-06-11",
  "ends_on": "2026-07-19",
  "hosts": ["USA", "CAN", "MEX"],
  "stages": ["GROUP_STAGE", "ROUND_OF_32", "LAST_16", "QUARTER_FINALS", "SEMI_FINALS", "THIRD_PLACE", "FINAL"],
  "groups": ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"],
  "venues": [
    { "name_en": "MetLife Stadium", "name_he": "אצטדיון מטלייף", "city_en": "East Rutherford", "city_he": "איסט רת'רפורד", "country": "USA" },
    { "name_en": "SoFi Stadium",     "name_he": "אצטדיון סופיי",   "city_en": "Inglewood",       "city_he": "אינגלווד",       "country": "USA" },
    { "name_en": "AT&T Stadium",     "name_he": "אצטדיון AT&T",    "city_en": "Arlington",       "city_he": "ארלינגטון",      "country": "USA" },
    { "name_en": "Estadio Azteca",   "name_he": "אצטדיון אסטקה",   "city_en": "Mexico City",     "city_he": "מקסיקו סיטי",   "country": "MEX" },
    { "name_en": "BMO Field",        "name_he": "אצטדיון BMO",     "city_en": "Toronto",         "city_he": "טורונטו",        "country": "CAN" }
  ]
}
```

Until the draw is published, the app shows "Fixtures will be published after the draw" / "המשחקים יפורסמו לאחר ההגרלה" in the empty state.

---

## 21. PWA / OFFLINE / INSTALL

### Manifest (`static/manifest.json`)
```json
{
  "name": "Mondial 2026",
  "short_name": "Mondial",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#FFF6E5",
  "theme_color": "#E8542C",
  "lang": "he",
  "dir": "rtl",
  "icons": [
    { "src": "/static/img/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/static/img/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

### Service worker
- Precache app shell: `/`, `/login`, all CSS/JS in `/static/`, `lang/he.json`, `lang/en.json`
- Network-first for `/api/*` with stale-while-revalidate for `matches/today`
- Cache `flagcdn.com` for 30 days (saves bandwidth)
- Skip caching POST/PUT/DELETE

### Install prompt
Banner "התקן את האפליקציה" appears once per device, dismissable.

---

## 22. ERROR HANDLING

### Server side
- Every request handler wrapped in try/except
- On exception: log full traceback with request method/path/user-id, return 500 JSON
- 401 / 403 / 404 / 409 / 423 / 429 — see standard JSON shapes

### Client side
- All API calls go through `api.js`'s `fetchJson(path, opts)`
- Network errors → toast "אין חיבור לאינטרנט" + retry
- 401 → redirect to `/login`
- 423 → friendly inline in prediction modal
- 5xx → toast "אירעה שגיאה. נסה שוב."

### Logging
- `logging` module, INFO default
- Format: `%(asctime)s %(levelname)s [%(name)s] %(message)s`
- Render captures stdout/stderr automatically
- Include request_id per request

---

## 23. RATE LIMITING

In-process token bucket per user_id and per IP.

| Route                                       | Limit                  |
|---------------------------------------------|------------------------|
| `POST /auth/google/start`                   | 10/min per IP          |
| `POST /api/groups/<id>/invite`              | 20/hour per user       |
| `POST /api/groups/<id>/predictions/<id>`    | 60/min per user        |
| `GET /api/matches/*`                        | 120/min per user       |
| Other authenticated endpoints               | 60/min per user        |

On limit hit → 429 with `Retry-After`.

---

## 24. SECURITY

- Set: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: geolocation=(), microphone=(), camera=()`
- CSP: `default-src 'self'; img-src 'self' https://flagcdn.com https://lh3.googleusercontent.com data:; font-src 'self' https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; connect-src 'self'; frame-ancestors 'none';`
- HSTS in production
- All user input HTML-escaped (`textContent`, not `innerHTML`)
- Group join codes: 6 chars from 32-letter alphabet
- Invitation tokens: 32-byte URL-safe random
- **Repo is public** (for free GitHub Actions) → secrets only in env vars and GitHub Secrets, never in code

---

## 25. TESTING (manual QA checklist)

### Auth
- [ ] First-time login creates user with Hebrew default
- [ ] Returning user sees their last language
- [ ] Logout clears session

### Matches feed
- [ ] Today's matches with correct flags (sample 20)
- [ ] Day strip scrolls
- [ ] Live match shows pulsing dot
- [ ] Pin toggles
- [ ] Pull-to-refresh works on mobile

### Match detail
- [ ] Score updates without page refresh (within 20s)
- [ ] Events appear with correct icons
- [ ] Pin button reflects state

### Predictions
- [ ] Submit creates record
- [ ] Cannot submit after kickoff
- [ ] After kickoff, all members' predictions are visible
- [ ] After match ends, points appear within 60s
- [ ] Re-running scoring produces same result

### Friends
- [ ] Create group works
- [ ] Invite email arrives in Gmail
- [ ] Invite link in logged-out browser flows correctly
- [ ] Joining via code works

### Leaderboard
- [ ] Rank order correct
- [ ] Ties resolved by exact-prediction count
- [ ] Highlights "you"

### Notifications
- [ ] Bell badge updates
- [ ] Settings persist
- [ ] Email digest arrives at 09:00 IST on a match day

### Hebrew/i18n (THIS IS THE BIG ONE)
- [ ] Language toggle persists across reloads
- [ ] All visible text is translated — zero English leaking when Hebrew is selected
- [ ] All RTL layouts render correctly
- [ ] Numbers and times use Hebrew conventions
- [ ] Mixed-direction strings (with scores like "2-1" inside Hebrew sentences) render correctly via `<bdi>`
- [ ] All country names match Appendix A spellings
- [ ] All UI verbs are imperative masculine singular
- [ ] Owner has personally read every visible Hebrew string and approved

### Visual
- [ ] Flags correct (no Union Jack for England)
- [ ] Warm palette consistent
- [ ] No blue/green/purple accents
- [ ] Bottom nav always present
- [ ] Header sticky
- [ ] Dark mode looks good (auto)

### Performance
- [ ] First contentful paint <2s on 3G simulation
- [ ] No layout shift on score updates
- [ ] Live polling pauses when tab hidden

### Accessibility
- [ ] Tab through app — focus rings visible
- [ ] Icon-only buttons have aria-labels
- [ ] WCAG AA color contrast

### Cost discipline (THE OTHER BIG ONE)
- [ ] Render shows free tier active, no upgrade prompts dismissed
- [ ] MongoDB Atlas dashboard shows M0 active, storage <50MB
- [ ] Brevo dashboard shows free plan, daily count <30
- [ ] Football-Data.org dashboard shows free tier, well under 10 rpm
- [ ] No paid dependencies in `requirements.txt` or `package.json` (there is no package.json)
- [ ] No "Trial" or "30-day free" services hidden anywhere
- [ ] Repo is public; GitHub Actions minutes consumed are visible and well under quota

---

## 26. DEPLOYMENT (free, end to end)

### Local dev
1. `cp .env.example .env` and fill in credentials
2. `pip install -r requirements.txt`
3. `python server.py`
4. Open `http://localhost:8000`

### Render setup (free Web Service)
1. Create new "Web Service" from GitHub repo `jeniaka/mondial2026`
2. Build command: `pip install -r requirements.txt`
3. Start command: `python server.py`
4. Add all env vars from section 5
5. **Plan: Free** — never click any upgrade
6. Region: Frankfurt (closest to Israel)
7. Auto-deploy on `main`

### `render.yaml`
```yaml
services:
  - type: web
    name: mondial2026
    runtime: python
    plan: free
    buildCommand: pip install -r requirements.txt
    startCommand: python server.py
    envVars:
      - key: PORT
        value: 10000
      - key: MONGO_URI
        sync: false
      - key: MONGO_DB
        value: mondial2026
      - key: SESSION_SECRET
        sync: false
      - key: GOOGLE_CLIENT_ID
        sync: false
      - key: GOOGLE_CLIENT_SECRET
        sync: false
      - key: OAUTH_REDIRECT_URI
        value: https://mondial2026.onrender.com/auth/google/callback
      - key: BREVO_API_KEY
        sync: false
      - key: BREVO_SENDER_EMAIL
        value: noreply@mytasks.bar
      - key: BREVO_SENDER_NAME
        value: Mondial 2026
      - key: FOOTBALL_DATA_TOKEN
        sync: false
      - key: APP_BASE_URL
        value: https://mondial2026.onrender.com
      - key: INTERNAL_TOKEN
        sync: false
      - key: TZ
        value: Asia/Jerusalem
```

Note: **No `cron` service block.** We use GitHub Actions instead because Render's cron jobs are not free.

### MongoDB Atlas (free M0)
- Reuse `Cluster0.k1ogcwd.mongodb.net`
- Create database `mondial2026`
- Create database user `mondial2026_app` with read/write on `mondial2026`
- Network Access: ensure `0.0.0.0/0` is in allowlist (Render IPs are dynamic)
- **Plan: M0 free.** Never accept upgrade prompts.

### Brevo (free)
- Reuse existing account
- Confirm `noreply@mytasks.bar` is verified (DKIM/DMARC)
- Generate new HTTP API key for this app: `BREVO_API_KEY`
- **Plan: Free 300/day forever.**

### Google OAuth (free)
- Add `https://mondial2026.onrender.com/auth/google/callback`
- Add the 30 friends as test users — keeps app in "Testing" mode (no verification needed, free)

### Football-Data.org (free)
- Sign up with email
- Copy token

### First deploy verification
After deploy:
1. Visit `https://mondial2026.onrender.com` — should redirect to `/login`
2. Sign in with Google → land on `/`
3. Today's matches appear (or "no matches" pre-tournament)
4. Bell visible
5. Language toggle works
6. **Render dashboard: free plan active**
7. **MongoDB dashboard: M0 active**
8. **Brevo dashboard: free plan active**

---

## 26.5. GITHUB ACTIONS (free cron)

We replace Render's paid cron with free GitHub Actions workflows. Two workflows.

### `.github/workflows/keepalive.yml`
Pings the app every 14 minutes to prevent free-tier sleep during the World Cup window.

```yaml
name: keepalive
on:
  schedule:
    - cron: "*/14 * * * *"
  workflow_dispatch:
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Skip if outside tournament window
        id: window
        run: |
          NOW=$(date -u +%s)
          START=$(date -u -d "2026-06-01" +%s)
          END=$(date -u -d "2026-07-22" +%s)
          if [ "$NOW" -lt "$START" ] || [ "$NOW" -gt "$END" ]; then
            echo "outside=true" >> $GITHUB_OUTPUT
          fi
      - name: Ping /healthz
        if: steps.window.outputs.outside != 'true'
        run: |
          curl -fsS --max-time 30 "${{ secrets.RENDER_BASE_URL }}/healthz"
```

Cost: ~10s × 3,000 invocations during the tournament = 500 min. Well under 2,000 min/mo free quota.

### `.github/workflows/sync.yml`
Syncs match data and triggers scoring.

```yaml
name: sync
on:
  schedule:
    - cron: "*/2 * * * *"
  workflow_dispatch:
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Skip if outside tournament window
        id: window
        run: |
          NOW=$(date -u +%s)
          START=$(date -u -d "2026-06-10" +%s)
          END=$(date -u -d "2026-07-20" +%s)
          if [ "$NOW" -lt "$START" ] || [ "$NOW" -gt "$END" ]; then
            echo "outside=true" >> $GITHUB_OUTPUT
          fi
      - name: Sync matches
        if: steps.window.outputs.outside != 'true'
        run: |
          curl -fsS --max-time 60 \
            -X POST \
            -H "X-Internal-Token: ${{ secrets.INTERNAL_TOKEN }}" \
            "${{ secrets.RENDER_BASE_URL }}/internal/sync-matches"
      - name: Score predictions
        if: steps.window.outputs.outside != 'true'
        run: |
          curl -fsS --max-time 60 \
            -X POST \
            -H "X-Internal-Token: ${{ secrets.INTERNAL_TOKEN }}" \
            "${{ secrets.RENDER_BASE_URL }}/internal/score-predictions"
```

### `.github/workflows/digest.yml`
Daily digest email at 09:00 IST (06:00 UTC).

```yaml
name: digest
on:
  schedule:
    - cron: "0 6 * * *"
  workflow_dispatch:
jobs:
  digest:
    runs-on: ubuntu-latest
    steps:
      - name: Send digest
        run: |
          curl -fsS --max-time 60 \
            -X POST \
            -H "X-Internal-Token: ${{ secrets.INTERNAL_TOKEN }}" \
            "${{ secrets.RENDER_BASE_URL }}/internal/email-digest"
```

### GitHub Secrets to set
In repo Settings → Secrets and variables → Actions:
- `RENDER_BASE_URL` = `https://mondial2026.onrender.com`
- `INTERNAL_TOKEN` = same value as Render env

### Acceptance criteria for Phase 11
- [ ] All three workflows committed under `.github/workflows/`
- [ ] Manual `workflow_dispatch` trigger of each workflow succeeds
- [ ] After sync, matches collection updates visible in MongoDB
- [ ] Total minutes consumed visible at <https://github.com/jeniaka/mondial2026/actions> are well under 2,000/mo

---

## 27. README CONTENT

The README in the repo should be brief and useful. Outline:
- One-paragraph what is this
- "Cost: $0 / month forever — see SPEC.md §1.5" badge line
- Stack list
- Local dev quickstart (3 commands)
- Env vars table
- Deployment notes (Render, MongoDB, Brevo, Google OAuth, GitHub Actions)
- Link to this SPEC.md for full design

---

## 28. APPENDIX A — COUNTRY DICTIONARY

`data/countries.json` must contain entries for all 211 FIFA-affiliated nations. Each entry: `FIFA_CODE → { iso2, name_en, name_he }`.

These Hebrew spellings are the authoritative ones — used by Israeli football media (Sport5, ONE, ספורט וואלה). Use them exactly. Do not invent variants.

### UEFA (Europe)
- ALB → al · Albania · אלבניה
- AND → ad · Andorra · אנדורה
- ARM → am · Armenia · ארמניה
- AUT → at · Austria · אוסטריה
- AZE → az · Azerbaijan · אזרבייג'ן
- BLR → by · Belarus · בלארוס
- BEL → be · Belgium · בלגיה
- BIH → ba · Bosnia and Herzegovina · בוסניה והרצגובינה
- BUL → bg · Bulgaria · בולגריה
- CRO → hr · Croatia · קרואטיה
- CYP → cy · Cyprus · קפריסין
- CZE → cz · Czechia · צ'כיה
- DEN → dk · Denmark · דנמרק
- ENG → gb-eng · England · אנגליה
- EST → ee · Estonia · אסטוניה
- FRO → fo · Faroe Islands · איי פארו
- FIN → fi · Finland · פינלנד
- FRA → fr · France · צרפת
- GEO → ge · Georgia · גאורגיה
- GER → de · Germany · גרמניה
- GIB → gi · Gibraltar · גיברלטר
- GRE → gr · Greece · יוון
- HUN → hu · Hungary · הונגריה
- ISL → is · Iceland · איסלנד
- IRL → ie · Ireland · אירלנד
- ISR → il · Israel · ישראל
- ITA → it · Italy · איטליה
- KAZ → kz · Kazakhstan · קזחסטן
- XKX → xk · Kosovo · קוסובו
- LVA → lv · Latvia · לטביה
- LIE → li · Liechtenstein · ליכטנשטיין
- LTU → lt · Lithuania · ליטא
- LUX → lu · Luxembourg · לוקסמבורג
- MKD → mk · North Macedonia · צפון מקדוניה
- MLT → mt · Malta · מלטה
- MDA → md · Moldova · מולדובה
- MNE → me · Montenegro · מונטנגרו
- NED → nl · Netherlands · הולנד
- NIR → gb-nir · Northern Ireland · צפון אירלנד
- NOR → no · Norway · נורווגיה
- POL → pl · Poland · פולין
- POR → pt · Portugal · פורטוגל
- ROU → ro · Romania · רומניה
- RUS → ru · Russia · רוסיה
- SMR → sm · San Marino · סן מרינו
- SCO → gb-sct · Scotland · סקוטלנד
- SRB → rs · Serbia · סרביה
- SVK → sk · Slovakia · סלובקיה
- SVN → si · Slovenia · סלובניה
- ESP → es · Spain · ספרד
- SWE → se · Sweden · שוודיה
- SUI → ch · Switzerland · שווייץ
- TUR → tr · Turkey · טורקיה
- UKR → ua · Ukraine · אוקראינה
- WAL → gb-wls · Wales · ויילס

### CONMEBOL (South America)
- ARG → ar · Argentina · ארגנטינה
- BOL → bo · Bolivia · בוליביה
- BRA → br · Brazil · ברזיל
- CHI → cl · Chile · צ'ילה
- COL → co · Colombia · קולומביה
- ECU → ec · Ecuador · אקוודור
- PAR → py · Paraguay · פרגוואי
- PER → pe · Peru · פרו
- URU → uy · Uruguay · אורוגוואי
- VEN → ve · Venezuela · ונצואלה

### CONCACAF
- USA → us · United States · ארה"ב
- CAN → ca · Canada · קנדה
- MEX → mx · Mexico · מקסיקו
- CRC → cr · Costa Rica · קוסטה ריקה
- HON → hn · Honduras · הונדורס
- PAN → pa · Panama · פנמה
- SLV → sv · El Salvador · אל סלבדור
- GUA → gt · Guatemala · גואטמלה
- NCA → ni · Nicaragua · ניקרגואה
- BLZ → bz · Belize · בליז
- JAM → jm · Jamaica · ג'מייקה
- TRI → tt · Trinidad and Tobago · טרינידד וטובגו
- HAI → ht · Haiti · האיטי
- CUB → cu · Cuba · קובה
- DOM → do · Dominican Republic · הרפובליקה הדומיניקנית
- BAH → bs · Bahamas · בהאמה
- BRB → bb · Barbados · ברבדוס
- BER → bm · Bermuda · ברמודה
- CAY → ky · Cayman Islands · איי קיימן
- CUW → cw · Curaçao · קוראסאו
- DMA → dm · Dominica · דומיניקה
- GRN → gd · Grenada · גרנדה
- GUY → gy · Guyana · גיאנה
- LCA → lc · Saint Lucia · סנט לוסיה
- VIN → vc · Saint Vincent and the Grenadines · סנט וינסנט והגרנדינים
- KNA → kn · Saint Kitts and Nevis · סנט קיטס ונוויס
- SUR → sr · Suriname · סורינאם
- ATG → ag · Antigua and Barbuda · אנטיגואה וברבודה
- ARU → aw · Aruba · ארובה

### CAF (Africa)
- ALG → dz · Algeria · אלג'יריה
- ANG → ao · Angola · אנגולה
- BEN → bj · Benin · בנין
- BOT → bw · Botswana · בוטסואנה
- BFA → bf · Burkina Faso · בורקינה פאסו
- BDI → bi · Burundi · בורונדי
- CMR → cm · Cameroon · קמרון
- CPV → cv · Cape Verde · כף ורדה
- CTA → cf · Central African Republic · הרפובליקה המרכז-אפריקאית
- CHA → td · Chad · צ'אד
- COM → km · Comoros · קומורו
- CGO → cg · Congo · קונגו
- COD → cd · DR Congo · הרפובליקה הדמוקרטית של קונגו
- CIV → ci · Ivory Coast · חוף השנהב
- DJI → dj · Djibouti · ג'יבוטי
- EGY → eg · Egypt · מצרים
- EQG → gq · Equatorial Guinea · גינאה המשוונית
- ERI → er · Eritrea · אריתריאה
- ETH → et · Ethiopia · אתיופיה
- GAB → ga · Gabon · גבון
- GAM → gm · Gambia · גמביה
- GHA → gh · Ghana · גאנה
- GUI → gn · Guinea · גינאה
- GNB → gw · Guinea-Bissau · גינאה ביסאו
- KEN → ke · Kenya · קניה
- LES → ls · Lesotho · לסוטו
- LBR → lr · Liberia · ליבריה
- LBY → ly · Libya · לוב
- MAD → mg · Madagascar · מדגסקר
- MWI → mw · Malawi · מלאווי
- MLI → ml · Mali · מאלי
- MTN → mr · Mauritania · מאוריטניה
- MRI → mu · Mauritius · מאוריציוס
- MAR → ma · Morocco · מרוקו
- MOZ → mz · Mozambique · מוזמביק
- NAM → na · Namibia · נמיביה
- NIG → ne · Niger · ניז'ר
- NGA → ng · Nigeria · ניגריה
- RWA → rw · Rwanda · רואנדה
- STP → st · São Tomé and Príncipe · סאו טומה ופרינסיפה
- SEN → sn · Senegal · סנגל
- SEY → sc · Seychelles · סיישל
- SLE → sl · Sierra Leone · סיירה לאון
- SOM → so · Somalia · סומליה
- RSA → za · South Africa · דרום אפריקה
- SSD → ss · South Sudan · דרום סודאן
- SDN → sd · Sudan · סודאן
- SWZ → sz · Eswatini · אסוואטיני
- TAN → tz · Tanzania · טנזניה
- TOG → tg · Togo · טוגו
- TUN → tn · Tunisia · תוניסיה
- UGA → ug · Uganda · אוגנדה
- ZAM → zm · Zambia · זמביה
- ZIM → zw · Zimbabwe · זימבבואה

### AFC (Asia)
- AFG → af · Afghanistan · אפגניסטן
- AUS → au · Australia · אוסטרליה
- BHR → bh · Bahrain · בחריין
- BAN → bd · Bangladesh · בנגלדש
- BHU → bt · Bhutan · בהוטן
- BRU → bn · Brunei · ברוניי
- CAM → kh · Cambodia · קמבודיה
- CHN → cn · China · סין
- TPE → tw · Chinese Taipei · טאיוואן
- GUM → gu · Guam · גואם
- HKG → hk · Hong Kong · הונג קונג
- IND → in · India · הודו
- IDN → id · Indonesia · אינדונזיה
- IRN → ir · Iran · איראן
- IRQ → iq · Iraq · עיראק
- JPN → jp · Japan · יפן
- JOR → jo · Jordan · ירדן
- PRK → kp · North Korea · קוריאה הצפונית
- KOR → kr · South Korea · קוריאה הדרומית
- KUW → kw · Kuwait · כווית
- KGZ → kg · Kyrgyzstan · קירגיזסטן
- LAO → la · Laos · לאוס
- LBN → lb · Lebanon · לבנון
- MAC → mo · Macau · מקאו
- MAS → my · Malaysia · מלזיה
- MDV → mv · Maldives · האיים המלדיביים
- MNG → mn · Mongolia · מונגוליה
- MYA → mm · Myanmar · מיאנמר
- NEP → np · Nepal · נפאל
- OMA → om · Oman · עומאן
- PAK → pk · Pakistan · פקיסטן
- PLE → ps · Palestine · פלסטין
- PHI → ph · Philippines · הפיליפינים
- QAT → qa · Qatar · קטאר
- KSA → sa · Saudi Arabia · ערב הסעודית
- SGP → sg · Singapore · סינגפור
- SRI → lk · Sri Lanka · סרי לנקה
- SYR → sy · Syria · סוריה
- TJK → tj · Tajikistan · טג'יקיסטן
- THA → th · Thailand · תאילנד
- TLS → tl · Timor-Leste · טימור המזרחית
- TKM → tm · Turkmenistan · טורקמניסטן
- UAE → ae · United Arab Emirates · איחוד האמירויות
- UZB → uz · Uzbekistan · אוזבקיסטן
- VIE → vn · Vietnam · וייטנאם
- YEM → ye · Yemen · תימן

### OFC (Oceania)
- ASA → as · American Samoa · סמואה האמריקנית
- COK → ck · Cook Islands · איי קוק
- FIJ → fj · Fiji · פיג'י
- NCL → nc · New Caledonia · קלדוניה החדשה
- NZL → nz · New Zealand · ניו זילנד
- PNG → pg · Papua New Guinea · פפואה גינאה החדשה
- SAM → ws · Samoa · סמואה
- SOL → sb · Solomon Islands · איי שלמה
- TAH → pf · Tahiti · טהיטי
- TGA → to · Tonga · טונגה
- VAN → vu · Vanuatu · ונואטו

When generating `data/countries.json`, copy these entries verbatim. Do not paraphrase Hebrew names. If a country qualifies that's not on this list, **do not invent the Hebrew spelling — ask the owner**.

---

## 29. APPENDIX B — CLAUDE CODE WORKING STYLE

1. **Read the spec section that applies before coding.** Open the relevant section, re-read it, then write the code.
2. **Phase boundaries are commit boundaries.** When phase 4 is "done," write the commit `Phase 4: sports.py + cache + sync`, push, then start phase 5.
3. **No silent edits.** When you change `server.py` you also update the routing table in this spec if the route changed.
4. **Hebrew strings come from `lang/he.json` only.** If you need a string that isn't there, **stop and ask** before adding any Hebrew on the fly.
5. **Flags use `flag.js` only.** Never inline a flag URL elsewhere.
6. **API responses are typed.** Every endpoint has a documented response shape. Match it.
7. **No npm, no build step, no transpilation.** ES modules served directly.
8. **No `console.log` in committed code.** Use the logger or remove it.
9. **Test in both languages before saying "done."** Toggle to Hebrew, walk through the page, then toggle to English.
10. **When you finish a phase**, paste the acceptance-criteria checklist with each box checked, then push.
11. **Cost discipline** — before adding any dependency or service, re-read section 1.5. The answer is almost always "no, don't add it."
12. **Hebrew discipline** — before changing any Hebrew string, re-read section 10. If unsure, ask the owner.

---

## 30. APPENDIX C — KNOWN GOTCHAS (from prior projects)

1. **Python 3.13 removed `cgi`.** For any file uploads, use base64 in JSON, not multipart.
2. **Render free tier blocks SMTP ports 587/465.** Use Brevo HTTP API, not `smtplib`.
3. **Brevo SMTP login is auto-generated, not your account email.** We use HTTP API anyway.
4. **MongoDB Atlas blocks Render IPs.** Whitelist `0.0.0.0/0` in Network Access.
5. **Claude Code skips `git push`.** Push every phase. Verify with `git log origin/main`.
6. **`time.tzset()` doesn't work on Render's containers.** Set TZ via env var; use `zoneinfo` for conversions.
7. **`http.server` is single-threaded by default.** Use `ThreadingHTTPServer` so polling endpoints don't block each other.
8. **In dark mode, `flagcdn` flags can look harsh.** Add a 1px hairline border so they sit nicely on dark backgrounds.
9. **GitHub Actions cron has up to 15-minute delay** during high-load periods. Don't depend on minute-precision firing.
10. **Render free tier sleeps after 15 min idle** → keep-alive workflow handles this during tournament. Outside tournament, accept the 30s cold start.
11. **Public repo means secrets must NEVER be committed.** Use Render env + GitHub Actions Secrets only.
12. **Google OAuth "Testing" mode** allows 100 test users without app verification. We have 30. Stay in Testing mode forever.

---

## 31. APPENDIX D — COST AUDIT CHECKLIST (run monthly during tournament)

The owner can verify zero spend at any time by checking these dashboards:

- [ ] **Render** → Dashboard → mondial2026 service → confirm "Free" plan, no billing tab
- [ ] **MongoDB Atlas** → Project → Cluster0 → confirm M0 (Shared) tier, storage <50MB
- [ ] **Brevo** → Statistics → confirm Free plan, daily count tracked
- [ ] **Football-Data.org** → Account → confirm Free tier, request count visible
- [ ] **Google Cloud Console** → APIs & Services → confirm OAuth client only, no billing
- [ ] **GitHub** → Repo → Actions → minutes consumed visible, well under 2,000
- [ ] **Domain** — using `*.onrender.com`, confirm no domain purchase

If any line shows a charge: stop, investigate, revert. The "$0/month forever" guarantee is the design budget.

---

## 32. FINAL CHECKLIST BEFORE HANDOFF

Before you announce "v1 is done," walk through this list end-to-end:

- [ ] All 11 phases committed and pushed
- [ ] Render deploy is live and healthy at https://mondial2026.onrender.com
- [ ] GitHub Actions sync workflow runs every 2 minutes during tournament window and updates `matches`
- [ ] Sign-in works in incognito with a fresh Google account
- [ ] Sign-in works for an Israeli Google account with Hebrew default
- [ ] Today's matches render with correct flags
- [ ] Live polling updates without page refresh
- [ ] Pinning a match persists
- [ ] A second user can be invited by email and join a group
- [ ] Both users submit predictions, both lock at kickoff
- [ ] Match finishes → points awarded within 60s
- [ ] Leaderboard reflects points
- [ ] Notifications drawer shows the events
- [ ] Email digest fires next morning
- [ ] Toggling language refreshes UI completely
- [ ] **Hebrew strings have all been read by the owner and approved**
- [ ] Mobile portrait view looks polished
- [ ] Dark mode looks polished
- [ ] No console errors anywhere
- [ ] No broken images
- [ ] No 500s in Render logs over 30-min browsing
- [ ] **Cost audit checklist (section 31) passes — zero charges anywhere**

When all 22 boxes are checked: ship it.

---

**End of spec. This is the contract — build to it. Zero dollars. Perfect Hebrew.**
