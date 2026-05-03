"""
server.py — Main HTTP server and request router.
Uses Python standard-library ThreadingHTTPServer (no frameworks).
"""
import json
import logging
import mimetypes
import os
import re
import secrets
import traceback
import urllib.parse
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import config  # validates all env vars at import time
import db
import auth

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Rate limiter (in-process token bucket per key)
# ---------------------------------------------------------------------------
import time
import threading

_rate_buckets: dict = {}
_rate_lock = threading.Lock()

def _check_rate(key: str, limit: int, window: int) -> bool:
    """Returns True if request is allowed, False if rate-limited."""
    now = time.time()
    with _rate_lock:
        entry = _rate_buckets.get(key)
        if entry is None or now - entry[0] > window:
            _rate_buckets[key] = (now, 1)
            return True
        if entry[1] >= limit:
            return False
        _rate_buckets[key] = (entry[0], entry[1] + 1)
        return True


# ---------------------------------------------------------------------------
# Helper utilities
# ---------------------------------------------------------------------------

def send_json(handler: BaseHTTPRequestHandler, status: int, data, extra_headers: list = None):
    body = json.dumps(data, default=str, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    _set_security_headers(handler)
    if extra_headers:
        for k, v in extra_headers:
            handler.send_header(k, v)
    handler.end_headers()
    handler.wfile.write(body)


def send_redirect(handler: BaseHTTPRequestHandler, location: str, status: int = 302, extra_headers: list = None):
    handler.send_response(status)
    handler.send_header("Location", location)
    if extra_headers:
        for k, v in extra_headers:
            handler.send_header(k, v)
    handler.send_header("Content-Length", "0")
    handler.end_headers()


def send_html(handler: BaseHTTPRequestHandler, body: str, status: int = 200, extra_headers: list = None):
    encoded = body.encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "text/html; charset=utf-8")
    handler.send_header("Content-Length", str(len(encoded)))
    _set_security_headers(handler)
    if extra_headers:
        for k, v in extra_headers:
            handler.send_header(k, v)
    handler.end_headers()
    handler.wfile.write(encoded)


def _set_security_headers(handler: BaseHTTPRequestHandler):
    handler.send_header("X-Content-Type-Options", "nosniff")
    handler.send_header("X-Frame-Options", "DENY")
    handler.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
    handler.send_header("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
    handler.send_header(
        "Content-Security-Policy",
        "default-src 'self'; "
        "img-src 'self' https://flagcdn.com https://lh3.googleusercontent.com data:; "
        "font-src 'self' https://fonts.gstatic.com; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "connect-src 'self'; "
        "frame-ancestors 'none';"
    )
    if config.APP_BASE_URL.startswith("https"):
        handler.send_header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")


def read_body(handler: BaseHTTPRequestHandler) -> bytes:
    length = int(handler.headers.get("Content-Length", "0"))
    if length <= 0:
        return b""
    return handler.rfile.read(length)


def parse_json_body(handler: BaseHTTPRequestHandler) -> dict:
    raw = read_body(handler)
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}


def get_client_ip(handler: BaseHTTPRequestHandler) -> str:
    return (
        handler.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        or handler.client_address[0]
    )


def parse_qs(path: str) -> dict:
    if "?" not in path:
        return {}
    return dict(urllib.parse.parse_qsl(path.split("?", 1)[1]))


def require_internal_token(handler: BaseHTTPRequestHandler) -> bool:
    token = handler.headers.get("X-Internal-Token", "")
    if not secrets.compare_digest(token, config.INTERNAL_TOKEN):
        send_json(handler, 403, {"error": "forbidden"})
        return False
    return True


# ---------------------------------------------------------------------------
# Static file server
# ---------------------------------------------------------------------------

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")

_CACHE_CONTROL = {
    ".html": "no-cache",
    ".json": "no-cache",
    ".js":   "public, max-age=3600",
    ".css":  "public, max-age=3600",
    ".png":  "public, max-age=86400",
    ".svg":  "public, max-age=86400",
    ".ico":  "public, max-age=86400",
}

def serve_static(handler: BaseHTTPRequestHandler, rel_path: str):
    """Serve a file from the static/ directory."""
    safe_path = rel_path.lstrip("/")
    full_path = os.path.realpath(os.path.join(STATIC_DIR, safe_path))
    # Security: must stay inside STATIC_DIR
    if not full_path.startswith(os.path.realpath(STATIC_DIR)):
        send_json(handler, 403, {"error": "forbidden"})
        return
    if not os.path.isfile(full_path):
        send_json(handler, 404, {"error": "not found"})
        return
    ext = os.path.splitext(full_path)[1].lower()
    mime = mimetypes.guess_type(full_path)[0] or "application/octet-stream"
    cache_ctrl = _CACHE_CONTROL.get(ext, "public, max-age=3600")
    with open(full_path, "rb") as f:
        body = f.read()
    handler.send_response(200)
    handler.send_header("Content-Type", mime)
    handler.send_header("Content-Length", str(len(body)))
    handler.send_header("Cache-Control", cache_ctrl)
    _set_security_headers(handler)
    handler.end_headers()
    handler.wfile.write(body)


# ---------------------------------------------------------------------------
# Route handlers
# ---------------------------------------------------------------------------

def handle_healthz(handler: BaseHTTPRequestHandler, **_):
    send_json(handler, 200, {"ok": True, "ts": datetime.now(timezone.utc).isoformat()})


def handle_root_get(handler: BaseHTTPRequestHandler, **_):
    user = auth.current_user(handler)
    if not user:
        send_redirect(handler, "/login")
        return
    # Slide the session cookie
    cookies = auth.set_session_cookie(handler, str(user["_id"]))
    serve_static(handler, "index.html")


def handle_login_get(handler: BaseHTTPRequestHandler, **_):
    serve_static(handler, "login.html")


def handle_manifest(handler: BaseHTTPRequestHandler, **_):
    serve_static(handler, "manifest.json")


def handle_service_worker(handler: BaseHTTPRequestHandler, **_):
    serve_static(handler, "service-worker.js")


def handle_static(handler: BaseHTTPRequestHandler, path: str, **_):
    # path is what comes after /static/
    serve_static(handler, path)


# --- Auth routes ---

def handle_auth_google_start(handler: BaseHTTPRequestHandler, **_):
    ip = get_client_ip(handler)
    if not _check_rate(f"auth_start:{ip}", 10, 60):
        send_json(handler, 429, {"error": "rate_limited"})
        return
    state = secrets.token_urlsafe(32)
    url = auth.build_google_auth_url(state)
    is_prod = config.APP_BASE_URL.startswith("https")
    secure = "; Secure" if is_prod else ""
    state_cookie = f"mn_state={state}; HttpOnly{secure}; SameSite=Lax; Max-Age=600; Path=/"
    send_redirect(handler, url, extra_headers=[("Set-Cookie", state_cookie)])


def handle_auth_google_callback(handler: BaseHTTPRequestHandler, **_):
    qs = parse_qs(handler.path)
    code = qs.get("code", "")
    state = qs.get("state", "")
    error = qs.get("error", "")

    if error:
        send_redirect(handler, "/login?error=oauth_denied")
        return

    # Verify state cookie
    raw_cookies = handler.headers.get("Cookie", "")
    stored_state = ""
    for part in raw_cookies.split(";"):
        part = part.strip()
        if part.startswith("mn_state="):
            stored_state = part[len("mn_state="):]
    if not stored_state or not secrets.compare_digest(stored_state, state):
        send_redirect(handler, "/login?error=state_mismatch")
        return

    try:
        tokens = auth.exchange_code(code)
        userinfo = auth.get_userinfo(tokens["access_token"])
        user_id = auth.upsert_user(userinfo)
    except Exception as exc:
        log.error("OAuth callback error: %s", exc)
        send_redirect(handler, "/login?error=oauth_error")
        return

    session_headers = auth.set_session_cookie(handler, user_id)
    # Clear state cookie
    session_headers.append(("Set-Cookie", "mn_state=; Max-Age=0; Path=/"))

    # Check for pending invite cookie
    invite_token = ""
    for part in raw_cookies.split(";"):
        part = part.strip()
        if part.startswith("mn_invite="):
            invite_token = part[len("mn_invite="):]

    dest = f"/invite/{invite_token}" if invite_token else "/"
    send_redirect(handler, dest, extra_headers=session_headers)


def handle_auth_logout(handler: BaseHTTPRequestHandler, **_):
    headers = auth.clear_session_cookie()
    send_redirect(handler, "/login", extra_headers=headers)


def handle_auth_me(handler: BaseHTTPRequestHandler, **_):
    user = auth.current_user(handler)
    if not user:
        send_json(handler, 401, {"error": "unauthenticated"})
        return
    # Slide session
    cookies = auth.set_session_cookie(handler, str(user["_id"]))
    safe = {
        "id":           str(user["_id"]),
        "name":         user.get("name", ""),
        "email":        user.get("email", ""),
        "picture":      user.get("picture", ""),
        "locale_pref":  user.get("locale_pref", "he"),
        "is_admin":     user.get("is_admin", False),
        "notif_prefs":  user.get("notif_prefs", {}),
        "pinned_matches": user.get("pinned_matches", []),
    }
    send_json(handler, 200, safe, extra_headers=cookies)


# --- Match API ---

def handle_matches_get(handler: BaseHTTPRequestHandler, **_):
    user = auth.require_user(handler)
    if not user:
        return
    qs = parse_qs(handler.path)
    day = qs.get("day", "today")
    from_iso = qs.get("from")
    to_iso = qs.get("to")

    from datetime import timedelta
    now = datetime.now(timezone.utc)
    today = now.date()

    if from_iso and to_iso:
        try:
            d_from = datetime.fromisoformat(from_iso).replace(tzinfo=timezone.utc)
            d_to = datetime.fromisoformat(to_iso).replace(tzinfo=timezone.utc)
        except ValueError:
            send_json(handler, 400, {"error": "invalid date range"})
            return
    else:
        offsets = {"today": 0, "yesterday": -1, "tomorrow": 1}
        offset = offsets.get(day, 0)
        target = today + timedelta(days=offset)
        d_from = datetime(target.year, target.month, target.day, tzinfo=timezone.utc)
        d_to = d_from + timedelta(days=1)

    cursor = db.matches().find({
        "kickoff_utc": {"$gte": d_from, "$lt": d_to}
    }).sort("kickoff_utc", 1)
    result = [_serialize_match(m) for m in cursor]
    send_json(handler, 200, result)


def handle_matches_live(handler: BaseHTTPRequestHandler, **_):
    user = auth.require_user(handler)
    if not user:
        return
    cursor = db.matches().find({"status": {"$in": ["IN_PLAY", "PAUSED", "LIVE"]}}).sort("kickoff_utc", 1)
    result = [_serialize_match(m) for m in cursor]
    send_json(handler, 200, result)


def handle_match_get(handler: BaseHTTPRequestHandler, match_id: str, **_):
    user = auth.require_user(handler)
    if not user:
        return
    match = db.matches().find_one({"_id": match_id})
    if not match:
        send_json(handler, 404, {"error": "not found"})
        return
    send_json(handler, 200, _serialize_match(match))


def handle_standings_get(handler: BaseHTTPRequestHandler, group: str, **_):
    user = auth.require_user(handler)
    if not user:
        return
    # Standings served from cached sports data (Phase 4 will populate)
    send_json(handler, 200, {"group": group, "standings": []})


def handle_tournament_get(handler: BaseHTTPRequestHandler, **_):
    user = auth.require_user(handler)
    if not user:
        return
    import json as _json
    path = os.path.join(os.path.dirname(__file__), "data", "tournament.json")
    with open(path, encoding="utf-8") as f:
        data = _json.load(f)
    send_json(handler, 200, data)


def handle_countries_get(handler: BaseHTTPRequestHandler, **_):
    """Public endpoint — no auth required. Returns countries.json for flag component."""
    import json as _json
    path = os.path.join(os.path.dirname(__file__), "data", "countries.json")
    with open(path, encoding="utf-8") as f:
        data = _json.load(f)
    send_json(handler, 200, data)


def handle_match_pin(handler: BaseHTTPRequestHandler, match_id: str, **_):
    user = auth.require_user(handler)
    if not user:
        return
    from bson import ObjectId
    pinned = user.get("pinned_matches", [])
    if match_id in pinned:
        pinned.remove(match_id)
        pinned_now = False
    else:
        pinned.append(match_id)
        pinned_now = True
    db.users().update_one({"_id": user["_id"]}, {"$set": {"pinned_matches": pinned}})
    send_json(handler, 200, {"pinned": pinned_now, "match_id": match_id})


def handle_matches_pinned(handler: BaseHTTPRequestHandler, **_):
    user = auth.require_user(handler)
    if not user:
        return
    pinned_ids = user.get("pinned_matches", [])
    if not pinned_ids:
        send_json(handler, 200, [])
        return
    cursor = db.matches().find({"_id": {"$in": pinned_ids}}).sort("kickoff_utc", 1)
    send_json(handler, 200, [_serialize_match(m) for m in cursor])


# --- Groups API ---

def handle_groups_list(handler: BaseHTTPRequestHandler, **_):
    user = auth.require_user(handler)
    if not user:
        return
    from bson import ObjectId
    uid = user["_id"]
    grps = list(db.groups().find({"members.user_id": uid}))
    send_json(handler, 200, [_serialize_group(g, uid) for g in grps])


def handle_groups_create(handler: BaseHTTPRequestHandler, **_):
    user = auth.require_user(handler)
    if not user:
        return
    body = parse_json_body(handler)
    name = (body.get("name") or "").strip()
    if not name:
        send_json(handler, 400, {"error": "name required"})
        return
    from bson import ObjectId
    join_code = _generate_join_code()
    now = datetime.now(timezone.utc)
    doc = {
        "name": name,
        "owner_id": user["_id"],
        "join_code": join_code,
        "scoring_rules": "default",
        "created_at": now,
        "members": [{"user_id": user["_id"], "joined_at": now, "role": "owner"}],
    }
    result = db.groups().insert_one(doc)
    doc["_id"] = result.inserted_id
    send_json(handler, 201, _serialize_group(doc, user["_id"]))


def handle_group_get(handler: BaseHTTPRequestHandler, group_id: str, **_):
    user = auth.require_user(handler)
    if not user:
        return
    from bson import ObjectId
    try:
        gid = ObjectId(group_id)
    except Exception:
        send_json(handler, 404, {"error": "not found"})
        return
    grp = db.groups().find_one({"_id": gid})
    if not grp:
        send_json(handler, 404, {"error": "not found"})
        return
    member_ids = [m["user_id"] for m in grp.get("members", [])]
    if user["_id"] not in member_ids:
        send_json(handler, 403, {"error": "forbidden"})
        return
    send_json(handler, 200, _serialize_group(grp, user["_id"], include_members=True))


def handle_group_invite(handler: BaseHTTPRequestHandler, group_id: str, **_):
    user = auth.require_user(handler)
    if not user:
        return
    ip = get_client_ip(handler)
    uid_key = f"invite:{user['_id']}"
    if not _check_rate(uid_key, 20, 3600):
        send_json(handler, 429, {"error": "rate_limited"})
        return
    from bson import ObjectId
    try:
        gid = ObjectId(group_id)
    except Exception:
        send_json(handler, 404, {"error": "not found"})
        return
    grp = db.groups().find_one({"_id": gid})
    if not grp:
        send_json(handler, 404, {"error": "not found"})
        return
    # Must be owner or member
    member_ids = [m["user_id"] for m in grp.get("members", [])]
    if user["_id"] not in member_ids:
        send_json(handler, 403, {"error": "forbidden"})
        return
    # Check pending invite cap
    pending_count = db.invitations().count_documents({"group_id": gid, "status": "pending"})
    if pending_count >= 20:
        send_json(handler, 429, {"error": "too many pending invitations"})
        return
    body = parse_json_body(handler)
    to_email = (body.get("email") or "").strip().lower()
    if not to_email or "@" not in to_email:
        send_json(handler, 400, {"error": "valid email required"})
        return
    token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    from datetime import timedelta
    inv_doc = {
        "group_id":      gid,
        "from_user_id":  user["_id"],
        "to_email":      to_email,
        "to_email_lower": to_email,
        "token":         token,
        "status":        "pending",
        "created_at":    now,
        "expires_at":    now + timedelta(days=14),
        "accepted_at":   None,
    }
    db.invitations().insert_one(inv_doc)
    accept_url = f"{config.APP_BASE_URL}/invite/{token}"
    import mail
    subject, html_body = mail.build_invite_email_he(user.get("name", ""), grp["name"], accept_url)
    ok, err = mail.send_email(to_email, "", subject, html_body)
    if not ok:
        log.warning("Invite email failed: %s", err)
    send_json(handler, 200, {"ok": True, "email": to_email})


def handle_group_leave(handler: BaseHTTPRequestHandler, group_id: str, **_):
    user = auth.require_user(handler)
    if not user:
        return
    from bson import ObjectId
    try:
        gid = ObjectId(group_id)
    except Exception:
        send_json(handler, 404, {"error": "not found"})
        return
    grp = db.groups().find_one({"_id": gid})
    if not grp:
        send_json(handler, 404, {"error": "not found"})
        return
    # Owner cannot leave (must delete)
    if grp["owner_id"] == user["_id"]:
        send_json(handler, 400, {"error": "owner cannot leave; delete the group instead"})
        return
    db.groups().update_one(
        {"_id": gid},
        {"$pull": {"members": {"user_id": user["_id"]}}}
    )
    send_json(handler, 200, {"ok": True})


def handle_group_kick(handler: BaseHTTPRequestHandler, group_id: str, **_):
    user = auth.require_user(handler)
    if not user:
        return
    from bson import ObjectId
    try:
        gid = ObjectId(group_id)
    except Exception:
        send_json(handler, 404, {"error": "not found"})
        return
    grp = db.groups().find_one({"_id": gid})
    if not grp or grp["owner_id"] != user["_id"]:
        send_json(handler, 403, {"error": "only owner can kick"})
        return
    body = parse_json_body(handler)
    kick_id_str = body.get("user_id", "")
    try:
        kick_id = ObjectId(kick_id_str)
    except Exception:
        send_json(handler, 400, {"error": "invalid user_id"})
        return
    db.groups().update_one({"_id": gid}, {"$pull": {"members": {"user_id": kick_id}}})
    send_json(handler, 200, {"ok": True})


def handle_invite_accept(handler: BaseHTTPRequestHandler, **_):
    user = auth.require_user(handler)
    if not user:
        return
    body = parse_json_body(handler)
    token = (body.get("token") or "").strip()
    if not token:
        send_json(handler, 400, {"error": "token required"})
        return
    now = datetime.now(timezone.utc)
    inv = db.invitations().find_one({"token": token, "status": "pending"})
    if not inv or inv["expires_at"] < now:
        send_json(handler, 410, {"error": "invite_invalid"})
        return
    from bson import ObjectId
    # Add user to group if not already member
    grp = db.groups().find_one({"_id": inv["group_id"]})
    if not grp:
        send_json(handler, 404, {"error": "group not found"})
        return
    member_ids = [m["user_id"] for m in grp.get("members", [])]
    if user["_id"] not in member_ids:
        db.groups().update_one(
            {"_id": grp["_id"]},
            {"$push": {"members": {"user_id": user["_id"], "joined_at": now, "role": "member"}}}
        )
    db.invitations().update_one(
        {"_id": inv["_id"]},
        {"$set": {"status": "accepted", "accepted_at": now}}
    )
    send_json(handler, 200, {"ok": True, "group_id": str(grp["_id"]), "group_name": grp["name"]})


def handle_invite_page(handler: BaseHTTPRequestHandler, token: str, **_):
    user = auth.current_user(handler)
    if not user:
        # Stash token in cookie, redirect to login
        is_prod = config.APP_BASE_URL.startswith("https")
        secure = "; Secure" if is_prod else ""
        cookie = f"mn_invite={token}; HttpOnly{secure}; SameSite=Lax; Max-Age=600; Path=/"
        send_redirect(handler, "/login", extra_headers=[("Set-Cookie", cookie)])
        return
    # Validate invite
    now = datetime.now(timezone.utc)
    inv = db.invitations().find_one({"token": token, "status": "pending"})
    if not inv or inv["expires_at"] < now:
        serve_static(handler, "index.html")
        return
    grp = db.groups().find_one({"_id": inv["group_id"]})
    if not grp:
        serve_static(handler, "index.html")
        return
    # Pass invite info in HTML via inline script, then serve the SPA
    # The SPA will detect the invite data and show the join modal
    serve_static(handler, "index.html")


# --- Predictions API ---

def handle_predictions_get(handler: BaseHTTPRequestHandler, group_id: str, match_id: str, **_):
    user = auth.require_user(handler)
    if not user:
        return
    from bson import ObjectId
    try:
        gid = ObjectId(group_id)
    except Exception:
        send_json(handler, 404, {"error": "not found"})
        return
    grp = db.groups().find_one({"_id": gid})
    if not grp:
        send_json(handler, 404, {"error": "not found"})
        return
    member_ids = [m["user_id"] for m in grp.get("members", [])]
    if user["_id"] not in member_ids:
        send_json(handler, 403, {"error": "forbidden"})
        return
    match = db.matches().find_one({"_id": match_id})
    kicked_off = match and match.get("status") not in ("SCHEDULED", "TIMED", None)
    preds = list(db.predictions().find({"group_id": gid, "match_id": match_id}))
    result = []
    for p in preds:
        if not kicked_off and p["user_id"] != user["_id"]:
            # Hide prediction until kickoff
            result.append({"user_id": str(p["user_id"]), "hidden": True})
        else:
            result.append(_serialize_prediction(p))
    send_json(handler, 200, result)


def handle_prediction_submit(handler: BaseHTTPRequestHandler, group_id: str, match_id: str, **_):
    user = auth.require_user(handler)
    if not user:
        return
    ip = get_client_ip(handler)
    if not _check_rate(f"pred:{user['_id']}", 60, 60):
        send_json(handler, 429, {"error": "rate_limited"})
        return
    from bson import ObjectId
    try:
        gid = ObjectId(group_id)
    except Exception:
        send_json(handler, 404, {"error": "not found"})
        return
    match = db.matches().find_one({"_id": match_id})
    if not match:
        send_json(handler, 404, {"error": "match not found"})
        return
    # Check lock: cannot predict after kickoff
    kickoff = match.get("kickoff_utc")
    now = datetime.now(timezone.utc)
    if match.get("status") not in ("SCHEDULED", "TIMED") or (kickoff and now >= kickoff):
        send_json(handler, 423, {"error": "match_locked"})
        return
    grp = db.groups().find_one({"_id": gid})
    if not grp:
        send_json(handler, 404, {"error": "group not found"})
        return
    member_ids = [m["user_id"] for m in grp.get("members", [])]
    if user["_id"] not in member_ids:
        send_json(handler, 403, {"error": "forbidden"})
        return
    body = parse_json_body(handler)
    try:
        home_score = int(body["home_score"])
        away_score = int(body["away_score"])
        assert 0 <= home_score <= 15 and 0 <= away_score <= 15
    except (KeyError, ValueError, AssertionError):
        send_json(handler, 400, {"error": "score_invalid"})
        return
    knockout_advances = body.get("knockout_advances")
    pred_doc = {
        "user_id":           user["_id"],
        "group_id":          gid,
        "match_id":          match_id,
        "home_score":        home_score,
        "away_score":        away_score,
        "knockout_advances": knockout_advances,
        "submitted_at":      now,
        "locked_at":         kickoff,
        "points_awarded":    None,
        "scored_at":         None,
    }
    db.predictions().update_one(
        {"user_id": user["_id"], "group_id": gid, "match_id": match_id},
        {"$set": pred_doc},
        upsert=True
    )
    send_json(handler, 200, {"ok": True})


def handle_leaderboard_get(handler: BaseHTTPRequestHandler, group_id: str, **_):
    user = auth.require_user(handler)
    if not user:
        return
    from bson import ObjectId
    try:
        gid = ObjectId(group_id)
    except Exception:
        send_json(handler, 404, {"error": "not found"})
        return
    grp = db.groups().find_one({"_id": gid})
    if not grp:
        send_json(handler, 404, {"error": "not found"})
        return
    member_ids = [m["user_id"] for m in grp.get("members", [])]
    if user["_id"] not in member_ids:
        send_json(handler, 403, {"error": "forbidden"})
        return

    # Aggregate per user
    pipeline = [
        {"$match": {"group_id": gid, "points_awarded": {"$ne": None}}},
        {"$group": {
            "_id": "$user_id",
            "total": {"$sum": "$points_awarded"},
            "exact": {"$sum": {"$cond": [{"$eq": ["$points_awarded", 3]}, 1, 0]}},
            "correct": {"$sum": {"$cond": [{"$eq": ["$points_awarded", 1]}, 1, 0]}},
            "count": {"$sum": 1},
        }},
        {"$sort": {"total": -1, "exact": -1, "correct": -1}},
    ]
    rows = list(db.predictions().aggregate(pipeline))

    # Enrich with user info
    uid_map = {m["user_id"]: m for m in grp.get("members", [])}
    user_docs = {u["_id"]: u for u in db.users().find({"_id": {"$in": list(uid_map.keys())}})}

    result = []
    for rank, row in enumerate(rows, 1):
        u = user_docs.get(row["_id"], {})
        result.append({
            "rank":    rank,
            "user_id": str(row["_id"]),
            "name":    u.get("name", ""),
            "picture": u.get("picture", ""),
            "total":   row["total"],
            "exact":   row["exact"],
            "correct": row["correct"],
            "count":   row["count"],
            "is_me":   row["_id"] == user["_id"],
        })
    send_json(handler, 200, result)


def handle_my_predictions(handler: BaseHTTPRequestHandler, group_id: str, **_):
    user = auth.require_user(handler)
    if not user:
        return
    from bson import ObjectId
    try:
        gid = ObjectId(group_id)
    except Exception:
        send_json(handler, 404, {"error": "not found"})
        return
    preds = list(db.predictions().find({"user_id": user["_id"], "group_id": gid}))
    send_json(handler, 200, [_serialize_prediction(p) for p in preds])


# --- Notifications API ---

def handle_notifications_list(handler: BaseHTTPRequestHandler, **_):
    user = auth.require_user(handler)
    if not user:
        return
    qs = parse_qs(handler.path)
    page = max(1, int(qs.get("page", "1")))
    per_page = 20
    cursor = (
        db.notifications()
        .find({"user_id": user["_id"]})
        .sort("created_at", -1)
        .skip((page - 1) * per_page)
        .limit(per_page)
    )
    result = [_serialize_notification(n) for n in cursor]
    send_json(handler, 200, result)


def handle_notifications_read(handler: BaseHTTPRequestHandler, **_):
    user = auth.require_user(handler)
    if not user:
        return
    body = parse_json_body(handler)
    ids = body.get("ids")
    from bson import ObjectId
    if ids == "all" or ids is None:
        db.notifications().update_many({"user_id": user["_id"]}, {"$set": {"read": True}})
    else:
        oid_list = [ObjectId(i) for i in ids if i]
        db.notifications().update_many(
            {"_id": {"$in": oid_list}, "user_id": user["_id"]},
            {"$set": {"read": True}}
        )
    send_json(handler, 200, {"ok": True})


def handle_notifications_prefs(handler: BaseHTTPRequestHandler, **_):
    user = auth.require_user(handler)
    if not user:
        return
    body = parse_json_body(handler)
    allowed_keys = {"match_start", "match_end", "goal_in_pinned", "friend_invite", "leaderboard_change", "email_digest"}
    prefs = {k: v for k, v in body.items() if k in allowed_keys}
    db.users().update_one(
        {"_id": user["_id"]},
        {"$set": {f"notif_prefs.{k}": v for k, v in prefs.items()}}
    )
    send_json(handler, 200, {"ok": True})


def handle_notifications_unread_count(handler: BaseHTTPRequestHandler, **_):
    user = auth.require_user(handler)
    if not user:
        return
    count = db.notifications().count_documents({"user_id": user["_id"], "read": False})
    send_json(handler, 200, {"count": count})


# --- Internal / cron endpoints ---

def handle_internal_sync(handler: BaseHTTPRequestHandler, **_):
    if not require_internal_token(handler):
        return
    import sports
    import json as _json

    # Load country lookup
    countries_path = os.path.join(os.path.dirname(__file__), "data", "countries.json")
    with open(countries_path, encoding="utf-8") as f:
        countries = _json.load(f)

    data = sports.get_fixtures()
    if not data:
        send_json(handler, 200, {"ok": True, "synced": 0, "note": "no data from Football-Data"})
        return

    from pymongo import UpdateOne

    synced = 0
    ops = []
    for fd_match in data.get("matches", []):
        match_doc = sports.map_fd_match(fd_match)
        # Enrich Hebrew names
        for side in ("home", "away"):
            fifa = match_doc[side]["fifa"]
            country = countries.get(fifa, {})
            match_doc[side]["name_he"] = country.get("name_he", "")
            if not match_doc[side]["name_en"]:
                match_doc[side]["name_en"] = country.get("name_en", fifa)
        ops.append(UpdateOne(
            {"_id": match_doc["_id"]},
            {"$set": match_doc},
            upsert=True
        ))
        synced += 1

    if ops:
        db.matches().bulk_write(ops, ordered=False)

    # Fire notifications for status transitions (Phase 10)
    send_json(handler, 200, {"ok": True, "synced": synced})


def handle_internal_score(handler: BaseHTTPRequestHandler, **_):
    if not require_internal_token(handler):
        return
    qs = parse_qs(handler.path)
    match_id = qs.get("match_id")
    import scoring
    if match_id:
        scored, skipped = scoring.run_scoring_for_match(match_id)
        send_json(handler, 200, {"ok": True, "scored": scored, "skipped": skipped})
    else:
        total = scoring.run_scoring_all()
        send_json(handler, 200, {"ok": True, "total_scored": total})


def handle_internal_digest(handler: BaseHTTPRequestHandler, **_):
    if not require_internal_token(handler):
        return
    # Find opted-in users and send digest (full impl Phase 10)
    from datetime import datetime, timezone
    import mail
    import i18n

    users = list(db.users().find({"notif_prefs.email_digest": {"$ne": "off"}}))
    sent = 0
    for u in users:
        if not u.get("email"):
            continue
        lang = u.get("locale_pref", "he")
        subject = "Mondial 2026 — " + i18n.t("notifications.title", lang=lang)
        body = f"<p>Your daily Mondial 2026 digest</p>"  # Phase 10 will flesh this out
        ok, _ = mail.send_email(u["email"], u.get("name", ""), subject, body)
        if ok:
            sent += 1
    send_json(handler, 200, {"ok": True, "sent": sent})


# ---------------------------------------------------------------------------
# Serializers
# ---------------------------------------------------------------------------

def _serialize_match(m: dict) -> dict:
    return {
        "id":          m["_id"],
        "competition": m.get("competition"),
        "stage":       m.get("stage"),
        "group":       m.get("group"),
        "matchday":    m.get("matchday"),
        "kickoff_utc": m["kickoff_utc"].isoformat() if m.get("kickoff_utc") else None,
        "venue":       m.get("venue"),
        "city":        m.get("city"),
        "home":        m.get("home", {}),
        "away":        m.get("away", {}),
        "status":      m.get("status"),
        "minute":      m.get("minute"),
        "score":       m.get("score", {}),
        "events":      m.get("events", []),
    }


def _serialize_group(g: dict, current_uid, include_members: bool = False) -> dict:
    d = {
        "id":       str(g["_id"]),
        "name":     g.get("name", ""),
        "join_code": g.get("join_code", ""),
        "is_owner": g.get("owner_id") == current_uid,
        "member_count": len(g.get("members", [])),
    }
    if include_members:
        member_ids = [m["user_id"] for m in g.get("members", [])]
        user_docs = {u["_id"]: u for u in db.users().find({"_id": {"$in": member_ids}})}
        d["members"] = [
            {
                "user_id": str(m["user_id"]),
                "role":    m.get("role", "member"),
                "name":    user_docs.get(m["user_id"], {}).get("name", ""),
                "picture": user_docs.get(m["user_id"], {}).get("picture", ""),
            }
            for m in g.get("members", [])
        ]
    return d


def _serialize_prediction(p: dict) -> dict:
    return {
        "id":                str(p["_id"]),
        "user_id":           str(p["user_id"]),
        "group_id":          str(p["group_id"]),
        "match_id":          p["match_id"],
        "home_score":        p.get("home_score"),
        "away_score":        p.get("away_score"),
        "knockout_advances": p.get("knockout_advances"),
        "submitted_at":      p["submitted_at"].isoformat() if p.get("submitted_at") else None,
        "points_awarded":    p.get("points_awarded"),
    }


def _serialize_notification(n: dict) -> dict:
    return {
        "id":         str(n["_id"]),
        "type":       n.get("type"),
        "title_he":   n.get("title_he", ""),
        "title_en":   n.get("title_en", ""),
        "body_he":    n.get("body_he", ""),
        "body_en":    n.get("body_en", ""),
        "link":       n.get("link"),
        "read":       n.get("read", False),
        "created_at": n["created_at"].isoformat() if n.get("created_at") else None,
    }


def _generate_join_code() -> str:
    import random
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    while True:
        code = "".join(random.choices(alphabet, k=6))
        if not db.groups().find_one({"join_code": code}):
            return code


# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

ROUTES_GET = [
    (r"^/$",                                    handle_root_get),
    (r"^/login$",                               handle_login_get),
    (r"^/healthz$",                             handle_healthz),
    (r"^/invite/([^/]+)$",                      handle_invite_page),
    (r"^/static/(.+)$",                         handle_static),
    (r"^/manifest\.json$",                      handle_manifest),
    (r"^/service-worker\.js$",                  handle_service_worker),
    # Auth
    (r"^/auth/google/start$",                   handle_auth_google_start),
    (r"^/auth/google/callback$",                handle_auth_google_callback),
    (r"^/auth/me$",                             handle_auth_me),
    # Match data
    (r"^/api/matches/live$",                    handle_matches_live),
    (r"^/api/matches/pinned$",                  handle_matches_pinned),
    (r"^/api/matches$",                         handle_matches_get),
    (r"^/api/matches/([^/]+)$",                 handle_match_get),
    (r"^/api/standings/([^/]+)$",               handle_standings_get),
    (r"^/api/tournament$",                      handle_tournament_get),
    (r"^/api/countries$",                       handle_countries_get),
    # Groups
    (r"^/api/groups$",                          handle_groups_list),
    (r"^/api/groups/([^/]+)$",                  handle_group_get),
    # Predictions
    (r"^/api/groups/([^/]+)/predictions/([^/]+)$", handle_predictions_get),
    (r"^/api/groups/([^/]+)/leaderboard$",      handle_leaderboard_get),
    (r"^/api/groups/([^/]+)/my-predictions$",   handle_my_predictions),
    # Notifications
    (r"^/api/notifications$",                   handle_notifications_list),
    (r"^/api/notifications/unread-count$",      handle_notifications_unread_count),
]

ROUTES_POST = [
    (r"^/auth/logout$",                         handle_auth_logout),
    (r"^/api/groups$",                          handle_groups_create),
    (r"^/api/groups/([^/]+)/invite$",           handle_group_invite),
    (r"^/api/groups/([^/]+)/leave$",            handle_group_leave),
    (r"^/api/groups/([^/]+)/kick$",             handle_group_kick),
    (r"^/api/invites/accept$",                  handle_invite_accept),
    (r"^/api/matches/([^/]+)/pin$",             handle_match_pin),
    (r"^/api/groups/([^/]+)/predictions/([^/]+)$", handle_prediction_submit),
    (r"^/api/notifications/read$",              handle_notifications_read),
    (r"^/api/notifications/prefs$",             handle_notifications_prefs),
    (r"^/internal/sync-matches$",               handle_internal_sync),
    (r"^/internal/score-predictions$",          handle_internal_score),
    (r"^/internal/email-digest$",               handle_internal_digest),
]


def _dispatch(handler: BaseHTTPRequestHandler, routes: list):
    path = handler.path.split("?")[0]
    for pattern, fn in routes:
        m = re.fullmatch(pattern, path)
        if m:
            try:
                fn(handler, **{f"arg{i}": v for i, v in enumerate(m.groups())},
                   **dict(zip(
                       [p.lstrip("^").rstrip("$").replace("([^/]+)", "group").split("/")[-1]
                        for _ in [pattern]],
                       []
                   )))
                # simpler: pass groups as positional
                pass
            except Exception:
                log.error("Handler error: %s\n%s", handler.path, traceback.format_exc())
                try:
                    send_json(handler, 500, {"error": "internal server error"})
                except Exception:
                    pass
            return True
    return False


def _dispatch2(handler: BaseHTTPRequestHandler, routes: list):
    """Dispatch using named capture groups."""
    path = handler.path.split("?")[0]
    for pattern, fn in routes:
        m = re.fullmatch(pattern, path)
        if m:
            try:
                groups = m.groups()
                # Map positional groups to likely param names based on route
                kwargs = _groups_to_kwargs(pattern, groups)
                fn(handler, **kwargs)
            except Exception:
                log.error("Handler error: %s\n%s", handler.path, traceback.format_exc())
                try:
                    send_json(handler, 500, {"error": "internal server error"})
                except Exception:
                    pass
            return True
    return False


_PARAM_NAMES = {
    r"^/invite/([^/]+)$":                           ("token",),
    r"^/static/(.+)$":                              ("path",),
    r"^/api/matches/([^/]+)$":                      ("match_id",),
    r"^/api/standings/([^/]+)$":                    ("group",),
    r"^/api/groups/([^/]+)$":                       ("group_id",),
    r"^/api/groups/([^/]+)/invite$":                ("group_id",),
    r"^/api/groups/([^/]+)/leave$":                 ("group_id",),
    r"^/api/groups/([^/]+)/kick$":                  ("group_id",),
    r"^/api/matches/([^/]+)/pin$":                  ("match_id",),
    r"^/api/groups/([^/]+)/predictions/([^/]+)$":   ("group_id", "match_id"),
    r"^/api/groups/([^/]+)/leaderboard$":           ("group_id",),
    r"^/api/groups/([^/]+)/my-predictions$":        ("group_id",),
}


def _groups_to_kwargs(pattern: str, groups: tuple) -> dict:
    names = _PARAM_NAMES.get(pattern, ())
    return dict(zip(names, groups))


# ---------------------------------------------------------------------------
# Request handler class
# ---------------------------------------------------------------------------

class MondialHandler(BaseHTTPRequestHandler):
    server_version = "Mondial/1.0"

    def log_message(self, format, *args):  # silence default logging; use our logger
        log.debug("%s - %s", self.address_string(), format % args)

    def do_GET(self):
        if not _dispatch2(self, ROUTES_GET):
            send_json(self, 404, {"error": "not found"})

    def do_POST(self):
        # CSRF: require X-Requested-With: fetch
        if not handler_passes_csrf(self):
            return
        if not _dispatch2(self, ROUTES_POST):
            send_json(self, 404, {"error": "not found"})

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()


def handler_passes_csrf(handler: BaseHTTPRequestHandler) -> bool:
    # Skip CSRF for internal endpoints (they use INTERNAL_TOKEN)
    path = handler.path.split("?")[0]
    if path.startswith("/internal/"):
        return True
    # Auth callbacks from Google don't come with our headers
    if path.startswith("/auth/"):
        return True
    xrw = handler.headers.get("X-Requested-With", "")
    if xrw != "fetch":
        send_json(handler, 403, {"error": "csrf"})
        return False
    return True


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    db.ensure_indexes()
    host = "0.0.0.0"
    port = config.PORT
    server = ThreadingHTTPServer((host, port), MondialHandler)
    log.info("Mondial 2026 server listening on %s:%d", host, port)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        log.info("Shutting down")


if __name__ == "__main__":
    main()
