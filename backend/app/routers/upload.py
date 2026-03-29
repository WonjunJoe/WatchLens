"""File upload endpoints for YouTube watch/search history."""

import json
from collections.abc import Generator
from datetime import datetime, timezone

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse

from config.settings import MAX_FILE_SIZE_BYTES, DEFAULT_USER_ID, SUPABASE_STORAGE_BUCKET
from app.utils import sse
from app.parsers.watch_history import parse_watch_history
from app.parsers.search_history import parse_search_history
from app.services.youtube import fetch_and_store_metadata
from app.db.repository import delete_user_records, batch_insert, store_original_file

router = APIRouter(prefix="/api/upload", tags=["upload"])


def _upload_timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")


def _parse_json(file_bytes: bytes) -> list | None:
    try:
        data = json.loads(file_bytes)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None
    if not isinstance(data, list):
        return None
    return data


def _watch_history_stream(file_bytes: bytes) -> Generator[str, None, None]:
    yield sse("progress", {"step": "파싱 중...", "percent": 10})
    data = _parse_json(file_bytes)
    if data is None:
        yield sse("error", {"detail": "유효한 YouTube Takeout JSON이 아닙니다"})
        return

    result = parse_watch_history(data)
    yield sse("progress", {"step": f"파싱 완료 — {result.total}건 발견 ({result.period})", "percent": 20})

    yield sse("progress", {"step": f"DB 저장 중... ({result.period})", "percent": 30})
    delete_user_records("watch_records", DEFAULT_USER_ID)
    if result.records:
        batch_insert("watch_records", result.records)
    yield sse("progress", {"step": f"DB 저장 완료 — {result.total}건", "percent": 50})

    video_ids = [r["video_id"] for r in result.records if r.get("video_id")]
    if video_ids:
        yield sse("progress", {"step": "YouTube API 메타데이터 조회 중...", "percent": 55})
        fetch_and_store_metadata(video_ids)
        yield sse("progress", {"step": "메타데이터 + Shorts 판별 완료", "percent": 90})

    timestamp = _upload_timestamp()
    path = f"takeout/{timestamp}/watch-history.json"
    store_original_file(SUPABASE_STORAGE_BUCKET, path, file_bytes)

    yield sse("done", {
        "total": result.total,
        "skipped": result.skipped,
        "period": result.period,
    })


def _search_history_stream(file_bytes: bytes) -> Generator[str, None, None]:
    yield sse("progress", {"step": "파싱 중...", "percent": 15})
    data = _parse_json(file_bytes)
    if data is None:
        yield sse("error", {"detail": "유효한 YouTube Takeout JSON이 아닙니다"})
        return

    result = parse_search_history(data)
    yield sse("progress", {"step": f"파싱 완료 — {result.total}건 발견 ({result.period})", "percent": 40})

    yield sse("progress", {"step": f"DB 저장 중... ({result.period})", "percent": 50})
    delete_user_records("search_records", DEFAULT_USER_ID)
    if result.records:
        batch_insert("search_records", result.records)
    yield sse("progress", {"step": f"DB 저장 완료 — {result.total}건", "percent": 80})

    timestamp = _upload_timestamp()
    path = f"takeout/{timestamp}/search-history.json"
    store_original_file(SUPABASE_STORAGE_BUCKET, path, file_bytes)

    yield sse("done", {
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
