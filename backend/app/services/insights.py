"""
Rule-based insight generation.

Analyzes computed stats and produces 3–5 natural language insight sentences.
No LLM needed — pure conditional logic.
"""

from config.settings import LATE_NIGHT_HOURS


def generate_insights(
    summary: dict,
    hourly: list[dict],
    shorts: dict,
    dopamine: dict,
    watch_time: dict,
    weekly: list[dict],
) -> list[dict]:
    """Return a list of {icon, text} insight items."""
    insights = []
    total = summary.get("total_watched", 0)
    if total == 0:
        return [{"icon": "📭", "text": "분석할 데이터가 없습니다."}]

    # 1. Watch time summary (most important — show first)
    total_min = watch_time.get("total_min_hours", 0)
    total_max = watch_time.get("total_max_hours", 0)
    daily_min = watch_time.get("daily_min_hours", 0)
    daily_max = watch_time.get("daily_max_hours", 0)
    if total_max > 0:
        insights.append({
            "icon": "⏱️",
            "text": f"총 **{total_min}~{total_max}시간** 시청했으며, 하루 평균 **{daily_min}~{daily_max}시간**을 YouTube에 사용했습니다.",
        })

    # 2. Peak viewing hour
    if hourly:
        peak = max(hourly, key=lambda h: h["count"])
        insights.append({
            "icon": "⏰",
            "text": f"가장 많이 시청한 시간대는 **{peak['hour']}시**입니다. ({peak['count']}건)",
        })

    # 3. Late night ratio
    if hourly:
        late_count = sum(h["count"] for h in hourly if h["hour"] in LATE_NIGHT_HOURS)
        late_pct = round(late_count / total * 100)
        if late_pct >= 30:
            insights.append({
                "icon": "🌙",
                "text": f"심야 시청(22~04시)이 전체의 **{late_pct}%**를 차지합니다. 수면에 영향을 줄 수 있어요.",
            })

    # 4. Shorts addiction level
    shorts_ratio = shorts.get("shorts_ratio", 0)
    if shorts_ratio >= 0.5:
        insights.append({
            "icon": "⚡",
            "text": f"시청의 **{round(shorts_ratio * 100)}%**가 Shorts입니다. 짧은 콘텐츠 위주로 소비하고 있어요.",
        })
    elif shorts_ratio <= 0.1:
        insights.append({
            "icon": "🎬",
            "text": f"Shorts 비율이 **{round(shorts_ratio * 100)}%**로 낮습니다. 롱폼 콘텐츠 위주로 시청해요.",
        })

    # 5. Dopamine score comment
    dopamine_score = dopamine.get("score", 0)
    if dopamine_score >= 70:
        insights.append({
            "icon": "🧠",
            "text": f"도파민 지수가 **{dopamine_score}점**(높음)입니다. Shorts·심야 비중이 높아요.",
        })
    elif dopamine_score <= 30:
        insights.append({
            "icon": "🧘",
            "text": f"도파민 지수가 **{dopamine_score}점**(낮음)입니다. 비교적 절제된 시청 패턴이에요.",
        })

    # 6. Weekly trend (if we have at least 2 weeks)
    if len(weekly) >= 2:
        last = weekly[-1]
        prev = weekly[-2]
        if prev["total"] > 0:
            change = round((last["total"] - prev["total"]) / prev["total"] * 100)
            direction = "증가" if change > 0 else "감소"
            if abs(change) >= 20:
                insights.append({
                    "icon": "📈" if change > 0 else "📉",
                    "text": f"최근 주({last['week_label']})는 이전 주 대비 시청이 **{abs(change)}% {direction}**했습니다.",
                })

    return insights[:7]  # Cap at 7 insights
