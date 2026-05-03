"""
config.py — reads all env vars at startup.
Crashes immediately with a clear message if any required var is missing.
"""
import os
import sys
import logging
from dotenv import load_dotenv

load_dotenv()

def _require(name: str) -> str:
    val = os.environ.get(name)
    if not val:
        print(f"FATAL: required env var '{name}' is not set. Exiting.", file=sys.stderr)
        sys.exit(1)
    return val

# --- Required ---
PORT                  = int(os.environ.get("PORT", "8000"))
MONGO_URI             = _require("MONGO_URI")
MONGO_DB              = _require("MONGO_DB")
SESSION_SECRET        = _require("SESSION_SECRET").encode()
GOOGLE_CLIENT_ID      = _require("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET  = _require("GOOGLE_CLIENT_SECRET")
OAUTH_REDIRECT_URI    = _require("OAUTH_REDIRECT_URI")
BREVO_API_KEY         = _require("BREVO_API_KEY")
BREVO_SENDER_EMAIL    = _require("BREVO_SENDER_EMAIL")
BREVO_SENDER_NAME     = _require("BREVO_SENDER_NAME")
FOOTBALL_DATA_TOKEN   = _require("FOOTBALL_DATA_TOKEN")
APP_BASE_URL          = _require("APP_BASE_URL").rstrip("/")
INTERNAL_TOKEN        = _require("INTERNAL_TOKEN")

# --- Optional ---
ADMIN_EMAILS = [e.strip() for e in os.environ.get("ADMIN_EMAILS", "").split(",") if e.strip()]
LOG_LEVEL    = os.environ.get("LOG_LEVEL", "INFO").upper()
TZ           = os.environ.get("TZ", "Asia/Jerusalem")

FOOTBALL_DATA_COMPETITION = os.environ.get("FOOTBALL_DATA_COMPETITION", "WC")

# Configure logging
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
