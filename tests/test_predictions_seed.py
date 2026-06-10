"""Unit tests for predictions_seed — pure logic, no MongoDB, no network."""
import predictions_seed


def _assert_payload_shape(doc):
    assert 0.99 <= doc["home_win_pct"] + doc["draw_pct"] + doc["away_win_pct"] <= 1.01
    assert 0 < doc["confidence"] <= 1
    assert isinstance(doc["sources_used"], list) and doc["sources_used"]
    assert len(doc["variants"]) == 5
    for i, v in enumerate(doc["variants"], start=1):
        assert v["risk"] == i
        assert isinstance(v["home_score"], int) and isinstance(v["away_score"], int)
        for key in ("label_he", "label_en", "reason_he", "reason_en"):
            assert v[key]


def test_seed_loads():
    seed = predictions_seed.load_seed()
    assert seed is not None
    assert len(seed["groups"]) == 12
    assert seed["final_answers"]["champion"] == "Spain"


def test_seed_pair_same_orientation():
    doc = predictions_seed.derive("Mexico", "South Africa", "מקסיקו", "דרום אפריקה")
    _assert_payload_shape(doc)
    assert doc["sources_used"] == ["consensus"]
    # seed: Mexico 2-0, High → home favored, risk-3 shows the consensus score
    assert doc["home_win_pct"] > doc["away_win_pct"]
    assert (doc["variants"][2]["home_score"], doc["variants"][2]["away_score"]) == (2, 0)


def test_seed_pair_flipped_orientation():
    # seed entry is "Czechia vs Mexico" 0-1; real fixture order reversed
    doc = predictions_seed.derive("Mexico", "Czechia")
    _assert_payload_shape(doc)
    assert doc["sources_used"] == ["consensus"]
    assert doc["home_win_pct"] > doc["away_win_pct"]  # pick=Mexico=home here
    assert (doc["variants"][2]["home_score"], doc["variants"][2]["away_score"]) == (1, 0)


def test_seed_alias_names():
    # "United States" (FD name) must match seed's "USA"; "Türkiye" → "Turkey"
    doc = predictions_seed.derive("Türkiye", "United States")
    _assert_payload_shape(doc)
    assert doc["sources_used"] == ["consensus"]
    # seed: Turkey vs USA = Draw 1-1
    assert doc["draw_pct"] >= doc["home_win_pct"]
    assert (doc["variants"][2]["home_score"], doc["variants"][2]["away_score"]) == (1, 1)


def test_seed_diacritics():
    # countries.json name "Curaçao" must match seed's "Curacao"
    doc = predictions_seed.derive("Germany", "Curaçao")
    _assert_payload_shape(doc)
    assert doc["sources_used"] == ["consensus"]
    assert (doc["variants"][2]["home_score"], doc["variants"][2]["away_score"]) == (3, 0)


def test_elo_fallback_for_unseeded_pair():
    # Italy never appears in the seed → ELO fallback, still a full payload
    doc = predictions_seed.derive("Italy", "Denmark")
    _assert_payload_shape(doc)
    assert doc["sources_used"] == ["elo"]


def test_missing_names_return_none():
    assert predictions_seed.derive("", "Brazil") is None
    assert predictions_seed.derive("Brazil", "") is None


def test_derive_for_match_doc_shape():
    match = {
        "_id": "fd-1234",
        "home": {"name_en": "Spain", "name_he": "ספרד"},
        "away": {"name_en": "Uruguay", "name_he": "אורוגוואי"},
    }
    doc = predictions_seed.derive_for_match(match)
    assert doc["match_id"] == "fd-1234"
    assert doc["seeded"] is True
    assert doc["built_at"]
    _assert_payload_shape(doc)
    # Hebrew reasons must contain the Hebrew team names (RTL content intact)
    assert any("ספרד" in v["reason_he"] or "אורוגוואי" in v["reason_he"] for v in doc["variants"])


class _FakeCol:
    def __init__(self, docs):
        self.docs = {d["match_id"]: d for d in docs}
        self.upserts = []

    def find(self, query=None, projection=None):
        if projection:
            return [{"match_id": d["match_id"]} for d in self.docs.values()]
        return list(self.docs.values())

    def update_one(self, flt, update, upsert=False):
        self.upserts.append(flt["match_id"])
        self.docs[flt["match_id"]] = {**update["$set"]}


class _FakeMatches:
    def __init__(self, matches):
        self.matches = matches

    def find(self, query=None):
        return list(self.matches)


def test_seed_missing_skips_existing():
    matches = [
        {"_id": "m1", "status": "TIMED",
         "home": {"name_en": "Spain"}, "away": {"name_en": "Uruguay"}},
        {"_id": "m2", "status": "TIMED",
         "home": {"name_en": "France"}, "away": {"name_en": "Senegal"}},
    ]
    preds = _FakeCol([{"match_id": "m1"}])
    stats = predictions_seed.seed_missing(_FakeMatches(matches), preds)
    assert stats["seeded"] == 1
    assert stats["skipped"] == 1
    assert preds.upserts == ["m2"]
