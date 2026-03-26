from collections import Counter
from datetime import datetime
from fastapi import APIRouter, Query
from app.db.supabase import get_supabase_client
from app.models.schemas import SummaryStats, HourlyCount, DailyCount
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
