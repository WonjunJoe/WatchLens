# Architecture Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Router에서 비즈니스 로직과 DB 접근을 분리하고, YouTube/Instagram 간 아키텍처 대칭성을 확보하며, 프론트엔드 SSE 중복을 제거한다.

**Architecture:** stats.py의 12개 계산 함수를 services/stats_service.py로, DB 접근을 db/repository.py로 추출한다. 프론트엔드는 SSE 파싱을 useSseStream 훅으로 통합하고, YouTube도 Instagram과 동일한 Context 패턴을 적용한다.

**Tech Stack:** FastAPI, Supabase, React 19, TypeScript

---

## File Structure

### Backend — 신규 파일
- `backend/app/services/stats_service.py` — stats.py에서 추출한 12개 계산 함수
- `backend/app/db/repository.py` — DB 접근 함수 (watch_records, search_records, video_metadata)

### Backend — 수정 파일
- `backend/app/routers/stats.py` — 계산/DB 로직 제거, service/repository 호출로 교체
- `backend/app/routers/upload.py` — DB 접근을 repository로 교체

### Frontend — 신규 파일
- `frontend/src/hooks/useSseStream.ts` — SSE 파싱 커스텀 훅
- `frontend/src/contexts/YouTubeDataContext.tsx` — YouTube 대시보드 전역 상태

### Frontend — 수정 파일
- `frontend/src/pages/DashboardPage.tsx` — useSseStream 훅 + Context 사용
- `frontend/src/pages/HomePage.tsx` — useSseStream 훅 사용
- `frontend/src/App.tsx` — YouTubeDataProvider 추가

### 테스트 파일
- `backend/tests/test_stats_service.py` — 추출된 계산 함수 단위 테스트
- `backend/tests/test_repository.py` — repository 함수 테스트

---

## Task 1: DB Repository 추출

stats.py와 upload.py에 흩어진 DB 접근 함수를 `db/repository.py`로 모은다.

**Files:**
- Create: `backend/app/db/repository.py`
- Create: `backend/tests/test_repository.py`
- Modify: `backend/app/routers/stats.py:47-104` (DB 함수 제거)
- Modify: `backend/app/routers/upload.py:20-31` (DB 함수 제거)

- [ ] **Step 1: repository.py 작성**

```python
"""Centralized database access functions."""

from app.db.supabase import get_supabase_client
from app.utils import chunk_list
from config.settings import DB_CHUNK_SIZE, DEFAULT_USER_ID

PAGE_SIZE = 1000


def _fetch_all_rows(query, page_size: int = PAGE_SIZE) -> list[dict]:
    """Execute paginated query and return all rows."""
    all_data: list[dict] = []
    offset = 0
    while True:
        resp = query.range(offset, offset + page_size - 1).execute()
        all_data.extend(resp.data)
        if len(resp.data) < page_size:
            break
        offset += page_size
    return all_data


def fetch_watch_records(user_id: str, date_from: str, date_to: str) -> list[dict]:
    """Fetch watch_records within UTC date range."""
    sb = get_supabase_client()
    query = (
        sb.table("watch_records")
        .select("video_id, video_title, channel_name, watched_at, is_shorts")
        .eq("user_id", user_id)
        .gte("watched_at", date_from)
        .lte("watched_at", date_to)
        .order("watched_at")
    )
    return _fetch_all_rows(query)


def fetch_search_records(user_id: str, date_from: str, date_to: str) -> list[dict]:
    """Fetch search_records within UTC date range."""
    sb = get_supabase_client()
    query = (
        sb.table("search_records")
        .select("query, searched_at")
        .eq("user_id", user_id)
        .gte("searched_at", date_from)
        .lte("searched_at", date_to)
        .order("searched_at")
    )
    return _fetch_all_rows(query)


def fetch_video_metadata(video_ids: list[str]) -> tuple[dict[str, int], dict[str, str]]:
    """Fetch video_metadata and return (id_to_duration, id_to_category) dicts."""
    sb = get_supabase_client()
    id_to_duration: dict[str, int] = {}
    id_to_category: dict[str, str] = {}
    for chunk in chunk_list(video_ids):
        resp = (
            sb.table("video_metadata")
            .select("video_id, duration_seconds, category_name")
            .in_("video_id", chunk)
            .execute()
        )
        for row in resp.data:
            if row["duration_seconds"]:
                id_to_duration[row["video_id"]] = row["duration_seconds"]
            if row["category_name"]:
                id_to_category[row["video_id"]] = row["category_name"]
    return id_to_duration, id_to_category


def fetch_period(user_id: str) -> dict | None:
    """Fetch earliest and latest watch_record timestamps. Returns None if no data."""
    sb = get_supabase_client()
    earliest = (
        sb.table("watch_records")
        .select("watched_at")
        .eq("user_id", user_id)
        .order("watched_at")
        .limit(1)
        .execute()
    )
    if not earliest.data:
        return None
    latest = (
        sb.table("watch_records")
        .select("watched_at")
        .eq("user_id", user_id)
        .order("watched_at", desc=True)
        .limit(1)
        .execute()
    )
    return {"earliest": earliest.data[0]["watched_at"], "latest": latest.data[0]["watched_at"]}


def delete_user_records(table: str, user_id: str, timestamp_col: str) -> None:
    """Delete all records for a user from the given table."""
    sb = get_supabase_client()
    sb.table(table).delete().eq("user_id", user_id).execute()


def batch_insert(table: str, records: list[dict]) -> None:
    """Insert records in chunks."""
    sb = get_supabase_client()
    for chunk in chunk_list(records):
        sb.table(table).insert(chunk).execute()


def store_original_file(bucket: str, path: str, file_bytes: bytes, content_type: str) -> bool:
    """Upload file to Supabase storage. Returns True on success."""
    sb = get_supabase_client()
    try:
        sb.storage.from_(bucket).upload(path, file_bytes, {"content-type": content_type})
        return True
    except Exception:
        return False


def save_instagram_results(user_id: str, results: dict) -> None:
    """Save Instagram dashboard results to DB."""
    sb = get_supabase_client()
    sb.table("instagram_dashboard_results").upsert({
        "user_id": user_id,
        "results": results,
    }).execute()


def fetch_instagram_results(user_id: str) -> dict | None:
    """Fetch cached Instagram dashboard results."""
    sb = get_supabase_client()
    resp = (
        sb.table("instagram_dashboard_results")
        .select("results")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if resp.data:
        return resp.data[0]["results"]
    return None
```

- [ ] **Step 2: repository 테스트 작성**

```python
"""Tests for db/repository.py"""

from unittest.mock import patch, MagicMock
from app.db.repository import (
    _fetch_all_rows,
    fetch_watch_records,
    fetch_video_metadata,
    delete_user_records,
    batch_insert,
)


def _mock_sb():
    sb = MagicMock()
    return sb


@patch("app.db.repository.get_supabase_client")
def test_fetch_watch_records_returns_filtered_data(mock_client):
    sb = _mock_sb()
    mock_client.return_value = sb
    chain = sb.table.return_value.select.return_value.eq.return_value
    chain = chain.gte.return_value.lte.return_value.order.return_value
    chain.range.return_value.execute.return_value.data = [
        {"video_id": "abc", "watched_at": "2024-01-01T00:00:00Z", "is_shorts": False,
         "video_title": "test", "channel_name": "ch"}
    ]

    result = fetch_watch_records("user1", "2024-01-01", "2024-12-31")
    assert len(result) == 1
    assert result[0]["video_id"] == "abc"


@patch("app.db.repository.get_supabase_client")
def test_fetch_video_metadata_returns_two_dicts(mock_client):
    sb = _mock_sb()
    mock_client.return_value = sb
    chain = sb.table.return_value.select.return_value.in_.return_value
    chain.execute.return_value.data = [
        {"video_id": "v1", "duration_seconds": 120, "category_name": "Music"},
        {"video_id": "v2", "duration_seconds": None, "category_name": "Gaming"},
    ]

    durations, categories = fetch_video_metadata(["v1", "v2"])
    assert durations == {"v1": 120}
    assert categories == {"v1": "Music", "v2": "Gaming"}


@patch("app.db.repository.get_supabase_client")
def test_delete_user_records(mock_client):
    sb = _mock_sb()
    mock_client.return_value = sb
    delete_user_records("watch_records", "user1", "watched_at")
    sb.table.assert_called_with("watch_records")


@patch("app.db.repository.get_supabase_client")
def test_batch_insert_chunks_data(mock_client):
    sb = _mock_sb()
    mock_client.return_value = sb
    records = [{"id": i} for i in range(3)]
    batch_insert("test_table", records)
    sb.table.assert_called_with("test_table")
```

- [ ] **Step 3: 테스트 실행**

Run: `cd /Users/wonjunjoe/Desktop/workspace/05_WatchLens/backend && python -m pytest tests/test_repository.py -v`
Expected: 4 tests PASS

- [ ] **Step 4: 커밋**

```bash
git add backend/app/db/repository.py backend/tests/test_repository.py
git commit -m "refactor: extract DB access to repository layer"
```

---

## Task 2: Stats 계산 로직을 Service로 추출

stats.py의 12개 `_compute_*` 함수를 `services/stats_service.py`로 이동한다.

**Files:**
- Create: `backend/app/services/stats_service.py`
- Create: `backend/tests/test_stats_service.py`

- [ ] **Step 1: stats_service.py 작성**

stats.py의 다음 함수들을 그대로 이동하되, `_` prefix를 제거하고 public 함수로 만든다:

```python
"""YouTube dashboard computation functions.

All functions are pure: they take fetched data and return computed results.
No DB or I/O calls.
"""

from collections import Counter
from datetime import datetime, timedelta
from app.utils import to_local
from config.settings import (
    SHORTS_MAX_DURATION_SECONDS,
    WATCH_TIME_CAP_SECONDS,
    AVG_RETENTION_SHORTS,
    AVG_RETENTION_LONGFORM,
    LATE_NIGHT_HOURS,
)

DAY_NAMES = ["월", "화", "수", "목", "금", "토", "일"]


def compute_summary(
    records: list[dict],
    date_from: str,
    date_to: str,
) -> dict:
    total = len(records)
    channels = {r["channel_name"] for r in records if r["channel_name"]}
    shorts_count = sum(1 for r in records if r["is_shorts"])

    d_from = datetime.strptime(date_from, "%Y-%m-%d")
    d_to = datetime.strptime(date_to, "%Y-%m-%d")
    total_days = max((d_to - d_from).days, 1)

    return {
        "total_watched": total,
        "total_channels": len(channels),
        "period": f"{date_from} ~ {date_to}",
        "daily_average": round(total / total_days, 1),
        "shorts_count": shorts_count,
    }


def compute_hourly(records: list[dict]) -> list[dict]:
    hour_counts = Counter(to_local(r["watched_at"]).hour for r in records)
    return [{"hour": h, "count": hour_counts.get(h, 0)} for h in range(24)]


def compute_daily(records: list[dict]) -> list[dict]:
    day_counts = Counter(to_local(r["watched_at"]).strftime("%Y-%m-%d") for r in records)
    return sorted(
        [{"date": d, "count": c} for d, c in day_counts.items()],
        key=lambda x: x["date"],
    )


def compute_top_channels(records: list[dict]) -> dict:
    long_counts: Counter = Counter()
    short_counts: Counter = Counter()
    for r in records:
        name = r["channel_name"] or "알 수 없음"
        if r["is_shorts"]:
            short_counts[name] += 1
        else:
            long_counts[name] += 1
    return {
        "longform": [{"channel": ch, "count": c} for ch, c in long_counts.most_common(10)],
        "shorts": [{"channel": ch, "count": c} for ch, c in short_counts.most_common(10)],
    }


def compute_shorts(records: list[dict]) -> dict:
    total = len(records)
    shorts = [r for r in records if r["is_shorts"]]
    shorts_count = len(shorts)

    daily: Counter = Counter()
    for r in shorts:
        daily[to_local(r["watched_at"]).strftime("%Y-%m-%d")] += 1

    sorted_days = sorted(daily.items())
    trend = []
    window: list[int] = []
    for date_str, count in sorted_days:
        window.append(count)
        if len(window) > 3:
            window.pop(0)
        trend.append({
            "date": date_str,
            "count": count,
            "ma3": round(sum(window) / len(window), 1),
        })

    return {
        "shorts_count": shorts_count,
        "shorts_ratio": round(shorts_count / total, 3) if total else 0,
        "daily_trend": trend,
    }


def compute_categories(
    records: list[dict],
    id_to_category: dict[str, str],
) -> dict:
    long_cats: Counter = Counter()
    short_cats: Counter = Counter()
    for r in records:
        cat = id_to_category.get(r.get("video_id", ""), "기타")
        if r["is_shorts"]:
            short_cats[cat] += 1
        else:
            long_cats[cat] += 1
    return {
        "longform": [{"category": c, "count": n} for c, n in long_cats.most_common()],
        "shorts": [{"category": c, "count": n} for c, n in short_cats.most_common()],
    }


def compute_watch_time(
    records: list[dict],
    id_to_duration: dict[str, int],
) -> dict:
    if not records:
        return {"total_min_hours": 0, "total_max_hours": 0, "daily_min_hours": 0, "daily_max_hours": 0}

    cap = WATCH_TIME_CAP_SECONDS
    dates = set()
    total_gap_sec = 0
    total_retention_sec = 0

    sorted_recs = sorted(records, key=lambda r: r["watched_at"])
    prev_dt = None
    for r in sorted_recs:
        dt = to_local(r["watched_at"])
        dates.add(dt.date())

        dur = id_to_duration.get(r.get("video_id", ""), 0)
        capped = min(dur, cap) if dur else 0

        if r["is_shorts"]:
            total_retention_sec += capped * AVG_RETENTION_SHORTS
        else:
            total_retention_sec += capped * AVG_RETENTION_LONGFORM

        if prev_dt and dt.date() == prev_dt.date():
            gap = (dt - prev_dt).total_seconds()
            if 0 < gap <= cap:
                total_gap_sec += gap
        prev_dt = dt

    num_days = len(dates) or 1
    min_h = round(total_retention_sec / 3600, 1)
    max_h = round((total_retention_sec + total_gap_sec) / 3600, 1)

    return {
        "total_min_hours": min_h,
        "total_max_hours": max_h,
        "daily_min_hours": round(min_h / num_days, 1),
        "daily_max_hours": round(max_h / num_days, 1),
    }


def compute_search_keywords(search_records: list[dict]) -> list[dict]:
    keyword_counts = Counter(r["query"] for r in search_records)
    return [{"keyword": k, "count": c} for k, c in keyword_counts.most_common(30)]


def _get_week_key(dt: datetime) -> str:
    iso = dt.isocalendar()
    return f"{iso[0]}-W{iso[1]:02d}"


def compute_weekly_watch_time(
    records: list[dict],
    id_to_duration: dict[str, int],
) -> list[dict]:
    if not records:
        return []

    cap = WATCH_TIME_CAP_SECONDS
    week_retention: Counter = Counter()
    week_gap: Counter = Counter()
    week_dates: dict[str, set] = {}

    sorted_recs = sorted(records, key=lambda r: r["watched_at"])
    prev_dt = None
    for r in sorted_recs:
        dt = to_local(r["watched_at"])
        wk = _get_week_key(dt)

        dur = id_to_duration.get(r.get("video_id", ""), 0)
        capped = min(dur, cap) if dur else 0
        rate = AVG_RETENTION_SHORTS if r["is_shorts"] else AVG_RETENTION_LONGFORM
        week_retention[wk] += capped * rate

        if prev_dt and dt.date() == prev_dt.date():
            gap = (dt - prev_dt).total_seconds()
            if 0 < gap <= cap:
                week_gap[wk] += gap

        week_dates.setdefault(wk, set()).add(dt.date())
        prev_dt = dt

    sorted_weeks = sorted(week_retention.keys())
    result = []
    prev_hours = None
    for wk in sorted_weeks:
        min_h = round(week_retention[wk] / 3600, 1)
        max_h = round((week_retention[wk] + week_gap[wk]) / 3600, 1)
        days_in_week = len(week_dates.get(wk, set()))

        change = None
        if prev_hours is not None and prev_hours > 0:
            change = round((max_h - prev_hours) / prev_hours * 100, 1)

        is_partial = days_in_week < 7
        result.append({
            "week": wk,
            "min_hours": min_h,
            "max_hours": max_h,
            "days": days_in_week,
            "is_partial": is_partial,
            "change_pct": change,
        })
        prev_hours = max_h

    return result


def compute_weekly(records: list[dict]) -> list[dict]:
    week_data: dict[str, dict] = {}
    week_dates: dict[str, set] = {}

    for r in records:
        dt = to_local(r["watched_at"])
        wk = _get_week_key(dt)
        if wk not in week_data:
            week_data[wk] = {"total": 0, "shorts": 0, "longform": 0}
        week_data[wk]["total"] += 1
        if r["is_shorts"]:
            week_data[wk]["shorts"] += 1
        else:
            week_data[wk]["longform"] += 1
        week_dates.setdefault(wk, set()).add(dt.date())

    result = []
    for wk in sorted(week_data.keys()):
        d = week_data[wk]
        days = len(week_dates.get(wk, set())) or 1
        result.append({
            "week_label": wk,
            "total": d["total"],
            "shorts": d["shorts"],
            "longform": d["longform"],
            "daily_avg": round(d["total"] / days, 1),
        })
    return result


def compute_day_of_week(records: list[dict]) -> list[dict]:
    day_date_counts: dict[int, Counter] = {i: Counter() for i in range(7)}

    for r in records:
        dt = to_local(r["watched_at"])
        day_date_counts[dt.weekday()][dt.strftime("%Y-%m-%d")] += 1

    result = []
    for i in range(7):
        counts = day_date_counts[i]
        total = sum(counts.values())
        num_weeks = len(counts) or 1
        result.append({
            "day": DAY_NAMES[i],
            "day_index": i,
            "total": total,
            "avg": round(total / num_weeks, 1),
        })
    return result


def compute_viewer_type(
    records: list[dict],
    id_to_duration: dict[str, int],
) -> dict:
    total = len(records)
    if total == 0:
        return {"code": "N/A", "axes": []}

    late = sum(1 for r in records if to_local(r["watched_at"]).hour in LATE_NIGHT_HOURS)
    nocturnal_ratio = late / total

    shorts_count = sum(1 for r in records if r["is_shorts"])
    shorts_ratio = shorts_count / total

    dates = Counter(to_local(r["watched_at"]).strftime("%Y-%m-%d") for r in records)
    if len(dates) >= 2:
        counts = list(dates.values())
        mean = sum(counts) / len(counts)
        variance = sum((c - mean) ** 2 for c in counts) / len(counts)
        std = variance ** 0.5
        cv = std / mean if mean else 0
    else:
        cv = 0

    known = [r for r in records if r.get("video_id") and r["video_id"] in id_to_duration]
    if known:
        unique_channels = {r["channel_name"] for r in known if r["channel_name"]}
        channel_ratio = len(unique_channels) / len(known)
    else:
        unique_channels = {r["channel_name"] for r in records if r["channel_name"]}
        channel_ratio = len(unique_channels) / total if total else 0

    axes = [
        {
            "axis": "시간대",
            "value": round(nocturnal_ratio, 3),
            "label": "야행성(N)" if nocturnal_ratio >= 0.3 else "주행성(D)",
            "code": "N" if nocturnal_ratio >= 0.3 else "D",
        },
        {
            "axis": "콘텐츠 길이",
            "value": round(shorts_ratio, 3),
            "label": "숏폼(S)" if shorts_ratio >= 0.4 else "롱폼(L)",
            "code": "S" if shorts_ratio >= 0.4 else "L",
        },
        {
            "axis": "시청 패턴",
            "value": round(cv, 3),
            "label": "몰아보기(B)" if cv >= 1.0 else "꾸준한(C)",
            "code": "B" if cv >= 1.0 else "C",
        },
        {
            "axis": "채널 다양성",
            "value": round(channel_ratio, 3),
            "label": "탐험가(E)" if channel_ratio >= 0.5 else "집중형(F)",
            "code": "E" if channel_ratio >= 0.5 else "F",
        },
    ]

    code = "".join(a["code"] for a in axes)
    return {"code": code, "axes": axes}
```

- [ ] **Step 2: stats_service 테스트 작성**

```python
"""Tests for services/stats_service.py — pure computation functions."""

from app.services.stats_service import (
    compute_summary,
    compute_hourly,
    compute_daily,
    compute_top_channels,
    compute_shorts,
    compute_categories,
    compute_watch_time,
    compute_search_keywords,
    compute_weekly,
    compute_day_of_week,
    compute_viewer_type,
)


def _make_record(watched_at="2024-06-15T12:00:00Z", is_shorts=False, video_id="v1", channel="ch1"):
    return {
        "video_id": video_id,
        "video_title": "test",
        "channel_name": channel,
        "watched_at": watched_at,
        "is_shorts": is_shorts,
    }


def test_compute_summary_basic():
    records = [_make_record(), _make_record(is_shorts=True)]
    result = compute_summary(records, "2024-06-15", "2024-06-15")
    assert result["total_watched"] == 2
    assert result["shorts_count"] == 1
    assert result["total_channels"] == 1


def test_compute_hourly_24_slots():
    records = [_make_record(watched_at="2024-06-15T03:00:00Z")]  # 03 UTC = 12 KST
    result = compute_hourly(records)
    assert len(result) == 24
    assert result[12]["count"] == 1


def test_compute_daily_sorted():
    records = [
        _make_record(watched_at="2024-06-16T00:00:00Z"),
        _make_record(watched_at="2024-06-15T00:00:00Z"),
    ]
    result = compute_daily(records)
    assert result[0]["date"] < result[-1]["date"]


def test_compute_top_channels_split():
    records = [
        _make_record(channel="A", is_shorts=False),
        _make_record(channel="B", is_shorts=True),
    ]
    result = compute_top_channels(records)
    assert result["longform"][0]["channel"] == "A"
    assert result["shorts"][0]["channel"] == "B"


def test_compute_shorts_ratio():
    records = [_make_record(is_shorts=True)] * 3 + [_make_record(is_shorts=False)] * 7
    result = compute_shorts(records)
    assert result["shorts_ratio"] == 0.3


def test_compute_categories_maps_correctly():
    records = [_make_record(video_id="v1"), _make_record(video_id="v2", is_shorts=True)]
    cats = compute_categories(records, {"v1": "Music", "v2": "Gaming"})
    assert cats["longform"][0]["category"] == "Music"
    assert cats["shorts"][0]["category"] == "Gaming"


def test_compute_watch_time_empty():
    result = compute_watch_time([], {})
    assert result["total_min_hours"] == 0


def test_compute_search_keywords_top30():
    search = [{"query": f"q{i % 5}", "searched_at": "2024-01-01T00:00:00Z"} for i in range(100)]
    result = compute_search_keywords(search)
    assert len(result) <= 30
    assert result[0]["count"] == 20


def test_compute_weekly_aggregation():
    records = [_make_record(watched_at="2024-06-10T12:00:00Z")] * 5
    result = compute_weekly(records)
    assert len(result) == 1
    assert result[0]["total"] == 5


def test_compute_day_of_week_7_days():
    records = [_make_record()]
    result = compute_day_of_week(records)
    assert len(result) == 7


def test_compute_viewer_type_returns_4char_code():
    records = [_make_record()] * 10
    result = compute_viewer_type(records, {"v1": 600})
    assert len(result["code"]) == 4
    assert len(result["axes"]) == 4
```

- [ ] **Step 3: 테스트 실행**

Run: `cd /Users/wonjunjoe/Desktop/workspace/05_WatchLens/backend && python -m pytest tests/test_stats_service.py -v`
Expected: 11 tests PASS

- [ ] **Step 4: 커밋**

```bash
git add backend/app/services/stats_service.py backend/tests/test_stats_service.py
git commit -m "refactor: extract stats computation to service layer"
```

---

## Task 3: stats.py 라우터를 Thin Router로 변환

계산 로직과 DB 접근을 제거하고, service/repository 호출로 교체한다.

**Files:**
- Modify: `backend/app/routers/stats.py`

- [ ] **Step 1: stats.py를 service + repository 호출로 재작성**

```python
"""YouTube analytics dashboard API endpoints."""

from datetime import datetime, timedelta, timezone
from collections.abc import Generator

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse

from config.settings import DEFAULT_USER_ID, USER_TZ_OFFSET_HOURS
from app.utils import sse
from app.db.repository import (
    fetch_watch_records,
    fetch_search_records,
    fetch_video_metadata,
    fetch_period,
)
from app.services.stats_service import (
    compute_summary,
    compute_hourly,
    compute_daily,
    compute_top_channels,
    compute_shorts,
    compute_categories,
    compute_watch_time,
    compute_search_keywords,
    compute_weekly_watch_time,
    compute_weekly,
    compute_day_of_week,
    compute_viewer_type,
)
from app.services.indices import calc_dopamine
from app.services.insights import generate_insights

router = APIRouter(prefix="/api/stats", tags=["stats"])

_TZ_OFFSET = timedelta(hours=USER_TZ_OFFSET_HOURS)


def _local_date_to_utc(date_str: str, end_of_day: bool = False) -> str:
    """Convert local date string to UTC ISO format."""
    dt = datetime.strptime(date_str, "%Y-%m-%d")
    if end_of_day:
        dt = dt.replace(hour=23, minute=59, second=59)
    utc_dt = dt - _TZ_OFFSET
    return utc_dt.replace(tzinfo=timezone.utc).isoformat()


# ---------- Dashboard SSE stream ----------

SECTIONS = [
    "summary", "hourly", "daily", "top_channels", "shorts",
    "categories", "watch_time", "weekly_watch_time", "weekly",
    "dopamine", "day_of_week", "viewer_type", "search_keywords", "insights",
]


def _dashboard_stream(
    date_from: str,
    date_to: str,
    user_id: str = DEFAULT_USER_ID,
) -> Generator[str, None, None]:
    utc_from = _local_date_to_utc(date_from)
    utc_to = _local_date_to_utc(date_to, end_of_day=True)

    # 1. Fetch data
    records = fetch_watch_records(user_id, utc_from, utc_to)
    search = fetch_search_records(user_id, utc_from, utc_to)
    video_ids = list({r["video_id"] for r in records if r.get("video_id")})
    id_to_duration, id_to_category = fetch_video_metadata(video_ids)

    yield sse("progress", {"step": "데이터 로드 완료", "loaded": 0, "total": len(SECTIONS)})

    # 2. Compute and stream each section
    total = len(SECTIONS)

    def emit(idx: int, name: str, data: dict) -> str:
        return sse("section", {"name": name, "data": data, "loaded": idx + 1, "total": total})

    summary = compute_summary(records, date_from, date_to)
    yield emit(0, "summary", summary)

    yield emit(1, "hourly", compute_hourly(records))
    yield emit(2, "daily", compute_daily(records))
    yield emit(3, "top_channels", compute_top_channels(records))

    shorts_data = compute_shorts(records)
    yield emit(4, "shorts", shorts_data)

    yield emit(5, "categories", compute_categories(records, id_to_category))

    watch_time = compute_watch_time(records, id_to_duration)
    yield emit(6, "watch_time", watch_time)

    yield emit(7, "weekly_watch_time", compute_weekly_watch_time(records, id_to_duration))

    weekly = compute_weekly(records)
    yield emit(8, "weekly", weekly)

    dopamine = calc_dopamine(records, id_to_duration)
    yield emit(9, "dopamine", dopamine)

    yield emit(10, "day_of_week", compute_day_of_week(records))
    yield emit(11, "viewer_type", compute_viewer_type(records, id_to_duration))
    yield emit(12, "search_keywords", compute_search_keywords(search))

    insights = generate_insights(summary, compute_hourly(records), shorts_data, dopamine, watch_time, weekly)
    yield emit(13, "insights", insights)

    yield sse("done", {"loaded": total, "total": total})


# ---------- Endpoints ----------

@router.get("/period")
def get_period(user_id: str = DEFAULT_USER_ID):
    result = fetch_period(user_id)
    if not result:
        return {"date_from": None, "date_to": None, "total_days": 0}

    from app.utils import to_local
    d_from = to_local(result["earliest"]).strftime("%Y-%m-%d")
    d_to = to_local(result["latest"]).strftime("%Y-%m-%d")
    delta = datetime.strptime(d_to, "%Y-%m-%d") - datetime.strptime(d_from, "%Y-%m-%d")

    return {"date_from": d_from, "date_to": d_to, "total_days": delta.days + 1}


@router.get("/dashboard")
def get_dashboard(
    date_from: str = Query(...),
    date_to: str = Query(...),
    user_id: str = DEFAULT_USER_ID,
):
    return StreamingResponse(
        _dashboard_stream(date_from, date_to, user_id),
        media_type="text/event-stream",
    )
```

- [ ] **Step 2: 기존 테스트 실행으로 regression 확인**

Run: `cd /Users/wonjunjoe/Desktop/workspace/05_WatchLens/backend && python -m pytest tests/ -v`
Expected: 기존 테스트 전부 PASS (test_stats_api.py는 mock 구조 변경으로 수정 필요할 수 있음)

- [ ] **Step 3: test_stats_api.py mock 경로 업데이트**

기존 테스트가 `app.routers.stats.get_supabase_client`를 mock하고 있다면, `app.db.repository.get_supabase_client`로 변경해야 한다. 실제 실패 내용에 맞춰 수정.

- [ ] **Step 4: 전체 테스트 통과 확인 후 커밋**

Run: `cd /Users/wonjunjoe/Desktop/workspace/05_WatchLens/backend && python -m pytest tests/ -v`

```bash
git add backend/app/routers/stats.py backend/tests/test_stats_api.py
git commit -m "refactor: slim down stats router to thin orchestration layer"
```

---

## Task 4: upload.py 라우터를 Repository 사용으로 변환

upload.py의 DB 직접 호출을 repository 함수로 교체한다.

**Files:**
- Modify: `backend/app/routers/upload.py`

- [ ] **Step 1: upload.py를 repository 호출로 재작성**

```python
"""File upload endpoints for YouTube watch/search history."""

from datetime import datetime, timezone
from collections.abc import Generator

from fastapi import APIRouter, UploadFile
from fastapi.responses import StreamingResponse

from config.settings import MAX_FILE_SIZE_BYTES, DEFAULT_USER_ID
from app.utils import sse, parse_period
from app.parsers.watch_history import parse_watch_history
from app.parsers.search_history import parse_search_history
from app.services.youtube import fetch_and_store_metadata
from app.db.repository import (
    delete_user_records,
    batch_insert,
    store_original_file,
)

import json

router = APIRouter(prefix="/api/upload", tags=["upload"])


def _upload_timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")


def _parse_json(raw: bytes) -> list | None:
    try:
        data = json.loads(raw)
        return data if isinstance(data, list) else None
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None


def _watch_history_stream(raw: bytes) -> Generator[str, None, None]:
    data = _parse_json(raw)
    if data is None:
        yield sse("error", {"message": "Invalid JSON file"})
        return

    result = parse_watch_history(data)
    yield sse("progress", {"step": "파싱 완료", "total": result.total, "skipped": result.skipped})

    delete_user_records("watch_records", DEFAULT_USER_ID, "watched_at")
    batch_insert("watch_records", result.records)
    yield sse("progress", {"step": "DB 저장 완료", "total": result.total})

    video_ids = [r["video_id"] for r in result.records if r.get("video_id")]
    if video_ids:
        fetch_and_store_metadata(video_ids)
    yield sse("progress", {"step": "메타데이터 수집 완료"})

    ts = _upload_timestamp()
    stored = store_original_file("watch-history", f"{DEFAULT_USER_ID}/{ts}.json", raw, "application/json")

    yield sse("done", {
        "total": result.total,
        "skipped": result.skipped,
        "period": result.period,
        "original_file_stored": stored,
    })


def _search_history_stream(raw: bytes) -> Generator[str, None, None]:
    data = _parse_json(raw)
    if data is None:
        yield sse("error", {"message": "Invalid JSON file"})
        return

    result = parse_search_history(data)
    yield sse("progress", {"step": "파싱 완료", "total": result.total, "skipped": result.skipped})

    delete_user_records("search_records", DEFAULT_USER_ID, "searched_at")
    batch_insert("search_records", result.records)
    yield sse("progress", {"step": "DB 저장 완료", "total": result.total})

    ts = _upload_timestamp()
    stored = store_original_file("search-history", f"{DEFAULT_USER_ID}/{ts}.json", raw, "application/json")

    yield sse("done", {
        "total": result.total,
        "skipped": result.skipped,
        "period": result.period,
        "original_file_stored": stored,
    })


@router.post("/watch-history")
async def upload_watch_history(file: UploadFile):
    raw = await file.read()
    if len(raw) > MAX_FILE_SIZE_BYTES:
        return {"error": f"파일이 너무 큽니다 (최대 {MAX_FILE_SIZE_BYTES // 1024 // 1024}MB)"}
    return StreamingResponse(_watch_history_stream(raw), media_type="text/event-stream")


@router.post("/search-history")
async def upload_search_history(file: UploadFile):
    raw = await file.read()
    if len(raw) > MAX_FILE_SIZE_BYTES:
        return {"error": f"파일이 너무 큽니다 (최대 {MAX_FILE_SIZE_BYTES // 1024 // 1024}MB)"}
    return StreamingResponse(_search_history_stream(raw), media_type="text/event-stream")
```

- [ ] **Step 2: 기존 test_upload_api.py mock 경로 업데이트 후 테스트**

Run: `cd /Users/wonjunjoe/Desktop/workspace/05_WatchLens/backend && python -m pytest tests/test_upload_api.py -v`

- [ ] **Step 3: 커밋**

```bash
git add backend/app/routers/upload.py backend/tests/test_upload_api.py
git commit -m "refactor: upload router uses repository for DB access"
```

---

## Task 5: instagram.py 라우터를 Repository 사용으로 변환

instagram.py의 직접 DB 호출도 repository로 통일한다.

**Files:**
- Modify: `backend/app/routers/instagram.py`

- [ ] **Step 1: instagram.py의 DB 호출을 repository로 교체**

변경 대상:
- `sb.table("instagram_dashboard_results").upsert(...)` → `save_instagram_results()`
- `sb.table("instagram_dashboard_results").select(...)` → `fetch_instagram_results()`
- `get_supabase_client` import 제거
- `app.db.repository` import 추가

- [ ] **Step 2: 테스트 실행**

Run: `cd /Users/wonjunjoe/Desktop/workspace/05_WatchLens/backend && python -m pytest tests/ -v`
Expected: ALL PASS

- [ ] **Step 3: 커밋**

```bash
git add backend/app/routers/instagram.py
git commit -m "refactor: instagram router uses repository for DB access"
```

---

## Task 6: Frontend — SSE 커스텀 훅 추출

DashboardPage.tsx와 HomePage.tsx에서 중복된 SSE 파싱 로직을 `useSseStream` 훅으로 추출한다.

**Files:**
- Create: `frontend/src/hooks/useSseStream.ts`
- Modify: `frontend/src/pages/DashboardPage.tsx`
- Modify: `frontend/src/pages/HomePage.tsx`

- [ ] **Step 1: useSseStream.ts 작성**

```typescript
import { useCallback, useRef } from "react";

interface SseEvent {
  event: string;
  data: any;
}

type SseHandler = (evt: SseEvent) => void;

/**
 * Returns a function that opens an SSE stream (GET or POST) and
 * calls handler(event) for each parsed SSE block.
 * Supports both GET (dashboard) and POST (upload) patterns.
 */
export function useSseStream() {
  const abortRef = useRef<AbortController | null>(null);

  const stream = useCallback(
    async (
      url: string,
      handler: SseHandler,
      options?: { method?: string; body?: FormData | string; headers?: Record<string, string> },
    ) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const res = await fetch(url, {
        method: options?.method ?? "GET",
        body: options?.body,
        headers: options?.headers,
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`SSE request failed: ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() ?? "";

        for (const block of blocks) {
          const eventMatch = block.match(/^event: (.+)$/m);
          const dataMatch = block.match(/^data: (.+)$/m);
          if (!eventMatch || !dataMatch) continue;
          try {
            handler({ event: eventMatch[1], data: JSON.parse(dataMatch[1]) });
          } catch {
            // skip malformed JSON
          }
        }
      }
    },
    [],
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { stream, abort };
}
```

- [ ] **Step 2: DashboardPage.tsx에서 훅 사용**

SSE 파싱 로직(기존 lines 63-93)을 제거하고 `useSseStream` 호출로 교체:

```typescript
// 기존 buffer/reader/decoder 로직 전부 삭제하고:
const { stream } = useSseStream();

const fetchDashboard = useCallback(async () => {
  setLoading(true);
  setError(null);
  setData({});

  try {
    await stream(
      `${API_BASE}/api/stats/dashboard?date_from=${dateFrom}&date_to=${dateTo}`,
      ({ event, data: payload }) => {
        if (event === "progress") setProgress(payload);
        else if (event === "section") {
          setData((prev) => ({ ...prev, [payload.name]: payload.data }));
          setProgress((p) => ({ ...p, loaded: payload.loaded, total: payload.total }));
        } else if (event === "done") setLoading(false);
      },
    );
  } catch (e: any) {
    setError(e.message);
  } finally {
    setLoading(false);
  }
}, [dateFrom, dateTo, stream]);
```

- [ ] **Step 3: HomePage.tsx의 Instagram 업로드 SSE도 훅 사용으로 교체**

기존 `handleInstagramUpload` 함수(lines 55-113)의 SSE 파싱을 동일하게 교체:

```typescript
const { stream } = useSseStream();

const handleInstagramUpload = async (file: File) => {
  setIgUploading(true);
  setIgError(null);
  const formData = new FormData();
  formData.append("file", file);

  try {
    await stream(
      `${API_BASE}/api/instagram/upload`,
      ({ event, data: payload }) => {
        if (event === "progress") setIgProgress(payload);
        else if (event === "section") {
          setSection(payload.name, payload.data);
          setIgProgress((p) => ({ ...p, loaded: payload.loaded, total: payload.total }));
        } else if (event === "done") setIgDone(true);
        else if (event === "error") setIgError(payload.message);
      },
      { method: "POST", body: formData },
    );
  } catch (e: any) {
    setIgError(e.message);
  } finally {
    setIgUploading(false);
  }
};
```

- [ ] **Step 4: 프론트 빌드 확인**

Run: `cd /Users/wonjunjoe/Desktop/workspace/05_WatchLens/frontend && npm run build`
Expected: 빌드 성공, 에러 없음

- [ ] **Step 5: 커밋**

```bash
git add frontend/src/hooks/useSseStream.ts frontend/src/pages/DashboardPage.tsx frontend/src/pages/HomePage.tsx
git commit -m "refactor: extract SSE parsing to useSseStream hook"
```

---

## Task 7: Frontend — YouTube Context 추가

Instagram과 동일한 Context 패턴을 YouTube에도 적용한다.

**Files:**
- Create: `frontend/src/contexts/YouTubeDataContext.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/pages/DashboardPage.tsx`

- [ ] **Step 1: YouTubeDataContext.tsx 작성**

```typescript
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

const API_BASE = "http://localhost:8000";

interface YouTubeData {
  summary?: any;
  hourly?: any;
  daily?: any;
  top_channels?: any;
  shorts?: any;
  categories?: any;
  watch_time?: any;
  weekly_watch_time?: any;
  weekly?: any;
  dopamine?: any;
  day_of_week?: any;
  viewer_type?: any;
  search_keywords?: any;
  insights?: any;
}

interface PeriodInfo {
  date_from: string;
  date_to: string;
  total_days: number;
}

interface YouTubeContextValue {
  data: YouTubeData;
  period: PeriodInfo | null;
  setSection: (name: string, value: any) => void;
  setAll: (data: YouTubeData) => void;
  setPeriod: (p: PeriodInfo | null) => void;
  clear: () => void;
  fetchPeriod: () => Promise<void>;
}

const YouTubeDataContext = createContext<YouTubeContextValue | null>(null);

export function YouTubeDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<YouTubeData>({});
  const [period, setPeriod] = useState<PeriodInfo | null>(null);

  const setSection = useCallback((name: string, value: any) => {
    setData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const setAll = useCallback((d: YouTubeData) => setData(d), []);
  const clear = useCallback(() => { setData({}); }, []);

  const fetchPeriod = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/stats/period`);
      const d = await res.json();
      if (d.date_from) setPeriod(d);
    } catch {
      // ignore
    }
  }, []);

  return (
    <YouTubeDataContext.Provider value={{ data, period, setSection, setAll, setPeriod, clear, fetchPeriod }}>
      {children}
    </YouTubeDataContext.Provider>
  );
}

export function useYouTubeData() {
  const ctx = useContext(YouTubeDataContext);
  if (!ctx) throw new Error("useYouTubeData must be inside YouTubeDataProvider");
  return ctx;
}
```

- [ ] **Step 2: App.tsx에 YouTubeDataProvider 추가**

```typescript
import { YouTubeDataProvider } from "./contexts/YouTubeDataContext";

// 기존 InstagramDataProvider 안에 YouTubeDataProvider 중첩:
<YouTubeDataProvider>
  <InstagramDataProvider>
    <BrowserRouter>
      ...
    </BrowserRouter>
  </InstagramDataProvider>
</YouTubeDataProvider>
```

- [ ] **Step 3: DashboardPage.tsx에서 Context 사용**

로컬 state를 Context의 `setSection`으로 교체. 페이지 재방문 시 이미 로드된 데이터가 있으면 재사용.

- [ ] **Step 4: HomePage.tsx에서 period를 Context로 관리**

기존 로컬 `period` state와 `useEffect` fetch를 Context의 `fetchPeriod`와 `period`로 교체.

- [ ] **Step 5: 빌드 확인**

Run: `cd /Users/wonjunjoe/Desktop/workspace/05_WatchLens/frontend && npm run build`
Expected: 빌드 성공

- [ ] **Step 6: 커밋**

```bash
git add frontend/src/contexts/YouTubeDataContext.tsx frontend/src/App.tsx \
  frontend/src/pages/DashboardPage.tsx frontend/src/pages/HomePage.tsx
git commit -m "refactor: add YouTube context for symmetric architecture with Instagram"
```

---

## Task 8: Backend — 에러 처리 표준화

라우터의 SSE 스트리밍에 일관된 try-catch를 적용한다.

**Files:**
- Modify: `backend/app/routers/stats.py`
- Modify: `backend/app/routers/upload.py`
- Modify: `backend/app/routers/instagram.py`

- [ ] **Step 1: stats.py _dashboard_stream에 에러 처리 추가**

`_dashboard_stream` 전체를 try-catch로 감싸고, 실패 시 SSE error 이벤트 전송:

```python
def _dashboard_stream(...) -> Generator[str, None, None]:
    try:
        # ... 기존 로직 ...
    except Exception as e:
        yield sse("error", {"message": f"대시보드 생성 중 오류: {str(e)}"})
```

- [ ] **Step 2: upload.py 스트림 함수들에도 동일 패턴 적용**

`_watch_history_stream`, `_search_history_stream` 각각 try-catch 추가.

- [ ] **Step 3: instagram.py의 silent `pass`를 에러 로깅으로 교체**

기존 `except: pass` → `except Exception as e: yield sse("error", {"message": str(e)})`

- [ ] **Step 4: 전체 테스트 실행**

Run: `cd /Users/wonjunjoe/Desktop/workspace/05_WatchLens/backend && python -m pytest tests/ -v`
Expected: ALL PASS

- [ ] **Step 5: 커밋**

```bash
git add backend/app/routers/stats.py backend/app/routers/upload.py backend/app/routers/instagram.py
git commit -m "refactor: standardize SSE error handling across all routers"
```

---

## Task 9: 최종 정리 및 아키텍처 문서 업데이트

리팩토링 결과를 반영하여 아키텍처 문서를 업데이트한다.

**Files:**
- Modify: `docs/architecture.md` — 평가 섹션의 문제점을 "해결됨"으로 업데이트

- [ ] **Step 1: 아키텍처 문서 평가 섹션 업데이트**

문제점 항목마다 해결 상태 표시. 새로운 파일 구조 반영.

- [ ] **Step 2: 전체 테스트 + 빌드 최종 확인**

```bash
cd /Users/wonjunjoe/Desktop/workspace/05_WatchLens/backend && python -m pytest tests/ -v
cd /Users/wonjunjoe/Desktop/workspace/05_WatchLens/frontend && npm run build
```

- [ ] **Step 3: 커밋**

```bash
git add docs/architecture.md
git commit -m "docs: update architecture document to reflect refactoring"
```
