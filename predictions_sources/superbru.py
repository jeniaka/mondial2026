import logging

import requests
from bs4 import BeautifulSoup

from predictions_sources import SourceResult

log = logging.getLogger(__name__)

_URL = "https://www.superbru.com/worldcup2026/picks.php"
_TIMEOUT = 12
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
}


def _norm(name: str) -> str:
    return name.lower().strip()


def _pct(text: str) -> float:
    return float(text.strip().replace("%", "").strip()) / 100


def fetch(home: str, away: str) -> SourceResult | None:
    """Return SuperBru community win probabilities, or None if unavailable."""
    try:
        resp = requests.get(_URL, headers=_HEADERS, timeout=_TIMEOUT)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
    except Exception as exc:
        log.debug("superbru: fetch failed: %s", exc)
        return None

    home_n = _norm(home)
    away_n = _norm(away)

    for row in soup.select(".match-row, [class*='match']"):
        h_text = _norm(row.get("data-home", "") or "")
        a_text = _norm(row.get("data-away", "") or "")
        if not h_text or not a_text:
            h_el = row.select_one("[class*='home']")
            a_el = row.select_one("[class*='away']")
            if not h_el or not a_el:
                continue
            h_text = _norm(h_el.get_text())
            a_text = _norm(a_el.get_text())

        if home_n not in h_text or away_n not in a_text:
            continue

        pct_els = row.select(".win-pct, [class*='pct']")
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
            source="superbru",
            home_win_pct=h_p / total,
            draw_pct=d_p / total,
            away_win_pct=a_p / total,
            confidence=0.60,
        )

    return None
