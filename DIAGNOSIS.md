# DIAGNOSIS — Mondial 2026 Production Outage

**Date:** 2026-05-06  
**Symptom:** Site at https://mondial2026.onrender.com/ shows "Mondial 26 ⚽ / האפליקציה נטענת… / Building…" spinner forever. Real app never loads.

---

## 1. Evidence gathered

| URL | Status | Body |
|-----|--------|------|
| `GET /` | 302 → /login | redirect |
| `GET /login` | 200 | **_BUILDING_PAGE placeholder** |
| `GET /static/dist/index.html` | 200 | **_BUILDING_PAGE placeholder** |
| `GET /healthz` | 200 | `{"ok": true, "ts": "..."}` |
| `GET /api/matches` | 401 | `{"error": "unauthenticated"}` |
| `GET /auth/google/start` | 302 | → Google OAuth — works |

**Conclusion from evidence:**
- Python backend is alive and healthy (healthz, APIs, OAuth all work)
- `static/dist/index.html` does **not exist** on the deployed server
- `server.py` `serve_static()` hits the `_BUILDING_PAGE` fallback branch (line ~190)

---

## 2. Root cause

`static/dist/index.html` is not present in the deployed environment.

**Why it's missing:**

The Render `runtime: python` build environment runs:
```
pip install -r requirements.txt && cd frontend && npm ci && npm run build
```

The npm build either:
- Fails silently (npm not reliably in PATH on Render's Python native env), OR
- Succeeds but the build artifacts are not preserved between build and run phases reliably

Evidence: `static/dist/` is not committed to git (`git ls-files static/dist/` returns nothing). Nothing puts the built files into a persistent location that Render's deploy can see.

---

## 3. Secondary issues found

- `GET /` redirects to `/login` for unauthenticated users — this is correct behavior, but means every unauthenticated visitor immediately sees the BUILDING_PAGE from `/login`
- The `_BUILDING_PAGE` fallback was added as a temporary measure but has become the permanent state
- `static/dist/` is gitignored by `dist/` rule with `!static/dist/` exception, so it CAN be committed — but nothing commits it

---

## 4. Fix plan

**Root fix:** Use GitHub Actions to build the frontend on every push to main and commit `static/dist/` into git. Render then just git-checkouts and runs `pip install` — no npm needed at deploy time.

Steps:
1. Create `.github/workflows/build-frontend.yml` — runs `npm ci && npm run build` and commits the output
2. Revert `render.yaml` buildCommand to `pip install -r requirements.txt` only
3. Push → GitHub Actions builds → commits `static/dist/` → Render redeploys → app live

**Why this is reliable:**
- Build happens on GitHub Actions Ubuntu (Node 20 guaranteed)  
- Built files live in git — Render's Python runtime just serves files, no npm needed
- Loop-safe: commit message includes `[skip ci]` + workflow only commits if there are actual changes

---

## 5. Risk

- First deploy after this fix will still show BUILDING_PAGE (~3-5 min) until GitHub Actions finishes building and pushes
- Subsequent deploys that don't change frontend source files will reuse the already-committed `static/dist/` (no rebuild needed)
- Infinite loop risk: mitigated by `[skip ci]` in bot commit message + checking for diff before committing
