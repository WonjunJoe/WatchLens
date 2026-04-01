"""Pure computation functions for YouTube stats.

No DB calls, no I/O — all functions take plain Python data structures and
return plain Python data structures.
"""

import math
from collections import Counter
from datetime import datetime

from app.utils import to_local
from config.settings import (
    AVG_RETENTION_SHORTS,
    AVG_RETENTION_LONGFORM,
    LATE_NIGHT_HOURS,
    BINGE_GAP_MINUTES,
    BINGE_MIN_COUNT,
)

DAY_NAMES = ["월", "화", "수", "목", "금", "토", "일"]

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


def _get_week_key(dt: datetime) -> str:
    iso = dt.isocalendar()
    return f"{iso.year}-W{iso.week:02d}"


def compute_summary(records: list[dict]) -> dict:
    if not records:
        return {"total_watched": 0, "total_channels": 0, "period": "", "daily_average": 0, "shorts_count": 0}
    channels = {r["channel_name"] for r in records if r["channel_name"]}
    local_dates = sorted({to_local(r["watched_at"]).strftime("%Y-%m-%d") for r in records})
    period = f"{local_dates[0]} ~ {local_dates[-1]}" if local_dates else ""
    num_days = len(local_dates) or 1
    shorts_count = sum(1 for r in records if r["is_shorts"])
    return {
        "total_watched": len(records),
        "total_channels": len(channels),
        "period": period,
        "daily_average": round(len(records) / num_days, 1),
        "shorts_count": shorts_count,
    }


def compute_hourly(records: list[dict]) -> list[dict]:
    hour_counts = Counter()
    for r in records:
        hour_counts[to_local(r["watched_at"]).hour] += 1
    return [{"hour": h, "count": hour_counts.get(h, 0)} for h in range(24)]


def compute_daily(records: list[dict]) -> list[dict]:
    day_counts = Counter(to_local(r["watched_at"]).strftime("%Y-%m-%d") for r in records)
    return sorted(
        [{"date": d, "count": c} for d, c in day_counts.items()],
        key=lambda x: x["date"],
    )


def compute_top_channels(
    records: list[dict],
    id_to_duration: dict[str, int] | None = None,
) -> dict:
    from datetime import datetime, timedelta, timezone

    longform_counts: Counter[str] = Counter()
    shorts_counts: Counter[str] = Counter()
    # Watch-time accumulator (seconds per channel, longform only)
    channel_time: Counter[str] = Counter()
    # Recent 30 days
    now_utc = datetime.now(timezone.utc)
    cutoff = now_utc - timedelta(days=30)
    recent_longform: Counter[str] = Counter()
    recent_shorts: Counter[str] = Counter()

    for r in records:
        name = r["channel_name"]
        if not name:
            continue
        if r["is_shorts"]:
            shorts_counts[name] += 1
        else:
            longform_counts[name] += 1
            # Accumulate watch time
            if id_to_duration and r.get("video_id"):
                dur = id_to_duration.get(r["video_id"], 0)
                channel_time[name] += dur

        # Recent 30 days
        watched_at = r.get("watched_at", "")
        try:
            ts = datetime.fromisoformat(watched_at.replace("Z", "+00:00"))
            if ts >= cutoff:
                if r["is_shorts"]:
                    recent_shorts[name] += 1
                else:
                    recent_longform[name] += 1
        except (ValueError, AttributeError):
            pass

    def to_count_list(counter: Counter) -> list[dict]:
        return [{"channel_name": ch, "count": c} for ch, c in counter.most_common(10)]

    def to_time_list(counter: Counter) -> list[dict]:
        return [
            {"channel_name": ch, "hours": round(s / 3600, 1), "count": longform_counts[ch]}
            for ch, s in counter.most_common(10) if s > 0
        ]

    return {
        "longform": to_count_list(longform_counts),
        "shorts": to_count_list(shorts_counts),
        "by_time": to_time_list(channel_time),
        "recent": {
            "longform": to_count_list(recent_longform),
            "shorts": to_count_list(recent_shorts),
        },
    }


def compute_shorts(records: list[dict]) -> dict:
    shorts = sum(1 for r in records if r["is_shorts"])
    regular = len(records) - shorts
    ratio = round(shorts / len(records), 2) if records else 0

    day_shorts: Counter[str] = Counter()
    day_total: Counter[str] = Counter()
    for r in records:
        date = to_local(r["watched_at"]).strftime("%Y-%m-%d")
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


def compute_categories(records: list[dict], id_to_category: dict[str, str]) -> dict:
    shorts_counts: Counter[str] = Counter()
    longform_counts: Counter[str] = Counter()
    for r in records:
        vid = r["video_id"]
        if not vid:
            continue
        cat = id_to_category.get(vid, "미분류")
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


def compute_watch_time(records: list[dict], id_to_duration: dict[str, int]) -> dict:
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

        if idx < len(sorted_records) - 1:
            current_dt = to_local(rec["watched_at"])
            next_dt = to_local(sorted_records[idx + 1]["watched_at"])
            gap_seconds = (next_dt - current_dt).total_seconds()
            if 0 < gap_seconds < duration:
                total_min_seconds += gap_seconds
                total_max_seconds += gap_seconds
                gap_based_count += 1
                continue

        retention = AVG_RETENTION_SHORTS if rec["is_shorts"] else AVG_RETENTION_LONGFORM
        total_min_seconds += duration * retention
        total_max_seconds += duration
        estimated_count += 1

    active_days = len({to_local(r["watched_at"]).strftime("%Y-%m-%d") for r in records}) or 1

    return {
        "total_min_hours": round(total_min_seconds / 3600, 1),
        "total_max_hours": round(total_max_seconds / 3600, 1),
        "daily_min_hours": round(total_min_seconds / 3600 / active_days, 1),
        "daily_max_hours": round(total_max_seconds / 3600 / active_days, 1),
        "gap_based_count": gap_based_count,
        "estimated_count": estimated_count,
    }


def compute_search_keywords(search_records: list[dict]) -> list[dict]:
    query_counts = Counter(r["query"] for r in search_records)
    return sorted(
        [{"keyword": q, "count": c} for q, c in query_counts.most_common(30)],
        key=lambda x: -x["count"],
    )


def compute_weekly_watch_time(records: list[dict], id_to_duration: dict[str, int]) -> list[dict]:
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

        local = to_local(rec["watched_at"])
        week_key = _get_week_key(local)
        week_dates.setdefault(week_key, set()).add(local.strftime("%Y-%m-%d"))

        if idx < len(sorted_records) - 1:
            current_dt = local
            next_dt = to_local(sorted_records[idx + 1]["watched_at"])
            gap = (next_dt - current_dt).total_seconds()
            if 0 < gap < duration:
                week_min[week_key] += gap
                week_max[week_key] += gap
                continue

        retention = AVG_RETENTION_SHORTS if rec["is_shorts"] else AVG_RETENTION_LONGFORM
        week_min[week_key] += duration * retention
        week_max[week_key] += duration

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


def compute_weekly(records: list[dict]) -> list[dict]:
    if not records:
        return []

    week_data: dict[str, dict] = {}
    for r in records:
        local = to_local(r["watched_at"])
        week_key = _get_week_key(local)
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


def compute_day_of_week(records: list[dict]) -> list[dict]:
    day_counts: dict[int, Counter] = {i: Counter() for i in range(7)}

    for r in records:
        local = to_local(r["watched_at"])
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


def compute_viewer_type(records: list[dict], shorts_data: dict, hourly: list[dict]) -> dict:
    total = len(records)
    if total == 0:
        return {"code": "----", "type_name": "데이터 없음", "description": "", "axes": []}

    # Axis 1: Time — Nocturnal(N) vs Diurnal(D)
    late_count = sum(1 for r in records if to_local(r["watched_at"]).hour in LATE_NIGHT_HOURS)
    late_ratio = late_count / total
    is_nocturnal = late_ratio >= 0.3

    # Axis 2: Content — Shorts(S) vs Longform(L)
    shorts_ratio = shorts_data.get("shorts_ratio", 0)
    is_shorts = shorts_ratio >= 0.5

    # Axis 3: Pattern — Burst(B) vs Consistent(C)
    day_counts = Counter(to_local(r["watched_at"]).strftime("%Y-%m-%d") for r in records)
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

    type_name, description = TYPE_NAMES.get(code, ("유니크 시청자", "독특한 시청 패턴을 가진 나만의 스타일."))

    return {
        "code": code,
        "type_name": type_name,
        "description": description,
        "axes": axes,
    }


def compute_content_diversity(records: list[dict], id_to_category: dict[str, str]) -> dict:
    """Shannon entropy on category distribution → 0-100 diversity score."""
    cat_counts: Counter[str] = Counter()
    for r in records:
        vid = r["video_id"]
        if not vid:
            continue
        cat = id_to_category.get(vid, "미분류")
        if cat == "Unknown":
            cat = "미분류"
        cat_counts[cat] += 1

    total = sum(cat_counts.values())
    if total == 0:
        return {"score": 0, "category_count": 0, "top_categories": [], "monthly_trend": []}

    # Shannon entropy
    entropy = 0.0
    for count in cat_counts.values():
        p = count / total
        if p > 0:
            entropy -= p * math.log2(p)

    num_cats = len(cat_counts)
    max_entropy = math.log2(num_cats) if num_cats > 1 else 1.0
    score = round((entropy / max_entropy) * 100) if max_entropy > 0 else 0

    top_categories = [
        {"category": cat, "count": c, "pct": round(c / total * 100, 1)}
        for cat, c in cat_counts.most_common(5)
    ]

    # Monthly trend
    month_cats: dict[str, Counter] = {}
    for r in records:
        vid = r["video_id"]
        if not vid:
            continue
        cat = id_to_category.get(vid, "미분류")
        if cat == "Unknown":
            cat = "미분류"
        month = to_local(r["watched_at"]).strftime("%Y-%m")
        month_cats.setdefault(month, Counter())[cat] += 1

    monthly_trend = []
    for month in sorted(month_cats.keys()):
        counts = month_cats[month]
        t = sum(counts.values())
        e = 0.0
        for c in counts.values():
            p = c / t
            if p > 0:
                e -= p * math.log2(p)
        nc = len(counts)
        me = math.log2(nc) if nc > 1 else 1.0
        s = round((e / me) * 100) if me > 0 else 0
        monthly_trend.append({"month": month, "score": s})

    return {
        "score": score,
        "category_count": num_cats,
        "top_categories": top_categories,
        "monthly_trend": monthly_trend,
    }


def compute_attention_trend(records: list[dict], id_to_duration: dict[str, int]) -> dict:
    """Monthly average video duration + Shorts ratio trend."""
    month_durations: dict[str, list[int]] = {}
    month_shorts: dict[str, dict] = {}

    for r in records:
        month = to_local(r["watched_at"]).strftime("%Y-%m")
        month_shorts.setdefault(month, {"total": 0, "shorts": 0})
        month_shorts[month]["total"] += 1
        if r["is_shorts"]:
            month_shorts[month]["shorts"] += 1

        vid = r["video_id"]
        dur = id_to_duration.get(vid, 0) if vid else 0
        if dur > 0:
            month_durations.setdefault(month, []).append(dur)

    months = sorted(set(list(month_durations.keys()) + list(month_shorts.keys())))
    trend = []
    for m in months:
        durs = month_durations.get(m, [])
        avg_dur_min = round(sum(durs) / len(durs) / 60, 1) if durs else 0
        ms = month_shorts.get(m, {"total": 0, "shorts": 0})
        shorts_pct = round(ms["shorts"] / ms["total"] * 100, 1) if ms["total"] > 0 else 0
        trend.append({"month": m, "avg_duration_min": avg_dur_min, "shorts_pct": shorts_pct})

    # Overall change
    first_dur = trend[0]["avg_duration_min"] if trend else 0
    last_dur = trend[-1]["avg_duration_min"] if trend else 0
    change_pct = round((last_dur - first_dur) / first_dur * 100) if first_dur > 0 else 0

    return {
        "trend": trend,
        "overall_change_pct": change_pct,
        "first_avg_min": first_dur,
        "last_avg_min": last_dur,
    }


def compute_time_cost(watch_time_data: dict) -> dict:
    """Convert total watch hours into relatable equivalents."""
    total_hours = watch_time_data.get("total_max_hours", 0)

    return {
        "total_hours": total_hours,
        "equivalents": [
            {"label": "책 읽기", "value": round(total_hours / 5, 1), "unit": "권", "desc": "평균 5시간/권"},
            {"label": "영화 감상", "value": round(total_hours / 2, 1), "unit": "편", "desc": "평균 2시간/편"},
            {"label": "언어 학습", "value": round(total_hours / 600 * 100, 1), "unit": "%", "desc": "FSI 기준 600시간"},
            {"label": "마라톤 훈련", "value": round(total_hours / 200, 1), "unit": "회 완주", "desc": "초보 기준 200시간"},
            {"label": "수면", "value": round(total_hours / 8, 1), "unit": "일", "desc": "8시간/일 기준"},
        ],
    }


def compute_search_watch_flow(search_records: list[dict], watch_records: list[dict]) -> dict:
    """Analyze search-to-watch conversion: which searches led to watching videos."""
    if not search_records or not watch_records:
        return {"total_searches": len(search_records), "total_watches": len(watch_records),
                "conversion_rate": 0, "top_converting": [], "top_abandoned": []}

    # Build watch timeline: for each search, check if a video was watched within 10 minutes
    watch_times = sorted(
        [(to_local(r["watched_at"]), r.get("channel_name", "")) for r in watch_records],
        key=lambda x: x[0],
    )

    search_conversions: Counter = Counter()
    search_totals: Counter = Counter()

    for sr in search_records:
        query = sr["query"]
        search_time = to_local(sr["searched_at"])
        search_totals[query] += 1

        # Check if any watch happened within 10 minutes after search
        for watch_time, _ in watch_times:
            diff = (watch_time - search_time).total_seconds()
            if diff < 0:
                continue
            if diff <= 600:  # 10 minutes
                search_conversions[query] += 1
                break
            if diff > 600:
                break

    total_converted = sum(search_conversions.values())
    conversion_rate = round(total_converted / len(search_records) * 100, 1) if search_records else 0

    # Top converting: searches that most often lead to watching
    top_converting = []
    for query, total in search_totals.most_common(30):
        converted = search_conversions.get(query, 0)
        if converted == 0:
            continue
        top_converting.append({
            "query": query,
            "searches": total,
            "converted": converted,
            "rate": round(converted / total * 100),
        })
    top_converting.sort(key=lambda x: -x["converted"])
    top_converting = top_converting[:10]

    # Top abandoned: frequently searched but rarely watched
    top_abandoned = []
    for query, total in search_totals.most_common(30):
        converted = search_conversions.get(query, 0)
        abandon_rate = round((1 - converted / total) * 100) if total > 0 else 100
        if total >= 2 and abandon_rate >= 50:
            top_abandoned.append({
                "query": query,
                "searches": total,
                "converted": converted,
                "abandon_rate": abandon_rate,
            })
    top_abandoned.sort(key=lambda x: (-x["abandon_rate"], -x["searches"]))
    top_abandoned = top_abandoned[:10]

    return {
        "total_searches": len(search_records),
        "total_watches": len(watch_records),
        "conversion_rate": conversion_rate,
        "top_converting": top_converting,
        "top_abandoned": top_abandoned,
    }


def compute_binge_sessions(records: list[dict]) -> dict:
    """Detect binge sessions: consecutive watches within BINGE_GAP_MINUTES gap."""
    if not records:
        return {"total_sessions": 0, "binge_sessions": 0, "binge_ratio": 0, "total_binge_videos": 0, "longest_binge": 0, "top_binge_channels": []}

    sorted_recs = sorted(records, key=lambda r: r["watched_at"])
    gap_seconds = BINGE_GAP_MINUTES * 60

    # Build sessions
    sessions: list[list[dict]] = []
    current_session: list[dict] = [sorted_recs[0]]

    for i in range(1, len(sorted_recs)):
        prev_dt = to_local(sorted_recs[i - 1]["watched_at"])
        curr_dt = to_local(sorted_recs[i]["watched_at"])
        diff = (curr_dt - prev_dt).total_seconds()

        if 0 <= diff <= gap_seconds:
            current_session.append(sorted_recs[i])
        else:
            sessions.append(current_session)
            current_session = [sorted_recs[i]]
    sessions.append(current_session)

    # Binge = sessions with BINGE_MIN_COUNT+ consecutive videos
    binge_sessions = [s for s in sessions if len(s) >= BINGE_MIN_COUNT]
    binge_channel_counts: Counter[str] = Counter()
    total_binge_videos = 0
    longest_binge = 0

    for session in binge_sessions:
        longest_binge = max(longest_binge, len(session))
        total_binge_videos += len(session)
        for r in session:
            ch = r.get("channel_name", "")
            if ch:
                binge_channel_counts[ch] += 1

    top_binge_channels = [
        {"channel": ch, "count": c}
        for ch, c in binge_channel_counts.most_common(5)
    ]

    return {
        "total_sessions": len(sessions),
        "binge_sessions": len(binge_sessions),
        "binge_ratio": round(len(binge_sessions) / len(sessions) * 100, 1) if sessions else 0,
        "total_binge_videos": total_binge_videos,
        "longest_binge": longest_binge,
        "top_binge_channels": top_binge_channels,
    }
