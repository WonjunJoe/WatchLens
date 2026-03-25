from dataclasses import dataclass, field
from urllib.parse import urlparse, parse_qs
from config.settings import (
    SUPPORTED_HEADERS, WATCH_TITLE_PREFIX,
    SHORTS_TITLE_KEYWORDS, SHORTS_URL_PATTERN, DEFAULT_USER_ID,
)


@dataclass
class WatchParseResult:
    records: list = field(default_factory=list)
    total: int = 0
    skipped: int = 0
    shorts: int = 0
    period: str = ""


def extract_video_id(url: str) -> str | None:
    parsed = urlparse(url)
    if SHORTS_URL_PATTERN in parsed.path:
        parts = parsed.path.split(SHORTS_URL_PATTERN)
        if len(parts) > 1:
            return parts[1].split("/")[0].split("?")[0]
    qs = parse_qs(parsed.query)
    if "v" in qs:
        return qs["v"][0]
    if parsed.hostname and "youtu.be" in parsed.hostname:
        return parsed.path.lstrip("/").split("/")[0]
    return None


def is_shorts(title: str, url: str) -> bool:
    title_lower = title.lower()
    for keyword in SHORTS_TITLE_KEYWORDS:
        if keyword in title_lower:
            return True
    if SHORTS_URL_PATTERN in url:
        return True
    return False


def parse_watch_history(data: list[dict]) -> WatchParseResult:
    records = []
    skipped = 0
    shorts_count = 0
    timestamps = []

    for entry in data:
        header = entry.get("header", "")
        if header not in SUPPORTED_HEADERS:
            skipped += 1
            continue
        title = entry.get("title", "")
        if not title.startswith(WATCH_TITLE_PREFIX):
            skipped += 1
            continue
        title_url = entry.get("titleUrl")
        if not title_url:
            skipped += 1
            continue

        video_title = title[len(WATCH_TITLE_PREFIX):]
        video_id = extract_video_id(title_url)
        shorts = is_shorts(title, title_url)

        subtitles = entry.get("subtitles", [])
        channel_name = subtitles[0]["name"] if subtitles else None
        channel_url = subtitles[0]["url"] if subtitles else None

        time_str = entry["time"]
        timestamps.append(time_str)
        if shorts:
            shorts_count += 1

        records.append({
            "user_id": DEFAULT_USER_ID,
            "video_id": video_id,
            "video_title": video_title,
            "channel_name": channel_name,
            "channel_url": channel_url,
            "watched_at": time_str,
            "is_shorts": shorts,
            "source": "takeout",
        })

    period = ""
    if timestamps:
        dates = sorted(t[:10] for t in timestamps)
        period = f"{dates[0]} ~ {dates[-1]}"

    return WatchParseResult(
        records=records,
        total=len(records),
        skipped=skipped,
        shorts=shorts_count,
        period=period,
    )
