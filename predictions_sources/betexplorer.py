import logging

import requests
from bs4 import BeautifulSoup

from predictions_sources import SourceResult

log = logging.getLogger(__name__)

_URL = "https://www.betexplorer.com/soccer/world/world-cup-2026/"
_TIMEOUT = 12
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
}


def _norm(name: str) -> str:
    return name.lower().strip()


def _implied(odds: float) -> float:
    return 1.0 / odds if odds > 0 else 0.0


def fetch(home: str, away: str) -> SourceResult | None:
    """Return implied win probabilities from bookmaker odds, or None if unavailable."""
    try:
        resp = requests.get(_URL, headers=_HEADERS, timeout=_TIMEOUT)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
    except Exception as exc:
        log.debug("betexplorer: fetch failed: %s", exc)
        return None

    home_n = _norm(home)
    away_n = _norm(away)

    for row in soup.select("tr.valign-middle"):
        tt = row.select_one(".table-main__tt")
        if not tt:
            continue
        if home_n not in _norm(tt.get_text()) or away_n not in _norm(tt.get_text()):
            continue

        odds_els = row.select("[data-odd]")
        if len(odds_els) < 3:
            continue

        try:
            o1 = float(odds_els[0].get("data-odd", 0))
            ox = float(odds_els[1].get("data-odd", 0))
            o2 = float(odds_els[2].get("data-odd", 0))
        except (ValueError, TypeError):
            continue

        if not (o1 > 1 and ox > 1 and o2 > 1):
            continue

        h = _implied(o1)
        d = _implied(ox)
        a = _implied(o2)
        total = h + d + a
        if total <= 0:
            continue

        return SourceResult(
            source="betexplorer",
            home_win_pct=h / total,
            draw_pct=d / total,
            away_win_pct=a / total,
            confidence=0.80,
        )

    return None
