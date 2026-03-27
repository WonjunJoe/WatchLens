"""
Dopamine Index calculation.

All index formulas and weights are centralized here.
Settings/thresholds come from config/settings.py.
"""

import math
from collections import Counter
from datetime import datetime, timezone, timedelta

from config.settings import (
    DOPAMINE_WEIGHTS, LATE_NIGHT_HOURS, USER_TZ_OFFSET_HOURS,
)

USER_TZ = timezone(timedelta(hours=USER_TZ_OFFSET_HOURS))


def _to_local(watched_at: str) -> datetime:
    dt = datetime.fromisoformat(watched_at.replace("Z", "+00:00"))
    return dt.astimezone(USER_TZ)


# ---------------------------------------------------------------------------
# Dopamine Index (0–100)
# ---------------------------------------------------------------------------
# Weighted sum of 3 sub-scores, each normalized to 0–1:
#   shorts_ratio     (40): fraction of Shorts in total views
#   late_night_ratio (30): fraction of views during 22:00–03:59
#   short_duration   (30): fraction of videos with duration < 300s
# ---------------------------------------------------------------------------

def calc_dopamine(
    records: list[dict],
    id_to_duration: dict[str, int],
) -> dict:
    total = len(records)
    if total == 0:
        return {
            "score": 0, "grade": "데이터 없음",
            "breakdown": {},
        }

    # 1. Shorts ratio
    shorts_count = sum(1 for r in records if r["is_shorts"])
    shorts_ratio = shorts_count / total

    # 2. Late night ratio
    late_count = sum(1 for r in records if _to_local(r["watched_at"]).hour in LATE_NIGHT_HOURS)
    late_night_ratio = late_count / total

    # 3. Short duration ratio (< 5 min)
    duration_known = [r for r in records if r.get("video_id") and r["video_id"] in id_to_duration]
    if duration_known:
        short_dur_count = sum(1 for r in duration_known if id_to_duration[r["video_id"]] < 300)
        short_duration_ratio = short_dur_count / len(duration_known)
    else:
        short_duration_ratio = shorts_ratio  # fallback

    sub_scores = {
        "shorts_ratio": shorts_ratio,
        "late_night_ratio": late_night_ratio,
        "short_duration": short_duration_ratio,
    }

    descriptions = {
        "shorts_ratio": f"Shorts 비율: {shorts_ratio:.0%}",
        "late_night_ratio": f"심야 시청(22~04시): {late_night_ratio:.0%}",
        "short_duration": f"5분 미만 영상 비율: {short_duration_ratio:.0%}",
    }

    weighted_score = 0
    breakdown = {}
    for factor, weight in DOPAMINE_WEIGHTS.items():
        value = sub_scores[factor]
        factor_score = round(value * weight, 1)
        weighted_score += factor_score
        breakdown[factor] = {
            "value": round(value, 3),
            "score": factor_score,
            "weight": weight,
            "description": descriptions[factor],
        }

    score = min(100, max(0, round(weighted_score)))

    if score >= 70:
        grade = "높음"
    elif score >= 40:
        grade = "보통"
    else:
        grade = "낮음"

    return {
        "score": score,
        "grade": grade,
        "breakdown": breakdown,
    }
