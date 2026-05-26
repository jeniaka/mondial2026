import pytest
from predictions_sources import SourceResult


def _s(h, d, a, conf=0.8, source="test"):
    return SourceResult(source=source, home_win_pct=h, draw_pct=d, away_win_pct=a, confidence=conf)


def test_aggregate_returns_none_for_empty_list():
    from predictions_aggregator import aggregate
    assert aggregate([], "A", "B", "א", "ב") is None


def test_aggregate_returns_none_for_all_none():
    from predictions_aggregator import aggregate
    assert aggregate([None, None, None], "A", "B", "א", "ב") is None


def test_aggregate_returns_dict_with_required_keys():
    from predictions_aggregator import aggregate
    result = aggregate([_s(0.5, 0.3, 0.2)], "Brazil", "Argentina", "ברזיל", "ארגנטינה")
    assert result is not None
    for k in ("home_win_pct", "draw_pct", "away_win_pct", "confidence",
              "sources_used", "variants"):
        assert k in result


def test_aggregate_five_variants_in_order():
    from predictions_aggregator import aggregate
    result = aggregate([_s(0.5, 0.3, 0.2)], "Brazil", "Argentina", "ברזיל", "ארגנטינה")
    assert len(result["variants"]) == 5
    assert [v["risk"] for v in result["variants"]] == [1, 2, 3, 4, 5]


def test_aggregate_normalizes_probabilities():
    from predictions_aggregator import aggregate
    result = aggregate([_s(0.6, 0.3, 0.4)], "A", "B", "א", "ב")
    total = result["home_win_pct"] + result["draw_pct"] + result["away_win_pct"]
    assert total == pytest.approx(1.0, abs=0.001)


def test_aggregate_averages_multiple_sources():
    from predictions_aggregator import aggregate
    sources = [_s(0.6, 0.25, 0.15), _s(0.4, 0.35, 0.25)]
    result = aggregate(sources, "A", "B", "א", "ב")
    assert result["home_win_pct"] == pytest.approx(0.5, abs=0.01)


def test_aggregate_skips_none_sources():
    from predictions_aggregator import aggregate
    result = aggregate([None, _s(0.5, 0.3, 0.2), None], "A", "B", "א", "ב")
    assert result is not None
    assert result["sources_used"] == ["test"]


def test_aggregate_home_win_risk1_minimal_score():
    from predictions_aggregator import aggregate
    result = aggregate([_s(0.65, 0.20, 0.15)], "France", "England", "צרפת", "אנגליה")
    risk1 = next(v for v in result["variants"] if v["risk"] == 1)
    assert risk1["home_score"] > risk1["away_score"]
    assert risk1["home_score"] + risk1["away_score"] <= 2


def test_aggregate_home_win_risk5_high_scoring():
    from predictions_aggregator import aggregate
    result = aggregate([_s(0.65, 0.20, 0.15)], "France", "England", "צרפת", "אנגליה")
    risk5 = next(v for v in result["variants"] if v["risk"] == 5)
    assert risk5["home_score"] > risk5["away_score"]
    assert risk5["home_score"] + risk5["away_score"] >= 4


def test_aggregate_draw_risk1_goalless():
    from predictions_aggregator import aggregate
    result = aggregate([_s(0.30, 0.40, 0.30)], "A", "B", "א", "ב")
    risk1 = next(v for v in result["variants"] if v["risk"] == 1)
    assert risk1["home_score"] == risk1["away_score"] == 0


def test_aggregate_variant_has_hebrew_and_english_reason():
    from predictions_aggregator import aggregate
    result = aggregate([_s(0.5, 0.3, 0.2)], "Brazil", "Argentina", "ברזיל", "ארגנטינה")
    for v in result["variants"]:
        assert len(v["reason_he"]) > 10
        assert len(v["label_he"]) > 0
        assert len(v["reason_en"]) > 10
        assert len(v["label_en"]) > 0


def test_aggregate_confidence_is_average_of_sources():
    from predictions_aggregator import aggregate
    sources = [_s(0.5, 0.3, 0.2, conf=0.8), _s(0.4, 0.35, 0.25, conf=0.6)]
    result = aggregate(sources, "A", "B", "א", "ב")
    assert result["confidence"] == pytest.approx(0.7, abs=0.01)


def test_aggregate_away_win_risk1_minimal_score():
    from predictions_aggregator import aggregate
    result = aggregate([_s(0.15, 0.20, 0.65)], "England", "France", "אנגליה", "צרפת")
    risk1 = next(v for v in result["variants"] if v["risk"] == 1)
    assert risk1["away_score"] > risk1["home_score"]
    assert risk1["home_score"] + risk1["away_score"] <= 2
