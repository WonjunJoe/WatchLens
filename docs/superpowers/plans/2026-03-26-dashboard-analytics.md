# Step 2: Dashboard & Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build analytics dashboard with 7 stat endpoints + YouTube API metadata integration + Recharts frontend

**Architecture:** API-first with independent endpoints. Backend aggregates in Python from Supabase queries. YouTube API called at upload time for metadata + Shorts detection. Frontend fetches each stat independently for parallel rendering.

**Tech Stack:** FastAPI, httpx, Recharts, react-router-dom

---

## File Structure

### Backend — New Files
- `app/routers/stats.py` — 7 stats API endpoints
- `app/services/youtube.py` — YouTube Data API client (batch fetch, duration parse, metadata store)
- `tests/test_youtube_service.py` — YouTube service unit tests
- `tests/test_stats_api.py` — Stats endpoint tests
- `supabase/migrations/002_video_metadata.sql` — Migration SQL

### Backend — Modified Files
- `app/main.py` — Register stats router
- `app/routers/upload.py` — Integrate YouTube API call after save
- `app/parsers/watch_history.py` — Remove is_shorts logic and source field
- `app/parsers/search_history.py` — Remove source field
- `app/models/schemas.py` — Add stats response models
- `config/settings.py` — Remove shorts constants, add YouTube constants + category map
- `tests/test_watch_history_parser.py` — Update for removed is_shorts/source
- `tests/test_search_history_parser.py` — Update for removed source

### Frontend — New Files
- `src/pages/DashboardPage.tsx` — Dashboard page with all chart sections
- `src/hooks/useStats.ts` — Reusable fetch hook for stats endpoints
- `src/components/dashboard/SummaryCards.tsx`
- `src/components/dashboard/HourlyChart.tsx`
- `src/components/dashboard/DailyChart.tsx`
- `src/components/dashboard/TopChannelsChart.tsx`
- `src/components/dashboard/ShortsChart.tsx`
- `src/components/dashboard/CategoriesChart.tsx`
- `src/components/dashboard/SearchKeywordsChart.tsx`

### Frontend — Modified Files
- `src/App.tsx` — Add routing (upload + dashboard pages)
- `package.json` — Add recharts, react-router-dom

---

### Task 1: DB Migration — video_metadata table + schema cleanup

**Files:**
- Create: `supabase/migrations/002_video_metadata.sql`

- [ ] **Step 1: Write migration SQL**

```sql
-- supabase/migrations/002_video_metadata.sql

CREATE TABLE IF NOT EXISTS video_metadata (
    video_id TEXT PRIMARY KEY,
    title TEXT,
    channel_id TEXT,
    category_id INT,
    category_name TEXT,
    tags TEXT[],
    default_language TEXT,
    duration_seconds INT,
    view_count BIGINT,
    like_count BIGINT,
    comment_count BIGINT,
    published_at TIMESTAMPTZ,
    fetched_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_metadata_category_id ON video_metadata(category_id);

ALTER TABLE watch_records DROP COLUMN IF EXISTS source;
ALTER TABLE search_records DROP COLUMN IF EXISTS source;
```

- [ ] **Step 2: Run migration in Supabase SQL Editor**

Go to Supabase Dashboard → SQL Editor → paste and run the SQL above. Verify:
- `video_metadata` table created
- `source` column removed from both `watch_records` and `search_records`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/002_video_metadata.sql
git commit -m "feat: add video_metadata table and remove source columns"
```

---

### Task 1.5: Shorts ≤60초 가설 검증

YouTube API로 실제 데이터를 샘플 확인하여 "duration ≤ 60초 = Shorts" 가설을 검증한다.
이 태스크는 Task 3 (YouTube API 서비스) 구현 후, 실제 데이터를 업로드한 뒤 수행한다.

- [ ] **Step 1: Supabase에서 검증 쿼리 실행**

YouTube API 연동 + 업로드가 완료된 후, Supabase SQL Editor에서:

```sql
-- Shorts URL 패턴이 있는데 duration > 60초인 영상 (false negative 후보)
SELECT vm.video_id, vm.title, vm.duration_seconds
FROM video_metadata vm
JOIN watch_records wr ON vm.video_id = wr.video_id
WHERE vm.duration_seconds > 60
AND (vm.title ILIKE '%#shorts%' OR vm.title ILIKE '%#short%')
LIMIT 20;

-- duration ≤ 60초인데 일반 영상인 것 (false positive 후보)
SELECT vm.video_id, vm.title, vm.duration_seconds
FROM video_metadata vm
WHERE vm.duration_seconds <= 60 AND vm.duration_seconds > 0
ORDER BY vm.duration_seconds DESC
LIMIT 20;
```

- [ ] **Step 2: 결과 분석 및 기준 조정**

- false positive/negative 비율이 높으면 `SHORTS_MAX_DURATION_SECONDS` 값을 조정 (settings.py)
- 결과를 README나 스펙에 기록

---

### Task 2: Refactor parsers + settings

**Files:**
- Modify: `config/settings.py`
- Modify: `app/parsers/watch_history.py`
- Modify: `app/parsers/search_history.py`
- Modify: `app/models/schemas.py`
- Modify: `tests/test_watch_history_parser.py`
- Modify: `tests/test_search_history_parser.py`

- [ ] **Step 1: Update settings.py — remove shorts constants, add YouTube constants**

Remove `SHORTS_TITLE_KEYWORDS`, `SHORTS_URL_PATTERN`. Add YouTube category map:

```python
# backend/config/settings.py

MAX_FILE_SIZE_MB = 50
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

SUPPORTED_HEADERS = ["YouTube"]

WATCH_TITLE_PREFIX = "Watched "
SEARCH_TITLE_PREFIX = "Searched for "

DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000"

SUPABASE_STORAGE_BUCKET = "takeout-backups"

YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3/videos"
YOUTUBE_BATCH_SIZE = 50
SHORTS_MAX_DURATION_SECONDS = 60

YOUTUBE_CATEGORY_MAP = {
    1: "Film & Animation",
    2: "Autos & Vehicles",
    10: "Music",
    15: "Pets & Animals",
    17: "Sports",
    19: "Travel & Events",
    20: "Gaming",
    22: "People & Blogs",
    23: "Comedy",
    24: "Entertainment",
    25: "News & Politics",
    26: "Howto & Style",
    27: "Education",
    28: "Science & Technology",
    29: "Nonprofits & Activism",
}
```

- [ ] **Step 2: Refactor watch_history.py — remove is_shorts logic and source field**

```python
from dataclasses import dataclass, field
from urllib.parse import urlparse, parse_qs
from config.settings import SUPPORTED_HEADERS, WATCH_TITLE_PREFIX, DEFAULT_USER_ID


@dataclass
class WatchParseResult:
    records: list = field(default_factory=list)
    total: int = 0
    skipped: int = 0
    period: str = ""


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


def parse_watch_history(data: list[dict]) -> WatchParseResult:
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

    period = ""
    if timestamps:
        dates = sorted(t[:10] for t in timestamps)
        period = f"{dates[0]} ~ {dates[-1]}"

    return WatchParseResult(
        records=records,
        total=len(records),
        skipped=skipped,
        period=period,
    )
```

- [ ] **Step 3: Refactor search_history.py — remove source field**

```python
from dataclasses import dataclass, field
from config.settings import SUPPORTED_HEADERS, SEARCH_TITLE_PREFIX, DEFAULT_USER_ID


@dataclass
class SearchParseResult:
    records: list = field(default_factory=list)
    total: int = 0
    skipped: int = 0
    period: str = ""


def parse_search_history(data: list[dict]) -> SearchParseResult:
    records = []
    skipped = 0
    timestamps = []

    for entry in data:
        header = entry.get("header", "")
        if header not in SUPPORTED_HEADERS:
            skipped += 1
            continue

        title = entry.get("title", "")
        if not title.startswith(SEARCH_TITLE_PREFIX):
            skipped += 1
            continue

        query = title[len(SEARCH_TITLE_PREFIX):]
        search_url = entry.get("titleUrl")
        time_str = entry["time"]
        timestamps.append(time_str)

        records.append({
            "user_id": DEFAULT_USER_ID,
            "query": query,
            "search_url": search_url,
            "searched_at": time_str,
        })

    period = ""
    if timestamps:
        dates = sorted(t[:10] for t in timestamps)
        period = f"{dates[0]} ~ {dates[-1]}"

    return SearchParseResult(
        records=records,
        total=len(records),
        skipped=skipped,
        period=period,
    )
```

- [ ] **Step 4: Update WatchUploadResponse — remove shorts field (will come from YouTube API)**

In `app/models/schemas.py`, remove `shorts` from `WatchUploadResponse`:

```python
from pydantic import BaseModel


class WatchUploadResponse(BaseModel):
    total: int
    skipped: int
    period: str
    original_file_stored: bool


class SearchUploadResponse(BaseModel):
    total: int
    skipped: int
    period: str
    original_file_stored: bool
```

- [ ] **Step 5: Update upload.py — remove shorts from response**

In `app/routers/upload.py`, update the `upload_watch_history` return:

```python
    return WatchUploadResponse(
        total=result.total,
        skipped=result.skipped,
        period=result.period,
        original_file_stored=stored,
    )
```

- [ ] **Step 6: Update test_watch_history_parser.py**

Remove all assertions about `is_shorts`, `shorts`, and `source` fields. Key changes:
- Remove `assert result.shorts == N` assertions
- Remove `assert record["is_shorts"] is True/False` assertions
- Remove `assert record["source"] == "takeout"` assertions
- Remove any test functions that test only shorts detection (e.g., `test_shorts_by_title`, `test_shorts_by_url`)
- `WatchParseResult` no longer has `shorts` attribute

- [ ] **Step 7: Update test_search_history_parser.py**

Remove `assert record["source"] == "takeout"` from all tests.

- [ ] **Step 8: Run tests to verify refactoring**

Run: `cd backend && python -m pytest tests/ -v`
Expected: All tests PASS

- [ ] **Step 9: Update UploadResultCard.tsx — remove shorts display**

In `frontend/src/components/UploadResultCard.tsx`:
- Remove `shorts` from `WatchResult` interface
- Remove the shorts display line (`{result.type === "watch" && ...}`)

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "refactor: remove is_shorts from parser and source field from records"
```

---

### Task 3: YouTube Data API Service

**Files:**
- Create: `app/services/youtube.py`
- Create: `tests/test_youtube_service.py`
- Modify: `requirements.txt` — add httpx

- [ ] **Step 1: Add httpx to requirements.txt**

Add `httpx` to `requirements.txt` and install:

```bash
echo "httpx" >> requirements.txt
pip install httpx
```

- [ ] **Step 2: Write test for parse_duration**

```python
# tests/test_youtube_service.py
from app.services.youtube import parse_duration


def test_parse_duration_minutes_and_seconds():
    assert parse_duration("PT3M20S") == 200


def test_parse_duration_seconds_only():
    assert parse_duration("PT45S") == 45


def test_parse_duration_hours():
    assert parse_duration("PT1H2M3S") == 3723


def test_parse_duration_minutes_only():
    assert parse_duration("PT5M") == 300


def test_parse_duration_empty():
    assert parse_duration("") == 0


def test_parse_duration_zero():
    assert parse_duration("PT0S") == 0
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd backend && python -m pytest tests/test_youtube_service.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.services.youtube'`

- [ ] **Step 4: Implement parse_duration**

```python
# app/services/youtube.py
import os
import re
import httpx
from app.db.supabase import get_supabase_client
from config.settings import (
    YOUTUBE_API_URL, YOUTUBE_BATCH_SIZE, YOUTUBE_CATEGORY_MAP,
    SHORTS_MAX_DURATION_SECONDS, DEFAULT_USER_ID,
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
```

- [ ] **Step 5: Run parse_duration tests**

Run: `cd backend && python -m pytest tests/test_youtube_service.py -v`
Expected: All PASS

- [ ] **Step 6: Write test for _build_metadata_record (response parsing)**

Add to `tests/test_youtube_service.py`:

```python
from app.services.youtube import _build_metadata_record


def test_build_metadata_record():
    item = {
        "id": "abc123",
        "snippet": {
            "title": "Test Video",
            "channelId": "UC123",
            "categoryId": "20",
            "tags": ["gaming", "fps"],
            "defaultLanguage": "ko",
            "publishedAt": "2026-01-15T10:00:00Z",
        },
        "contentDetails": {"duration": "PT3M20S"},
        "statistics": {
            "viewCount": "1234567",
            "likeCount": "45000",
            "commentCount": "320",
        },
    }
    record = _build_metadata_record(item)
    assert record["video_id"] == "abc123"
    assert record["title"] == "Test Video"
    assert record["channel_id"] == "UC123"
    assert record["category_id"] == 20
    assert record["category_name"] == "Gaming"
    assert record["tags"] == ["gaming", "fps"]
    assert record["duration_seconds"] == 200
    assert record["view_count"] == 1234567
    assert record["like_count"] == 45000
    assert record["comment_count"] == 320


def test_build_metadata_record_missing_optional_fields():
    item = {
        "id": "xyz789",
        "snippet": {
            "title": "Minimal Video",
            "channelId": "UC456",
            "categoryId": "99",
            "publishedAt": "2026-02-01T00:00:00Z",
        },
        "contentDetails": {"duration": "PT30S"},
        "statistics": {},
    }
    record = _build_metadata_record(item)
    assert record["video_id"] == "xyz789"
    assert record["tags"] == []
    assert record["default_language"] is None
    assert record["category_name"] == "Unknown"
    assert record["duration_seconds"] == 30
    assert record["view_count"] is None
    assert record["like_count"] is None
    assert record["comment_count"] is None
```

- [ ] **Step 7: Run tests to verify they fail**

Run: `cd backend && python -m pytest tests/test_youtube_service.py::test_build_metadata_record -v`
Expected: FAIL

- [ ] **Step 8: Implement _build_metadata_record**

Add to `app/services/youtube.py`:

```python
def _build_metadata_record(item: dict) -> dict:
    """Convert a YouTube API video item to a DB record."""
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
```

- [ ] **Step 9: Run tests**

Run: `cd backend && python -m pytest tests/test_youtube_service.py -v`
Expected: All PASS

- [ ] **Step 10: Implement fetch_and_store_metadata**

Add to `app/services/youtube.py`:

```python
def _fetch_batch(video_ids: list[str]) -> list[dict]:
    """Fetch metadata for up to 50 video IDs from YouTube API."""
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


def fetch_and_store_metadata(video_ids: list[str], user_id: str = DEFAULT_USER_ID):
    """Fetch metadata for all video_ids in batches, store in DB, update is_shorts."""
    unique_ids = [vid for vid in set(video_ids) if vid]
    if not unique_ids:
        return

    sb = get_supabase_client()

    # Check which IDs already have metadata (skip re-fetching)
    existing = sb.table("video_metadata").select("video_id").in_("video_id", unique_ids).execute()
    existing_ids = {r["video_id"] for r in existing.data}
    new_ids = [vid for vid in unique_ids if vid not in existing_ids]

    if not new_ids:
        return

    all_records = []
    for i in range(0, len(new_ids), YOUTUBE_BATCH_SIZE):
        batch_ids = new_ids[i : i + YOUTUBE_BATCH_SIZE]
        try:
            items = _fetch_batch(batch_ids)
            for item in items:
                all_records.append(_build_metadata_record(item))
        except httpx.HTTPError:
            continue

    # Insert metadata
    if all_records:
        for i in range(0, len(all_records), 500):
            batch = all_records[i : i + 500]
            sb.table("video_metadata").upsert(batch).execute()

    # Update is_shorts based on duration
    shorts_ids = [r["video_id"] for r in all_records
                  if r["duration_seconds"] and r["duration_seconds"] <= SHORTS_MAX_DURATION_SECONDS]
    if shorts_ids:
        sb.table("watch_records").update({"is_shorts": True}).eq("user_id", user_id).in_("video_id", shorts_ids).execute()
```

- [ ] **Step 11: Commit**

```bash
git add app/services/youtube.py tests/test_youtube_service.py requirements.txt
git commit -m "feat: add YouTube Data API service for video metadata"
```

---

### Task 4: Integrate YouTube API into upload flow

**Files:**
- Modify: `app/routers/upload.py`

- [ ] **Step 1: Update upload_watch_history to call YouTube API after DB save**

```python
import json
from datetime import datetime, timezone
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.parsers.watch_history import parse_watch_history
from app.parsers.search_history import parse_search_history
from app.models.schemas import WatchUploadResponse, SearchUploadResponse
from app.db.supabase import get_supabase_client
from app.services.youtube import fetch_and_store_metadata
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

    # Fetch YouTube metadata and update is_shorts
    video_ids = [r["video_id"] for r in result.records if r.get("video_id")]
    fetch_and_store_metadata(video_ids)

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
```

- [ ] **Step 2: Run all tests**

Run: `cd backend && python -m pytest tests/ -v`
Expected: All PASS

- [ ] **Step 3: Commit**

```bash
git add app/routers/upload.py
git commit -m "feat: integrate YouTube API metadata fetch into upload flow"
```

---

### Task 5: Stats API — response models + summary, hourly, daily

**Files:**
- Modify: `app/models/schemas.py`
- Create: `app/routers/stats.py`
- Modify: `app/main.py`
- Create: `tests/test_stats_api.py`

- [ ] **Step 1: Add stats response models to schemas.py**

Append to `app/models/schemas.py`:

```python
class SummaryStats(BaseModel):
    total_watched: int
    total_channels: int
    period: str
    daily_average: float
    shorts_count: int


class HourlyCount(BaseModel):
    hour: int
    count: int


class DailyCount(BaseModel):
    date: str
    count: int


class ChannelCount(BaseModel):
    channel_name: str
    count: int


class ShortsStats(BaseModel):
    shorts_count: int
    regular_count: int
    shorts_ratio: float
    weekly_trend: list[dict]


class CategoryCount(BaseModel):
    category_name: str
    count: int


class KeywordCount(BaseModel):
    keyword: str
    count: int
```

- [ ] **Step 2: Write tests for summary, hourly, daily endpoints**

```python
# tests/test_stats_api.py
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def _mock_watch_records():
    """Sample watch records for testing."""
    return [
        {"video_id": "v1", "video_title": "Video 1", "channel_name": "Ch A",
         "watched_at": "2026-01-10T14:00:00Z", "is_shorts": False},
        {"video_id": "v2", "video_title": "Video 2", "channel_name": "Ch A",
         "watched_at": "2026-01-10T14:30:00Z", "is_shorts": True},
        {"video_id": "v3", "video_title": "Video 3", "channel_name": "Ch B",
         "watched_at": "2026-01-11T02:00:00Z", "is_shorts": False},
        {"video_id": "v4", "video_title": "Video 4", "channel_name": "Ch A",
         "watched_at": "2026-01-11T23:00:00Z", "is_shorts": True},
    ]


def _mock_supabase_select(data):
    mock_sb = MagicMock()
    mock_table = MagicMock()
    mock_select = MagicMock()
    mock_eq = MagicMock()
    mock_limit = MagicMock()
    mock_result = MagicMock()
    mock_result.data = data
    mock_sb.table.return_value = mock_table
    mock_table.select.return_value = mock_select
    mock_select.eq.return_value = mock_eq
    mock_eq.limit.return_value = mock_limit
    mock_limit.execute.return_value = mock_result
    return mock_sb


@patch("app.routers.stats.get_supabase_client")
def test_summary(mock_get_sb):
    mock_get_sb.return_value = _mock_supabase_select(_mock_watch_records())
    res = client.get("/api/stats/summary")
    assert res.status_code == 200
    data = res.json()
    assert data["total_watched"] == 4
    assert data["total_channels"] == 2
    assert data["shorts_count"] == 2
    assert data["daily_average"] == 2.0


@patch("app.routers.stats.get_supabase_client")
def test_hourly(mock_get_sb):
    mock_get_sb.return_value = _mock_supabase_select(_mock_watch_records())
    res = client.get("/api/stats/hourly")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 24
    hour_14 = next(h for h in data if h["hour"] == 14)
    assert hour_14["count"] == 2


@patch("app.routers.stats.get_supabase_client")
def test_daily(mock_get_sb):
    mock_get_sb.return_value = _mock_supabase_select(_mock_watch_records())
    res = client.get("/api/stats/daily")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 2
    assert data[0]["date"] == "2026-01-10"
    assert data[0]["count"] == 2
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd backend && python -m pytest tests/test_stats_api.py -v`
Expected: FAIL

- [ ] **Step 4: Implement stats router with summary, hourly, daily**

```python
# app/routers/stats.py
from collections import Counter
from datetime import datetime
from fastapi import APIRouter, Query
from app.db.supabase import get_supabase_client
from app.models.schemas import (
    SummaryStats, HourlyCount, DailyCount,
    ChannelCount, ShortsStats, CategoryCount, KeywordCount,
)
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
```

- [ ] **Step 5: Register stats router in main.py**

In `app/main.py`, add:

```python
from app.routers.stats import router as stats_router
```

and:

```python
app.include_router(stats_router)
```

- [ ] **Step 6: Run tests**

Run: `cd backend && python -m pytest tests/test_stats_api.py -v`
Expected: All PASS

- [ ] **Step 7: Commit**

```bash
git add app/routers/stats.py app/models/schemas.py app/main.py tests/test_stats_api.py
git commit -m "feat: add stats API endpoints — summary, hourly, daily"
```

---

### Task 6: Stats API — top-channels, shorts, categories, search-keywords

**Files:**
- Modify: `app/routers/stats.py`
- Modify: `tests/test_stats_api.py`

- [ ] **Step 1: Add tests for top-channels, shorts, search-keywords**

Append to `tests/test_stats_api.py`:

```python
@patch("app.routers.stats.get_supabase_client")
def test_top_channels(mock_get_sb):
    mock_get_sb.return_value = _mock_supabase_select(_mock_watch_records())
    res = client.get("/api/stats/top-channels")
    assert res.status_code == 200
    data = res.json()
    assert data[0]["channel_name"] == "Ch A"
    assert data[0]["count"] == 3
    assert data[1]["channel_name"] == "Ch B"
    assert data[1]["count"] == 1


@patch("app.routers.stats.get_supabase_client")
def test_shorts(mock_get_sb):
    mock_get_sb.return_value = _mock_supabase_select(_mock_watch_records())
    res = client.get("/api/stats/shorts")
    assert res.status_code == 200
    data = res.json()
    assert data["shorts_count"] == 2
    assert data["regular_count"] == 2
    assert data["shorts_ratio"] == 0.5


def _mock_search_records():
    return [
        {"query": "python tutorial", "searched_at": "2026-01-10T10:00:00Z"},
        {"query": "python tutorial", "searched_at": "2026-01-10T11:00:00Z"},
        {"query": "react hooks", "searched_at": "2026-01-11T09:00:00Z"},
    ]


@patch("app.routers.stats.get_supabase_client")
def test_search_keywords(mock_get_sb):
    mock_get_sb.return_value = _mock_supabase_select(_mock_search_records())
    res = client.get("/api/stats/search-keywords")
    assert res.status_code == 200
    data = res.json()
    assert data[0]["keyword"] == "python tutorial"
    assert data[0]["count"] == 2
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && python -m pytest tests/test_stats_api.py::test_top_channels tests/test_stats_api.py::test_shorts tests/test_stats_api.py::test_search_keywords -v`
Expected: FAIL

- [ ] **Step 3: Implement top-channels, shorts, categories, search-keywords**

Append to `app/routers/stats.py`:

```python
@router.get("/top-channels", response_model=list[ChannelCount])
def get_top_channels(user_id: str = Query(default=DEFAULT_USER_ID)):
    records = _fetch_watch_records(user_id)
    channel_counts = Counter(r["channel_name"] for r in records if r["channel_name"])

    return sorted(
        [ChannelCount(channel_name=ch, count=c) for ch, c in channel_counts.most_common(20)],
        key=lambda x: -x.count,
    )


@router.get("/shorts", response_model=ShortsStats)
def get_shorts(user_id: str = Query(default=DEFAULT_USER_ID)):
    records = _fetch_watch_records(user_id)
    shorts = sum(1 for r in records if r["is_shorts"])
    regular = len(records) - shorts
    ratio = round(shorts / len(records), 2) if records else 0

    # Weekly trend
    week_shorts = Counter()
    week_total = Counter()
    for r in records:
        date = r["watched_at"][:10]
        dt = datetime.fromisoformat(date)
        week_key = dt.strftime("%Y-W%W")
        week_total[week_key] += 1
        if r["is_shorts"]:
            week_shorts[week_key] += 1

    weekly_trend = sorted([
        {"week": w, "shorts_ratio": round(week_shorts[w] / week_total[w], 2)}
        for w in week_total
    ], key=lambda x: x["week"])

    return ShortsStats(
        shorts_count=shorts,
        regular_count=regular,
        shorts_ratio=ratio,
        weekly_trend=weekly_trend,
    )


@router.get("/categories", response_model=list[CategoryCount])
def get_categories(user_id: str = Query(default=DEFAULT_USER_ID)):
    sb = get_supabase_client()

    # Get watch records with video_id
    watch_result = sb.table("watch_records").select("video_id").eq(
        "user_id", user_id
    ).limit(QUERY_LIMIT).execute()
    video_ids = [r["video_id"] for r in watch_result.data if r["video_id"]]

    if not video_ids:
        return []

    # Get category mapping from video_metadata
    meta_result = sb.table("video_metadata").select(
        "video_id, category_name"
    ).in_("video_id", video_ids).execute()
    id_to_category = {r["video_id"]: r["category_name"] for r in meta_result.data}

    category_counts = Counter(
        id_to_category.get(vid, "Unknown") for vid in video_ids
    )

    return sorted(
        [CategoryCount(category_name=cat, count=c) for cat, c in category_counts.most_common()],
        key=lambda x: -x.count,
    )


@router.get("/search-keywords", response_model=list[KeywordCount])
def get_search_keywords(user_id: str = Query(default=DEFAULT_USER_ID)):
    sb = get_supabase_client()
    result = sb.table("search_records").select("query").eq(
        "user_id", user_id
    ).limit(QUERY_LIMIT).execute()

    query_counts = Counter(r["query"] for r in result.data)

    return sorted(
        [KeywordCount(keyword=q, count=c) for q, c in query_counts.most_common(30)],
        key=lambda x: -x.count,
    )
```

- [ ] **Step 4: Run all stats tests**

Run: `cd backend && python -m pytest tests/test_stats_api.py -v`
Expected: All PASS

- [ ] **Step 5: Run all tests**

Run: `cd backend && python -m pytest tests/ -v`
Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add app/routers/stats.py tests/test_stats_api.py
git commit -m "feat: add stats API endpoints — top-channels, shorts, categories, search-keywords"
```

---

### Task 7: Frontend — setup, routing, useStats hook

**Files:**
- Modify: `frontend/package.json` — add recharts, react-router-dom
- Modify: `frontend/src/App.tsx` — add routing
- Create: `frontend/src/hooks/useStats.ts`

- [ ] **Step 1: Install dependencies**

```bash
cd /Users/wonjunjoe/Desktop/workspace/05_WatchLens/frontend
npm install recharts react-router-dom
```

- [ ] **Step 2: Create useStats hook**

```typescript
// frontend/src/hooks/useStats.ts
import { useState, useEffect } from "react";

const API_BASE = "http://localhost:8000";

export function useStats<T>(endpoint: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}${endpoint}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => setData(json))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [endpoint]);

  return { data, loading, error };
}
```

- [ ] **Step 3: Update App.tsx with routing**

```typescript
// frontend/src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UploadPage } from "./pages/UploadPage";
import { DashboardPage } from "./pages/DashboardPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

- [ ] **Step 4: Create DashboardPage shell**

```typescript
// frontend/src/pages/DashboardPage.tsx
import { Link } from "react-router-dom";
import { SummaryCards } from "../components/dashboard/SummaryCards";
import { HourlyChart } from "../components/dashboard/HourlyChart";
import { DailyChart } from "../components/dashboard/DailyChart";
import { TopChannelsChart } from "../components/dashboard/TopChannelsChart";
import { ShortsChart } from "../components/dashboard/ShortsChart";
import { CategoriesChart } from "../components/dashboard/CategoriesChart";
import { SearchKeywordsChart } from "../components/dashboard/SearchKeywordsChart";

export function DashboardPage() {
  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">WatchLens Dashboard</h1>
        <Link to="/" className="text-blue-600 hover:underline text-sm">
          ← 업로드 페이지
        </Link>
      </div>
      <div className="space-y-8">
        <SummaryCards />
        <HourlyChart />
        <DailyChart />
        <TopChannelsChart />
        <ShortsChart />
        <CategoriesChart />
        <SearchKeywordsChart />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Add dashboard link to UploadPage**

In `frontend/src/pages/UploadPage.tsx`, add at the top of the return JSX (after opening div), before the h1:

```typescript
import { Link } from "react-router-dom";
```

And add a link after the upload results section:

```tsx
{(watchResult || searchResult) && (
  <div className="mt-6 text-center">
    <Link to="/dashboard" className="text-blue-600 hover:underline font-medium">
      대시보드 보기 →
    </Link>
  </div>
)}
```

- [ ] **Step 6: Commit**

```bash
cd /Users/wonjunjoe/Desktop/workspace/05_WatchLens
git add frontend/src/App.tsx frontend/src/hooks/useStats.ts frontend/src/pages/DashboardPage.tsx frontend/src/pages/UploadPage.tsx frontend/package.json frontend/package-lock.json
git commit -m "feat: add frontend routing, useStats hook, and dashboard page shell"
```

---

### Task 8: Frontend — SummaryCards + HourlyChart + DailyChart

**Files:**
- Create: `frontend/src/components/dashboard/SummaryCards.tsx`
- Create: `frontend/src/components/dashboard/HourlyChart.tsx`
- Create: `frontend/src/components/dashboard/DailyChart.tsx`

- [ ] **Step 1: Create SummaryCards**

```typescript
// frontend/src/components/dashboard/SummaryCards.tsx
import { useStats } from "../../hooks/useStats";

interface Summary {
  total_watched: number;
  total_channels: number;
  period: string;
  daily_average: number;
  shorts_count: number;
}

export function SummaryCards() {
  const { data, loading } = useStats<Summary>("/api/stats/summary");

  if (loading) return <p className="text-gray-500">요약 로딩 중...</p>;
  if (!data) return null;

  const cards = [
    { label: "총 시청 영상", value: data.total_watched.toLocaleString() },
    { label: "채널 수", value: data.total_channels.toLocaleString() },
    { label: "일 평균", value: `${data.daily_average}건` },
    { label: "Shorts", value: data.shorts_count.toLocaleString() },
  ];

  return (
    <div>
      <p className="text-sm text-gray-500 mb-3">{data.period}</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white border rounded-lg p-4 text-center shadow-sm">
            <p className="text-2xl font-bold">{c.value}</p>
            <p className="text-sm text-gray-500 mt-1">{c.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create HourlyChart**

```typescript
// frontend/src/components/dashboard/HourlyChart.tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useStats } from "../../hooks/useStats";

interface HourlyData {
  hour: number;
  count: number;
}

export function HourlyChart() {
  const { data, loading } = useStats<HourlyData[]>("/api/stats/hourly");

  if (loading) return <p className="text-gray-500">시간대별 로딩 중...</p>;
  if (!data) return null;

  return (
    <div className="bg-white border rounded-lg p-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-4">시간대별 시청 분포</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <XAxis dataKey="hour" tickFormatter={(h) => `${h}시`} />
          <YAxis />
          <Tooltip labelFormatter={(h) => `${h}시`} />
          <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 3: Create DailyChart**

```typescript
// frontend/src/components/dashboard/DailyChart.tsx
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useStats } from "../../hooks/useStats";

interface DailyData {
  date: string;
  count: number;
}

export function DailyChart() {
  const { data, loading } = useStats<DailyData[]>("/api/stats/daily");

  if (loading) return <p className="text-gray-500">일별 트렌드 로딩 중...</p>;
  if (!data) return null;

  return (
    <div className="bg-white border rounded-lg p-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-4">일별 시청량 트렌드</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 4: Verify in browser**

Open `http://localhost:5173/dashboard` and check that summary cards, hourly chart, and daily chart render (backend must be running).

- [ ] **Step 5: Commit**

```bash
cd /Users/wonjunjoe/Desktop/workspace/05_WatchLens
git add frontend/src/components/dashboard/SummaryCards.tsx frontend/src/components/dashboard/HourlyChart.tsx frontend/src/components/dashboard/DailyChart.tsx
git commit -m "feat: add summary cards, hourly chart, daily chart components"
```

---

### Task 9: Frontend — TopChannels, Shorts, Categories, SearchKeywords charts

**Files:**
- Create: `frontend/src/components/dashboard/TopChannelsChart.tsx`
- Create: `frontend/src/components/dashboard/ShortsChart.tsx`
- Create: `frontend/src/components/dashboard/CategoriesChart.tsx`
- Create: `frontend/src/components/dashboard/SearchKeywordsChart.tsx`

- [ ] **Step 1: Create TopChannelsChart**

```typescript
// frontend/src/components/dashboard/TopChannelsChart.tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useStats } from "../../hooks/useStats";

interface ChannelData {
  channel_name: string;
  count: number;
}

export function TopChannelsChart() {
  const { data, loading } = useStats<ChannelData[]>("/api/stats/top-channels");

  if (loading) return <p className="text-gray-500">Top 채널 로딩 중...</p>;
  if (!data) return null;

  return (
    <div className="bg-white border rounded-lg p-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-4">Top 채널</h2>
      <ResponsiveContainer width="100%" height={Math.max(300, data.length * 32)}>
        <BarChart data={data} layout="vertical" margin={{ left: 120 }}>
          <XAxis type="number" />
          <YAxis dataKey="channel_name" type="category" width={110} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: Create ShortsChart**

```typescript
// frontend/src/components/dashboard/ShortsChart.tsx
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useStats } from "../../hooks/useStats";

interface ShortsData {
  shorts_count: number;
  regular_count: number;
  shorts_ratio: number;
  weekly_trend: { week: string; shorts_ratio: number }[];
}

const COLORS = ["#f43f5e", "#6366f1"];

export function ShortsChart() {
  const { data, loading } = useStats<ShortsData>("/api/stats/shorts");

  if (loading) return <p className="text-gray-500">Shorts 분석 로딩 중...</p>;
  if (!data) return null;

  const pieData = [
    { name: "Shorts", value: data.shorts_count },
    { name: "일반 영상", value: data.regular_count },
  ];

  return (
    <div className="bg-white border rounded-lg p-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-4">
        Shorts 비율 — {Math.round(data.shorts_ratio * 100)}%
      </h2>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {pieData.map((_, i) => (
              <Cell key={i} fill={COLORS[i]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 3: Create CategoriesChart**

```typescript
// frontend/src/components/dashboard/CategoriesChart.tsx
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useStats } from "../../hooks/useStats";

interface CategoryData {
  category_name: string;
  count: number;
}

const COLORS = [
  "#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd",
  "#f43f5e", "#fb7185", "#fda4af",
  "#f59e0b", "#fbbf24", "#fcd34d",
  "#10b981", "#34d399", "#6ee7b7",
  "#3b82f6", "#60a5fa", "#93c5fd",
];

export function CategoriesChart() {
  const { data, loading } = useStats<CategoryData[]>("/api/stats/categories");

  if (loading) return <p className="text-gray-500">카테고리 로딩 중...</p>;
  if (!data || data.length === 0) return null;

  return (
    <div className="bg-white border rounded-lg p-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-4">카테고리별 시청 비율</h2>
      <ResponsiveContainer width="100%" height={350}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={120}
            dataKey="count"
            nameKey="category_name"
            label={({ category_name, percent }) =>
              percent > 0.03 ? `${category_name} ${(percent * 100).toFixed(0)}%` : ""
            }
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 4: Create SearchKeywordsChart**

```typescript
// frontend/src/components/dashboard/SearchKeywordsChart.tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useStats } from "../../hooks/useStats";

interface KeywordData {
  keyword: string;
  count: number;
}

export function SearchKeywordsChart() {
  const { data, loading } = useStats<KeywordData[]>("/api/stats/search-keywords");

  if (loading) return <p className="text-gray-500">검색 키워드 로딩 중...</p>;
  if (!data || data.length === 0) return null;

  const top15 = data.slice(0, 15);

  return (
    <div className="bg-white border rounded-lg p-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-4">검색 키워드 Top 15</h2>
      <ResponsiveContainer width="100%" height={Math.max(300, top15.length * 32)}>
        <BarChart data={top15} layout="vertical" margin={{ left: 150 }}>
          <XAxis type="number" />
          <YAxis dataKey="keyword" type="category" width={140} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 5: Verify all charts in browser**

Open `http://localhost:5173/dashboard` and verify all 7 sections render correctly.

- [ ] **Step 6: Commit**

```bash
cd /Users/wonjunjoe/Desktop/workspace/05_WatchLens
git add frontend/src/components/dashboard/
git commit -m "feat: add top-channels, shorts, categories, search-keywords chart components"
```

---

### Task 10: Final integration test + cleanup

- [ ] **Step 1: Run all backend tests**

```bash
cd /Users/wonjunjoe/Desktop/workspace/05_WatchLens/backend
python -m pytest tests/ -v
```

Expected: All PASS

- [ ] **Step 2: Manual E2E test**

1. Start backend: `uvicorn app.main:app --reload`
2. Start frontend: `cd frontend && npm run dev`
3. Upload watch-history.json at `localhost:5173`
4. Wait for YouTube API metadata fetch to complete
5. Click "대시보드 보기" link
6. Verify all 7 dashboard sections load with real data

- [ ] **Step 3: Update README TODO checkboxes**

Mark completed items in README TODO section.

- [ ] **Step 4: Final commit**

```bash
cd /Users/wonjunjoe/Desktop/workspace/05_WatchLens
git add README.md
git commit -m "docs: update README with Step 2 progress"
```
