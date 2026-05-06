# DIAGNOSIS — Mondial 2026 (2026-05-06)

## Previously fixed (session 1)
- Site showed "Building…" spinner forever → static/dist not in git → fixed via GitHub Actions build workflow
- Auth infinite loop → auth.tsx expected `data?.user` but backend returns user directly → fixed
- Notifications crash → backend returned plain array, frontend expected `{notifications,total,unread}` → fixed
- Match detail crash → `handle_predictions_get` returned plain array, frontend expected `{predictions,locked}` → fixed
- Bonus bet NameError → `read_json_body` doesn't exist, should be `parse_json_body` → fixed
- Bonus field name mismatch → backend used `winner_tla/finalist_a/b`, frontend uses `winner/finalist_1/2` → fixed

---

## Fix 1 — Matches feed shows "no upcoming matches"

**Root cause: sync.yml date guard prevents all syncs before 2026-06-10.**

```yaml
NOW=$(date -u +%s)
START=$(date -u -d "2026-06-10" +%s)
if [ "$NOW" -lt "$START" ]; then echo "outside=true" >> $GITHUB_OUTPUT; fi
# Sync step: if: steps.window.outputs.outside != 'true'  ← ALWAYS SKIPPED today
```

Today is 2026-05-06. The sync step and score step are unconditionally skipped. The MongoDB
`matches` collection has zero documents. The frontend fetches
`/api/matches?from=2026-06-11&to=2026-07-20`, gets `[]`, shows empty state.

Football-Data.org has all 104 WC 2026 fixtures (draw was December 2024). Competition code `WC`
is correct. Fix: remove date guard, change cron to every 6 hours, trigger manual sync immediately.

Also: sync currently doesn't write `iso2` to match documents. Frontend Flag component derives
iso2 from country name lookup — add it explicitly at sync time for reliability.

---

## Fix 2 — Leagues leaderboard shows nothing (members "invisible")

**Root cause: leaderboard aggregation filters to `points_awarded != null` only.**

```python
{"$match": {"group_id": gid, "points_awarded": {"$ne": None}}}
```

With no matches played yet, every prediction has `points_awarded = None`. The pipeline returns `[]`.
All group members are invisible. The UI renders an empty div — looks like "nothing happened."

Fix: after aggregation, append any group members missing from results with 0 pts.

---

## Fix 3 — Invite emails silently fail

**Root cause: invite endpoint returns `{ok:true}` regardless of Brevo result.**

```python
ok, err = mail.send_email(...)
if not ok:
    log.warning("Invite email failed: %s", err)  # logged but swallowed
send_json(handler, 200, {"ok": True, "email": to_email})  # always 200!
```

User sees "invite sent" toast even if Brevo rejected the request. The actual Brevo error is only
in Render logs, invisible to the user.

Fix: return 502 if Brevo fails; surface error to frontend; always show join code as fallback.

---

## Fix 4 — Last bottom tab labeled "Friends" instead of "Profile"

**Root cause:** `BottomTabs.tsx` uses `t("friends")` + `Users` icon for the last tab (which
routes to `/friends` = ProfilePage). Correct: `t("profile")` + `User` (single-person) icon.
Both strings already exist in i18n. No new strings needed.
