from unittest.mock import patch, MagicMock
from predictions_sources import SourceResult


def _match(home_en="Brazil", away_en="Argentina", home_he="ברזיל", away_he="ארגנטינה"):
    return {
        "_id": "fd-12345",
        "status": "SCHEDULED",
        "home": {"name_en": home_en, "name_he": home_he},
        "away": {"name_en": away_en, "name_he": away_he},
    }


def _src(h=0.5, d=0.3, a=0.2):
    return SourceResult(source="mock", home_win_pct=h, draw_pct=d, away_win_pct=a, confidence=0.8)


def test_build_returns_doc_when_source_succeeds():
    from predictions_builder import _build
    with patch("predictions_builder._SCRAPERS", [lambda h, a: _src()]):
        doc = _build(_match())
    assert doc is not None
    assert doc["match_id"] == "fd-12345"
    assert "variants" in doc
    assert len(doc["variants"]) == 5
    assert "built_at" in doc


def test_build_returns_none_when_all_scrapers_return_none():
    from predictions_builder import _build
    with patch("predictions_builder._SCRAPERS", [lambda h, a: None]):
        doc = _build(_match())
    assert doc is None


def test_build_returns_none_for_empty_team_names():
    from predictions_builder import _build
    bad = {"_id": "fd-99", "status": "SCHEDULED",
           "home": {"name_en": "", "name_he": ""}, "away": {"name_en": "", "name_he": ""}}
    with patch("predictions_builder._SCRAPERS", [lambda h, a: _src()]):
        assert _build(bad) is None


def test_build_tolerates_scraper_exception():
    from predictions_builder import _build

    def boom(h, a):
        raise RuntimeError("network down")

    with patch("predictions_builder._SCRAPERS", [boom, lambda h, a: _src()]):
        doc = _build(_match())
    assert doc is not None


def test_run_calls_update_one_with_upsert():
    import predictions_builder

    mock_predictions = MagicMock()
    mock_matches     = MagicMock()
    mock_matches.find.return_value = [_match()]

    mock_db = MagicMock()
    mock_db.__getitem__.side_effect = lambda k: {
        "matches": mock_matches,
        "match_predictions": mock_predictions,
    }[k]

    with (
        patch.object(predictions_builder, "_db", mock_db),
        patch.object(predictions_builder, "_SCRAPERS", [lambda h, a: _src()]),
    ):
        predictions_builder.run()

    mock_predictions.update_one.assert_called_once()
    _, kwargs = mock_predictions.update_one.call_args
    assert kwargs.get("upsert") is True
