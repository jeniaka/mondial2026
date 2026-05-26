def test_match_predictions_collection_exists():
    """db.match_predictions() must return a Collection without error."""
    import db
    col = db.match_predictions()
    assert col.name == "match_predictions"
