import os
import re
import httpx
from app.db.supabase import get_supabase_client
from app.utils import chunk_list
from config.settings import (
    YOUTUBE_API_URL, YOUTUBE_BATCH_SIZE, YOUTUBE_CATEGORY_MAP,
    SHORTS_MAX_DURATION_SECONDS,
)

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "")


def parse_duration(iso_duration: str) -> int:
    """Parse ISO 8601 duration (e.g., 'PT3M20S') to seconds."""
    match = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", iso_duration)
    if not match:
        return 0
    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    seconds = int(match.group(3) or 0)
    return hours * 3600 + minutes * 60 + seconds


def _build_metadata_record(item: dict) -> dict:
    snippet = item.get("snippet", {})
    content = item.get("contentDetails", {})
    stats = item.get("statistics", {})
    category_id = int(snippet.get("categoryId", 0))

    return {
        "video_id": item["id"],
        "title": snippet.get("title"),
        "channel_id": snippet.get("channelId"),
        "category_id": category_id,
        "category_name": YOUTUBE_CATEGORY_MAP.get(category_id, "Unknown"),
        "tags": snippet.get("tags", []),
        "default_language": snippet.get("defaultLanguage"),
        "duration_seconds": parse_duration(content.get("duration", "")),
        "view_count": int(stats["viewCount"]) if "viewCount" in stats else None,
        "like_count": int(stats["likeCount"]) if "likeCount" in stats else None,
        "comment_count": int(stats["commentCount"]) if "commentCount" in stats else None,
        "published_at": snippet.get("publishedAt"),
    }


def _fetch_batch(video_ids: list[str]) -> list[dict]:
    if not YOUTUBE_API_KEY:
        return []
    response = httpx.get(
        YOUTUBE_API_URL,
        params={
            "part": "snippet,contentDetails,statistics",
            "id": ",".join(video_ids),
            "key": YOUTUBE_API_KEY,
        },
        timeout=30,
    )
    response.raise_for_status()
    return response.json().get("items", [])


def fetch_and_store_metadata(video_ids: list[str], user_id: str):
    unique_ids = [vid for vid in set(video_ids) if vid]
    if not unique_ids:
        return

    sb = get_supabase_client()

    existing_ids: set[str] = set()
    for chunk in chunk_list(unique_ids):
        resp = sb.table("video_metadata").select("video_id").in_("video_id", chunk).execute()
        existing_ids.update(r["video_id"] for r in resp.data)
    new_ids = [vid for vid in unique_ids if vid not in existing_ids]

    if new_ids:
        all_records = []
        for i in range(0, len(new_ids), YOUTUBE_BATCH_SIZE):
            batch_ids = new_ids[i : i + YOUTUBE_BATCH_SIZE]
            try:
                items = _fetch_batch(batch_ids)
                for item in items:
                    all_records.append(_build_metadata_record(item))
            except httpx.HTTPError:
                continue

        if all_records:
            for chunk in chunk_list(all_records):
                sb.table("video_metadata").upsert(chunk).execute()

    # Determine shorts from metadata durations
    shorts_ids: list[str] = []
    for chunk in chunk_list(unique_ids):
        meta = sb.table("video_metadata").select("video_id, duration_seconds").in_("video_id", chunk).execute()
        shorts_ids.extend(
            r["video_id"] for r in meta.data
            if r["duration_seconds"] and r["duration_seconds"] <= SHORTS_MAX_DURATION_SECONDS
        )

    for chunk in chunk_list(unique_ids):
        sb.table("watch_records").update({"is_shorts": False}).eq("user_id", user_id).in_("video_id", chunk).execute()

    for chunk in chunk_list(shorts_ids):
        sb.table("watch_records").update({"is_shorts": True}).eq("user_id", user_id).in_("video_id", chunk).execute()
