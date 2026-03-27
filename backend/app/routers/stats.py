import json
import math
from collections import Counter
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from app.db.supabase import get_supabase_client
from app.models.schemas import PeriodInfo
from app.services.indices import calc_dopamine
from app.services.insights import generate_insights
from config.settings import (
    DEFAULT_USER_ID, USER_TZ_OFFSET_HOURS,
    WATCH_TIME_CAP_SECONDS, AVG_RETENTION_SHORTS, AVG_RETENTION_LONGFORM,
    LATE_NIGHT_HOURS,
)

router = APIRouter(prefix="/api/stats", tags=["stats"])

PAGE_SIZE = 1000
USER_TZ = timezone(timedelta(hours=USER_TZ_OFFSET_HOURS))


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def _local_date_to_utc(local_date: str, end_of_day: bool = False) -> str:
    if end_of_day:
        local_dt = datetime.strptime(local_date, "%Y-%m-%d").replace(
            hour=23, minute=59, second=59, tzinfo=USER_TZ
        )
    else:
        local_dt = datetime.strptime(local_date, "%Y-%m-%d").replace(
            hour=0, minute=0, second=0, tzinfo=USER_TZ
        )
    return local_dt.astimezone(timezone.utc).isoformat()


def _to_local(watched_at: str) -> datetime:
    dt = datetime.fromisoformat(watched_at.replace("Z", "+00:00"))
    return dt.astimezone(USER_TZ)


def _fetch_all_rows(query, page_size: int = PAGE_SIZE) -> list[dict]:
    all_data: list[dict] = []
    offset = 0
    while True:
        resp = query.range(offset, offset + page_size - 1).execute()
        all_data.extend(resp.data)
        if len(resp.data) < page_size:
            break
        offset += page_size
    return all_data


def _fetch_watch_records(user_id: str, date_from: str, date_to: str) -> list[dict]:
    sb = get_supabase_client()
    utc_from = _local_date_to_utc(date_from)
    utc_to = _local_date_to_utc(date_to, end_of_day=True)
    query = sb.table("watch_records").select(
        "video_id, video_title, channel_name, watched_at, is_shorts"
    ).eq("user_id", user_id).gte("watched_at", utc_from).lte("watched_at", utc_to)
    return _fetch_all_rows(query)


def _fetch_search_records(user_id: str, date_from: str, date_to: str) -> list[dict]:
    sb = get_supabase_client()
    utc_from = _local_date_to_utc(date_from)
    utc_to = _local_date_to_utc(date_to, end_of_day=True)
    query = sb.table("search_records").select("query").eq(
        "user_id", user_id
    ).gte("searched_at", utc_from).lte("searched_at", utc_to)
    return _fetch_all_rows(query)


def _fetch_durations(video_ids: list[str]) -> dict[str, int]:
    sb = get_supabase_client()
    id_to_duration: dict[str, int] = {}
    for i in range(0, len(video_ids), 500):
        chunk = video_ids[i : i + 500]
        meta = sb.table("video_metadata").select(
            "video_id, duration_seconds"
        ).in_("video_id", chunk).execute()
        for r in meta.data:
            if r["duration_seconds"]:
                id_to_duration[r["video_id"]] = r["duration_seconds"]
    return id_to_duration


def _fetch_categories(video_ids: list[str]) -> dict[str, str]:
    sb = get_supabase_client()
    id_to_category: dict[str, str] = {}
    for i in range(0, len(video_ids), 500):
        chunk = video_ids[i : i + 500]
        result = sb.table("video_metadata").select(
            "video_id, category_name"
        ).in_("video_id", chunk).execute()
        for r in result.data:
            id_to_category[r["video_id"]] = r["category_name"]
    return id_to_category


# ---------------------------------------------------------------------------
# Computation functions (pure logic, no DB calls)
# ---------------------------------------------------------------------------

def _active_days(records: list[dict]) -> int:
    """Number of unique days with at least one viewing record."""
    return len({_to_local(r["watched_at"]).strftime("%Y-%m-%d") for r in records}) or 1


def _compute_summary(records: list[dict]) -> dict:
    if not records:
        return {"total_watched": 0, "total_channels": 0, "period": "", "daily_average": 0, "shorts_count": 0}
    channels = {r["channel_name"] for r in records if r["channel_name"]}
    local_dates = sorted({_to_local(r["watched_at"]).strftime("%Y-%m-%d") for r in records})
    period = f"{local_dates[0]} ~ {local_dates[-1]}" if local_dates else ""
    num_days = _active_days(records)
    shorts_count = sum(1 for r in records if r["is_shorts"])
    return {
        "total_watched": len(records),
        "total_channels": len(channels),
        "period": period,
        "daily_average": round(len(records) / num_days, 1),
        "shorts_count": shorts_count,
    }


def _compute_hourly(records: list[dict]) -> list[dict]:
    hour_counts = Counter()
    for r in records:
        hour_counts[_to_local(r["watched_at"]).hour] += 1
    return [{"hour": h, "count": hour_counts.get(h, 0)} for h in range(24)]


def _compute_daily(records: list[dict]) -> list[dict]:
    day_counts = Counter(_to_local(r["watched_at"]).strftime("%Y-%m-%d") for r in records)
    return sorted(
        [{"date": d, "count": c} for d, c in day_counts.items()],
        key=lambda x: x["date"],
    )


def _compute_top_channels(records: list[dict]) -> dict:
    longform_counts: Counter[str] = Counter()
    shorts_counts: Counter[str] = Counter()
    for r in records:
        name = r["channel_name"]
        if not name:
            continue
        if r["is_shorts"]:
            shorts_counts[name] += 1
        else:
            longform_counts[name] += 1

    def to_list(counter: Counter) -> list[dict]:
        return [{"channel_name": ch, "count": c} for ch, c in counter.most_common(10)]

    return {"longform": to_list(longform_counts), "shorts": to_list(shorts_counts)}


def _compute_shorts(records: list[dict]) -> dict:
    shorts = sum(1 for r in records if r["is_shorts"])
    regular = len(records) - shorts
    ratio = round(shorts / len(records), 2) if records else 0

    day_shorts: Counter[str] = Counter()
    day_total: Counter[str] = Counter()
    for r in records:
        date = _to_local(r["watched_at"]).strftime("%Y-%m-%d")
        day_total[date] += 1
        if r["is_shorts"]:
            day_shorts[date] += 1

    sorted_dates = sorted(day_total.keys())
    raw_ratios = [round(day_shorts[d] / day_total[d], 2) for d in sorted_dates]

    window = 3
    daily_trend = []
    for i, date in enumerate(sorted_dates):
        start = max(0, i - window + 1)
        avg = round(sum(raw_ratios[start:i + 1]) / (i - start + 1), 2)
        daily_trend.append({"date": date, "shorts_ratio": avg})

    return {
        "shorts_count": shorts,
        "regular_count": regular,
        "shorts_ratio": ratio,
        "daily_trend": daily_trend,
    }


def _compute_categories(records: list[dict], id_to_category: dict[str, str]) -> dict:
    shorts_counts: Counter[str] = Counter()
    longform_counts: Counter[str] = Counter()
    for r in records:
        vid = r["video_id"]
        if not vid:
            continue
        cat = id_to_category.get(vid, "Unknown")
        if cat == "Unknown":
            cat = "미분류"
        if r["is_shorts"]:
            shorts_counts[cat] += 1
        else:
            longform_counts[cat] += 1

    def to_list(counter: Counter) -> list[dict]:
        return sorted(
            [{"category_name": cat, "count": c} for cat, c in counter.most_common()],
            key=lambda x: -x["count"],
        )

    return {"longform": to_list(longform_counts), "shorts": to_list(shorts_counts)}


def _compute_watch_time(records: list[dict], id_to_duration: dict[str, int]) -> dict:
    if not records:
        return {
            "total_min_hours": 0, "total_max_hours": 0,
            "daily_min_hours": 0, "daily_max_hours": 0,
            "gap_based_count": 0, "estimated_count": 0,
        }

    sorted_records = sorted(records, key=lambda r: r["watched_at"])
    total_min_seconds = 0.0
    total_max_seconds = 0.0
    gap_based_count = 0
    estimated_count = 0

    for idx, rec in enumerate(sorted_records):
        vid = rec["video_id"]
        duration = id_to_duration.get(vid, 0) if vid else 0
        if duration == 0:
            continue

        capped = min(duration, WATCH_TIME_CAP_SECONDS)

        if idx < len(sorted_records) - 1:
            current_dt = datetime.fromisoformat(rec["watched_at"].replace("Z", "+00:00"))
            next_dt = datetime.fromisoformat(sorted_records[idx + 1]["watched_at"].replace("Z", "+00:00"))
            gap_seconds = (next_dt - current_dt).total_seconds()
            if 0 < gap_seconds < duration:
                total_min_seconds += gap_seconds
                total_max_seconds += gap_seconds
                gap_based_count += 1
                continue

        retention = AVG_RETENTION_SHORTS if rec["is_shorts"] else AVG_RETENTION_LONGFORM
        total_min_seconds += capped * retention
        total_max_seconds += capped
        estimated_count += 1

    num_days = _active_days(records)

    return {
        "total_min_hours": round(total_min_seconds / 3600, 1),
        "total_max_hours": round(total_max_seconds / 3600, 1),
        "daily_min_hours": round(total_min_seconds / 3600 / num_days, 1),
        "daily_max_hours": round(total_max_seconds / 3600 / num_days, 1),
        "gap_based_count": gap_based_count,
        "estimated_count": estimated_count,
    }


def _compute_search_keywords(search_records: list[dict]) -> list[dict]:
    query_counts = Counter(r["query"] for r in search_records)
    return sorted(
        [{"keyword": q, "count": c} for q, c in query_counts.most_common(30)],
        key=lambda x: -x["count"],
    )


def _compute_weekly_watch_time(records: list[dict], id_to_duration: dict[str, int]) -> list[dict]:
    """Per-week watch time estimation using the same gap-based + retention logic."""
    if not records:
        return []

    sorted_records = sorted(records, key=lambda r: r["watched_at"])

    week_min: Counter[str] = Counter()
    week_max: Counter[str] = Counter()
    week_dates: dict[str, set] = {}

    for idx, rec in enumerate(sorted_records):
        vid = rec["video_id"]
        duration = id_to_duration.get(vid, 0) if vid else 0
        if duration == 0:
            continue

        capped = min(duration, WATCH_TIME_CAP_SECONDS)
        local = _to_local(rec["watched_at"])
        iso = local.isocalendar()
        week_key = f"{iso.year}-W{iso.week:02d}"
        week_dates.setdefault(week_key, set()).add(local.strftime("%Y-%m-%d"))

        if idx < len(sorted_records) - 1:
            current_dt = datetime.fromisoformat(rec["watched_at"].replace("Z", "+00:00"))
            next_dt = datetime.fromisoformat(sorted_records[idx + 1]["watched_at"].replace("Z", "+00:00"))
            gap = (next_dt - current_dt).total_seconds()
            if 0 < gap < duration:
                week_min[week_key] += gap
                week_max[week_key] += gap
                continue

        retention = AVG_RETENTION_SHORTS if rec["is_shorts"] else AVG_RETENTION_LONGFORM
        week_min[week_key] += capped * retention
        week_max[week_key] += capped

    result = []
    prev_max = None
    sorted_weeks = sorted(week_dates.keys())
    for week_key in sorted_weeks:
        dates = sorted(week_dates[week_key])
        num_days = len(dates)
        is_partial = num_days < 4
        label = f"{dates[0][5:]} ~ {dates[-1][5:]}"
        if is_partial and (week_key == sorted_weeks[0] or week_key == sorted_weeks[-1]):
            label += " (일부)"
        min_h = round(week_min[week_key] / 3600, 1)
        max_h = round(week_max[week_key] / 3600, 1)

        change_pct = None
        if prev_max is not None and prev_max > 0 and not is_partial:
            change_pct = round((max_h - prev_max) / prev_max * 100)

        result.append({
            "week_label": label,
            "min_hours": min_h,
            "max_hours": max_h,
            "change_pct": change_pct,
        })
        prev_max = max_h

    return result


def _compute_weekly(records: list[dict]) -> list[dict]:
    """Group records into ISO weeks and return per-week stats."""
    if not records:
        return []

    week_data: dict[str, dict] = {}
    for r in records:
        local = _to_local(r["watched_at"])
        iso = local.isocalendar()
        week_key = f"{iso.year}-W{iso.week:02d}"
        if week_key not in week_data:
            week_data[week_key] = {"total": 0, "shorts": 0, "dates": set()}
        week_data[week_key]["total"] += 1
        week_data[week_key]["dates"].add(local.strftime("%Y-%m-%d"))
        if r["is_shorts"]:
            week_data[week_key]["shorts"] += 1

    result = []
    for week_key in sorted(week_data.keys()):
        d = week_data[week_key]
        dates = sorted(d["dates"])
        label = f"{dates[0][5:]} ~ {dates[-1][5:]}" if dates else week_key
        num_days = len(d["dates"]) or 1
        result.append({
            "week_label": label,
            "total": d["total"],
            "shorts": d["shorts"],
            "longform": d["total"] - d["shorts"],
            "daily_avg": round(d["total"] / num_days, 1),
        })

    return result


def _compute_day_of_week(records: list[dict]) -> list[dict]:
    """Average viewing count per day-of-week (Mon=0 ~ Sun=6)."""
    DAY_NAMES = ["월", "화", "수", "목", "금", "토", "일"]
    day_counts: dict[int, Counter] = {i: Counter() for i in range(7)}

    for r in records:
        local = _to_local(r["watched_at"])
        weekday = local.weekday()
        date_str = local.strftime("%Y-%m-%d")
        day_counts[weekday][date_str] += 1

    result = []
    for i in range(7):
        counts = day_counts[i]
        total = sum(counts.values())
        num_weeks = len(counts) or 1
        avg = round(total / num_weeks, 1)
        result.append({
            "day": DAY_NAMES[i],
            "day_index": i,
            "total": total,
            "avg": avg,
            "weeks": num_weeks,
        })

    return result


def _compute_viewer_type(records: list[dict], shorts_data: dict, hourly: list[dict]) -> dict:
    """Compute a 4-letter viewer personality code based on viewing patterns."""
    total = len(records)
    if total == 0:
        return {"code": "----", "type_name": "데이터 없음", "description": "", "axes": []}

    # Axis 1: Time — Nocturnal(N) vs Diurnal(D)
    late_count = sum(1 for r in records if _to_local(r["watched_at"]).hour in LATE_NIGHT_HOURS)
    late_ratio = late_count / total
    is_nocturnal = late_ratio >= 0.3

    # Axis 2: Content — Shorts(S) vs Longform(L)
    shorts_ratio = shorts_data.get("shorts_ratio", 0)
    is_shorts = shorts_ratio >= 0.5

    # Axis 3: Pattern — Burst(B) vs Consistent(C)
    day_counts = Counter(_to_local(r["watched_at"]).strftime("%Y-%m-%d") for r in records)
    counts = list(day_counts.values())
    avg = sum(counts) / len(counts) if counts else 0
    variance = sum((c - avg) ** 2 for c in counts) / len(counts) if counts else 0
    cv = (variance ** 0.5) / avg if avg > 0 else 0
    is_bursty = cv >= 0.6

    # Axis 4: Focus — Focused(F) vs Explorer(E)
    channel_counts = Counter(r["channel_name"] for r in records if r["channel_name"])
    ch_total = sum(channel_counts.values())
    top5_total = sum(c for _, c in channel_counts.most_common(5))
    concentration = top5_total / ch_total if ch_total > 0 else 0
    is_focused = concentration >= 0.15

    code = ""
    code += "N" if is_nocturnal else "D"
    code += "S" if is_shorts else "L"
    code += "B" if is_bursty else "C"
    code += "F" if is_focused else "E"

    axes = [
        {"axis": "시간대", "left": "주간형", "right": "올빼미형", "value": round(late_ratio, 2), "pick": "N" if is_nocturnal else "D"},
        {"axis": "콘텐츠", "left": "롱폼형", "right": "숏츠형", "value": round(shorts_ratio, 2), "pick": "S" if is_shorts else "L"},
        {"axis": "패턴", "left": "꾸준형", "right": "몰아보기형", "value": round(min(cv, 1.0), 2), "pick": "B" if is_bursty else "C"},
        {"axis": "채널", "left": "탐험형", "right": "충성형", "value": round(concentration, 2), "pick": "F" if is_focused else "E"},
    ]

    TYPE_NAMES = {
        "NSBF": ("야행성 숏츠 폭주러", "밤마다 Shorts를 몰아보는 충성 시청자. 알고리즘이 가장 좋아하는 타입."),
        "NSBE": ("올빼미 탐험가", "밤에 Shorts를 다양한 채널에서 폭주 시청. 새로운 콘텐츠에 목마른 타입."),
        "NSCF": ("야행성 습관 시청자", "매일 밤 꾸준히 같은 채널의 Shorts를 시청. 루틴형 올빼미."),
        "NSCE": ("밤산책 감상러", "밤에 이것저것 구경하듯 Shorts를 꾸준히 소비하는 탐색형."),
        "NLBF": ("심야 정주행러", "밤에 좋아하는 채널의 긴 영상을 몰아보는 집중형 시청자."),
        "NLBE": ("밤새 서핑러", "다양한 채널의 롱폼을 밤에 몰아보는 자유로운 영혼."),
        "NLCF": ("충성 올빼미", "매일 밤 꾸준히 즐겨보는 채널의 롱폼 콘텐츠를 시청."),
        "NLCE": ("야행성 큐레이터", "밤에 다양한 롱폼을 꾸준히 탐색하는 감상형 시청자."),
        "DSBF": ("주간 숏츠 폭주러", "낮 시간에 같은 채널 Shorts를 몰아보는 패턴. 점심시간 주의."),
        "DSBE": ("트렌드 서퍼", "낮에 다양한 채널의 Shorts를 폭주 시청. 유행에 민감한 타입."),
        "DSCF": ("출퇴근 숏츠러", "낮에 꾸준히 Shorts를 시청하는 습관형. 이동 중 시청 가능성 높음."),
        "DSCE": ("일상 브라우저", "낮에 이것저것 Shorts를 가볍게 둘러보는 일상형 시청자."),
        "DLBF": ("몰입 학습러", "좋아하는 채널의 롱폼을 낮에 집중 시청. 학습·정보 탐구형."),
        "DLBE": ("주간 정주행러", "낮에 다양한 롱폼을 몰아보는 탐색형 시청자."),
        "DLCF": ("꾸준한 구독자", "매일 즐겨보는 채널의 롱폼을 꾸준히 시청하는 안정형."),
        "DLCE": ("롱폼 탐험가", "다양한 채널의 롱폼을 매일 꾸준히 탐색하는 호기심 가득한 시청자."),
    }

    type_name, description = TYPE_NAMES.get(code, ("유니크 시청자", "독특한 시청 패턴을 가진 나만의 스타일."))

    return {
        "code": code,
        "type_name": type_name,
        "description": description,
        "axes": axes,
    }


# ---------------------------------------------------------------------------
# GET /api/stats/period — data range available in DB
# ---------------------------------------------------------------------------

@router.get("/period", response_model=PeriodInfo)
def get_period(user_id: str = Query(default=DEFAULT_USER_ID)):
    sb = get_supabase_client()
    earliest = sb.table("watch_records").select("watched_at").eq(
        "user_id", user_id
    ).order("watched_at").limit(1).execute()
    latest = sb.table("watch_records").select("watched_at").eq(
        "user_id", user_id
    ).order("watched_at", desc=True).limit(1).execute()

    if not earliest.data or not latest.data:
        return PeriodInfo(date_from="", date_to="", total_days=0)

    date_from = _to_local(earliest.data[0]["watched_at"]).strftime("%Y-%m-%d")
    date_to = _to_local(latest.data[0]["watched_at"]).strftime("%Y-%m-%d")
    d1 = datetime.strptime(date_from, "%Y-%m-%d")
    d2 = datetime.strptime(date_to, "%Y-%m-%d")
    total_days = (d2 - d1).days + 1

    return PeriodInfo(date_from=date_from, date_to=date_to, total_days=total_days)


# ---------------------------------------------------------------------------
# GET /api/stats/dashboard — SSE endpoint, single DB fetch, streams all sections
# ---------------------------------------------------------------------------

def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


SECTIONS = [
    "summary", "hourly", "daily", "top_channels", "shorts",
    "categories", "watch_time", "weekly_watch_time", "weekly",
    "dopamine", "day_of_week", "viewer_type", "search_keywords", "insights",
]


def _dashboard_stream(user_id: str, date_from: str, date_to: str):
    total_sections = len(SECTIONS)

    yield _sse("progress", {"step": "데이터 조회 중...", "loaded": 0, "total": total_sections})

    records = _fetch_watch_records(user_id, date_from, date_to)
    search_records = _fetch_search_records(user_id, date_from, date_to)

    video_ids = list({r["video_id"] for r in records if r.get("video_id")})
    id_to_duration = _fetch_durations(video_ids) if video_ids else {}
    id_to_category = _fetch_categories(video_ids) if video_ids else {}

    loaded = 0

    # 1. Summary
    summary = _compute_summary(records)
    loaded += 1
    yield _sse("section", {"name": "summary", "data": summary, "loaded": loaded, "total": total_sections})

    # 2. Hourly
    hourly = _compute_hourly(records)
    loaded += 1
    yield _sse("section", {"name": "hourly", "data": hourly, "loaded": loaded, "total": total_sections})

    # 3. Daily
    daily = _compute_daily(records)
    loaded += 1
    yield _sse("section", {"name": "daily", "data": daily, "loaded": loaded, "total": total_sections})

    # 4. Top Channels
    top_channels = _compute_top_channels(records)
    loaded += 1
    yield _sse("section", {"name": "top_channels", "data": top_channels, "loaded": loaded, "total": total_sections})

    # 5. Shorts
    shorts = _compute_shorts(records)
    loaded += 1
    yield _sse("section", {"name": "shorts", "data": shorts, "loaded": loaded, "total": total_sections})

    # 6. Categories
    categories = _compute_categories(records, id_to_category)
    loaded += 1
    yield _sse("section", {"name": "categories", "data": categories, "loaded": loaded, "total": total_sections})

    # 7. Watch Time
    watch_time = _compute_watch_time(records, id_to_duration)
    loaded += 1
    yield _sse("section", {"name": "watch_time", "data": watch_time, "loaded": loaded, "total": total_sections})

    # 8. Weekly Watch Time
    weekly_watch_time = _compute_weekly_watch_time(records, id_to_duration)
    loaded += 1
    yield _sse("section", {"name": "weekly_watch_time", "data": weekly_watch_time, "loaded": loaded, "total": total_sections})

    # 9. Weekly Comparison
    weekly = _compute_weekly(records)
    loaded += 1
    yield _sse("section", {"name": "weekly", "data": weekly, "loaded": loaded, "total": total_sections})

    # 10. Dopamine
    dopamine = calc_dopamine(records, id_to_duration)
    loaded += 1
    yield _sse("section", {"name": "dopamine", "data": dopamine, "loaded": loaded, "total": total_sections})

    # 11. Day of Week
    day_of_week = _compute_day_of_week(records)
    loaded += 1
    yield _sse("section", {"name": "day_of_week", "data": day_of_week, "loaded": loaded, "total": total_sections})

    # 12. Viewer Type
    viewer_type = _compute_viewer_type(records, shorts, hourly)
    loaded += 1
    yield _sse("section", {"name": "viewer_type", "data": viewer_type, "loaded": loaded, "total": total_sections})

    # 13. Search Keywords
    keywords = _compute_search_keywords(search_records)
    loaded += 1
    yield _sse("section", {"name": "search_keywords", "data": keywords, "loaded": loaded, "total": total_sections})

    # 14. Insights (depends on all above)
    insights = generate_insights(summary, hourly, shorts, dopamine, watch_time, weekly)
    loaded += 1
    yield _sse("section", {"name": "insights", "data": insights, "loaded": loaded, "total": total_sections})

    yield _sse("done", {"loaded": total_sections, "total": total_sections})


@router.get("/dashboard")
def get_dashboard(
    date_from: str = Query(...),
    date_to: str = Query(...),
    user_id: str = Query(default=DEFAULT_USER_ID),
):
    return StreamingResponse(
        _dashboard_stream(user_id, date_from, date_to),
        media_type="text/event-stream",
    )
