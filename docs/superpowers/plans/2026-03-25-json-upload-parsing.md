# JSON 업로드 + 파싱 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Google Takeout JSON 파일(watch-history, search-history)을 업로드하면 파싱하여 Supabase DB에 저장하고 원본을 백업하는 풀스택 기능 구현

**Architecture:** FastAPI 백엔드에서 파싱 + DB 저장을 담당하고, React 프론트엔드는 파일 업로드 UI + 결과 표시를 담당한다. Supabase를 PostgreSQL DB + Storage로 사용한다. 인증 없이 단일 사용자로 동작한다.

**Tech Stack:** FastAPI (Python), React + TypeScript, Tailwind CSS + shadcn/ui, Supabase (PostgreSQL + Storage)

**Spec:** `docs/superpowers/specs/2026-03-25-json-upload-parsing-design.md`

---

## File Map

### Backend
| 파일 | 역할 |
|------|------|
| `backend/config/settings.py` | 설정값 (파일 크기 제한, 접두사, 패턴 등) |
| `backend/app/main.py` | FastAPI 앱 초기화, 라우터 등록, CORS |
| `backend/app/parsers/watch_history.py` | watch-history.json 파싱 로직 |
| `backend/app/parsers/search_history.py` | search-history.json 파싱 로직 |
| `backend/app/models/schemas.py` | Pydantic 모델 (요청/응답) |
| `backend/app/db/supabase.py` | Supabase 클라이언트 초기화 |
| `backend/app/routers/upload.py` | /api/upload/* 엔드포인트 |
| `backend/requirements.txt` | Python 의존성 |
| `backend/tests/test_watch_history_parser.py` | 시청 기록 파서 유닛 테스트 |
| `backend/tests/test_search_history_parser.py` | 검색 기록 파서 유닛 테스트 |
| `backend/tests/conftest.py` | PYTHONPATH 설정 |
| `backend/tests/test_upload_api.py` | 업로드 API 통합 테스트 |

### Frontend
| 파일 | 역할 |
|------|------|
| `frontend/src/App.tsx` | 라우팅, 메인 레이아웃 |
| `frontend/src/pages/UploadPage.tsx` | 업로드 페이지 (FileUploader + 결과 카드) |
| `frontend/src/components/FileUploader.tsx` | 파일 선택/드래그앤드롭 컴포넌트 |
| `frontend/src/components/UploadResultCard.tsx` | 파싱 결과 요약 카드 |

### Infra
| 파일 | 역할 |
|------|------|
| `supabase/migrations/001_create_tables.sql` | 테이블 + 인덱스 생성 SQL |

---

## Task 1: 프로젝트 초기화 + 설정

**Files:**
- Create: `backend/config/settings.py`
- Create: `backend/requirements.txt`
- Create: `backend/app/__init__.py`
- Create: `backend/app/main.py`
- Create: `backend/config/__init__.py`

- [ ] **Step 1: 백엔드 디렉토리 구조 생성**

```bash
mkdir -p backend/app/routers backend/app/parsers backend/app/models backend/app/db backend/config backend/tests
touch backend/app/__init__.py backend/app/routers/__init__.py backend/app/parsers/__init__.py backend/app/models/__init__.py backend/app/db/__init__.py backend/config/__init__.py backend/tests/__init__.py
```

- [ ] **Step 2: settings.py 작성**

```python
# backend/config/settings.py

MAX_FILE_SIZE_MB = 50
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

SUPPORTED_HEADERS = ["YouTube"]

SHORTS_TITLE_KEYWORDS = ["#shorts", "#short"]
SHORTS_URL_PATTERN = "/shorts/"

WATCH_TITLE_PREFIX = "Watched "
SEARCH_TITLE_PREFIX = "Searched for "

DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000"

SUPABASE_STORAGE_BUCKET = "takeout-backups"
```

- [ ] **Step 3: requirements.txt 작성**

```
fastapi==0.115.*
uvicorn[standard]==0.34.*
python-multipart==0.0.*
supabase==2.*
python-dotenv==1.*
pytest==8.*
httpx==0.28.*
```

- [ ] **Step 4: FastAPI 앱 초기화 (main.py)**

```python
# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="WatchLens API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 5: conftest.py 작성 (PYTHONPATH 설정)**

```python
# backend/tests/conftest.py
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
```

- [ ] **Step 6: 의존성 설치 + 서버 실행 확인**

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
# http://localhost:8000/health → {"status": "ok"}
```

- [ ] **Step 7: 커밋**

```bash
git add backend/
git commit -m "feat: initialize backend project with FastAPI + settings"
```

---

## Task 2: Supabase 테이블 생성

**Files:**
- Create: `supabase/migrations/001_create_tables.sql`

- [ ] **Step 1: SQL 마이그레이션 파일 작성**

```sql
-- supabase/migrations/001_create_tables.sql

CREATE TABLE IF NOT EXISTS watch_records (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    video_id TEXT,
    video_title TEXT NOT NULL,
    channel_name TEXT,
    channel_url TEXT,
    watched_at TIMESTAMPTZ NOT NULL,
    is_shorts BOOLEAN DEFAULT false,
    source TEXT DEFAULT 'takeout',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS search_records (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    query TEXT NOT NULL,
    search_url TEXT,
    searched_at TIMESTAMPTZ NOT NULL,
    source TEXT DEFAULT 'takeout',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_watch_records_watched_at ON watch_records(watched_at);
CREATE INDEX IF NOT EXISTS idx_search_records_searched_at ON search_records(searched_at);
```

- [ ] **Step 2: Supabase 대시보드에서 SQL 실행**

Supabase 프로젝트의 SQL Editor에서 위 SQL을 실행한다. 테이블이 생성되었는지 Table Editor에서 확인.

- [ ] **Step 3: 커밋**

```bash
git add supabase/
git commit -m "feat: add DB migration for watch_records and search_records"
```

---

## Task 3: Supabase 클라이언트 설정

**Files:**
- Create: `backend/.env`
- Create: `backend/app/db/supabase.py`

- [ ] **Step 1: .env 파일 생성**

```bash
# backend/.env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
```

주의: `.env`는 `.gitignore`에 추가할 것.

- [ ] **Step 2: Supabase 클라이언트 모듈 작성**

```python
# backend/app/db/supabase.py
import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

_url = os.getenv("SUPABASE_URL", "")
_key = os.getenv("SUPABASE_KEY", "")

def get_supabase_client() -> Client:
    return create_client(_url, _key)
```

- [ ] **Step 3: .gitignore 생성**

```bash
cat <<'EOF' > .gitignore
backend/.env
backend/venv/
__pycache__/
node_modules/
EOF
```

- [ ] **Step 4: 연결 확인**

```python
# 터미널에서 빠르게 확인
cd backend
python -c "from app.db.supabase import get_supabase_client; c = get_supabase_client(); print(c.table('watch_records').select('*').limit(1).execute())"
```

- [ ] **Step 5: 커밋**

```bash
git add backend/app/db/ .gitignore
git commit -m "feat: add Supabase client configuration"
```

---

## Task 4: Watch History 파서

**Files:**
- Create: `backend/app/parsers/watch_history.py`
- Create: `backend/tests/test_watch_history_parser.py`

- [ ] **Step 1: 테스트 파일 작성**

```python
# backend/tests/test_watch_history_parser.py
from app.parsers.watch_history import parse_watch_history

def test_parse_normal_record():
    raw = [{
        "header": "YouTube",
        "title": "Watched 테스트 영상 제목",
        "titleUrl": "https://www.youtube.com/watch?v\u003dABC123",
        "subtitles": [{"name": "테스트채널", "url": "https://www.youtube.com/channel/UC123"}],
        "time": "2026-01-15T14:32:00.000Z",
        "products": ["YouTube"],
        "activityControls": ["YouTube watch history"]
    }]
    result = parse_watch_history(raw)
    assert result.total == 1
    assert result.skipped == 0
    assert len(result.records) == 1
    rec = result.records[0]
    assert rec["video_id"] == "ABC123"
    assert rec["video_title"] == "테스트 영상 제목"
    assert rec["channel_name"] == "테스트채널"
    assert rec["is_shorts"] is False

def test_parse_shorts_by_title():
    raw = [{
        "header": "YouTube",
        "title": "Watched 재밌는 영상 #shorts",
        "titleUrl": "https://www.youtube.com/watch?v\u003dDEF456",
        "subtitles": [{"name": "채널", "url": "https://www.youtube.com/channel/UC456"}],
        "time": "2026-01-15T15:00:00.000Z",
        "products": ["YouTube"],
        "activityControls": ["YouTube watch history"]
    }]
    result = parse_watch_history(raw)
    assert result.records[0]["is_shorts"] is True

def test_parse_shorts_by_url():
    raw = [{
        "header": "YouTube",
        "title": "Watched 쇼츠 영상",
        "titleUrl": "https://www.youtube.com/shorts/GHI789",
        "subtitles": [{"name": "채널", "url": "https://www.youtube.com/channel/UC789"}],
        "time": "2026-01-15T16:00:00.000Z",
        "products": ["YouTube"],
        "activityControls": ["YouTube watch history"]
    }]
    result = parse_watch_history(raw)
    assert result.records[0]["is_shorts"] is True
    assert result.records[0]["video_id"] == "GHI789"

def test_skip_no_title_url():
    raw = [{
        "header": "YouTube",
        "title": "Viewed a post that is no longer available",
        "time": "2026-01-15T17:00:00.000Z",
        "products": ["YouTube"],
        "activityControls": ["YouTube watch history"]
    }]
    result = parse_watch_history(raw)
    assert result.total == 0
    assert result.skipped == 1

def test_skip_non_youtube_header():
    raw = [{
        "header": "Google Play",
        "title": "Watched something",
        "titleUrl": "https://example.com",
        "time": "2026-01-15T17:00:00.000Z",
        "products": ["Google Play"],
    }]
    result = parse_watch_history(raw)
    assert result.total == 0
    assert result.skipped == 1

def test_skip_non_watched_prefix():
    raw = [{
        "header": "YouTube",
        "title": "Visited some page",
        "titleUrl": "https://www.youtube.com/watch?v\u003dXYZ",
        "time": "2026-01-15T17:00:00.000Z",
        "products": ["YouTube"],
        "activityControls": ["YouTube watch history"]
    }]
    result = parse_watch_history(raw)
    assert result.total == 0
    assert result.skipped == 1

def test_no_subtitles():
    raw = [{
        "header": "YouTube",
        "title": "Watched 채널 없는 영상",
        "titleUrl": "https://www.youtube.com/watch?v\u003dNOCH",
        "time": "2026-01-15T18:00:00.000Z",
        "products": ["YouTube"],
        "activityControls": ["YouTube watch history"]
    }]
    result = parse_watch_history(raw)
    assert result.total == 1
    assert result.records[0]["channel_name"] is None

def test_video_id_from_youtu_be():
    raw = [{
        "header": "YouTube",
        "title": "Watched 짧은 URL 영상",
        "titleUrl": "https://youtu.be/SHORT123",
        "subtitles": [{"name": "채널", "url": "https://www.youtube.com/channel/UC"}],
        "time": "2026-01-15T19:00:00.000Z",
        "products": ["YouTube"],
        "activityControls": ["YouTube watch history"]
    }]
    result = parse_watch_history(raw)
    assert result.records[0]["video_id"] == "SHORT123"

def test_parse_shorts_by_title_singular():
    raw = [{
        "header": "YouTube",
        "title": "Watched 재밌는 영상 #short",
        "titleUrl": "https://www.youtube.com/watch?v\u003dSHORT1",
        "subtitles": [{"name": "채널", "url": "https://www.youtube.com/channel/UC"}],
        "time": "2026-01-15T15:00:00.000Z",
        "products": ["YouTube"],
        "activityControls": ["YouTube watch history"]
    }]
    result = parse_watch_history(raw)
    assert result.records[0]["is_shorts"] is True

def test_parse_shorts_case_insensitive():
    raw = [{
        "header": "YouTube",
        "title": "Watched 재밌는 영상 #SHORTS",
        "titleUrl": "https://www.youtube.com/watch?v\u003dSHORT2",
        "subtitles": [{"name": "채널", "url": "https://www.youtube.com/channel/UC"}],
        "time": "2026-01-15T15:00:00.000Z",
        "products": ["YouTube"],
        "activityControls": ["YouTube watch history"]
    }]
    result = parse_watch_history(raw)
    assert result.records[0]["is_shorts"] is True

def test_video_id_with_extra_params():
    raw = [{
        "header": "YouTube",
        "title": "Watched 파라미터 있는 영상",
        "titleUrl": "https://www.youtube.com/watch?v\u003dABC123&t\u003d30",
        "subtitles": [{"name": "채널", "url": "https://www.youtube.com/channel/UC"}],
        "time": "2026-01-15T15:00:00.000Z",
        "products": ["YouTube"],
        "activityControls": ["YouTube watch history"]
    }]
    result = parse_watch_history(raw)
    assert result.records[0]["video_id"] == "ABC123"

def test_video_id_unknown_url_pattern():
    raw = [{
        "header": "YouTube",
        "title": "Watched 플레이리스트",
        "titleUrl": "https://www.youtube.com/playlist?list\u003dPLxxx",
        "subtitles": [{"name": "채널", "url": "https://www.youtube.com/channel/UC"}],
        "time": "2026-01-15T15:00:00.000Z",
        "products": ["YouTube"],
        "activityControls": ["YouTube watch history"]
    }]
    result = parse_watch_history(raw)
    assert result.records[0]["video_id"] is None

def test_empty_input():
    result = parse_watch_history([])
    assert result.total == 0
    assert result.skipped == 0
    assert result.period == ""

def test_watch_period_calculation():
    raw = [
        {
            "header": "YouTube",
            "title": "Watched 첫번째",
            "titleUrl": "https://www.youtube.com/watch?v\u003dA",
            "time": "2026-01-10T10:00:00.000Z",
            "products": ["YouTube"],
            "activityControls": ["YouTube watch history"]
        },
        {
            "header": "YouTube",
            "title": "Watched 두번째",
            "titleUrl": "https://www.youtube.com/watch?v\u003dB",
            "time": "2026-02-20T10:00:00.000Z",
            "products": ["YouTube"],
            "activityControls": ["YouTube watch history"]
        },
    ]
    result = parse_watch_history(raw)
    assert result.period == "2026-01-10 ~ 2026-02-20"
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
cd backend
python -m pytest tests/test_watch_history_parser.py -v
# Expected: ModuleNotFoundError (파서 모듈 없음)
```

- [ ] **Step 3: 파서 구현**

```python
# backend/app/parsers/watch_history.py
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
    """YouTube URL에서 video_id를 추출한다."""
    parsed = urlparse(url)

    # youtube.com/shorts/VIDEO_ID
    if SHORTS_URL_PATTERN in parsed.path:
        parts = parsed.path.split(SHORTS_URL_PATTERN)
        if len(parts) > 1:
            return parts[1].split("/")[0].split("?")[0]

    # youtube.com/watch?v=VIDEO_ID
    qs = parse_qs(parsed.query)
    if "v" in qs:
        return qs["v"][0]

    # youtu.be/VIDEO_ID
    if parsed.hostname and "youtu.be" in parsed.hostname:
        return parsed.path.lstrip("/").split("/")[0]

    return None


def is_shorts(title: str, url: str) -> bool:
    """Shorts 영상인지 판별한다."""
    title_lower = title.lower()
    for keyword in SHORTS_TITLE_KEYWORDS:
        if keyword in title_lower:
            return True
    if SHORTS_URL_PATTERN in url:
        return True
    return False


def parse_watch_history(data: list[dict]) -> WatchParseResult:
    """watch-history.json 데이터를 파싱한다."""
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
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

```bash
cd backend
python -m pytest tests/test_watch_history_parser.py -v
# Expected: 모든 테스트 PASS
```

- [ ] **Step 5: 커밋**

```bash
git add backend/app/parsers/watch_history.py backend/tests/test_watch_history_parser.py
git commit -m "feat: add watch-history parser with tests"
```

---

## Task 5: Search History 파서

**Files:**
- Create: `backend/app/parsers/search_history.py`
- Create: `backend/tests/test_search_history_parser.py`

- [ ] **Step 1: 테스트 파일 작성**

```python
# backend/tests/test_search_history_parser.py
from app.parsers.search_history import parse_search_history

def test_parse_normal_record():
    raw = [{
        "header": "YouTube",
        "title": "Searched for claude code",
        "titleUrl": "https://www.youtube.com/results?search_query\u003dclaude+code",
        "time": "2026-02-03T08:25:27.538Z",
        "products": ["YouTube"],
        "activityControls": ["YouTube search history"]
    }]
    result = parse_search_history(raw)
    assert result.total == 1
    assert result.skipped == 0
    assert result.records[0]["query"] == "claude code"

def test_skip_non_youtube_header():
    raw = [{
        "header": "Google Play",
        "title": "Searched for something",
        "titleUrl": "https://example.com",
        "time": "2026-01-15T10:00:00.000Z",
        "products": ["Google Play"],
    }]
    result = parse_search_history(raw)
    assert result.total == 0
    assert result.skipped == 1

def test_skip_non_searched_prefix():
    raw = [{
        "header": "YouTube",
        "title": "Visited some page",
        "titleUrl": "https://www.youtube.com/results?search_query\u003dtest",
        "time": "2026-01-15T10:00:00.000Z",
        "products": ["YouTube"],
        "activityControls": ["YouTube search history"]
    }]
    result = parse_search_history(raw)
    assert result.total == 0
    assert result.skipped == 1

def test_no_title_url():
    raw = [{
        "header": "YouTube",
        "title": "Searched for 테스트 검색어",
        "time": "2026-01-15T10:00:00.000Z",
        "products": ["YouTube"],
        "activityControls": ["YouTube search history"]
    }]
    result = parse_search_history(raw)
    assert result.total == 1
    assert result.records[0]["query"] == "테스트 검색어"
    assert result.records[0]["search_url"] is None

def test_empty_input():
    result = parse_search_history([])
    assert result.total == 0
    assert result.skipped == 0
    assert result.period == ""

def test_search_period_calculation():
    raw = [
        {
            "header": "YouTube",
            "title": "Searched for first",
            "titleUrl": "https://www.youtube.com/results?search_query\u003dfirst",
            "time": "2023-05-19T10:00:00.000Z",
            "products": ["YouTube"],
            "activityControls": ["YouTube search history"]
        },
        {
            "header": "YouTube",
            "title": "Searched for last",
            "titleUrl": "https://www.youtube.com/results?search_query\u003dlast",
            "time": "2026-02-03T10:00:00.000Z",
            "products": ["YouTube"],
            "activityControls": ["YouTube search history"]
        },
    ]
    result = parse_search_history(raw)
    assert result.period == "2023-05-19 ~ 2026-02-03"
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
cd backend
python -m pytest tests/test_search_history_parser.py -v
# Expected: ModuleNotFoundError
```

- [ ] **Step 3: 파서 구현**

```python
# backend/app/parsers/search_history.py
from dataclasses import dataclass, field
from config.settings import SUPPORTED_HEADERS, SEARCH_TITLE_PREFIX, DEFAULT_USER_ID


@dataclass
class SearchParseResult:
    records: list = field(default_factory=list)
    total: int = 0
    skipped: int = 0
    period: str = ""


def parse_search_history(data: list[dict]) -> SearchParseResult:
    """search-history.json 데이터를 파싱한다."""
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
            "source": "takeout",
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

- [ ] **Step 4: 테스트 실행 → 통과 확인**

```bash
cd backend
python -m pytest tests/test_search_history_parser.py -v
# Expected: 모든 테스트 PASS
```

- [ ] **Step 5: 커밋**

```bash
git add backend/app/parsers/search_history.py backend/tests/test_search_history_parser.py
git commit -m "feat: add search-history parser with tests"
```

---

## Task 6: Pydantic 응답 모델

**Files:**
- Create: `backend/app/models/schemas.py`

- [ ] **Step 1: 스키마 작성**

```python
# backend/app/models/schemas.py
from pydantic import BaseModel


class WatchUploadResponse(BaseModel):
    total: int
    skipped: int
    shorts: int
    period: str
    original_file_stored: bool


class SearchUploadResponse(BaseModel):
    total: int
    skipped: int
    period: str
    original_file_stored: bool
```

- [ ] **Step 2: 커밋**

```bash
git add backend/app/models/schemas.py
git commit -m "feat: add Pydantic response schemas"
```

---

## Task 7: 업로드 API 엔드포인트

**Files:**
- Create: `backend/app/routers/upload.py`
- Modify: `backend/app/main.py` (라우터 등록)
- Create: `backend/tests/test_upload_api.py`

- [ ] **Step 1: 업로드 API 테스트 작성**

```python
# backend/tests/test_upload_api.py
import json
import io
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

SAMPLE_WATCH = [
    {
        "header": "YouTube",
        "title": "Watched 테스트 영상",
        "titleUrl": "https://www.youtube.com/watch?v\u003dABC",
        "subtitles": [{"name": "채널", "url": "https://www.youtube.com/channel/UC"}],
        "time": "2026-01-15T14:00:00.000Z",
        "products": ["YouTube"],
        "activityControls": ["YouTube watch history"]
    }
]

SAMPLE_SEARCH = [
    {
        "header": "YouTube",
        "title": "Searched for 테스트",
        "titleUrl": "https://www.youtube.com/results?search_query\u003d%ED%85%8C%EC%8A%A4%ED%8A%B8",
        "time": "2026-01-15T14:00:00.000Z",
        "products": ["YouTube"],
        "activityControls": ["YouTube search history"]
    }
]


@patch("app.routers.upload.get_supabase_client")
def test_upload_watch_history(mock_client):
    mock_sb = MagicMock()
    mock_client.return_value = mock_sb
    # Mock DB operations
    mock_sb.table.return_value.delete.return_value.eq.return_value.execute.return_value = None
    mock_sb.table.return_value.insert.return_value.execute.return_value = None
    mock_sb.storage.from_.return_value.upload.return_value = None

    file_content = json.dumps(SAMPLE_WATCH).encode("utf-8")
    response = client.post(
        "/api/upload/watch-history",
        files={"file": ("watch-history.json", io.BytesIO(file_content), "application/json")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["skipped"] == 0
    assert data["original_file_stored"] is True


@patch("app.routers.upload.get_supabase_client")
def test_upload_search_history(mock_client):
    mock_sb = MagicMock()
    mock_client.return_value = mock_sb
    mock_sb.table.return_value.delete.return_value.eq.return_value.execute.return_value = None
    mock_sb.table.return_value.insert.return_value.execute.return_value = None
    mock_sb.storage.from_.return_value.upload.return_value = None

    file_content = json.dumps(SAMPLE_SEARCH).encode("utf-8")
    response = client.post(
        "/api/upload/search-history",
        files={"file": ("search-history.json", io.BytesIO(file_content), "application/json")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["skipped"] == 0


def test_upload_invalid_json():
    file_content = b"not a json"
    response = client.post(
        "/api/upload/watch-history",
        files={"file": ("watch-history.json", io.BytesIO(file_content), "application/json")},
    )
    assert response.status_code == 400
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
cd backend
python -m pytest tests/test_upload_api.py -v
# Expected: FAIL (라우터 없음)
```

- [ ] **Step 3: 업로드 라우터 구현**

```python
# backend/app/routers/upload.py
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

    # 기존 데이터 삭제 + 새 데이터 삽입
    # NOTE: Supabase Python SDK는 multi-statement 트랜잭션을 지원하지 않음.
    # 단일 사용자 모드에서는 DELETE→INSERT 순서로 실행하되,
    # INSERT 실패 시 사용자가 재업로드하면 복구된다.
    # 다중 사용자 전환 시 Supabase RPC(stored procedure)로 교체 필요.
    sb.table("watch_records").delete().eq("user_id", DEFAULT_USER_ID).execute()
    if result.records:
        _batch_insert(sb, "watch_records", result.records)

    timestamp = _upload_timestamp()
    stored = _store_original(sb, file_bytes, "watch-history.json", timestamp)

    return WatchUploadResponse(
        total=result.total,
        skipped=result.skipped,
        shorts=result.shorts,
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

- [ ] **Step 4: main.py에 라우터 등록**

`backend/app/main.py`에 추가:

```python
from app.routers.upload import router as upload_router
app.include_router(upload_router)
```

- [ ] **Step 5: 테스트 실행 → 통과 확인**

```bash
cd backend
python -m pytest tests/test_upload_api.py -v
# Expected: 모든 테스트 PASS
```

- [ ] **Step 6: 실제 데이터로 수동 테스트**

```bash
cd backend
uvicorn app.main:app --reload
# 별도 터미널에서:
curl -X POST http://localhost:8000/api/upload/watch-history \
  -F "file=@../datas/watch-history.json"
curl -X POST http://localhost:8000/api/upload/search-history \
  -F "file=@../datas/search-history.json"
```

Supabase 대시보드에서 watch_records, search_records 테이블에 데이터가 들어갔는지 확인.

- [ ] **Step 7: 커밋**

```bash
git add backend/app/routers/upload.py backend/app/main.py backend/tests/test_upload_api.py
git commit -m "feat: add upload API endpoints for watch and search history"
```

---

## Task 8: 프론트엔드 초기화

**Files:**
- Create: `frontend/` (Vite + React + TypeScript 프로젝트)

- [ ] **Step 1: Vite 프로젝트 생성**

```bash
cd /Users/wonjunjoe/Desktop/05\ new_start
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
```

- [ ] **Step 2: Tailwind CSS + shadcn/ui 설치**

```bash
cd frontend
npm install -D tailwindcss @tailwindcss/vite
npx shadcn@latest init --defaults
```

`vite.config.ts`에 tailwind 플러그인 추가:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

- [ ] **Step 3: 실행 확인**

```bash
npm run dev
# http://localhost:5173 에서 기본 페이지 확인
```

- [ ] **Step 4: 커밋**

```bash
cd /Users/wonjunjoe/Desktop/05\ new_start
git add frontend/
git commit -m "feat: initialize frontend with Vite + React + TypeScript + Tailwind + shadcn"
```

---

## Task 9: 프론트엔드 업로드 UI

**Files:**
- Create: `frontend/src/components/FileUploader.tsx`
- Create: `frontend/src/components/UploadResultCard.tsx`
- Create: `frontend/src/pages/UploadPage.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: FileUploader 컴포넌트 작성**

```tsx
// frontend/src/components/FileUploader.tsx
import { useCallback, useState } from "react";

interface FileUploaderProps {
  label: string;
  accept: string;
  endpoint: string;
  onResult: (data: any) => void;
}

export function FileUploader({ label, accept, endpoint, onResult }: FileUploaderProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MAX_SIZE = 50 * 1024 * 1024;

  const uploadFile = useCallback(async (file: File) => {
    setError(null);
    if (file.size > MAX_SIZE) {
      setError("파일 크기가 50MB를 초과합니다");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`http://localhost:8000${endpoint}`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail || `업로드 실패 (${res.status})`);
      }

      const data = await res.json();
      onResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }, [endpoint, onResult]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
        dragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
      }`}
    >
      <label className="cursor-pointer">
        <p className="text-lg font-medium mb-2">{label}</p>
        <p className="text-sm text-gray-500 mb-4">
          파일을 드래그하거나 클릭하여 선택하세요 (최대 50MB)
        </p>
        <input
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
          disabled={uploading}
        />
      </label>
      {uploading && <p className="text-blue-600 mt-2">업로드 중...</p>}
      {error && <p className="text-red-600 mt-2">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: UploadResultCard 컴포넌트 작성**

```tsx
// frontend/src/components/UploadResultCard.tsx

interface WatchResult {
  type: "watch";
  total: number;
  skipped: number;
  shorts: number;
  period: string;
  original_file_stored: boolean;
}

interface SearchResult {
  type: "search";
  total: number;
  skipped: number;
  period: string;
  original_file_stored: boolean;
}

type UploadResult = WatchResult | SearchResult;

export function UploadResultCard({ result }: { result: UploadResult }) {
  return (
    <div className="border rounded-lg p-6 bg-white shadow-sm">
      <h3 className="text-lg font-semibold mb-4">
        {result.type === "watch" ? "시청 기록" : "검색 기록"} 업로드 완료
      </h3>
      <div className="space-y-2 text-sm">
        <p>저장된 레코드: <span className="font-bold">{result.total.toLocaleString()}건</span></p>
        <p>스킵된 레코드: <span className="font-bold">{result.skipped}건</span></p>
        {result.type === "watch" && (
          <p>Shorts 영상: <span className="font-bold">{result.shorts}건</span></p>
        )}
        <p>기간: <span className="font-bold">{result.period}</span></p>
        <p>원본 백업: {result.original_file_stored ? "✓" : "✗"}</p>
      </div>
    </div>
  );
}

export type { UploadResult, WatchResult, SearchResult };
```

- [ ] **Step 3: UploadPage 작성**

```tsx
// frontend/src/pages/UploadPage.tsx
import { useState } from "react";
import { FileUploader } from "../components/FileUploader";
import { UploadResultCard, type UploadResult } from "../components/UploadResultCard";

export function UploadPage() {
  const [watchResult, setWatchResult] = useState<UploadResult | null>(null);
  const [searchResult, setSearchResult] = useState<UploadResult | null>(null);

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-2">WatchLens</h1>
      <p className="text-gray-600 mb-8">
        Google Takeout에서 다운로드한 YouTube 데이터를 업로드하세요.
      </p>

      <div className="space-y-6">
        <FileUploader
          label="시청 기록 (watch-history.json)"
          accept=".json"
          endpoint="/api/upload/watch-history"
          onResult={(data) => setWatchResult({ type: "watch", ...data })}
        />

        <FileUploader
          label="검색 기록 (search-history.json)"
          accept=".json"
          endpoint="/api/upload/search-history"
          onResult={(data) => setSearchResult({ type: "search", ...data })}
        />
      </div>

      {(watchResult || searchResult) && (
        <div className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold">업로드 결과</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {watchResult && <UploadResultCard result={watchResult} />}
            {searchResult && <UploadResultCard result={searchResult} />}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: App.tsx 수정**

```tsx
// frontend/src/App.tsx
import { UploadPage } from "./pages/UploadPage";

function App() {
  return <UploadPage />;
}

export default App;
```

- [ ] **Step 5: 프론트엔드 실행 + 수동 테스트**

```bash
cd frontend
npm run dev
```

1. http://localhost:5173 접속
2. watch-history.json 업로드 → 결과 카드 확인
3. search-history.json 업로드 → 결과 카드 확인
4. 잘못된 파일 업로드 → 에러 메시지 확인

- [ ] **Step 6: 커밋**

```bash
cd /Users/wonjunjoe/Desktop/05\ new_start
git add frontend/src/
git commit -m "feat: add upload page with file uploader and result cards"
```

---

## Task 10: 엔드투엔드 통합 테스트

**Files:** 없음 (수동 테스트)

- [ ] **Step 1: 백엔드 + 프론트엔드 동시 실행**

```bash
# 터미널 1
cd backend && source venv/bin/activate && uvicorn app.main:app --reload

# 터미널 2
cd frontend && npm run dev
```

- [ ] **Step 2: 실제 데이터로 풀 플로우 테스트**

1. http://localhost:5173 접속
2. `datas/watch-history.json` 업로드 → 결과 확인 (약 10,693건, 7건 스킵, 632 shorts)
3. `datas/search-history.json` 업로드 → 결과 확인 (약 3,692건)
4. Supabase 대시보드에서 watch_records, search_records 테이블 데이터 확인
5. Supabase Storage에서 원본 파일 백업 확인

- [ ] **Step 3: 재업로드 테스트**

1. watch-history.json 다시 업로드
2. watch_records 건수가 이전과 동일한지 확인 (중복 아닌 덮어쓰기)
3. search_records는 그대로인지 확인

- [ ] **Step 4: 전체 테스트 실행**

```bash
cd backend
python -m pytest tests/ -v
# Expected: 모든 테스트 PASS
```

- [ ] **Step 5: 최종 커밋**

```bash
cd /Users/wonjunjoe/Desktop/05\ new_start
git add -A
git commit -m "feat: complete Step 1 - JSON upload and parsing"
```
