"""YouTube analytics dashboard API endpoints."""

import logging
from datetime import datetime, timezone
from collections.abc import Generator

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse, JSONResponse

from config.settings import DEFAULT_USER_ID
from app.utils import to_local, sse, USER_TZ, local_date_to_utc

logger = logging.getLogger(__name__)
from app.models.schemas import PeriodInfo
from app.db.repository import (
    fetch_watch_records,
    fetch_search_records,
    fetch_video_metadata,
    fetch_period,
    save_youtube_results,
    fetch_youtube_results,
)
from app.services.stats_service import (
    compute_summary,
    compute_hourly,
    compute_daily,
    compute_top_channels,
    compute_shorts,
    compute_categories,
    compute_watch_time,
    compute_search_keywords,
    compute_weekly_watch_time,
    compute_weekly,
    compute_day_of_week,
    compute_viewer_type,
    compute_content_diversity,
    compute_attention_trend,
    compute_time_cost,
    compute_binge_sessions,
    compute_search_watch_flow,
)
from app.services.indices import calc_dopamine
from app.services.insights import generate_insights

router = APIRouter(prefix="/api/stats", tags=["stats"])


# ---------------------------------------------------------------------------
# GET /api/stats/period
# ---------------------------------------------------------------------------

@router.get("/period", response_model=PeriodInfo)
def get_period(user_id: str = Query(default=DEFAULT_USER_ID)):
    earliest, latest = fetch_period(user_id)
    if not earliest:
        return PeriodInfo(date_from="", date_to="", total_days=0)

    date_from = to_local(earliest).strftime("%Y-%m-%d")
    date_to = to_local(latest).strftime("%Y-%m-%d")
    d1 = datetime.strptime(date_from, "%Y-%m-%d")
    d2 = datetime.strptime(date_to, "%Y-%m-%d")
    total_days = (d2 - d1).days + 1

    return PeriodInfo(date_from=date_from, date_to=date_to, total_days=total_days)


# ---------------------------------------------------------------------------
# GET /api/stats/dashboard — SSE endpoint
# ---------------------------------------------------------------------------

SECTIONS = [
    "summary", "hourly", "daily", "top_channels", "shorts",
    "categories", "watch_time", "weekly_watch_time", "weekly",
    "dopamine", "day_of_week", "viewer_type", "search_keywords",
    "content_diversity", "attention_trend", "time_cost", "binge_sessions",
    "search_watch_flow", "insights",
]


def _dashboard_stream(user_id: str, date_from: str, date_to: str) -> Generator[str, None, None]:
    try:
        total_sections = len(SECTIONS)
        loaded = 0

        yield sse("progress", {"step": "데이터 조회 중...", "loaded": 0, "total": total_sections})

        # Fetch data via repository (expects UTC strings)
        utc_from = local_date_to_utc(date_from)
        utc_to = local_date_to_utc(date_to, end_of_day=True)

        records = fetch_watch_records(user_id, utc_from, utc_to)
        search_records = fetch_search_records(user_id, utc_from, utc_to)

        video_ids = list({r["video_id"] for r in records if r.get("video_id")})
        id_to_duration, id_to_category = fetch_video_metadata(video_ids) if video_ids else ({}, {})

        # Compute and stream each section
        summary = compute_summary(records)
        loaded += 1
        yield sse("section", {"name": "summary", "data": summary, "loaded": loaded, "total": total_sections})

        hourly = compute_hourly(records)
        loaded += 1
        yield sse("section", {"name": "hourly", "data": hourly, "loaded": loaded, "total": total_sections})

        daily = compute_daily(records)
        loaded += 1
        yield sse("section", {"name": "daily", "data": daily, "loaded": loaded, "total": total_sections})

        top_channels = compute_top_channels(records)
        loaded += 1
        yield sse("section", {"name": "top_channels", "data": top_channels, "loaded": loaded, "total": total_sections})

        shorts = compute_shorts(records)
        loaded += 1
        yield sse("section", {"name": "shorts", "data": shorts, "loaded": loaded, "total": total_sections})

        categories = compute_categories(records, id_to_category)
        loaded += 1
        yield sse("section", {"name": "categories", "data": categories, "loaded": loaded, "total": total_sections})

        watch_time = compute_watch_time(records, id_to_duration)
        loaded += 1
        yield sse("section", {"name": "watch_time", "data": watch_time, "loaded": loaded, "total": total_sections})

        weekly_watch_time = compute_weekly_watch_time(records, id_to_duration)
        loaded += 1
        yield sse("section", {"name": "weekly_watch_time", "data": weekly_watch_time, "loaded": loaded, "total": total_sections})

        weekly = compute_weekly(records)
        loaded += 1
        yield sse("section", {"name": "weekly", "data": weekly, "loaded": loaded, "total": total_sections})

        dopamine = calc_dopamine(records, id_to_duration)
        loaded += 1
        yield sse("section", {"name": "dopamine", "data": dopamine, "loaded": loaded, "total": total_sections})

        day_of_week = compute_day_of_week(records)
        loaded += 1
        yield sse("section", {"name": "day_of_week", "data": day_of_week, "loaded": loaded, "total": total_sections})

        viewer_type = compute_viewer_type(records, shorts, hourly)
        loaded += 1
        yield sse("section", {"name": "viewer_type", "data": viewer_type, "loaded": loaded, "total": total_sections})

        keywords = compute_search_keywords(search_records)
        loaded += 1
        yield sse("section", {"name": "search_keywords", "data": keywords, "loaded": loaded, "total": total_sections})

        content_diversity = compute_content_diversity(records, id_to_category)
        loaded += 1
        yield sse("section", {"name": "content_diversity", "data": content_diversity, "loaded": loaded, "total": total_sections})

        attention_trend = compute_attention_trend(records, id_to_duration)
        loaded += 1
        yield sse("section", {"name": "attention_trend", "data": attention_trend, "loaded": loaded, "total": total_sections})

        time_cost = compute_time_cost(watch_time)
        loaded += 1
        yield sse("section", {"name": "time_cost", "data": time_cost, "loaded": loaded, "total": total_sections})

        binge_sessions = compute_binge_sessions(records)
        loaded += 1
        yield sse("section", {"name": "binge_sessions", "data": binge_sessions, "loaded": loaded, "total": total_sections})

        search_watch_flow = compute_search_watch_flow(search_records, records)
        loaded += 1
        yield sse("section", {"name": "search_watch_flow", "data": search_watch_flow, "loaded": loaded, "total": total_sections})

        insights = generate_insights(summary, hourly, shorts, dopamine, watch_time, weekly)
        loaded += 1
        yield sse("section", {"name": "insights", "data": insights, "loaded": loaded, "total": total_sections})

        # Cache results to DB
        all_results = {
            "summary": summary, "hourly": hourly, "daily": daily,
            "top_channels": top_channels, "shorts": shorts, "categories": categories,
            "watch_time": watch_time, "weekly_watch_time": weekly_watch_time,
            "weekly": weekly, "dopamine": dopamine, "day_of_week": day_of_week,
            "viewer_type": viewer_type, "search_keywords": keywords,
            "content_diversity": content_diversity, "attention_trend": attention_trend,
            "time_cost": time_cost, "binge_sessions": binge_sessions,
            "search_watch_flow": search_watch_flow, "insights": insights,
        }
        try:
            save_youtube_results(user_id, date_from, date_to, all_results)
        except Exception as e:
            logger.warning("YouTube 캐시 저장 실패: %s", e)

        yield sse("done", {"loaded": total_sections, "total": total_sections})
    except Exception as e:
        yield sse("error", {"message": f"대시보드 생성 중 오류: {str(e)}"})


@router.get("/dashboard/cached")
def get_cached_dashboard(user_id: str = Query(default=DEFAULT_USER_ID)):
    """Return cached YouTube dashboard results (instant load)."""
    cached = fetch_youtube_results(user_id)
    if not cached:
        return JSONResponse(status_code=404, content={"detail": "캐시된 대시보드가 없습니다"})
    return JSONResponse(content=cached)


@router.get("/dashboard")
def get_dashboard(
    date_from: str = Query(...),
    date_to: str = Query(...),
    user_id: str = Query(default=DEFAULT_USER_ID),
):
    return StreamingResponse(
        _dashboard_stream(user_id, date_from, date_to),
        media_type="text/event-stream",
    )
