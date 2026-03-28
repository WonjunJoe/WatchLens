"""Rule-based insight generation for Instagram data."""

from config.settings import LATE_NIGHT_HOURS


def generate_ig_insights(
    summary: dict,
    hourly: list[dict],
    top_accounts: list[dict],
    dm_analysis: dict,
) -> list[dict]:
    insights = []
    total_likes = summary.get("total_likes", 0)
    if total_likes == 0 and summary.get("total_messages", 0) == 0:
        return [{"icon": "📭", "text": "분석할 데이터가 없습니다."}]

    # 1. Story vs Post likes ratio
    post_likes = summary.get("post_likes", 0)
    story_likes = summary.get("story_likes", 0)
    if post_likes > 0 and story_likes > 0:
        if story_likes > post_likes:
            ratio = round(story_likes / post_likes, 1)
            insights.append({
                "icon": "📖",
                "text": f"스토리 좋아요가 게시물 좋아요보다 **{ratio}배** 많습니다 — 스토리 중심 소비 패턴이에요.",
            })
        else:
            ratio = round(post_likes / story_likes, 1)
            insights.append({
                "icon": "📷",
                "text": f"게시물 좋아요가 스토리 좋아요보다 **{ratio}배** 많습니다 — 피드 중심 소비 패턴이에요.",
            })

    # 2. Peak activity hour
    if hourly:
        peak = max(hourly, key=lambda h: h["count"])
        if peak["count"] > 0:
            insights.append({
                "icon": "⏰",
                "text": f"가장 활발한 시간대는 **{peak['hour']}시**입니다. ({peak['count']}건)",
            })

    # 3. Late night activity
    if hourly:
        total_activity = sum(h["count"] for h in hourly)
        late_count = sum(h["count"] for h in hourly if h["hour"] in LATE_NIGHT_HOURS)
        if total_activity > 0:
            late_pct = round(late_count / total_activity * 100)
            if late_pct >= 25:
                insights.append({
                    "icon": "🌙",
                    "text": f"심야 활동(22~04시)이 전체의 **{late_pct}%**를 차지합니다.",
                })

    # 4. Top account concentration
    if top_accounts and total_likes > 0:
        top3_total = sum(a["total"] for a in top_accounts[:3])
        all_total = sum(a["total"] for a in top_accounts)
        if all_total > 0:
            concentration = round(top3_total / all_total * 100)
            top_name = top_accounts[0]["username"]
            insights.append({
                "icon": "💬",
                "text": f"상위 3명과의 소통이 전체의 **{concentration}%**를 차지합니다. 1위: **@{top_name}**",
            })

    # 5. DM sent/received ratio
    sent = dm_analysis.get("sent", 0)
    received = dm_analysis.get("received", 0)
    total_msgs = sent + received
    if total_msgs > 10:
        sent_pct = round(sent / total_msgs * 100)
        if sent_pct >= 60:
            insights.append({
                "icon": "📤",
                "text": f"DM의 **{sent_pct}%**를 내가 먼저 보냈습니다 — 적극적인 대화 스타일이에요.",
            })
        elif sent_pct <= 40:
            insights.append({
                "icon": "📥",
                "text": f"DM의 **{100 - sent_pct}%**를 상대방이 먼저 보냈습니다 — 수신 위주 대화 패턴이에요.",
            })

    return insights[:7]
