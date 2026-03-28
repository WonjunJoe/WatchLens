from urllib.parse import urlparse, parse_qs
from app.models.schemas import ParseResult
from app.utils import parse_period
from config.settings import SUPPORTED_HEADERS, WATCH_TITLE_PREFIX, DEFAULT_USER_ID


def extract_video_id(url: str) -> str | None:
    parsed = urlparse(url)
    if "/shorts/" in parsed.path:
        parts = parsed.path.split("/shorts/")
        if len(parts) > 1:
            return parts[1].split("/")[0].split("?")[0]
    qs = parse_qs(parsed.query)
    if "v" in qs:
        return qs["v"][0]
    if parsed.hostname and "youtu.be" in parsed.hostname:
        return parsed.path.lstrip("/").split("/")[0]
    return None


def parse_watch_history(data: list[dict]) -> ParseResult:
    records = []
    skipped = 0
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

        subtitles = entry.get("subtitles", [])
        channel_name = subtitles[0]["name"] if subtitles else None
        channel_url = subtitles[0]["url"] if subtitles else None

        time_str = entry["time"]
        timestamps.append(time_str)

        records.append({
            "user_id": DEFAULT_USER_ID,
            "video_id": video_id,
            "video_title": video_title,
            "channel_name": channel_name,
            "channel_url": channel_url,
            "watched_at": time_str,
        })

    return ParseResult(
        records=records,
        total=len(records),
        skipped=skipped,
        period=parse_period(timestamps),
    )
