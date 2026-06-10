"""
db.py — MongoDB client and collection helpers.
Implemented in Phase 2.
"""
import logging
from pymongo import MongoClient
from pymongo.collection import Collection
import config

log = logging.getLogger(__name__)

_client: MongoClient = None
_db = None


def get_db():
    global _client, _db
    if _db is None:
        _client = MongoClient(config.MONGO_URI)
        _db = _client[config.MONGO_DB]
        log.info("MongoDB connected to database '%s'", config.MONGO_DB)
    return _db


def users() -> Collection:
    return get_db()["users"]


def groups() -> Collection:
    return get_db()["groups"]


def invitations() -> Collection:
    return get_db()["invitations"]


def predictions() -> Collection:
    return get_db()["predictions"]


def matches() -> Collection:
    return get_db()["matches"]


def notifications() -> Collection:
    return get_db()["notifications"]


def tournament_bets() -> Collection:
    return get_db()["tournament_bets"]


def match_predictions() -> Collection:
    return get_db()["match_predictions"]


def ai_consensus() -> Collection:
    return get_db()["ai_consensus"]


def ensure_indexes():
    """Create all required indexes. Safe to run multiple times (idempotent)."""
    db = get_db()

    db["users"].create_index("email_lower", unique=True)
    # google_sub is sparse — email/password users don't have it.
    # Drop legacy non-sparse index if present, then create sparse one.
    try:
        existing = db["users"].index_information().get("google_sub_1")
        if existing and not existing.get("sparse"):
            db["users"].drop_index("google_sub_1")
            log.info("Dropped legacy non-sparse google_sub index")
    except Exception as e:
        log.warning("google_sub index check skipped: %s", e)
    db["users"].create_index("google_sub", unique=True, sparse=True)

    db["groups"].create_index("join_code", unique=True)
    db["groups"].create_index("members.user_id")

    db["invitations"].create_index("token", unique=True)
    db["invitations"].create_index("to_email_lower")

    db["predictions"].create_index(
        [("user_id", 1), ("group_id", 1), ("match_id", 1)], unique=True
    )
    db["predictions"].create_index([("group_id", 1), ("match_id", 1)])

    db["matches"].create_index("kickoff_utc")
    db["matches"].create_index("status")
    db["matches"].create_index([("stage", 1), ("matchday", 1)])

    db["notifications"].create_index(
        [("user_id", 1), ("read", 1), ("created_at", -1)]
    )

    db["tournament_bets"].create_index(
        [("group_id", 1), ("user_id", 1)], unique=True
    )
    db["match_predictions"].create_index("match_id", unique=True)
    db["match_predictions"].create_index("built_at")
    log.info("MongoDB indexes ensured")
