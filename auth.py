"""
auth.py — Google OAuth 2.0 + signed session cookies.
Implemented in Phase 2.
"""
import base64
import hashlib
import hmac
import json
import logging
import os
import secrets
import time
import urllib.parse
from http.server import BaseHTTPRequestHandler

import requests as http_requests

import config
import db

log = logging.getLogger(__name__)

COOKIE_NAME = "mn_sess"
SESSION_MAX_AGE = 30 * 24 * 3600  # 30 days

GOOGLE_AUTH_URL    = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL   = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


# ---------------------------------------------------------------------------
# Session cookie helpers
# ---------------------------------------------------------------------------

def make_session(user_id: str) -> str:
    payload = base64.urlsafe_b64encode(
        json.dumps({"uid": user_id, "iat": int(time.time())}).encode()
    ).decode()
    sig = base64.urlsafe_b64encode(
        hmac.new(config.SESSION_SECRET, payload.encode(), hashlib.sha256).digest()
    ).decode()
    return f"{payload}.{sig}"


def verify_session(cookie_value: str):
    """Returns user_id string or None if invalid/expired."""
    try:
        payload, sig = cookie_value.rsplit(".", 1)
    except ValueError:
        return None
    expected_sig = base64.urlsafe_b64encode(
        hmac.new(config.SESSION_SECRET, payload.encode(), hashlib.sha256).digest()
    ).decode()
    if not hmac.compare_digest(sig, expected_sig):
        return None
    try:
        data = json.loads(base64.urlsafe_b64decode(payload + "=="))
    except Exception:
        return None
    if time.time() - data.get("iat", 0) > SESSION_MAX_AGE:
        return None
    return data.get("uid")


def _parse_cookies(handler: BaseHTTPRequestHandler) -> dict:
    raw = handler.headers.get("Cookie", "")
    result = {}
    for part in raw.split(";"):
        part = part.strip()
        if "=" in part:
            k, v = part.split("=", 1)
            result[k.strip()] = v.strip()
    return result


def current_user(handler: BaseHTTPRequestHandler):
    """Returns the user dict from MongoDB, or None."""
    cookies = _parse_cookies(handler)
    token = cookies.get(COOKIE_NAME)
    if not token:
        return None
    user_id = verify_session(token)
    if not user_id:
        return None
    from bson import ObjectId
    user = db.users().find_one({"_id": ObjectId(user_id)})
    return user


def require_user(handler: BaseHTTPRequestHandler):
    """Returns user dict or sends 401 and returns None."""
    user = current_user(handler)
    if user is None:
        from server import send_json
        send_json(handler, 401, {"error": "unauthenticated"})
        return None
    return user


def set_session_cookie(handler: BaseHTTPRequestHandler, user_id: str, additional_headers: list = None):
    """Returns list of Set-Cookie header strings."""
    token = make_session(user_id)
    is_prod = config.APP_BASE_URL.startswith("https")
    secure = "; Secure" if is_prod else ""
    cookie = (
        f"{COOKIE_NAME}={token}; HttpOnly{secure}; SameSite=Lax; "
        f"Max-Age={SESSION_MAX_AGE}; Path=/"
    )
    return [("Set-Cookie", cookie)]


def clear_session_cookie() -> list:
    return [("Set-Cookie", f"{COOKIE_NAME}=; HttpOnly; Max-Age=0; Path=/")]


# ---------------------------------------------------------------------------
# OAuth flow helpers
# ---------------------------------------------------------------------------

def build_google_auth_url(state: str) -> str:
    params = {
        "client_id":     config.GOOGLE_CLIENT_ID,
        "redirect_uri":  config.OAUTH_REDIRECT_URI,
        "response_type": "code",
        "scope":         "openid email profile",
        "state":         state,
        "prompt":        "select_account",
    }
    return GOOGLE_AUTH_URL + "?" + urllib.parse.urlencode(params)


def exchange_code(code: str) -> dict:
    """Exchange authorization code for tokens. Returns token dict."""
    r = http_requests.post(GOOGLE_TOKEN_URL, data={
        "code":          code,
        "client_id":     config.GOOGLE_CLIENT_ID,
        "client_secret": config.GOOGLE_CLIENT_SECRET,
        "redirect_uri":  config.OAUTH_REDIRECT_URI,
        "grant_type":    "authorization_code",
    }, timeout=10)
    r.raise_for_status()
    return r.json()


def get_userinfo(access_token: str) -> dict:
    r = http_requests.get(GOOGLE_USERINFO_URL, headers={"Authorization": f"Bearer {access_token}"}, timeout=10)
    r.raise_for_status()
    return r.json()


def upsert_user(userinfo: dict) -> str:
    """Upsert user from Google userinfo. Returns str(user_id)."""
    from datetime import datetime, timezone
    from bson import ObjectId

    now = datetime.now(timezone.utc)
    google_sub = userinfo["sub"]
    email = userinfo.get("email", "").lower()

    existing = db.users().find_one({"google_sub": google_sub})
    if existing:
        db.users().update_one(
            {"_id": existing["_id"]},
            {"$set": {
                "last_login_at": now,
                "name":          userinfo.get("name", existing.get("name", "")),
                "picture":       userinfo.get("picture", existing.get("picture", "")),
            }}
        )
        return str(existing["_id"])

    # First login — create new user with all defaults
    is_admin = email in [e.lower() for e in config.ADMIN_EMAILS]
    user_doc = {
        "google_sub":    google_sub,
        "email":         userinfo.get("email", ""),
        "email_lower":   email,
        "name":          userinfo.get("name", ""),
        "picture":       userinfo.get("picture", ""),
        "locale_pref":   "he",
        "is_admin":      is_admin,
        "created_at":    now,
        "last_login_at": now,
        "notif_prefs": {
            "match_start":        True,
            "match_end":          True,
            "goal_in_pinned":     True,
            "friend_invite":      True,
            "leaderboard_change": True,
            "email_digest":       "daily",
        },
        "pinned_matches": [],
    }
    result = db.users().insert_one(user_doc)
    log.info("New user created: %s (%s)", email, result.inserted_id)
    return str(result.inserted_id)


# ---------------------------------------------------------------------------
# Email / password auth
# ---------------------------------------------------------------------------

PW_ITERATIONS = 200_000


def hash_password(password: str) -> str:
    """Returns base64-encoded salt+hash (sha256 pbkdf2, 200k rounds)."""
    salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PW_ITERATIONS)
    return base64.b64encode(salt + dk).decode()


def verify_password(password: str, encoded: str) -> bool:
    """Constant-time verify a password against stored hash."""
    try:
        data = base64.b64decode(encoded.encode())
        salt, stored = data[:16], data[16:]
        dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PW_ITERATIONS)
        return hmac.compare_digest(dk, stored)
    except Exception:
        return False


def register_user(name: str, email: str, password: str):
    """Create email/password user. Returns (user_id, err) tuple. err is None on success."""
    from datetime import datetime, timezone

    name = (name or "").strip()
    email = (email or "").strip()
    email_lower = email.lower()

    if not name or not email or not password:
        return (None, "missing_fields")
    if "@" not in email or "." not in email_lower.split("@")[-1]:
        return (None, "invalid_email")
    if len(password) < 8:
        return (None, "password_too_short")
    if len(name) > 80 or len(email) > 200:
        return (None, "too_long")

    if db.users().find_one({"email_lower": email_lower}):
        return (None, "email_exists")

    now = datetime.now(timezone.utc)
    is_admin = email_lower in [e.lower() for e in config.ADMIN_EMAILS]
    user_doc = {
        "email":         email,
        "email_lower":   email_lower,
        "name":          name,
        "picture":       "",
        "password_hash": hash_password(password),
        "locale_pref":   "he",
        "is_admin":      is_admin,
        "created_at":    now,
        "last_login_at": now,
        "notif_prefs": {
            "match_start":        True,
            "match_end":          True,
            "goal_in_pinned":     True,
            "friend_invite":      True,
            "leaderboard_change": True,
            "email_digest":       "daily",
        },
        "pinned_matches": [],
    }
    result = db.users().insert_one(user_doc)
    log.info("New user (email/pw) registered: %s (%s)", email_lower, result.inserted_id)
    return (str(result.inserted_id), None)


def login_password(email: str, password: str):
    """Verify email/password. Returns user_id or None."""
    from datetime import datetime, timezone

    email_lower = (email or "").strip().lower()
    if not email_lower or not password:
        return None
    user = db.users().find_one({"email_lower": email_lower})
    if not user or not user.get("password_hash"):
        return None
    if not verify_password(password, user["password_hash"]):
        return None
    db.users().update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login_at": datetime.now(timezone.utc)}}
    )
    return str(user["_id"])
