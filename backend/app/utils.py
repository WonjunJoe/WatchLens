"""Shared utilities used across routers, services, and parsers."""

import json
from datetime import datetime, timezone, timedelta
from collections.abc import Iterator

from config.settings import USER_TZ_OFFSET_HOURS, DB_CHUNK_SIZE

USER_TZ = timezone(timedelta(hours=USER_TZ_OFFSET_HOURS))


def to_local(watched_at: str) -> datetime:
    dt = datetime.fromisoformat(watched_at.replace("Z", "+00:00"))
    return dt.astimezone(USER_TZ)


def sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def chunk_list(items: list, size: int = DB_CHUNK_SIZE) -> Iterator[list]:
    for i in range(0, len(items), size):
        yield items[i : i + size]


def local_date_to_utc(local_date: str, end_of_day: bool = False) -> str:
    """Convert local date string (YYYY-MM-DD) to UTC ISO-8601."""
    if end_of_day:
        local_dt = datetime.strptime(local_date, "%Y-%m-%d").replace(
            hour=23, minute=59, second=59, tzinfo=USER_TZ
        )
    else:
        local_dt = datetime.strptime(local_date, "%Y-%m-%d").replace(
            hour=0, minute=0, second=0, tzinfo=USER_TZ
        )
    return local_dt.astimezone(timezone(timedelta(hours=0))).isoformat()


def parse_period(timestamps: list[str]) -> str:
    if not timestamps:
        return ""
    dates = sorted(t[:10] for t in timestamps)
    return f"{dates[0]} ~ {dates[-1]}"
