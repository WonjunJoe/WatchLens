"""File upload endpoints for YouTube watch/search history."""

import io
import json
import zipfile
from collections.abc import Generator
from datetime import datetime, timezone

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse

from config.settings import (
    MAX_FILE_SIZE_BYTES, DEFAULT_USER_ID, SUPABASE_STORAGE_BUCKET,
    MAX_YOUTUBE_ZIP_SIZE_BYTES,
    TAKEOUT_WATCH_HISTORY_PATTERNS, TAKEOUT_SEARCH_HISTORY_PATTERNS,
)
from app.utils import sse
from app.parsers.watch_history import parse_watch_history
from app.parsers.search_history import parse_search_history
from app.services.youtube import fetch_and_store_metadata
from app.db.repository import delete_user_records, batch_insert, store_original_file, delete_youtube_cache

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
    try:
        yield sse("progress", {"step": "파싱 중...", "percent": 10})
        data = _parse_json(file_bytes)
        if data is None:
            yield sse("error", {"detail": "유효한 YouTube Takeout JSON이 아닙니다"})
            return

        result = parse_watch_history(data)
        yield sse("progress", {"step": f"파싱 완료 — {result.total}건 발견 ({result.period})", "percent": 20})

        yield sse("progress", {"step": f"DB 저장 중... ({result.period})", "percent": 30})
        delete_user_records("watch_records", DEFAULT_USER_ID)
        delete_youtube_cache(DEFAULT_USER_ID)
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
    except Exception as e:
        yield sse("error", {"detail": f"업로드 처리 중 오류: {str(e)}"})


def _search_history_stream(file_bytes: bytes) -> Generator[str, None, None]:
    try:
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
    except Exception as e:
        yield sse("error", {"detail": f"업로드 처리 중 오류: {str(e)}"})


def _find_in_zip(zf: zipfile.ZipFile, patterns: list[str]) -> str | None:
    """Find a file in the ZIP matching any of the given suffix patterns."""
    for name in zf.namelist():
        for pattern in patterns:
            if name.endswith(pattern):
                return name
    return None


def _read_json_from_zip(zf: zipfile.ZipFile, path: str) -> list | None:
    try:
        data = json.loads(zf.read(path))
    except (json.JSONDecodeError, UnicodeDecodeError, KeyError):
        return None
    if not isinstance(data, list):
        return None
    return data


def _youtube_takeout_stream(file_bytes: bytes) -> Generator[str, None, None]:
    try:
        yield sse("progress", {"step": "ZIP 파일 열기...", "percent": 5})
        try:
            zf = zipfile.ZipFile(io.BytesIO(file_bytes))
        except zipfile.BadZipFile:
            yield sse("error", {"detail": "유효한 ZIP 파일이 아닙니다"})
            return

        # Find watch history
        watch_path = _find_in_zip(zf, TAKEOUT_WATCH_HISTORY_PATTERNS)
        search_path = _find_in_zip(zf, TAKEOUT_SEARCH_HISTORY_PATTERNS)

        if not watch_path and not search_path:
            yield sse("error", {
                "detail": "ZIP 안에서 YouTube 시청/검색 기록을 찾을 수 없습니다. "
                          "Google Takeout에서 YouTube 데이터를 포함했는지 확인해주세요."
            })
            return

        found = []
        if watch_path:
            found.append("시청 기록")
        if search_path:
            found.append("검색 기록")
        yield sse("progress", {"step": f"발견: {', '.join(found)}", "percent": 10})

        timestamp = _upload_timestamp()
        results = {}

        # Process watch history
        if watch_path:
            yield sse("progress", {"step": "시청 기록 파싱 중...", "percent": 15})
            watch_data = _read_json_from_zip(zf, watch_path)
            if watch_data is None:
                yield sse("progress", {"step": "⚠ 시청 기록 JSON 파싱 실패, 건너뜀", "percent": 20})
            else:
                result = parse_watch_history(watch_data)
                yield sse("progress", {"step": f"시청 기록 파싱 완료 — {result.total}건 ({result.period})", "percent": 25})

                yield sse("progress", {"step": "시청 기록 DB 저장 중...", "percent": 30})
                delete_user_records("watch_records", DEFAULT_USER_ID)
                delete_youtube_cache(DEFAULT_USER_ID)
                if result.records:
                    batch_insert("watch_records", result.records)
                yield sse("progress", {"step": f"시청 기록 DB 저장 완료 — {result.total}건", "percent": 40})

                video_ids = [r["video_id"] for r in result.records if r.get("video_id")]
                if video_ids:
                    yield sse("progress", {"step": "YouTube API 메타데이터 조회 중...", "percent": 45})
                    fetch_and_store_metadata(video_ids)
                    yield sse("progress", {"step": "메타데이터 + Shorts 판별 완료", "percent": 65})

                watch_bytes = zf.read(watch_path)
                store_original_file(SUPABASE_STORAGE_BUCKET, f"takeout/{timestamp}/watch-history.json", watch_bytes)
                results["watch"] = {"total": result.total, "skipped": result.skipped, "period": result.period}

        # Process search history
        if search_path:
            yield sse("progress", {"step": "검색 기록 파싱 중...", "percent": 70})
            search_data = _read_json_from_zip(zf, search_path)
            if search_data is None:
                yield sse("progress", {"step": "⚠ 검색 기록 JSON 파싱 실패, 건너뜀", "percent": 75})
            else:
                result = parse_search_history(search_data)
                yield sse("progress", {"step": f"검색 기록 파싱 완료 — {result.total}건 ({result.period})", "percent": 80})

                yield sse("progress", {"step": "검색 기록 DB 저장 중...", "percent": 85})
                delete_user_records("search_records", DEFAULT_USER_ID)
                if result.records:
                    batch_insert("search_records", result.records)
                yield sse("progress", {"step": f"검색 기록 DB 저장 완료 — {result.total}건", "percent": 90})

                search_bytes = zf.read(search_path)
                store_original_file(SUPABASE_STORAGE_BUCKET, f"takeout/{timestamp}/search-history.json", search_bytes)
                results["search"] = {"total": result.total, "skipped": result.skipped, "period": result.period}

        # Store original ZIP
        yield sse("progress", {"step": "원본 ZIP 백업 중...", "percent": 95})
        store_original_file(SUPABASE_STORAGE_BUCKET, f"takeout/{timestamp}/takeout.zip", file_bytes)

        yield sse("done", results)
    except Exception as e:
        yield sse("error", {"detail": f"업로드 처리 중 오류: {str(e)}"})


@router.post("/youtube-takeout")
async def upload_youtube_takeout(file: UploadFile = File(...)):
    file_bytes = await file.read()
    if len(file_bytes) > MAX_YOUTUBE_ZIP_SIZE_BYTES:
        raise HTTPException(413, "파일 크기가 500MB를 초과합니다")
    return StreamingResponse(_youtube_takeout_stream(file_bytes), media_type="text/event-stream")


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
