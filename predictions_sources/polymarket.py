import json
import logging

import requests

from predictions_sources import SourceResult

log = logging.getLogger(__name__)

_API_BASE = "https://gamma-api.polymarket.com"
_TIMEOUT = 10


def _norm(name: str) -> str:
    return name.lower().strip()


def fetch(home: str, away: str) -> SourceResult | None:
    """Return Polymarket-derived win probabilities, or None if unavailable."""
    try:
        resp = requests.get(
            f"{_API_BASE}/events",
            params={"q": home, "limit": 20, "active": "true"},
            timeout=_TIMEOUT,
            headers={"Accept": "application/json"},
        )
        resp.raise_for_status()
        events = resp.json()
    except Exception as exc:
        log.debug("polymarket: fetch failed: %s", exc)
        return None

    home_n = _norm(home)
    away_n = _norm(away)

    for event in events:
        title = _norm(event.get("title", ""))
        if home_n not in title or away_n not in title:
            continue

        home_p = draw_p = away_p = None

        for market in event.get("markets", []):
            question = _norm(market.get("question", ""))
            try:
                prices = market.get("outcomePrices", "[]")
                if isinstance(prices, str):
                    prices = json.loads(prices)
                if not prices:
                    continue
                p_yes = float(prices[0])
            except (ValueError, TypeError, IndexError):
                continue

            if home_n in question and "win" in question and home_p is None:
                home_p = p_yes
            elif "draw" in question and draw_p is None:
                draw_p = p_yes
            elif away_n in question and "win" in question and away_p is None:
                away_p = p_yes

        if home_p is None:
            continue

        if draw_p is None:
            draw_p = 0.25
        if away_p is None:
            away_p = max(0.01, 1.0 - home_p - draw_p)

        total = home_p + draw_p + away_p
        if total <= 0:
            continue

        return SourceResult(
            source="polymarket",
            home_win_pct=home_p / total,
            draw_pct=draw_p / total,
            away_win_pct=away_p / total,
            confidence=0.85,
        )

    return None
