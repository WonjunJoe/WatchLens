# Step 1: JSON 업로드 + 파싱 설계

> **Version:** 1.0
> **Date:** 2026-03-25
> **Scope:** Google Takeout JSON 파일(watch-history, search-history) 업로드, 파싱, DB 저장
> **Parent PRD:** WatchLens_PRD_v1.md

---

## 1. 개요

WatchLens의 첫 번째 구현 단계. 사용자가 Google Takeout에서 다운로드한 YouTube JSON 파일 2종을 업로드하면, 서버에서 파싱하여 DB에 저장하고 원본을 백업한다. 분석 로직은 이 단계에 포함하지 않는다.

**흐름 요약:**
```
파일 선택 → 업로드 → 서버 파싱 → DB 저장 + 원본 백업 → 완료 요약 표시
```

---

## 2. 파싱 대상 및 데이터 모델

### 2.1 watch-history.json

**원본 구조:**
```json
{
  "header": "YouTube",
  "title": "Watched 영상제목",
  "titleUrl": "https://www.youtube.com/watch?v=xxxxx",
  "subtitles": [{ "name": "채널명", "url": "채널URL" }],
  "time": "2026-01-15T14:32:00.000Z",
  "products": ["YouTube"],
  "activityControls": ["YouTube watch history"]
}
```

**파싱 → watch_records 테이블:**

| 컬럼 | 타입 | 소스 | 비고 |
|------|------|------|------|
| id | BIGSERIAL PK | 자동 생성 | |
| user_id | UUID FK | 인증 정보 | users 테이블 참조 |
| video_id | TEXT | titleUrl에서 `v=` 파라미터 추출 | null 가능 |
| video_title | TEXT NOT NULL | title에서 "Watched " 접두사 제거 | |
| channel_name | TEXT | subtitles[0].name | null 가능 (356건/10,700건) |
| channel_url | TEXT | subtitles[0].url | null 가능 |
| watched_at | TIMESTAMPTZ NOT NULL | time | ISO 8601 |
| is_shorts | BOOLEAN DEFAULT false | 제목에 `#shorts`/`#short` 포함 OR URL에 `/shorts/` 포함 | 병행 판별 |
| source | TEXT DEFAULT 'takeout' | 고정값 | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

### 2.2 search-history.json

**원본 구조:**
```json
{
  "header": "YouTube",
  "title": "Searched for 검색어",
  "titleUrl": "https://www.youtube.com/results?search_query=...",
  "time": "2026-01-15T14:32:00.000Z",
  "products": ["YouTube"],
  "activityControls": ["YouTube search history"]
}
```

**파싱 → search_records 테이블 (신규):**

| 컬럼 | 타입 | 소스 | 비고 |
|------|------|------|------|
| id | BIGSERIAL PK | 자동 생성 | |
| user_id | UUID FK | 인증 정보 | users 테이블 참조 |
| query | TEXT NOT NULL | title에서 "Searched for " 접두사 제거 | |
| search_url | TEXT | titleUrl | |
| searched_at | TIMESTAMPTZ NOT NULL | time | ISO 8601 |
| source | TEXT DEFAULT 'takeout' | 고정값 | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

### 2.3 스킵 규칙

| 조건 | 처리 |
|------|------|
| `titleUrl` 없음 (삭제된 영상) | 스킵, 카운트 |
| `header` != "YouTube" | 스킵 |
| `subtitles` 없음 | channel_name = null로 정상 저장 |

### 2.4 중복 업로드 처리

같은 user_id의 기존 데이터를 삭제 후 재업로드 (덮어쓰기).

---

## 3. API 설계

### 3.1 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/upload/watch-history` | 시청 기록 업로드 + 파싱 |
| POST | `/api/upload/search-history` | 검색 기록 업로드 + 파싱 |
| GET | `/api/upload/status` | 업로드 결과 요약 조회 |

### 3.2 업로드 완료 응답

```json
{
  "watch_records": {
    "total": 10693,
    "skipped": 7,
    "shorts": 632,
    "period": "2025-10-28 ~ 2026-02-03"
  },
  "search_records": {
    "total": 3692,
    "period": "2023-05-19 ~ 2026-02-03"
  },
  "original_files_stored": true
}
```

### 3.3 에러 응답

| 상황 | HTTP 코드 | 메시지 |
|------|-----------|--------|
| JSON 파싱 실패 | 400 | "유효한 YouTube Takeout JSON이 아닙니다" |
| 파일 크기 초과 | 413 | "파일 크기가 50MB를 초과합니다" |
| 서버 오류 | 500 | "업로드 처리 중 오류가 발생했습니다" |

---

## 4. 프론트엔드

**최소 기능 업로드 페이지 (`/upload`):**
- 파일 선택 또는 드래그앤드롭
- watch-history.json, search-history.json 각각 또는 동시에 업로드
- 업로드 중 프로그레스 표시
- 완료 시 파싱 결과 요약 카드 (총 건수, 기간, Shorts 수 등)
- 디자인은 기능 위주 최소한으로, 추후 다듬기

---

## 5. 아키텍처

```
[브라우저: React]
    │
    ├── 파일 선택 + 클라이언트 유효성 검사 (형식, 크기)
    │
    ▼
[FastAPI 서버]
    │
    ├── JSON 파싱 (watch/search 파서)
    ├── DB 저장 (Supabase PostgreSQL)
    └── 원본 백업 (Supabase Storage)
    │
    ▼
[Supabase]
    ├── PostgreSQL: watch_records, search_records
    └── Storage: 원본 JSON 파일
```

---

## 6. 프로젝트 구조

```
watchlens/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   └── UploadPage.tsx
│   │   ├── components/
│   │   │   └── FileUploader.tsx
│   │   └── App.tsx
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── routers/
│   │   │   └── upload.py
│   │   ├── parsers/
│   │   │   ├── watch_history.py
│   │   │   └── search_history.py
│   │   ├── models/
│   │   │   └── schemas.py
│   │   └── db/
│   │       └── supabase.py
│   ├── config/
│   │   └── settings.py
│   └── requirements.txt
│
└── docs/
    └── superpowers/
        └── specs/
```

---

## 7. 설정값 (config/settings.py)

```python
MAX_FILE_SIZE_MB = 50
SUPPORTED_HEADERS = ["YouTube"]
SHORTS_TITLE_KEYWORDS = ["#shorts", "#short"]
SHORTS_URL_PATTERN = "/shorts/"
WATCH_TITLE_PREFIX = "Watched "
SEARCH_TITLE_PREFIX = "Searched for "
```

---

## 8. 범위 외 (다음 단계)

- 카테고리 분류 (제목 기반 NLP)
- 시간대/요일 분석
- 도파민 중독 지수
- 대시보드 시각화
- Google OAuth 연동
- 소셜/비교 기능

이들은 데이터가 DB에 저장된 후 별도 브레인스토밍을 거쳐 설계한다.
