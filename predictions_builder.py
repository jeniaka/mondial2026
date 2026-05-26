"""
predictions_builder.py — Daily cron orchestrator for building match predictions.

Connects directly to MongoDB using MONGO_URI + MONGO_DB env vars only.
Does NOT import config.py (avoids requiring the full set of server env vars).
Fetches all upcoming SCHEDULED/TIMED matches, runs all scrapers, aggregates,
and upserts to the match_predictions collection.

Usage: python predictions_builder.py
"""
from __future__ import annotations

import logging
import os
import sys
from datetime import datetime, timezone

from dotenv import load_dotenv
import pymongo

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
log = logging.getLogger(__name__)

_MONGO_URI = os.environ.get("MONGO_URI", "")
_MONGO_DB  = os.environ.get("MONGO_DB", "")

if _MONGO_URI and _MONGO_DB:
    _client = pymongo.MongoClient(_MONGO_URI)
    _db = _client[_MONGO_DB]
else:
    _db = {}  # type: ignore[assignment]  — replaced by mocks in tests

import predictions_aggregator
from predictions_sources import polymarket, forebet, betexplorer, footystats, superbru, elo

# ELO is listed first — always produces a result.
# Scraping sources return None gracefully when unavailable; aggregator averages valid ones.
_SCRAPERS = [
    elo.fetch,
    polymarket.fetch,
    forebet.fetch,
    betexplorer.fetch,
    footystats.fetch,
    superbru.fetch,
]


def _build(match: dict) -> dict | None:
    """Run all scrapers for one match, aggregate, return prediction doc or None."""
    home_en = (match.get("home") or {}).get("name_en", "")
    away_en = (match.get("away") or {}).get("name_en", "")
    home_he = (match.get("home") or {}).get("name_he", "") or home_en
    away_he = (match.get("away") or {}).get("name_he", "") or away_en

    if not home_en or not away_en:
        log.warning("Match %s: missing team names, skipping", match.get("_id"))
        return None

    results = []
    for fn in _SCRAPERS:
        try:
            results.append(fn(home_en, away_en))
        except Exception as exc:
            log.warning("Scraper %s raised: %s", fn.__module__, exc)
            results.append(None)

    agg = predictions_aggregator.aggregate(results, home_en, away_en, home_he, away_he)
    if not agg:
        log.info("No prediction produced for %s vs %s", home_en, away_en)
        return None

    return {
        "match_id": str(match["_id"]),
        "built_at": datetime.now(timezone.utc).isoformat(),
        **agg,
    }


def run() -> None:
    now = datetime.now(timezone.utc)

    # Fetch ALL upcoming matches — no time-window filter.
    # The daily cron rebuilds predictions for every unstarted match so that
    # the feature works from the moment the tournament schedule is known.
    matches = list(_db["matches"].find({  # type: ignore[index]
        "status": {"$in": ["SCHEDULED", "TIMED"]},
        "kickoff_utc": {"$gt": now},
    }))
    log.info("Upcoming SCHEDULED/TIMED matches: %d", len(matches))

    ok = 0
    for match in matches:
        doc = _build(match)
        if not doc:
            continue
        _db["match_predictions"].update_one(  # type: ignore[index]
            {"match_id": doc["match_id"]},
            {"$set": doc},
            upsert=True,
        )
        ok += 1
        h = (match.get("home") or {}).get("name_en", "?")
        a = (match.get("away") or {}).get("name_en", "?")
        log.info("Built: %s vs %s → %s", h, a, doc["match_id"])

    log.info("Done: %d/%d predictions built", ok, len(matches))


if __name__ == "__main__":
    if not _MONGO_URI or not _MONGO_DB:
        log.error("MONGO_URI and MONGO_DB env vars are required")
        sys.exit(1)
    run()
