"""Centralized DB access layer for WatchLens."""

from app.db.supabase import get_supabase_client
from app.utils import chunk_list
from config.settings import DB_CHUNK_SIZE, DB_PAGE_SIZE, DEFAULT_USER_ID


# ---------------------------------------------------------------------------
# Pagination helper
# ---------------------------------------------------------------------------

def _fetch_all_rows(query, page_size: int = DB_PAGE_SIZE) -> list[dict]:
    all_data: list[dict] = []
    offset = 0
    while True:
        resp = query.range(offset, offset + page_size - 1).execute()
        all_data.extend(resp.data)
        if len(resp.data) < page_size:
            break
        offset += page_size
    return all_data


# ---------------------------------------------------------------------------
# YouTube watch / search records
# ---------------------------------------------------------------------------

def fetch_watch_records(user_id: str, date_from: str, date_to: str) -> list[dict]:
    """Fetch watch_records for a user within a date range.

    date_from and date_to must be UTC ISO-8601 strings.
    """
    sb = get_supabase_client()
    query = sb.table("watch_records").select(
        "video_id, video_title, channel_name, watched_at, is_shorts"
    ).eq("user_id", user_id).gte("watched_at", date_from).lte("watched_at", date_to)
    return _fetch_all_rows(query)


def fetch_search_records(user_id: str, date_from: str, date_to: str) -> list[dict]:
    """Fetch search_records for a user within a date range.

    date_from and date_to must be UTC ISO-8601 strings.
    """
    sb = get_supabase_client()
    query = sb.table("search_records").select("query, searched_at").eq(
        "user_id", user_id
    ).gte("searched_at", date_from).lte("searched_at", date_to)
    return _fetch_all_rows(query)


def fetch_video_metadata(video_ids: list[str]) -> tuple[dict[str, int], dict[str, str]]:
    """Fetch durations and categories in a single pass over video_metadata."""
    sb = get_supabase_client()
    id_to_duration: dict[str, int] = {}
    id_to_category: dict[str, str] = {}
    for chunk in chunk_list(video_ids):
        meta = sb.table("video_metadata").select(
            "video_id, duration_seconds, category_name"
        ).in_("video_id", chunk).execute()
        for r in meta.data:
            if r["duration_seconds"]:
                id_to_duration[r["video_id"]] = r["duration_seconds"]
            id_to_category[r["video_id"]] = r["category_name"]
    return id_to_duration, id_to_category


def fetch_period(user_id: str) -> tuple[str, str]:
    """Return (earliest_watched_at, latest_watched_at) ISO strings, or ('', '') if no records."""
    sb = get_supabase_client()
    earliest = sb.table("watch_records").select("watched_at").eq(
        "user_id", user_id
    ).order("watched_at").limit(1).execute()
    latest = sb.table("watch_records").select("watched_at").eq(
        "user_id", user_id
    ).order("watched_at", desc=True).limit(1).execute()

    if not earliest.data or not latest.data:
        return "", ""

    return earliest.data[0]["watched_at"], latest.data[0]["watched_at"]


# ---------------------------------------------------------------------------
# Upload helpers
# ---------------------------------------------------------------------------

def delete_user_records(table: str, user_id: str) -> None:
    """Delete all records for a user from the given table."""
    sb = get_supabase_client()
    sb.table(table).delete().eq("user_id", user_id).execute()


def batch_insert(table: str, records: list) -> None:
    """Insert records into table in chunks."""
    sb = get_supabase_client()
    for batch in chunk_list(records):
        sb.table(table).insert(batch).execute()


def store_original_file(bucket: str, path: str, file_bytes: bytes) -> bool:
    """Upload a file to Supabase storage. Returns True on success."""
    sb = get_supabase_client()
    try:
        sb.storage.from_(bucket).upload(path, file_bytes)
        return True
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Instagram dashboard results
# ---------------------------------------------------------------------------

def save_instagram_results(user_id: str, results: dict) -> None:
    """Upsert Instagram dashboard results for a user."""
    sb = get_supabase_client()
    sb.table("instagram_dashboard_results").delete().eq("user_id", user_id).execute()
    sb.table("instagram_dashboard_results").insert({
        "user_id": user_id,
        "results": results,
    }).execute()


def fetch_instagram_results(user_id: str) -> dict | None:
    """Fetch the latest cached Instagram dashboard results. Returns None if not found."""
    sb = get_supabase_client()
    resp = sb.table("instagram_dashboard_results").select("results").eq(
        "user_id", user_id
    ).order("created_at", desc=True).limit(1).execute()

    if not resp.data:
        return None
    return resp.data[0]["results"]


# ---------------------------------------------------------------------------
# YouTube dashboard results
# ---------------------------------------------------------------------------

def save_youtube_results(user_id: str, date_from: str, date_to: str, results: dict) -> None:
    """Upsert YouTube dashboard results for a user."""
    sb = get_supabase_client()
    sb.table("youtube_dashboard_results").delete().eq("user_id", user_id).execute()
    sb.table("youtube_dashboard_results").insert({
        "user_id": user_id,
        "date_from": date_from,
        "date_to": date_to,
        "results": results,
    }).execute()


def fetch_youtube_results(user_id: str) -> dict | None:
    """Fetch the latest cached YouTube dashboard results. Returns None if not found."""
    sb = get_supabase_client()
    resp = sb.table("youtube_dashboard_results").select("results, date_from, date_to").eq(
        "user_id", user_id
    ).order("created_at", desc=True).limit(1).execute()

    if not resp.data:
        return None
    return resp.data[0]
