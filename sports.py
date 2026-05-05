"""
sports.py — Football-Data.org client with in-process TTL cache.
Implemented in Phase 4.
"""
import logging
import time
from datetime import datetime, timezone, timedelta

import requests as http_requests

import config

log = logging.getLogger(__name__)

BASE_URL = "https://api.football-data.org/v4"

# In-process cache: key -> (data, expires_at)
_cache: dict = {}


def _headers() -> dict:
    return {"X-Auth-Token": config.FOOTBALL_DATA_TOKEN}


def _cached(key: str, ttl: int, fetch_fn):
    """Generic cache helper. ttl in seconds."""
    entry = _cache.get(key)
    if entry and time.time() < entry[1]:
        return entry[0]
    data = fetch_fn()
    if data is not None:
        _cache[key] = (data, time.time() + ttl)
    return data


def _get(path: str, params: dict = None):
    url = BASE_URL + path
    try:
        r = http_requests.get(url, headers=_headers(), params=params, timeout=15)
        if r.status_code == 429:
            log.warning("Football-Data rate limit hit, returning cached/None")
            return None
        r.raise_for_status()
        return r.json()
    except Exception as exc:
        log.error("Football-Data request failed: %s %s", url, exc)
        return None


# TTL constants (seconds)
TTL_ALL_FIXTURES     = 1800   # 30 min
TTL_TODAY_FIXTURES   = 300    # 5 min
TTL_LIVE             = 30     # 30 sec
TTL_LIVE_MATCH       = 20     # 20 sec
TTL_NONLIVE_MATCH    = 600    # 10 min
TTL_STANDINGS        = 900    # 15 min


def get_fixtures(status: str = None):
    """Fetch all WC fixtures, optionally filtered by status."""
    key = f"fixtures:{status or 'all'}"
    ttl = TTL_TODAY_FIXTURES if status == "LIVE" else TTL_ALL_FIXTURES

    def fetch():
        params = {"competition": config.FOOTBALL_DATA_COMPETITION}
        if status:
            params["status"] = status
        return _get(f"/competitions/{config.FOOTBALL_DATA_COMPETITION}/matches", params)

    return _cached(key, ttl, fetch)


def get_live():
    """Fetch currently live matches."""
    return _cached("live", TTL_LIVE, lambda: _get(
        f"/competitions/{config.FOOTBALL_DATA_COMPETITION}/matches",
        {"status": "LIVE"}
    ))


def get_match(match_id: str):
    """Fetch a single match by ID."""
    # Check if live to decide TTL
    key = f"match:{match_id}"
    existing = _cache.get(key)
    data = existing[0] if existing else None
    is_live = data and data.get("status") in ("IN_PLAY", "PAUSED", "LIVE")
    ttl = TTL_LIVE_MATCH if is_live else TTL_NONLIVE_MATCH
    return _cached(key, ttl, lambda: _get(f"/matches/{match_id}"))


def invalidate(key: str):
    """Remove an entry from the in-process cache (force fresh fetch on next call)."""
    _cache.pop(key, None)


def validate_team_tlas(match_docs: list, countries: dict) -> list:
    """Check every team TLA in match_docs against countries.json. Returns sorted list of missing TLAs."""
    missing = set()
    for m in match_docs:
        for side in ("home", "away"):
            tla = m.get(side, {}).get("fifa", "")
            if tla and tla not in countries:
                missing.add(tla)
    for tla in sorted(missing):
        log.warning("FLAG MISSING: team TLA '%s' not found in countries.json — flag will fall back to placeholder", tla)
    return sorted(missing)


def get_standings():
    """Fetch group standings."""
    return _cached("standings", TTL_STANDINGS, lambda: _get(
        f"/competitions/{config.FOOTBALL_DATA_COMPETITION}/standings"
    ))


def map_fd_match(fd: dict) -> dict:
    """Map Football-Data match dict to our internal schema."""
    from bson import ObjectId

    home_tla = fd.get("homeTeam", {}).get("tla", "")
    away_tla = fd.get("awayTeam", {}).get("tla", "")
    score_obj = fd.get("score", {})
    full = score_obj.get("fullTime", {})
    half = score_obj.get("halfTime", {})
    extra = score_obj.get("extraTime", {})
    penalties = score_obj.get("penalties", {})

    def _int(v):
        return int(v) if v is not None else None

    kickoff_str = fd.get("utcDate")
    kickoff_utc = None
    if kickoff_str:
        try:
            kickoff_utc = datetime.fromisoformat(kickoff_str.replace("Z", "+00:00"))
        except ValueError:
            pass

    stage_map = {
        "GROUP_STAGE":    "GROUP_STAGE",
        "ROUND_OF_16":    "LAST_16",
        "LAST_16":        "LAST_16",
        "QUARTER_FINALS": "QUARTER_FINALS",
        "SEMI_FINALS":    "SEMI_FINALS",
        "FINAL":          "FINAL",
        "THIRD_PLACE":    "THIRD_PLACE",
        "ROUND_OF_32":    "ROUND_OF_32",
    }

    return {
        "_id":          f"fd-{fd['id']}",
        "competition":  "WC2026",
        "stage":        stage_map.get(fd.get("stage", ""), fd.get("stage", "")),
        "group":        fd.get("group"),
        "matchday":     fd.get("matchday"),
        "kickoff_utc":  kickoff_utc,
        "venue":        fd.get("venue"),
        "city":         fd.get("area", {}).get("name"),
        "country_host": None,
        "home": {
            "fifa":    home_tla,
            "name_en": fd.get("homeTeam", {}).get("name", ""),
            "name_he": "",  # filled from countries.json lookup
        },
        "away": {
            "fifa":    away_tla,
            "name_en": fd.get("awayTeam", {}).get("name", ""),
            "name_he": "",  # filled from countries.json lookup
        },
        "status":  fd.get("status", "SCHEDULED"),
        "minute":  None,
        "score": {
            "home":     _int(full.get("home")),
            "away":     _int(full.get("away")),
            "ht_home":  _int(half.get("home")),
            "ht_away":  _int(half.get("away")),
            "ft_home":  _int(full.get("home")),
            "ft_away":  _int(full.get("away")),
            "et_home":  _int(extra.get("home")),
            "et_away":  _int(extra.get("away")),
            "pen_home": _int(penalties.get("home")),
            "pen_away": _int(penalties.get("away")),
            "winner":   score_obj.get("winner"),
        },
        "events":         [],
        "last_synced_at": datetime.now(timezone.utc),
    }
