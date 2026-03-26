# Step 2: Dashboard & Analytics Design

## Overview

유튜브 시청/검색 기록을 분석하여 시청 습관과 취향을 시각적으로 보여주는 대시보드.
자기 인사이트가 메인 목적이며, 소셜 비교 기능은 이후 확장 예정.

## Architecture: API-first

각 분석 항목마다 독립 API 엔드포인트를 두고, 프론트엔드가 병렬 호출.
빠른 차트가 먼저 렌더링되고, 느린 것(카테고리 등)은 나중에 뜸.
하나가 실패해도 나머지는 정상 동작.

## Backend API Endpoints

모든 엔드포인트: `GET /api/stats/{name}?user_id=...`

| 엔드포인트 | 설명 | 데이터 소스 |
|---|---|---|
| `/api/stats/summary` | 총 시청 수, 채널 수, 기간, 일 평균, Shorts 수 | watch_records |
| `/api/stats/hourly` | 시간대별(0~23) 시청 수 배열 | watch_records.watched_at |
| `/api/stats/daily` | 날짜별 시청 수 | watch_records.watched_at |
| `/api/stats/top-channels` | 채널별 시청 수 Top 20 | watch_records.channel_name |
| `/api/stats/shorts` | Shorts/일반 비율 + 주별 Shorts 비중 추이 | watch_records.is_shorts |
| `/api/stats/categories` | 카테고리별 시청 비율 | watch_records JOIN video_metadata |
| `/api/stats/search-keywords` | 검색 키워드 Top 30 | search_records.query |

모든 API에 `user_id` 파라미터 포함 (소셜 비교 확장용).

## YouTube Data API Integration

### 호출 시점

업로드 시 배치 처리. 파일 파싱 → DB 저장 → YouTube API 호출 → video_metadata 저장 → is_shorts 업데이트.

### 호출 방식

- `videos.list(part=snippet,contentDetails,statistics)` — 한 번에 50개씩 (API 제한)
- 10,500건 기준 약 210회 호출, 무료 할당량(10,000 units/일) 내 처리 가능

### video_metadata 테이블

```sql
CREATE TABLE video_metadata (
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
```

description, thumbnails는 저장하지 않음 (불필요하게 큼).

### Shorts 판별 보강

- YouTube API에서 `duration_seconds` 조회
- `duration_seconds ≤ 60` → `watch_records.is_shorts = true`로 업데이트
- API 조회 실패한 영상(삭제됨 등)은 `is_shorts = false` 유지

#### 사전 검증 필요

구현 전에 "Shorts = 1분 이하" 가설 검증:
- 실제 Shorts가 모두 1분 이하인지
- 1분 이하 영상이 모두 Shorts인지
- 샘플 데이터로 확인 후 기준 조정 가능

## Refactoring (Step 1 코드 정리)

### 파서에서 제거할 것

- `is_shorts` 판별 로직 제거 (YouTube API duration 기반으로 전환)
- `source` 필드 제거 (항상 "takeout"이므로 불필요)

### settings.py에서 제거할 것

- `SHORTS_TITLE_KEYWORDS`
- `SHORTS_URL_PATTERN`

### DB 스키마 변경

- `watch_records.source` 컬럼 제거
- `search_records.source` 컬럼 제거
- `watch_records.is_shorts` 유지 (YouTube API가 업데이트)

## Frontend Dashboard

### 기술 스택

- Recharts (차트 라이브러리)
- 기존 React + TypeScript + Tailwind 유지

### 페이지 구성

싱글 페이지, 섹션별 스크롤. 디자인은 추후 재조정 예정.

| 순서 | 섹션 | 차트 타입 |
|---|---|---|
| 1 | 요약 통계 카드 | 숫자 카드 4~5개 |
| 2 | 시간대별 시청 분포 | 바 차트 |
| 3 | 일별 시청량 트렌드 | 라인 차트 |
| 4 | Top 채널 랭킹 | 수평 바 차트 |
| 5 | Shorts 비율 | 도넛 차트 + 추이 라인 |
| 6 | 카테고리별 비율 | 파이 차트 |
| 7 | 검색 키워드 Top 30 | 바 차트 or 리스트 |

각 섹션이 독립적으로 API 호출 → 빠른 것부터 렌더링.

## Data Flow

### 업로드 시
1. JSON 파일 업로드 → 파서가 레코드 추출
2. watch_records / search_records에 저장
3. watch_records의 video_id들로 YouTube API 배치 호출 (50개씩)
4. video_metadata 테이블에 저장
5. duration_seconds ≤ 60이면 watch_records.is_shorts = true 업데이트

### 대시보드 조회 시
1. 프론트 로딩 → 7개 API 병렬 호출
2. 각 API는 Supabase SQL 집계 → JSON 리턴
3. categories API만 video_metadata JOIN
4. 각 차트 컴포넌트가 독립 렌더링

## Scope Out (이번에 안 함)

- 소셜 비교 기능 (Step 3)
- 영상 길이별 분석 (duration 데이터는 저장하지만 차트는 미포함)
- 관심사 변화 추이 (시계열 카테고리 변화)
