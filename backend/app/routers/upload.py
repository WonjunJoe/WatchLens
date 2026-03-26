import json
from datetime import datetime, timezone
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.parsers.watch_history import parse_watch_history
from app.parsers.search_history import parse_search_history
from app.models.schemas import WatchUploadResponse, SearchUploadResponse
from app.db.supabase import get_supabase_client
from config.settings import MAX_FILE_SIZE_BYTES, DEFAULT_USER_ID, SUPABASE_STORAGE_BUCKET

router = APIRouter(prefix="/api/upload", tags=["upload"])

BATCH_SIZE = 500


def _upload_timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")


def _store_original(sb, file_bytes: bytes, filename: str, timestamp: str) -> bool:
    path = f"takeout/{timestamp}/{filename}"
    try:
        sb.storage.from_(SUPABASE_STORAGE_BUCKET).upload(path, file_bytes)
        return True
    except Exception:
        return False


def _batch_insert(sb, table: str, records: list):
    for i in range(0, len(records), BATCH_SIZE):
        batch = records[i : i + BATCH_SIZE]
        sb.table(table).insert(batch).execute()


@router.post("/watch-history", response_model=WatchUploadResponse)
async def upload_watch_history(file: UploadFile = File(...)):
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(413, "파일 크기가 50MB를 초과합니다")

    try:
        data = json.loads(file_bytes)
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise HTTPException(400, "유효한 YouTube Takeout JSON이 아닙니다")

    if not isinstance(data, list):
        raise HTTPException(400, "유효한 YouTube Takeout JSON이 아닙니다")

    result = parse_watch_history(data)

    sb = get_supabase_client()

    sb.table("watch_records").delete().eq("user_id", DEFAULT_USER_ID).execute()
    if result.records:
        _batch_insert(sb, "watch_records", result.records)

    timestamp = _upload_timestamp()
    stored = _store_original(sb, file_bytes, "watch-history.json", timestamp)

    return WatchUploadResponse(
        total=result.total,
        skipped=result.skipped,
        period=result.period,
        original_file_stored=stored,
    )


@router.post("/search-history", response_model=SearchUploadResponse)
async def upload_search_history(file: UploadFile = File(...)):
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(413, "파일 크기가 50MB를 초과합니다")

    try:
        data = json.loads(file_bytes)
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise HTTPException(400, "유효한 YouTube Takeout JSON이 아닙니다")

    if not isinstance(data, list):
        raise HTTPException(400, "유효한 YouTube Takeout JSON이 아닙니다")

    result = parse_search_history(data)

    sb = get_supabase_client()

    sb.table("search_records").delete().eq("user_id", DEFAULT_USER_ID).execute()
    if result.records:
        _batch_insert(sb, "search_records", result.records)

    timestamp = _upload_timestamp()
    stored = _store_original(sb, file_bytes, "search-history.json", timestamp)

    return SearchUploadResponse(
        total=result.total,
        skipped=result.skipped,
        period=result.period,
        original_file_stored=stored,
    )
