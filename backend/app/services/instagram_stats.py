"""Instagram KPI computation functions.

All functions are pure: they take parsed data and return computed results.
No DB or I/O calls.
"""

from collections import Counter
from datetime import datetime, timezone, timedelta
from config.settings import USER_TZ_OFFSET_HOURS, LATE_NIGHT_HOURS

_TZ = timezone(timedelta(hours=USER_TZ_OFFSET_HOURS))

DAY_NAMES = ["월", "화", "수", "목", "금", "토", "일"]


def _ts_to_local(ts: int) -> datetime:
    return datetime.fromtimestamp(ts, tz=timezone.utc).astimezone(_TZ)


def compute_ig_summary(
    liked_posts: list[dict],
    story_likes: list[dict],
    messages: list[dict],
    following: list[dict],
    content_viewed: list[dict],
) -> dict:
    conversations = {m["conversation"] for m in messages}
    return {
        "total_likes": len(liked_posts) + len(story_likes),
        "post_likes": len(liked_posts),
        "story_likes": len(story_likes),
        "total_messages": len(messages),
        "total_conversations": len(conversations),
        "following_count": len(following),
        "content_viewed": len(content_viewed),
    }


def compute_ig_hourly(
    liked_posts: list[dict],
    story_likes: list[dict],
    messages: list[dict],
) -> list[dict]:
    hour_counts = Counter()
    for item in liked_posts + story_likes:
        hour_counts[_ts_to_local(item["timestamp"]).hour] += 1
    for msg in messages:
        hour_counts[_ts_to_local(msg["timestamp"]).hour] += 1
    return [{"hour": h, "count": hour_counts.get(h, 0)} for h in range(24)]


def compute_ig_daily(
    liked_posts: list[dict],
    story_likes: list[dict],
    messages: list[dict],
) -> list[dict]:
    day_counts = Counter()
    for item in liked_posts + story_likes:
        day_counts[_ts_to_local(item["timestamp"]).strftime("%Y-%m-%d")] += 1
    for msg in messages:
        day_counts[_ts_to_local(msg["timestamp"]).strftime("%Y-%m-%d")] += 1
    return sorted(
        [{"date": d, "count": c} for d, c in day_counts.items()],
        key=lambda x: x["date"],
    )


def compute_ig_day_of_week(
    liked_posts: list[dict],
    story_likes: list[dict],
    messages: list[dict],
) -> list[dict]:
    day_date_counts: dict[int, Counter] = {i: Counter() for i in range(7)}

    for item in liked_posts + story_likes:
        local = _ts_to_local(item["timestamp"])
        day_date_counts[local.weekday()][local.strftime("%Y-%m-%d")] += 1
    for msg in messages:
        local = _ts_to_local(msg["timestamp"])
        day_date_counts[local.weekday()][local.strftime("%Y-%m-%d")] += 1

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


def compute_ig_top_accounts(
    liked_posts: list[dict],
    story_likes: list[dict],
    messages: list[dict],
    my_username: str,
) -> list[dict]:
    """Rank accounts by total interactions (likes + story likes + DM messages)."""
    account_likes: Counter = Counter()
    account_story: Counter = Counter()
    account_msgs: Counter = Counter()

    for item in liked_posts:
        account_likes[item["username"]] += 1
    for item in story_likes:
        account_story[item["username"]] += 1
    for msg in messages:
        sender = msg["sender"]
        if sender != my_username:
            account_msgs[sender] += 1

    all_accounts = set(account_likes) | set(account_story) | set(account_msgs)
    ranked = []
    for acct in all_accounts:
        likes = account_likes.get(acct, 0)
        story = account_story.get(acct, 0)
        msgs = account_msgs.get(acct, 0)
        ranked.append({
            "username": acct,
            "likes": likes,
            "story_likes": story,
            "messages": msgs,
            "total": likes + story + msgs,
        })

    ranked.sort(key=lambda x: -x["total"])
    return ranked[:10]


def compute_ig_dm_analysis(messages: list[dict], my_username: str) -> dict:
    """Analyze DM patterns: sent/received ratio, top conversations."""
    sent = sum(1 for m in messages if m["sender"] == my_username)
    received = len(messages) - sent

    conv_counts = Counter(m["conversation"] for m in messages)
    top = [{"conversation": c, "count": n} for c, n in conv_counts.most_common(10)]

    return {"sent": sent, "received": received, "top_conversations": top}


def compute_ig_follow_network(
    following: list[dict],
    unfollowed: list[dict],
) -> dict:
    """Monthly cumulative following growth + recent unfollows."""
    month_counts: Counter = Counter()
    for f in following:
        if f["timestamp"] > 0:
            month_key = _ts_to_local(f["timestamp"]).strftime("%Y-%m")
            month_counts[month_key] += 1

    sorted_months = sorted(month_counts.keys())
    cumulative = 0
    monthly_growth = []
    for month in sorted_months:
        cumulative += month_counts[month]
        monthly_growth.append({
            "month": month,
            "new": month_counts[month],
            "cumulative": cumulative,
        })

    recent_unf = [{"username": u["username"], "timestamp": u["timestamp"]} for u in unfollowed]

    return {"monthly_growth": monthly_growth, "recent_unfollowed": recent_unf}
