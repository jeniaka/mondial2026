"""
scoring.py — Prediction scoring rules.
Canonical rules per spec section 16.
"""
import logging
from datetime import datetime, timezone

import db

log = logging.getLogger(__name__)

KNOCKOUT_STAGES = {"LAST_16", "QUARTER_FINALS", "SEMI_FINALS", "FINAL", "THIRD_PLACE"}


def score_prediction(prediction: dict, match: dict):
    """
    Returns points (int) or None if match not finished / scores missing.
    Exact score  = 3 pts
    Correct outcome (W/D/L) but wrong score = 1 pt
    Wrong outcome = 0 pts
    Knockout bonus: +1 if correct team advances
    """
    if match.get("status") != "FINISHED":
        return None

    ph = prediction.get("home_score")
    pa = prediction.get("away_score")
    if ph is None or pa is None:
        return None

    score = match.get("score", {})
    fh = score.get("ft_home", score.get("home"))
    fa = score.get("ft_away", score.get("away"))
    if fh is None or fa is None:
        return None

    ph, pa, fh, fa = int(ph), int(pa), int(fh), int(fa)

    if ph == fh and pa == fa:
        points = 3
    elif (ph - pa) == 0 and (fh - fa) == 0:
        points = 1
    elif (ph - pa) > 0 and (fh - fa) > 0:
        points = 1
    elif (ph - pa) < 0 and (fh - fa) < 0:
        points = 1
    else:
        points = 0

    is_knockout = match.get("stage") in KNOCKOUT_STAGES
    if is_knockout and prediction.get("knockout_advances") is not None:
        actual_winner = score.get("winner")
        predicted_advances = prediction["knockout_advances"]
        if (
            (actual_winner == "HOME_TEAM" and predicted_advances == "HOME") or
            (actual_winner == "AWAY_TEAM" and predicted_advances == "AWAY")
        ):
            points += 1

    return points


def run_scoring_for_match(match_id: str):
    """
    Score all unscored predictions for a finished match.
    Returns (scored_count, skipped_count).
    Idempotent — safe to run twice.
    """
    match = db.matches().find_one({"_id": match_id})
    if not match:
        log.warning("run_scoring_for_match: match %s not found", match_id)
        return 0, 0

    if match.get("status") != "FINISHED":
        log.info("run_scoring_for_match: match %s not finished (status=%s)", match_id, match.get("status"))
        return 0, 0

    preds = list(db.predictions().find({"match_id": match_id, "points_awarded": None}))
    scored, skipped = 0, 0
    for pred in preds:
        pts = score_prediction(pred, match)
        if pts is None:
            skipped += 1
            continue
        db.predictions().update_one(
            {"_id": pred["_id"]},
            {"$set": {"points_awarded": pts, "scored_at": datetime.now(timezone.utc)}}
        )
        scored += 1

    log.info("run_scoring_for_match: match %s — scored %d, skipped %d", match_id, scored, skipped)
    return scored, skipped


def run_scoring_all():
    """
    Find all finished matches with unscored predictions and score them.
    Returns total scored count.
    """
    finished_ids = [
        m["_id"] for m in db.matches().find({"status": "FINISHED"}, {"_id": 1})
    ]
    total = 0
    for match_id in finished_ids:
        scored, _ = run_scoring_for_match(match_id)
        total += scored
    return total
