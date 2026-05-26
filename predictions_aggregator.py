from __future__ import annotations

from typing import Optional

from predictions_sources import SourceResult

_SCORES_HOME_WIN = {1: (1, 0), 2: (2, 0), 3: (2, 1), 4: (3, 1), 5: (4, 1)}
_SCORES_DRAW     = {1: (0, 0), 2: (1, 1), 3: (1, 1), 4: (2, 2), 5: (3, 3)}
_SCORES_AWAY_WIN = {1: (0, 1), 2: (0, 2), 3: (1, 2), 4: (1, 3), 5: (1, 4)}
_SCORES_TOSS_UP  = {1: (1, 1), 2: (1, 0), 3: (1, 1), 4: (2, 1), 5: (3, 2)}

_REASON_HE = {
    "home_win": [
        "{home} נכנסות כמועדפות — המספרים מצביעים על ניצחון ביתי.",
        "{home} עם יתרון ברור לפי הניתוח. הסיכויים לביתיות.",
        "שוק ההימורים מעדיף את {home}. ניצחון ביתי הסביר ביותר.",
        "{home} חזקות יותר על הנייר. ניצחון ביתי לפי המחקר.",
        "{home} אמורות לנצח — הנתונים ברורים.",
    ],
    "draw": [
        "משחק מאוזן בין {home} ל{away}. תיקו הוא תרחיש סביר.",
        "שתי הנבחרות חזקות — הסיכויים צפופים. תיקו אפשרי מאוד.",
        "{home} מול {away} — התנגשות צמודה. תיקו ביניהן לא יפתיע.",
        "הנתונים מצביעים על שוויון. שתי הנבחרות ברמה דומה.",
        "קרב עצום בין {home} ל{away} — תיקו הוא תוצאה ריאלית.",
    ],
    "away_win": [
        "{away} מגיעות כמועדפות — ניצחון האורחות הסביר ביותר.",
        "{away} חזקות יותר על הנייר. הסיכוי לניצחון חוץ גבוה.",
        "שוק ההימורים מצביע על {away}. ניצחון חוץ המועדף.",
        "{away} מגיעות עם יתרון ברור לפי הניתוח.",
        "{away} אמורות לנצח — הנתונים ברורים.",
    ],
    "toss_up": [
        "משחק פתוח לחלוטין בין {home} ל{away}. כל תוצאה אפשרית.",
        "שוויון בסיכויים בין {home} ל{away} — קשה להצביע על מנצח.",
        "{home} מול {away} — מאבק לא קבוע. הנתונים לא חד-משמעיים.",
        "50-50 בין {home} ל{away}. הניחוש הזה הוא אמיץ.",
        "כל אחת יכולה לנצח — {home} ו{away} ברמה דומה.",
    ],
}

_REASON_EN = {
    "home_win": [
        "{home} are favored — data points to a home win.",
        "{home} have a clear advantage. Home win most likely.",
        "Markets and models back {home} to win.",
        "{home} stronger on paper — home win expected.",
        "Data is clear: {home} should win this one.",
    ],
    "draw": [
        "Evenly matched. A draw is the most likely outcome.",
        "{home} vs {away} — tight contest. Draw expected.",
        "Both teams level — a draw is a realistic result.",
        "Data shows parity between {home} and {away}.",
        "Closely contested — draw the likeliest outcome.",
    ],
    "away_win": [
        "{away} are favored — away win most likely.",
        "Models and markets back {away} to take the points.",
        "{away} have the edge. Away win expected.",
        "{away} stronger on paper — away win projected.",
        "Data is clear: {away} should win this one.",
    ],
    "toss_up": [
        "Too close to call. Any result is possible.",
        "{home} vs {away} — open match, no clear favorite.",
        "50/50 between {home} and {away}. Bold pick.",
        "Data inconclusive — {home} and {away} are equal.",
        "No clear winner — both sides can take this.",
    ],
}

_LABELS_HE = {1: "בטוח", 2: "שמרני", 3: "מאוזן", 4: "אמיץ", 5: "פרוע"}
_LABELS_EN = {1: "Safe",  2: "Cautious", 3: "Balanced", 4: "Bold", 5: "Wild"}


def aggregate(
    sources: list[SourceResult | None],
    home_en: str,
    away_en: str,
    home_he: str,
    away_he: str,
) -> Optional[dict]:
    valid = [s for s in sources if s is not None]
    if not valid:
        return None

    n = len(valid)
    h_avg = sum(s["home_win_pct"] for s in valid) / n
    d_avg = sum(s["draw_pct"]     for s in valid) / n
    a_avg = sum(s["away_win_pct"] for s in valid) / n
    conf  = sum(s["confidence"]   for s in valid) / n

    total = h_avg + d_avg + a_avg
    if total <= 0:
        return None
    h_avg /= total
    d_avg /= total
    a_avg /= total

    if h_avg >= 0.40 and h_avg >= d_avg and h_avg >= a_avg:
        outcome   = "home_win"
        score_tbl = _SCORES_HOME_WIN
    elif a_avg >= 0.40 and a_avg >= d_avg and a_avg >= h_avg:
        outcome   = "away_win"
        score_tbl = _SCORES_AWAY_WIN
    elif d_avg >= h_avg and d_avg >= a_avg:
        outcome   = "draw"
        score_tbl = _SCORES_DRAW
    else:
        outcome   = "toss_up"
        score_tbl = _SCORES_TOSS_UP

    templates_he = _REASON_HE[outcome]
    templates_en = _REASON_EN[outcome]

    variants = []
    for risk in range(1, 6):
        h_score, a_score = score_tbl[risk]
        idx = (risk - 1) % len(templates_he)
        variants.append({
            "risk":       risk,
            "home_score": h_score,
            "away_score": a_score,
            "label_he":   _LABELS_HE[risk],
            "label_en":   _LABELS_EN[risk],
            "reason_he":  templates_he[idx].format(home=home_he, away=away_he),
            "reason_en":  templates_en[idx].format(home=home_en, away=away_en),
        })

    return {
        "home_win_pct": round(h_avg, 4),
        "draw_pct":     round(d_avg, 4),
        "away_win_pct": round(a_avg, 4),
        "confidence":   round(conf, 4),
        "sources_used": [s["source"] for s in valid],
        "variants":     variants,
    }
