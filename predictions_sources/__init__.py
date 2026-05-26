from typing import TypedDict


class SourceResult(TypedDict):
    source: str
    home_win_pct: float  # 0.0–1.0
    draw_pct: float      # 0.0–1.0
    away_win_pct: float  # 0.0–1.0
    confidence: float    # 0.0–1.0; how reliable this source is considered
