from collections import Counter
from datetime import datetime
from fastapi import APIRouter, Query
from app.db.supabase import get_supabase_client
from app.models.schemas import SummaryStats, HourlyCount, DailyCount, ChannelCount, ShortsStats, CategoryCount, KeywordCount
from config.settings import DEFAULT_USER_ID

router = APIRouter(prefix="/api/stats", tags=["stats"])

QUERY_LIMIT = 100000


def _fetch_watch_records(user_id: str) -> list[dict]:
    sb = get_supabase_client()
    result = sb.table("watch_records").select(
        "video_id, video_title, channel_name, watched_at, is_shorts"
    ).eq("user_id", user_id).limit(QUERY_LIMIT).execute()
    return result.data


@router.get("/summary", response_model=SummaryStats)
def get_summary(user_id: str = Query(default=DEFAULT_USER_ID)):
    records = _fetch_watch_records(user_id)
    if not records:
        return SummaryStats(total_watched=0, total_channels=0, period="", daily_average=0, shorts_count=0)

    channels = {r["channel_name"] for r in records if r["channel_name"]}
    dates = sorted({r["watched_at"][:10] for r in records})
    period = f"{dates[0]} ~ {dates[-1]}" if dates else ""
    num_days = len(dates) or 1
    shorts_count = sum(1 for r in records if r["is_shorts"])

    return SummaryStats(
        total_watched=len(records),
        total_channels=len(channels),
        period=period,
        daily_average=round(len(records) / num_days, 1),
        shorts_count=shorts_count,
    )


@router.get("/hourly", response_model=list[HourlyCount])
def get_hourly(user_id: str = Query(default=DEFAULT_USER_ID)):
    records = _fetch_watch_records(user_id)
    hour_counts = Counter()
    for r in records:
        hour = datetime.fromisoformat(r["watched_at"].replace("Z", "+00:00")).hour
        hour_counts[hour] += 1

    return [HourlyCount(hour=h, count=hour_counts.get(h, 0)) for h in range(24)]


@router.get("/daily", response_model=list[DailyCount])
def get_daily(user_id: str = Query(default=DEFAULT_USER_ID)):
    records = _fetch_watch_records(user_id)
    day_counts = Counter(r["watched_at"][:10] for r in records)

    return sorted(
        [DailyCount(date=d, count=c) for d, c in day_counts.items()],
        key=lambda x: x.date,
    )


@router.get("/top-channels", response_model=list[ChannelCount])
def get_top_channels(user_id: str = Query(default=DEFAULT_USER_ID)):
    records = _fetch_watch_records(user_id)
    channel_counts = Counter(r["channel_name"] for r in records if r["channel_name"])

    return sorted(
        [ChannelCount(channel_name=ch, count=c) for ch, c in channel_counts.most_common(20)],
        key=lambda x: -x.count,
    )


@router.get("/shorts", response_model=ShortsStats)
def get_shorts(user_id: str = Query(default=DEFAULT_USER_ID)):
    records = _fetch_watch_records(user_id)
    shorts = sum(1 for r in records if r["is_shorts"])
    regular = len(records) - shorts
    ratio = round(shorts / len(records), 2) if records else 0

    # Weekly trend
    week_shorts = Counter()
    week_total = Counter()
    for r in records:
        date = r["watched_at"][:10]
        dt = datetime.fromisoformat(date)
        week_key = dt.strftime("%Y-W%W")
        week_total[week_key] += 1
        if r["is_shorts"]:
            week_shorts[week_key] += 1

    weekly_trend = sorted([
        {"week": w, "shorts_ratio": round(week_shorts[w] / week_total[w], 2)}
        for w in week_total
    ], key=lambda x: x["week"])

    return ShortsStats(
        shorts_count=shorts,
        regular_count=regular,
        shorts_ratio=ratio,
        weekly_trend=weekly_trend,
    )


@router.get("/categories", response_model=list[CategoryCount])
def get_categories(user_id: str = Query(default=DEFAULT_USER_ID)):
    sb = get_supabase_client()

    watch_result = sb.table("watch_records").select("video_id").eq(
        "user_id", user_id
    ).limit(QUERY_LIMIT).execute()
    video_ids = [r["video_id"] for r in watch_result.data if r["video_id"]]

    if not video_ids:
        return []

    meta_result = sb.table("video_metadata").select(
        "video_id, category_name"
    ).in_("video_id", video_ids).execute()
    id_to_category = {r["video_id"]: r["category_name"] for r in meta_result.data}

    category_counts = Counter(
        id_to_category.get(vid, "Unknown") for vid in video_ids
    )

    return sorted(
        [CategoryCount(category_name=cat, count=c) for cat, c in category_counts.most_common()],
        key=lambda x: -x.count,
    )


@router.get("/search-keywords", response_model=list[KeywordCount])
def get_search_keywords(user_id: str = Query(default=DEFAULT_USER_ID)):
    sb = get_supabase_client()
    result = sb.table("search_records").select("query").eq(
        "user_id", user_id
    ).limit(QUERY_LIMIT).execute()

    query_counts = Counter(r["query"] for r in result.data)

    return sorted(
        [KeywordCount(keyword=q, count=c) for q, c in query_counts.most_common(30)],
        key=lambda x: -x.count,
    )
