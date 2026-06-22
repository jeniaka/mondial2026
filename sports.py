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
        "minute":  fd.get("minute"),
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


# ---------------------------------------------------------------------------
# Goal-event mapping (scorer + minute timeline)
# ---------------------------------------------------------------------------

# Football-Data /matches/{id} goal.type -> our internal event type.
# Our event schema is what server.py's notification + serializer code already
# expects: {minute, type ("GOAL"/"PENALTY_SCORED"/"OWN_GOAL"), scorer, team(fifa)}.
_FD_GOAL_TYPE = {
    "REGULAR": "GOAL",
    "PENALTY": "PENALTY_SCORED",
    "OWN":     "OWN_GOAL",
}


def _team_fifa_for_name(name: str, match_doc: dict) -> str:
    """Resolve a goal's team name to our FIFA/TLA code via the match's teams."""
    name_n = (name or "").strip().lower()
    home = match_doc.get("home", {})
    away = match_doc.get("away", {})
    if name_n and name_n == (away.get("name_en", "") or "").strip().lower():
        return away.get("fifa", "")
    if name_n and name_n == (home.get("name_en", "") or "").strip().lower():
        return home.get("fifa", "")
    return ""


def map_fd_goals(detail: dict, match_doc: dict) -> list:
    """Map a Football-Data /matches/{id} detail dict's `goals[]` into our events
    schema. Resolves the scoring team to our FIFA code by name. Sorted by minute.
    Returns [] when there is no detail or no goals."""
    if not detail:
        return []
    out = []
    for g in (detail.get("goals") or []):
        team_name = (g.get("team") or {}).get("name", "")
        score = g.get("score") or {}
        assist = g.get("assist") or None
        out.append({
            "minute":      g.get("minute"),
            "injury_time": g.get("injuryTime"),
            "type":        _FD_GOAL_TYPE.get(g.get("type", "REGULAR"), "GOAL"),
            "scorer":      (g.get("scorer") or {}).get("name"),
            "assist":      assist.get("name") if isinstance(assist, dict) else None,
            "team":        _team_fifa_for_name(team_name, match_doc),
            "score_home":  score.get("home"),
            "score_away":  score.get("away"),
        })
    out.sort(key=lambda e: ((e.get("minute") or 0), (e.get("injury_time") or 0)))
    return out


# ---------------------------------------------------------------------------
# openfootball fallback (no API key) — backfill goals for FINISHED matches
# when Football-Data's free tier omits the `goals` array.
# ---------------------------------------------------------------------------

OPENFOOTBALL_URL = (
    "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json"
)
TTL_OPENFOOTBALL = 3600  # 1h — source is hand-updated ~once/day


def fetch_openfootball():
    """Fetch + cache the openfootball 2026 worldcup.json. Returns parsed dict or None.
    Best-effort: returns None on 404 (file may not exist yet) or any error."""
    def fetch():
        try:
            r = http_requests.get(OPENFOOTBALL_URL, timeout=15)
            if r.status_code != 200:
                log.warning("openfootball fetch %s -> HTTP %s", OPENFOOTBALL_URL, r.status_code)
                return None
            return r.json()
        except Exception as exc:
            log.error("openfootball fetch failed: %s", exc)
            return None
    return _cached("openfootball:2026", TTL_OPENFOOTBALL, fetch)


def _flatten_openfootball(of_data: dict) -> list:
    """openfootball files put matches either at top-level `matches` or nested under
    `rounds[].matches`. Return a flat list of match dicts."""
    if not isinstance(of_data, dict):
        return []
    if isinstance(of_data.get("matches"), list):
        return of_data["matches"]
    out = []
    for rnd in (of_data.get("rounds") or []):
        out.extend(rnd.get("matches") or [])
    return out


def openfootball_events_for(match_doc: dict, of_data: dict) -> list:
    """Find the openfootball match matching match_doc (by team names, then date)
    and return its goals as our events schema. Best-effort backfill for FINISHED
    matches only. Returns [] if no confident match is found."""
    of_matches = _flatten_openfootball(of_data)
    if not of_matches:
        return []

    home = (match_doc.get("home", {}).get("name_en", "") or "").strip().lower()
    away = (match_doc.get("away", {}).get("name_en", "") or "").strip().lower()
    home_fifa = match_doc.get("home", {}).get("fifa", "")
    away_fifa = match_doc.get("away", {}).get("fifa", "")
    ko = match_doc.get("kickoff_utc")
    date_str = ko.strftime("%Y-%m-%d") if ko else None

    for m in of_matches:
        t1 = (m.get("team1") or "").strip().lower()
        t2 = (m.get("team2") or "").strip().lower()
        if {t1, t2} != {home, away}:
            continue
        # If both have a date, require it to match (guards same-pairing replays).
        if date_str and m.get("date") and m.get("date") != date_str:
            continue
        t1_fifa = home_fifa if t1 == home else away_fifa
        t2_fifa = away_fifa if t2 == away else home_fifa
        evs = []
        for goals_key, team_fifa in (("goals1", t1_fifa), ("goals2", t2_fifa)):
            for g in (m.get(goals_key) or []):
                if g.get("owngoal"):
                    typ = "OWN_GOAL"
                elif g.get("penalty"):
                    typ = "PENALTY_SCORED"
                else:
                    typ = "GOAL"
                evs.append({
                    "minute":      g.get("minute"),
                    "injury_time": g.get("offset"),
                    "type":        typ,
                    "scorer":      g.get("name"),
                    "assist":      None,
                    "team":        team_fifa,
                    "score_home":  None,
                    "score_away":  None,
                })
        evs.sort(key=lambda e: ((e.get("minute") or 0), (e.get("injury_time") or 0)))
        return evs
    return []
