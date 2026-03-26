import json
from collections.abc import Generator
from datetime import datetime, timezone
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from app.parsers.watch_history import parse_watch_history
from app.parsers.search_history import parse_search_history
from app.db.supabase import get_supabase_client
from app.services.youtube import fetch_and_store_metadata
from config.settings import MAX_FILE_SIZE_BYTES, DEFAULT_USER_ID, SUPABASE_STORAGE_BUCKET

router = APIRouter(prefix="/api/upload", tags=["upload"])

BATCH_SIZE = 500


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


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


def _watch_history_stream(file_bytes: bytes) -> Generator[str, None, None]:
    # 1. Parse
    yield _sse("progress", {"step": "파싱 중...", "percent": 10})
    try:
        data = json.loads(file_bytes)
    except (json.JSONDecodeError, UnicodeDecodeError):
        yield _sse("error", {"detail": "유효한 YouTube Takeout JSON이 아닙니다"})
        return
    if not isinstance(data, list):
        yield _sse("error", {"detail": "유효한 YouTube Takeout JSON이 아닙니다"})
        return

    result = parse_watch_history(data)
    yield _sse("progress", {"step": f"파싱 완료 — {result.total}건 발견 ({result.period})", "percent": 20})

    # 2. DB save
    yield _sse("progress", {"step": f"DB 저장 중... ({result.period})", "percent": 30})
    sb = get_supabase_client()
    sb.table("watch_records").delete().eq("user_id", DEFAULT_USER_ID).execute()
    if result.records:
        _batch_insert(sb, "watch_records", result.records)
    yield _sse("progress", {"step": f"DB 저장 완료 — {result.total}건", "percent": 50})

    # 3. YouTube API metadata
    video_ids = [r["video_id"] for r in result.records if r.get("video_id")]
    if video_ids:
        yield _sse("progress", {"step": "YouTube API 메타데이터 조회 중...", "percent": 55})
        fetch_and_store_metadata(video_ids)
        yield _sse("progress", {"step": "메타데이터 + Shorts 판별 완료", "percent": 90})

    # 4. Backup (silent)
    timestamp = _upload_timestamp()
    _store_original(sb, file_bytes, "watch-history.json", timestamp)

    yield _sse("done", {
        "total": result.total,
        "skipped": result.skipped,
        "period": result.period,
    })


def _search_history_stream(file_bytes: bytes) -> Generator[str, None, None]:
    # 1. Parse
    yield _sse("progress", {"step": "파싱 중...", "percent": 15})
    try:
        data = json.loads(file_bytes)
    except (json.JSONDecodeError, UnicodeDecodeError):
        yield _sse("error", {"detail": "유효한 YouTube Takeout JSON이 아닙니다"})
        return
    if not isinstance(data, list):
        yield _sse("error", {"detail": "유효한 YouTube Takeout JSON이 아닙니다"})
        return

    result = parse_search_history(data)
    yield _sse("progress", {"step": f"파싱 완료 — {result.total}건 발견 ({result.period})", "percent": 40})

    # 2. DB save
    yield _sse("progress", {"step": f"DB 저장 중... ({result.period})", "percent": 50})
    sb = get_supabase_client()
    sb.table("search_records").delete().eq("user_id", DEFAULT_USER_ID).execute()
    if result.records:
        _batch_insert(sb, "search_records", result.records)
    yield _sse("progress", {"step": f"DB 저장 완료 — {result.total}건", "percent": 80})

    # 3. Backup (silent)
    timestamp = _upload_timestamp()
    _store_original(sb, file_bytes, "search-history.json", timestamp)

    yield _sse("done", {
        "total": result.total,
        "skipped": result.skipped,
        "period": result.period,
    })


@router.post("/watch-history")
async def upload_watch_history(file: UploadFile = File(...)):
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(413, "파일 크기가 50MB를 초과합니다")
    return StreamingResponse(_watch_history_stream(file_bytes), media_type="text/event-stream")


@router.post("/search-history")
async def upload_search_history(file: UploadFile = File(...)):
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(413, "파일 크기가 50MB를 초과합니다")
    return StreamingResponse(_search_history_stream(file_bytes), media_type="text/event-stream")
