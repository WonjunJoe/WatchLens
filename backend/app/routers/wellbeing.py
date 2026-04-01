"""Cross-platform digital wellbeing dashboard endpoint."""

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from config.settings import (
    DEFAULT_USER_ID,
    WELLBEING_WEIGHTS,
    WELLBEING_GRADE_THRESHOLDS,
    BINGE_SCORE_MULTIPLIER,
    WATCH_INTENSITY_MAX_HOURS,
    LATE_NIGHT_SCORE_MULTIPLIER,
)
from app.utils import to_local, local_date_to_utc
from app.db.repository import (
    fetch_instagram_results,
    fetch_period,
    fetch_watch_records,
    fetch_video_metadata,
)
from app.services.stats_service import compute_watch_time, compute_binge_sessions, cap_durations
from app.services.indices import calc_dopamine

router = APIRouter(prefix="/api/wellbeing", tags=["wellbeing"])


def _fetch_youtube_signals(user_id: str) -> dict:
    """Fetch YouTube data from DB and compute wellbeing-relevant metrics."""
    earliest, latest = fetch_period(user_id)
    if not earliest:
        return {}

    date_from = to_local(earliest).strftime("%Y-%m-%d")
    date_to = to_local(latest).strftime("%Y-%m-%d")

    utc_from = local_date_to_utc(date_from)
    utc_to = local_date_to_utc(date_to, end_of_day=True)

    records = fetch_watch_records(user_id, utc_from, utc_to)
    if not records:
        return {}

    video_ids = list({r["video_id"] for r in records if r.get("video_id")})
    id_to_duration_raw, _ = fetch_video_metadata(video_ids) if video_ids else ({}, {})
    id_to_duration = cap_durations(id_to_duration_raw)

    return {
        "dopamine": calc_dopamine(records, id_to_duration),
        "binge_sessions": compute_binge_sessions(records),
        "watch_time": compute_watch_time(records, id_to_duration),
    }


def _compute_wellbeing(youtube_data: dict, instagram_data: dict) -> dict:
    """Combine YouTube and Instagram data into a single wellbeing score."""
    scores = {}
    details = {}

    # --- YouTube signals ---
    yt_available = bool(youtube_data.get("dopamine"))
    if yt_available:
        dopamine = youtube_data["dopamine"]
        dopamine_score = dopamine.get("score", 50)
        scores["dopamine"] = dopamine_score
        details["dopamine"] = {
            "score": dopamine_score,
            "grade": dopamine.get("grade", ""),
            "label": "도파민 의존도",
            "desc": "Shorts·심야·짧은 영상 비율 기반",
        }

        binge = youtube_data.get("binge_sessions", {})
        binge_ratio = binge.get("binge_ratio", 0)
        binge_score = min(100, round(binge_ratio * BINGE_SCORE_MULTIPLIER))
        scores["binge"] = binge_score
        details["binge"] = {
            "score": binge_score,
            "label": "몰아보기 빈도",
            "desc": f"전체 세션 중 {binge_ratio}%가 몰아보기",
        }

        wt = youtube_data.get("watch_time", {})
        daily_max = wt.get("daily_max_hours", 0)
        intensity_score = min(100, round(daily_max / WATCH_INTENSITY_MAX_HOURS * 100))
        scores["watch_intensity"] = intensity_score
        details["watch_intensity"] = {
            "score": intensity_score,
            "label": "시청 강도",
            "desc": f"일 평균 최대 {daily_max}시간",
        }

    # --- Instagram signals ---
    lurker = instagram_data.get("lurker_index")
    ig_available = bool(lurker and lurker.get("total_viewed"))
    if ig_available:
        lurker_score = lurker.get("lurker_score", 50)
        engagement_rate = min(lurker.get("engagement_rate", 0), 100)
        scores["lurker"] = lurker_score
        details["lurker"] = {
            "score": lurker_score,
            "label": "소비 vs 소통",
            "desc": f"참여율 {engagement_rate}%",
        }

        late = instagram_data.get("late_night") or {}
        late_ratio = late.get("late_ratio", 0)
        if late.get("late_actions", 0) > 0:
            late_score = min(100, round(late_ratio * LATE_NIGHT_SCORE_MULTIPLIER))
            scores["late_night"] = late_score
            details["late_night"] = {
                "score": late_score,
                "label": "심야 활동",
                "desc": f"전체 활동의 {late_ratio}%가 심야",
            }

    # --- Composite score ---
    if not scores:
        return {"score": 0, "available": False, "details": {}, "grade": ""}

    total_weight = sum(WELLBEING_WEIGHTS[k] for k in scores)
    weighted_sum = sum(scores[k] * WELLBEING_WEIGHTS[k] for k in scores)
    composite = round(weighted_sum / total_weight) if total_weight > 0 else 0

    health_score = max(0, 100 - composite)

    grade = WELLBEING_GRADE_THRESHOLDS[-1][1]  # default to last
    for threshold, label in WELLBEING_GRADE_THRESHOLDS:
        if health_score >= threshold:
            grade = label
            break

    return {
        "score": health_score,
        "grade": grade,
        "available": True,
        "yt_available": yt_available,
        "ig_available": ig_available,
        "details": details,
    }


@router.get("/compute")
def compute_wellbeing_score(user_id: str = Query(default=DEFAULT_USER_ID)):
    """Compute wellbeing score by reading both platforms' data from DB."""
    youtube_data = _fetch_youtube_signals(user_id)

    ig_data = {}
    try:
        ig_data = fetch_instagram_results(user_id) or {}
    except Exception:
        pass

    result = _compute_wellbeing(youtube_data, ig_data)
    return JSONResponse(content=result)
