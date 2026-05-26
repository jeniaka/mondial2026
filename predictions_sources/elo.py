"""
ELO-based win-probability predictor using FIFA World Ranking points.

Hardcoded rating table covers all 48 WC2026 teams plus common alternates.
No network requests — always returns a result for any known team pair.
Formula: P(win) = 1 / (1 + 10^(-(elo_home - elo_away) / 400))
Draw probability fixed at 0.25; remainder split proportionally.
"""
from __future__ import annotations

import logging

from predictions_sources import SourceResult

log = logging.getLogger(__name__)

# Approximate FIFA World Ranking points (Jan 2026).
# Covers standard Football-data.org English names and common variants.
_ELO: dict[str, float] = {
    # CONMEBOL
    "Argentina":             1871,
    "France":                1858,
    "England":               1826,
    "Spain":                 1820,
    "Portugal":              1810,
    "Belgium":               1792,
    "Brazil":                1788,
    "Netherlands":           1764,
    "Colombia":              1749,
    "Italy":                 1736,
    "Germany":               1721,
    "Morocco":               1703,
    "United States":         1698,
    "USA":                   1698,
    "Croatia":               1679,
    "Uruguay":               1671,
    "Japan":                 1660,
    "Senegal":               1649,
    "Switzerland":           1640,
    "Mexico":                1635,
    "Korea Republic":        1622,
    "South Korea":           1622,
    "Ecuador":               1610,
    "Australia":             1598,
    "Canada":                1593,
    "Serbia":                1580,
    "Denmark":               1574,
    "IR Iran":               1558,
    "Iran":                  1558,
    "Poland":                1545,
    "Nigeria":               1540,
    "Cameroon":              1525,
    "Ghana":                 1515,
    "Saudi Arabia":          1510,
    "Costa Rica":            1500,
    "Honduras":              1488,
    "Panama":                1475,
    "Jamaica":               1462,
    "El Salvador":           1440,
    "Venezuela":             1434,
    "Bolivia":               1428,
    "Paraguay":              1422,
    "Peru":                  1418,
    "South Africa":          1410,
    "Tunisia":               1405,
    "Algeria":               1400,
    "Egypt":                 1396,
    "Ivory Coast":           1393,
    "Côte d'Ivoire":         1393,
    "Mali":                  1388,
    "Zambia":                1380,
    "New Zealand":           1372,
    # UEFA extras
    "Austria":               1362,
    "Czech Republic":        1358,
    "Czechia":               1358,
    "Turkey":                1354,
    "Türkiye":               1354,
    "Ukraine":               1352,
    "Scotland":              1348,
    "Hungary":               1345,
    "Romania":               1342,
    "Slovakia":              1340,
    "Norway":                1362,
    "Sweden":                1360,
    "Wales":                 1325,
    "Finland":               1320,
    "Greece":                1330,
    # AFC extras
    "Qatar":                 1360,
    "Uzbekistan":            1340,
    "China PR":              1305,
    "China":                 1305,
    "Indonesia":             1295,
    "Jordan":                1310,
    "Iraq":                  1315,
    "Oman":                  1290,
    # CONCACAF extras
    "Guatemala":             1290,
    "Cuba":                  1280,
    "Trinidad and Tobago":   1275,
    "Haiti":                 1270,
    "Curaçao":               1265,
    "Jamaica":               1262,
    "Suriname":              1250,
    "Dominican Republic":    1220,
    # OFC
    "New Caledonia":         1200,
    "Tahiti":                1180,
    # CAF extras
    "DR Congo":              1280,
    "Congo":                 1255,
    "Tanzania":              1265,
    "Mozambique":            1268,
    "Comoros":               1260,
    "Rwanda":                1258,
    "Liberia":               1270,
    "Equatorial Guinea":     1250,
    "Namibia":               1240,
    "Cape Verde":            1370,
}

_DRAW_RATE = 0.25
_DEFAULT_ELO = 1350


def _lookup(name: str) -> float:
    return _ELO.get(name) or _ELO.get(name.strip()) or _DEFAULT_ELO


def fetch(home: str, away: str) -> SourceResult | None:
    """Return ELO-derived win probabilities. Always succeeds for any team pair."""
    elo_h = _lookup(home)
    elo_a = _lookup(away)

    if elo_h == _DEFAULT_ELO and home not in _ELO:
        log.debug("elo: unknown team '%s', using default %d", home, _DEFAULT_ELO)
    if elo_a == _DEFAULT_ELO and away not in _ELO:
        log.debug("elo: unknown team '%s', using default %d", away, _DEFAULT_ELO)

    diff = elo_h - elo_a
    p_win = 1.0 / (1.0 + 10.0 ** (-diff / 400.0))

    # Allocate draw probability, distribute remainder to win/loss
    h = p_win * (1.0 - _DRAW_RATE)
    d = _DRAW_RATE
    a = (1.0 - p_win) * (1.0 - _DRAW_RATE)

    total = h + d + a  # should be ~1.0 but normalize for safety
    return SourceResult(
        source="elo",
        home_win_pct=round(h / total, 4),
        draw_pct=round(d / total, 4),
        away_win_pct=round(a / total, 4),
        confidence=0.65,
    )
