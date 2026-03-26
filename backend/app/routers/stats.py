from collections import Counter
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Query
from app.db.supabase import get_supabase_client
from app.models.schemas import (
    SummaryStats, HourlyCount, DailyCount, ChannelCount, TopChannelsSplit,
    ShortsStats, CategorySplit, CategoryCount, KeywordCount, WatchTimeStats,
)
from config.settings import (
    DEFAULT_USER_ID, STATS_DATE_FROM, STATS_DATE_TO, USER_TZ_OFFSET_HOURS,
    WATCH_TIME_CAP_SECONDS, AVG_RETENTION_SHORTS, AVG_RETENTION_LONGFORM,
    SHORTS_MAX_DURATION_SECONDS,
)

router = APIRouter(prefix="/api/stats", tags=["stats"])

PAGE_SIZE = 1000
USER_TZ = timezone(timedelta(hours=USER_TZ_OFFSET_HOURS))


def _local_date_to_utc(local_date: str, end_of_day: bool = False) -> str:
    """Convert a local date string to UTC ISO timestamp for DB queries."""
    if end_of_day:
        local_dt = datetime.strptime(local_date, "%Y-%m-%d").replace(
            hour=23, minute=59, second=59, tzinfo=USER_TZ
        )
    else:
        local_dt = datetime.strptime(local_date, "%Y-%m-%d").replace(
            hour=0, minute=0, second=0, tzinfo=USER_TZ
        )
    return local_dt.astimezone(timezone.utc).isoformat()


# Pre-compute UTC bounds from local date settings
_UTC_FROM = _local_date_to_utc(STATS_DATE_FROM)
_UTC_TO = _local_date_to_utc(STATS_DATE_TO, end_of_day=True)


def _to_local(watched_at: str) -> datetime:
    """Convert a UTC ISO timestamp to the user's local timezone."""
    dt = datetime.fromisoformat(watched_at.replace("Z", "+00:00"))
    return dt.astimezone(USER_TZ)


def _fetch_all_rows(query, page_size: int = PAGE_SIZE) -> list[dict]:
    """Paginate through Supabase results to bypass the 1000-row default limit."""
    all_data: list[dict] = []
    offset = 0
    while True:
        resp = query.range(offset, offset + page_size - 1).execute()
        all_data.extend(resp.data)
        if len(resp.data) < page_size:
            break
        offset += page_size
    return all_data


def _fetch_watch_records(user_id: str) -> list[dict]:
    sb = get_supabase_client()
    query = sb.table("watch_records").select(
        "video_id, video_title, channel_name, watched_at, is_shorts"
    ).eq("user_id", user_id).gte("watched_at", _UTC_FROM).lte("watched_at", _UTC_TO)
    return _fetch_all_rows(query)


@router.get("/summary", response_model=SummaryStats)
def get_summary(user_id: str = Query(default=DEFAULT_USER_ID)):
    records = _fetch_watch_records(user_id)
    if not records:
        return SummaryStats(total_watched=0, total_channels=0, period="", daily_average=0, shorts_count=0)

    channels = {r["channel_name"] for r in records if r["channel_name"]}
    local_dates = sorted({_to_local(r["watched_at"]).strftime("%Y-%m-%d") for r in records})
    period = f"{local_dates[0]} ~ {local_dates[-1]}" if local_dates else ""
    num_days = len(local_dates) or 1
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
        hour = _to_local(r["watched_at"]).hour
        hour_counts[hour] += 1

    return [HourlyCount(hour=h, count=hour_counts.get(h, 0)) for h in range(24)]


@router.get("/daily", response_model=list[DailyCount])
def get_daily(user_id: str = Query(default=DEFAULT_USER_ID)):
    records = _fetch_watch_records(user_id)
    day_counts = Counter(_to_local(r["watched_at"]).strftime("%Y-%m-%d") for r in records)

    return sorted(
        [DailyCount(date=d, count=c) for d, c in day_counts.items()],
        key=lambda x: x.date,
    )


@router.get("/top-channels", response_model=TopChannelsSplit)
def get_top_channels(user_id: str = Query(default=DEFAULT_USER_ID)):
    records = _fetch_watch_records(user_id)

    longform_counts: Counter[str] = Counter()
    shorts_counts: Counter[str] = Counter()
    for r in records:
        name = r["channel_name"]
        if not name:
            continue
        if r["is_shorts"]:
            shorts_counts[name] += 1
        else:
            longform_counts[name] += 1

    def to_list(counter: Counter) -> list[ChannelCount]:
        return sorted(
            [ChannelCount(channel_name=ch, count=c) for ch, c in counter.most_common(10)],
            key=lambda x: -x.count,
        )

    return TopChannelsSplit(longform=to_list(longform_counts), shorts=to_list(shorts_counts))


@router.get("/shorts", response_model=ShortsStats)
def get_shorts(user_id: str = Query(default=DEFAULT_USER_ID)):
    records = _fetch_watch_records(user_id)
    shorts = sum(1 for r in records if r["is_shorts"])
    regular = len(records) - shorts
    ratio = round(shorts / len(records), 2) if records else 0

    # Daily trend with 3-day moving average (local timezone)
    day_shorts: Counter[str] = Counter()
    day_total: Counter[str] = Counter()
    for r in records:
        date = _to_local(r["watched_at"]).strftime("%Y-%m-%d")
        day_total[date] += 1
        if r["is_shorts"]:
            day_shorts[date] += 1

    sorted_dates = sorted(day_total.keys())
    raw_ratios = [round(day_shorts[d] / day_total[d], 2) for d in sorted_dates]

    window = 3
    daily_trend = []
    for i, date in enumerate(sorted_dates):
        start = max(0, i - window + 1)
        avg = round(sum(raw_ratios[start:i + 1]) / (i - start + 1), 2)
        daily_trend.append({"date": date, "shorts_ratio": avg})

    return ShortsStats(
        shorts_count=shorts,
        regular_count=regular,
        shorts_ratio=ratio,
        daily_trend=daily_trend,
    )


@router.get("/categories", response_model=CategorySplit)
def get_categories(user_id: str = Query(default=DEFAULT_USER_ID)):
    records = _fetch_watch_records(user_id)
    video_ids = list({r["video_id"] for r in records if r["video_id"]})

    if not video_ids:
        return CategorySplit(longform=[], shorts=[])

    sb = get_supabase_client()
    id_to_category: dict[str, str] = {}
    for i in range(0, len(video_ids), 500):
        chunk = video_ids[i : i + 500]
        meta_result = sb.table("video_metadata").select(
            "video_id, category_name"
        ).in_("video_id", chunk).execute()
        for r in meta_result.data:
            id_to_category[r["video_id"]] = r["category_name"]

    # Split by is_shorts
    shorts_counts: Counter[str] = Counter()
    longform_counts: Counter[str] = Counter()
    for r in records:
        vid = r["video_id"]
        if not vid:
            continue
        cat = id_to_category.get(vid, "Unknown")
        if r["is_shorts"]:
            shorts_counts[cat] += 1
        else:
            longform_counts[cat] += 1

    def to_list(counter: Counter) -> list[CategoryCount]:
        return sorted(
            [CategoryCount(category_name=cat, count=c) for cat, c in counter.most_common()],
            key=lambda x: -x.count,
        )

    return CategorySplit(longform=to_list(longform_counts), shorts=to_list(shorts_counts))


@router.get("/watch-time", response_model=WatchTimeStats)
def get_watch_time(user_id: str = Query(default=DEFAULT_USER_ID)):
    records = _fetch_watch_records(user_id)
    if not records:
        return WatchTimeStats(
            total_min_hours=0, total_max_hours=0,
            daily_min_hours=0, daily_max_hours=0,
            gap_based_count=0, estimated_count=0,
        )

    # Get duration metadata for all videos
    video_ids = list({r["video_id"] for r in records if r["video_id"]})
    sb = get_supabase_client()
    id_to_duration: dict[str, int] = {}
    for i in range(0, len(video_ids), 500):
        chunk = video_ids[i : i + 500]
        meta = sb.table("video_metadata").select(
            "video_id, duration_seconds"
        ).in_("video_id", chunk).execute()
        for r in meta.data:
            if r["duration_seconds"]:
                id_to_duration[r["video_id"]] = r["duration_seconds"]

    # Sort by watched_at (local time)
    sorted_records = sorted(records, key=lambda r: r["watched_at"])

    total_min_seconds = 0.0
    total_max_seconds = 0.0
    gap_based_count = 0
    estimated_count = 0

    for idx, rec in enumerate(sorted_records):
        vid = rec["video_id"]
        duration = id_to_duration.get(vid, 0) if vid else 0
        is_short = rec["is_shorts"]

        if duration == 0:
            continue

        # Cap duration at 1 hour for estimation
        capped = min(duration, WATCH_TIME_CAP_SECONDS)

        if idx < len(sorted_records) - 1:
            current_dt = datetime.fromisoformat(rec["watched_at"].replace("Z", "+00:00"))
            next_dt = datetime.fromisoformat(sorted_records[idx + 1]["watched_at"].replace("Z", "+00:00"))
            gap_seconds = (next_dt - current_dt).total_seconds()

            if 0 < gap_seconds < duration:
                # Method 1: gap-based — actual watch time
                total_min_seconds += gap_seconds
                total_max_seconds += gap_seconds
                gap_based_count += 1
                continue

        # Method 2: estimation — gap >= duration or last video
        retention = AVG_RETENTION_SHORTS if is_short else AVG_RETENTION_LONGFORM
        total_min_seconds += capped * retention
        total_max_seconds += capped
        estimated_count += 1

    num_days = len({_to_local(r["watched_at"]).strftime("%Y-%m-%d") for r in records}) or 1

    return WatchTimeStats(
        total_min_hours=round(total_min_seconds / 3600, 1),
        total_max_hours=round(total_max_seconds / 3600, 1),
        daily_min_hours=round(total_min_seconds / 3600 / num_days, 1),
        daily_max_hours=round(total_max_seconds / 3600 / num_days, 1),
        gap_based_count=gap_based_count,
        estimated_count=estimated_count,
    )


@router.get("/search-keywords", response_model=list[KeywordCount])
def get_search_keywords(user_id: str = Query(default=DEFAULT_USER_ID)):
    sb = get_supabase_client()
    query = sb.table("search_records").select("query").eq(
        "user_id", user_id
    ).gte("searched_at", _UTC_FROM).lte("searched_at", _UTC_TO)
    results = _fetch_all_rows(query)

    query_counts = Counter(r["query"] for r in results)

    return sorted(
        [KeywordCount(keyword=q, count=c) for q, c in query_counts.most_common(30)],
        key=lambda x: -x.count,
    )
