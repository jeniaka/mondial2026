import json
from unittest.mock import patch, MagicMock


def _mock_resp(data):
    m = MagicMock()
    m.raise_for_status.return_value = None
    m.json.return_value = data
    return m


# ---------------------------------------------------------------------------
# SourceResult
# ---------------------------------------------------------------------------

def test_source_result_has_required_keys():
    from predictions_sources import SourceResult
    result = SourceResult(
        source="test",
        home_win_pct=0.5,
        draw_pct=0.3,
        away_win_pct=0.2,
        confidence=0.8,
    )
    assert result["source"] == "test"
    assert result["home_win_pct"] == 0.5
    assert result["draw_pct"] == 0.3
    assert result["away_win_pct"] == 0.2
    assert result["confidence"] == 0.8


# ---------------------------------------------------------------------------
# Polymarket
# ---------------------------------------------------------------------------

def test_polymarket_returns_source_result_when_market_found():
    events = [{
        "title": "Brazil vs Argentina - World Cup 2026",
        "markets": [
            {
                "question": "Brazil to win vs Argentina",
                "outcomePrices": json.dumps([0.60, 0.40]),
                "outcomes": json.dumps(["Yes", "No"]),
            },
            {
                "question": "Draw brazil argentina",
                "outcomePrices": json.dumps([0.25, 0.75]),
                "outcomes": json.dumps(["Yes", "No"]),
            },
            {
                "question": "Argentina to win vs Brazil",
                "outcomePrices": json.dumps([0.30, 0.70]),
                "outcomes": json.dumps(["Yes", "No"]),
            },
        ],
    }]
    with patch("requests.get", return_value=_mock_resp(events)):
        from predictions_sources.polymarket import fetch
        result = fetch("Brazil", "Argentina")
    assert result is not None
    assert result["source"] == "polymarket"
    assert 0 < result["home_win_pct"] < 1
    assert result["confidence"] > 0


def test_polymarket_returns_none_on_network_error():
    from requests.exceptions import RequestException
    with patch("requests.get", side_effect=RequestException("timeout")):
        from predictions_sources.polymarket import fetch
        result = fetch("Brazil", "Argentina")
    assert result is None


def test_polymarket_returns_none_when_no_matching_event():
    with patch("requests.get", return_value=_mock_resp([])):
        from predictions_sources.polymarket import fetch
        result = fetch("Brazil", "Argentina")
    assert result is None


# ---------------------------------------------------------------------------
# Forebet
# ---------------------------------------------------------------------------

def _forebet_html(home_team="Brazil", away_team="Argentina",
                  p1="60", px="22", p2="18"):
    return f"""
    <html><body>
    <div class="rcnt">
      <a class="ht">{home_team}</a>
      <a class="at">{away_team}</a>
      <div class="fprc">
        <span class="fpr">{p1}%</span>
        <span class="fpr">{px}%</span>
        <span class="fpr">{p2}%</span>
      </div>
    </div>
    </body></html>
    """


def test_forebet_returns_source_result_when_match_found():
    m = MagicMock()
    m.raise_for_status.return_value = None
    m.text = _forebet_html()
    with patch("requests.get", return_value=m):
        from predictions_sources.forebet import fetch
        result = fetch("Brazil", "Argentina")
    assert result is not None
    assert result["source"] == "forebet"
    assert result["home_win_pct"] > result["away_win_pct"]


def test_forebet_returns_none_when_match_not_found():
    m = MagicMock()
    m.raise_for_status.return_value = None
    m.text = _forebet_html(home_team="France", away_team="Germany")
    with patch("requests.get", return_value=m):
        from predictions_sources.forebet import fetch
        result = fetch("Brazil", "Argentina")
    assert result is None


def test_forebet_returns_none_on_network_error():
    from requests.exceptions import RequestException
    with patch("requests.get", side_effect=RequestException("timeout")):
        from predictions_sources.forebet import fetch
        result = fetch("Brazil", "Argentina")
    assert result is None


# ---------------------------------------------------------------------------
# BetExplorer
# ---------------------------------------------------------------------------

def _betexplorer_html(home="Brazil", away="Argentina",
                      odds1="1.80", oddsx="3.50", odds2="4.50"):
    return f"""
    <html><body><table>
    <tr class="valign-middle">
      <td class="table-main__tt"><a>{home} - {away}</a></td>
      <td><span data-odd="{odds1}">1.80</span></td>
      <td><span data-odd="{oddsx}">3.50</span></td>
      <td><span data-odd="{odds2}">4.50</span></td>
    </tr>
    </table></body></html>
    """


def test_betexplorer_returns_source_result():
    m = MagicMock()
    m.raise_for_status.return_value = None
    m.text = _betexplorer_html()
    with patch("requests.get", return_value=m):
        from predictions_sources.betexplorer import fetch
        result = fetch("Brazil", "Argentina")
    assert result is not None
    assert result["source"] == "betexplorer"
    assert result["home_win_pct"] > result["away_win_pct"]


def test_betexplorer_returns_none_when_match_not_found():
    m = MagicMock()
    m.raise_for_status.return_value = None
    m.text = _betexplorer_html(home="France", away="Germany")
    with patch("requests.get", return_value=m):
        from predictions_sources.betexplorer import fetch
        result = fetch("Brazil", "Argentina")
    assert result is None


def test_betexplorer_returns_none_on_network_error():
    from requests.exceptions import RequestException
    with patch("requests.get", side_effect=RequestException()):
        from predictions_sources.betexplorer import fetch
        result = fetch("Brazil", "Argentina")
    assert result is None


# ---------------------------------------------------------------------------
# FootyStats
# ---------------------------------------------------------------------------

def _footystats_html(home="Brazil", away="Argentina",
                     hp="62", dp="20", ap="18"):
    return f"""
    <html><body>
    <div class="prediction-card">
      <span class="home-team">{home}</span>
      <span class="away-team">{away}</span>
      <div class="prediction-percent home">{hp}%</div>
      <div class="prediction-percent draw">{dp}%</div>
      <div class="prediction-percent away">{ap}%</div>
    </div>
    </body></html>
    """


def test_footystats_returns_source_result():
    m = MagicMock()
    m.raise_for_status.return_value = None
    m.text = _footystats_html()
    with patch("requests.get", return_value=m):
        from predictions_sources.footystats import fetch
        result = fetch("Brazil", "Argentina")
    assert result is not None
    assert result["source"] == "footystats"
    assert result["home_win_pct"] > result["away_win_pct"]


def test_footystats_returns_none_when_match_not_found():
    m = MagicMock()
    m.raise_for_status.return_value = None
    m.text = _footystats_html(home="France", away="Germany")
    with patch("requests.get", return_value=m):
        from predictions_sources.footystats import fetch
        result = fetch("Brazil", "Argentina")
    assert result is None


def test_footystats_returns_none_on_network_error():
    from requests.exceptions import RequestException
    with patch("requests.get", side_effect=RequestException()):
        from predictions_sources.footystats import fetch
        result = fetch("Brazil", "Argentina")
    assert result is None


# ---------------------------------------------------------------------------
# SuperBru
# ---------------------------------------------------------------------------

def _superbru_html(home="Brazil", away="Argentina",
                   hp="55", dp="25", ap="20"):
    return f"""
    <html><body>
    <div class="match-row" data-home="{home}" data-away="{away}">
      <span class="win-pct home">{hp}%</span>
      <span class="win-pct draw">{dp}%</span>
      <span class="win-pct away">{ap}%</span>
    </div>
    </body></html>
    """


def test_superbru_returns_source_result():
    m = MagicMock()
    m.raise_for_status.return_value = None
    m.text = _superbru_html()
    with patch("requests.get", return_value=m):
        from predictions_sources.superbru import fetch
        result = fetch("Brazil", "Argentina")
    assert result is not None
    assert result["source"] == "superbru"
    assert result["home_win_pct"] > result["away_win_pct"]


def test_superbru_returns_none_when_match_not_found():
    m = MagicMock()
    m.raise_for_status.return_value = None
    m.text = _superbru_html(home="France", away="Germany")
    with patch("requests.get", return_value=m):
        from predictions_sources.superbru import fetch
        result = fetch("Brazil", "Argentina")
    assert result is None


def test_superbru_returns_none_on_network_error():
    from requests.exceptions import RequestException
    with patch("requests.get", side_effect=RequestException()):
        from predictions_sources.superbru import fetch
        result = fetch("Brazil", "Argentina")
    assert result is None
