import logging

import requests
from bs4 import BeautifulSoup

from predictions_sources import SourceResult

log = logging.getLogger(__name__)

_URL = "https://footystats.org/world-cup/predictions"
_TIMEOUT = 12
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}


def _norm(name: str) -> str:
    return name.lower().strip()


def _pct(text: str) -> float:
    return float(text.strip().replace("%", "").strip()) / 100


def fetch(home: str, away: str) -> SourceResult | None:
    """Return FootyStats-derived win probabilities, or None if unavailable."""
    try:
        resp = requests.get(_URL, headers=_HEADERS, timeout=_TIMEOUT)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
    except Exception as exc:
        log.debug("footystats: fetch failed: %s", exc)
        return None

    home_n = _norm(home)
    away_n = _norm(away)

    for card in soup.select(".prediction-card, [class*='predict']"):
        h_el = card.select_one(".home-team, [class*='home']")
        a_el = card.select_one(".away-team, [class*='away']")
        if not h_el or not a_el:
            continue
        if home_n not in _norm(h_el.get_text()) or away_n not in _norm(a_el.get_text()):
            continue

        pct_els = card.select(".prediction-percent, [class*='percent']")
        if len(pct_els) < 3:
            continue

        try:
            h_p = _pct(pct_els[0].get_text())
            d_p = _pct(pct_els[1].get_text())
            a_p = _pct(pct_els[2].get_text())
        except (ValueError, IndexError):
            return None

        total = h_p + d_p + a_p
        if total <= 0:
            return None

        return SourceResult(
            source="footystats",
            home_win_pct=h_p / total,
            draw_pct=d_p / total,
            away_win_pct=a_p / total,
            confidence=0.70,
        )

    return None
