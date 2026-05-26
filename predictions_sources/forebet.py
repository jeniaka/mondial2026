import logging

import requests
from bs4 import BeautifulSoup

from predictions_sources import SourceResult

log = logging.getLogger(__name__)

_URL = "https://www.forebet.com/en/football-predictions"
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


def fetch(home: str, away: str) -> SourceResult | None:
    """Return Forebet-derived win probabilities, or None if unavailable."""
    try:
        resp = requests.get(_URL, headers=_HEADERS, timeout=_TIMEOUT)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
    except Exception as exc:
        log.debug("forebet: fetch failed: %s", exc)
        return None

    home_n = _norm(home)
    away_n = _norm(away)

    for row in soup.select(".rcnt"):
        h_el = row.select_one(".ht")
        a_el = row.select_one(".at")
        if not h_el or not a_el:
            continue
        if home_n not in _norm(h_el.get_text()) or away_n not in _norm(a_el.get_text()):
            continue

        probs = row.select(".fprc .fpr")
        if len(probs) < 3:
            probs = row.select(".fpr")
        if len(probs) < 3:
            return None

        try:
            h_pct = float(probs[0].get_text(strip=True).replace("%", "")) / 100
            d_pct = float(probs[1].get_text(strip=True).replace("%", "")) / 100
            a_pct = float(probs[2].get_text(strip=True).replace("%", "")) / 100
        except (ValueError, IndexError):
            return None

        total = h_pct + d_pct + a_pct
        if total <= 0:
            return None

        return SourceResult(
            source="forebet",
            home_win_pct=h_pct / total,
            draw_pct=d_pct / total,
            away_win_pct=a_pct / total,
            confidence=0.75,
        )

    return None
