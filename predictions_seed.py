"""
predictions_seed.py — derive per-match prediction documents from the bundled
AI consensus seed (data/ai_guesser_seed.json), with a pure-math ELO fallback.

The seed holds a tournament-wide weighted-consensus prediction (group picks,
knockout bracket, final answers). This module flattens it into the exact
per-match document shape that GET /api/prediction serves (same shape that
predictions_builder.py produces), so the "Guess For Me" button always has
data even when the scraping cron has not produced anything.

No network calls anywhere in this module — safe to run on the free dyno,
at server startup, and on every button click as a fallback.
"""
from __future__ import annotations

import json
import logging
import os
import unicodedata
from datetime import datetime, timezone

import predictions_aggregator
from predictions_sources import SourceResult, elo

log = logging.getLogger(__name__)

_SEED_PATH = os.path.join(os.path.dirname(__file__), "data", "ai_guesser_seed.json")

# Seed team names → canonical Football-Data/countries.json English names.
_ALIASES = {
    "usa": "united states",
    "bosnia": "bosnia and herzegovina",
    "bosnia & herzegovina": "bosnia and herzegovina",
    "bosnia herzegovina": "bosnia and herzegovina",   # FD.org: "Bosnia-Herzegovina"
    "curacao": "curacao",        # canonical form is normalized without diacritics
    "czech republic": "czechia",
    "turkiye": "turkey",
    "korea republic": "south korea",
    "cote d'ivoire": "ivory coast",
    "cabo verde": "cape verde",
    "cape verde islands": "cape verde",               # FD.org variant
    "ir iran": "iran",
    "congo dr": "dr congo",
}

# pick confidence → (win_pct, draw_pct, lose_pct, confidence)
_DECISIVE = {
    "High": (0.62, 0.22, 0.16, 0.80),
    "Med":  (0.52, 0.26, 0.22, 0.62),
    "Low":  (0.42, 0.30, 0.28, 0.45),
}
# draw pick → (home_pct, draw_pct, away_pct, confidence)
_DRAWISH = {
    "High": (0.28, 0.44, 0.28, 0.70),
    "Med":  (0.29, 0.42, 0.29, 0.55),
    "Low":  (0.30, 0.40, 0.30, 0.45),
}

_seed_cache: dict | None = None
_pair_index: dict[frozenset, dict] | None = None


def _norm(name: str) -> str:
    """Normalize a team name: strip diacritics, lowercase, collapse spaces, alias."""
    s = unicodedata.normalize("NFKD", name or "")
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = " ".join(s.lower().replace(".", "").replace("-", " ").split())
    return _ALIASES.get(s, s)


def load_seed() -> dict | None:
    """Load and cache the raw seed document. Returns None if file missing/broken."""
    global _seed_cache
    if _seed_cache is not None:
        return _seed_cache
    try:
        with open(_SEED_PATH, encoding="utf-8-sig") as f:
            _seed_cache = json.load(f)
    except Exception as exc:
        log.error("predictions_seed: cannot load %s: %s", _SEED_PATH, exc)
        return None
    return _seed_cache


def _iter_seed_matches(seed: dict):
    for group in (seed.get("groups") or {}).values():
        for m in group.get("matches") or []:
            yield m, "group"
    ko = seed.get("knockouts") or {}
    for stage in ("R32", "R16", "QF", "SF"):
        for m in ko.get(stage) or []:
            yield m, stage
    for key in ("third_place", "final"):
        if ko.get(key):
            yield ko[key], key


def _index() -> dict[frozenset, dict]:
    """Pair-of-teams → seed entry. Built once, ~70 entries."""
    global _pair_index
    if _pair_index is not None:
        return _pair_index
    _pair_index = {}
    seed = load_seed()
    if not seed:
        return _pair_index
    for entry, stage in _iter_seed_matches(seed):
        raw = entry.get("match", "")
        if " vs " not in raw:
            continue
        home_raw, away_raw = raw.split(" vs ", 1)
        try:
            h_goals, a_goals = (int(x) for x in entry.get("score", "").split("-", 1))
        except ValueError:
            continue
        key = frozenset((_norm(home_raw), _norm(away_raw)))
        # Group-stage entry wins over knockout rematch of the same pair
        if key in _pair_index and stage != "group":
            continue
        _pair_index[key] = {
            "seed_home": _norm(home_raw),
            "seed_away": _norm(away_raw),
            "pick": entry.get("pick", "Draw"),
            "pick_norm": _norm(entry.get("pick", "")),
            "h_goals": h_goals,
            "a_goals": a_goals,
            "confidence": entry.get("confidence", "Low"),
        }
    log.info("predictions_seed: indexed %d seed match entries", len(_pair_index))
    return _pair_index


def _seed_source(home_en: str, away_en: str) -> tuple[SourceResult, tuple[int, int]] | None:
    """Return (SourceResult, (home_goals, away_goals)) for the given real fixture
    orientation, or None when the pairing is not in the seed."""
    entry = _index().get(frozenset((_norm(home_en), _norm(away_en))))
    if not entry:
        return None

    flipped = _norm(home_en) != entry["seed_home"]
    h_goals = entry["a_goals"] if flipped else entry["h_goals"]
    a_goals = entry["h_goals"] if flipped else entry["a_goals"]

    conf_label = entry["confidence"] if entry["confidence"] in _DECISIVE else "Low"
    if entry["pick_norm"] == "draw" or not entry["pick_norm"]:
        h, d, a, conf = _DRAWISH[conf_label]
    else:
        win, d, lose, conf = _DECISIVE[conf_label]
        pick_is_home = entry["pick_norm"] == _norm(home_en)
        h, a = (win, lose) if pick_is_home else (lose, win)

    src = SourceResult(
        source="consensus",
        home_win_pct=h,
        draw_pct=d,
        away_win_pct=a,
        confidence=conf,
    )
    return src, (h_goals, a_goals)


def derive(home_en: str, away_en: str, home_he: str = "", away_he: str = "") -> dict | None:
    """Build a full prediction payload (aggregator shape) for one fixture.

    Seed consensus when the pairing is known; otherwise ELO math. Returns None
    only when team names are missing.
    """
    if not home_en or not away_en:
        return None
    home_he = home_he or home_en
    away_he = away_he or away_en

    seeded = _seed_source(home_en, away_en)
    if seeded:
        src, (h_goals, a_goals) = seeded
        agg = predictions_aggregator.aggregate([src], home_en, away_en, home_he, away_he)
        if agg:
            # Risk-3 ("Balanced") must show the seed's exact consensus scoreline
            agg["variants"][2]["home_score"] = h_goals
            agg["variants"][2]["away_score"] = a_goals
            return agg

    try:
        src = elo.fetch(home_en, away_en)
    except Exception as exc:
        log.warning("predictions_seed: elo fallback failed for %s vs %s: %s", home_en, away_en, exc)
        return None
    return predictions_aggregator.aggregate([src], home_en, away_en, home_he, away_he)


def derive_for_match(match: dict) -> dict | None:
    """derive() from a matches-collection document; adds match_id/built_at."""
    home = match.get("home") or {}
    away = match.get("away") or {}
    agg = derive(
        home.get("name_en", ""), away.get("name_en", ""),
        home.get("name_he", ""), away.get("name_he", ""),
    )
    if not agg:
        return None
    return {
        "match_id": str(match["_id"]),
        "built_at": datetime.now(timezone.utc).isoformat(),
        "seeded": True,
        **agg,
    }


def seed_missing(matches_col, predictions_col) -> dict:
    """Upsert a prediction doc for every upcoming match that lacks one.

    Never overwrites docs the scraping cron produced. Our own ELO-fallback docs
    (seeded + sources_used == ["elo"]) are upgraded when the consensus seed now
    matches the pairing. Returns {"matches": n, "seeded": n, "skipped": n}.
    """
    have = {
        d["match_id"]: d
        for d in predictions_col.find({}, {"match_id": 1, "seeded": 1, "sources_used": 1})
    }
    matches = list(matches_col.find({"status": {"$in": ["SCHEDULED", "TIMED"]}}))
    seeded = skipped = 0
    for match in matches:
        mid = str(match["_id"])
        existing = have.get(mid)
        upgradable = bool(existing) and existing.get("seeded") and existing.get("sources_used") == ["elo"]
        if existing and not upgradable:
            skipped += 1
            continue
        doc = derive_for_match(match)
        if not doc:
            skipped += 1
            continue
        predictions_col.update_one({"match_id": mid}, {"$set": doc}, upsert=True)
        seeded += 1
    log.info("predictions_seed: %d seeded, %d skipped of %d upcoming", seeded, skipped, len(matches))
    return {"matches": len(matches), "seeded": seeded, "skipped": skipped}


def store_raw_seed(consensus_col) -> bool:
    """Upsert the raw tournament-wide seed document into MongoDB (_id: wc2026)."""
    seed = load_seed()
    if not seed:
        return False
    consensus_col.update_one(
        {"_id": "wc2026"},
        {"$set": {**seed, "stored_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return True
