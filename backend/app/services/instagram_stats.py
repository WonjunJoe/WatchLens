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


def compute_ig_engagement_balance(
    liked_posts: list[dict],
    story_likes: list[dict],
    messages: list[dict],
    my_username: str,
) -> list[dict]:
    """Per-account balance: what I gave (likes, story likes, sent DMs) vs received (DMs from them)."""
    given: Counter = Counter()
    received: Counter = Counter()

    for item in liked_posts:
        given[item["username"]] += 1
    for item in story_likes:
        given[item["username"]] += 1
    for msg in messages:
        sender = msg["sender"]
        # Extract other person from conversation
        if sender == my_username:
            # I sent → count as "given" to conversation partner
            # conversation name is typically the other person
            conv = msg["conversation"]
            given[conv] += 1
        else:
            received[sender] += 1

    all_accounts = set(given) | set(received)
    results = []
    for acct in all_accounts:
        g = given.get(acct, 0)
        r = received.get(acct, 0)
        total = g + r
        if total < 3:
            continue
        ratio = round(g / r, 2) if r > 0 else float("inf")
        results.append({
            "username": acct,
            "given": g,
            "received": r,
            "total": total,
            "ratio": ratio if ratio != float("inf") else 999,
            "balance": "일방적 관심" if (r == 0 or ratio >= 3) else ("균형" if 0.5 <= ratio <= 2 else "수신 위주"),
        })

    results.sort(key=lambda x: -x["total"])
    return results[:15]


def compute_ig_dm_balance(messages: list[dict], my_username: str) -> list[dict]:
    """Per-conversation DM balance: sent vs received ratio."""
    conv_sent: Counter = Counter()
    conv_received: Counter = Counter()

    for msg in messages:
        conv = msg["conversation"]
        if msg["sender"] == my_username:
            conv_sent[conv] += 1
        else:
            conv_received[conv] += 1

    all_convs = set(conv_sent) | set(conv_received)
    results = []
    for conv in all_convs:
        s = conv_sent.get(conv, 0)
        r = conv_received.get(conv, 0)
        total = s + r
        if total < 5:
            continue
        sent_pct = round(s / total * 100)
        results.append({
            "conversation": conv,
            "sent": s,
            "received": r,
            "total": total,
            "sent_pct": sent_pct,
        })

    results.sort(key=lambda x: -x["total"])
    return results[:10]


def compute_ig_following_cleanup(
    following: list[dict],
    liked_posts: list[dict],
    story_likes: list[dict],
    messages: list[dict],
    my_username: str,
) -> dict:
    """Find followed accounts with zero or minimal interaction."""
    following_set = {f["username"] for f in following}

    interacted: Counter = Counter()
    for item in liked_posts:
        if item["username"] in following_set:
            interacted[item["username"]] += 1
    for item in story_likes:
        if item["username"] in following_set:
            interacted[item["username"]] += 1
    for msg in messages:
        sender = msg["sender"]
        if sender != my_username and sender in following_set:
            interacted[sender] += 1

    no_interaction = sorted(following_set - set(interacted))
    low_interaction = [
        {"username": u, "count": c}
        for u, c in interacted.most_common()
        if c <= 2
    ]
    low_interaction.sort(key=lambda x: x["count"])

    return {
        "total_following": len(following_set),
        "no_interaction_count": len(no_interaction),
        "no_interaction_pct": round(len(no_interaction) / len(following_set) * 100, 1) if following_set else 0,
        "no_interaction_sample": no_interaction[:20],
        "low_interaction": low_interaction[:10],
    }


def compute_ig_lurker_index(
    liked_posts: list[dict],
    story_likes: list[dict],
    messages: list[dict],
    content_viewed: list[dict],
) -> dict:
    """Ratio of passive viewing vs active engagement."""
    total_viewed = len(content_viewed)
    total_engagement = len(liked_posts) + len(story_likes) + len(messages)

    engagement_rate = round(total_engagement / total_viewed * 100, 1) if total_viewed > 0 else 0

    # Monthly trend
    month_viewed: Counter = Counter()
    month_engaged: Counter = Counter()

    for item in content_viewed:
        m = _ts_to_local(item["timestamp"]).strftime("%Y-%m")
        month_viewed[m] += 1
    for item in liked_posts + story_likes:
        m = _ts_to_local(item["timestamp"]).strftime("%Y-%m")
        month_engaged[m] += 1
    for msg in messages:
        m = _ts_to_local(msg["timestamp"]).strftime("%Y-%m")
        month_engaged[m] += 1

    months = sorted(set(month_viewed) | set(month_engaged))
    trend = []
    for m in months:
        v = month_viewed.get(m, 0)
        e = month_engaged.get(m, 0)
        rate = round(e / v * 100, 1) if v > 0 else 0
        trend.append({"month": m, "viewed": v, "engaged": e, "rate": rate})

    lurker_score = max(0, min(100, 100 - round(engagement_rate * 10)))

    return {
        "total_viewed": total_viewed,
        "total_engagement": total_engagement,
        "engagement_rate": engagement_rate,
        "lurker_score": lurker_score,
        "trend": trend,
    }


def compute_ig_video_trend(
    posts_viewed: list[dict],
    videos_watched: list[dict],
) -> dict:
    """Monthly trend of video (Reels) vs post consumption."""
    month_posts: Counter = Counter()
    month_videos: Counter = Counter()

    for item in posts_viewed:
        m = _ts_to_local(item["timestamp"]).strftime("%Y-%m")
        month_posts[m] += 1
    for item in videos_watched:
        m = _ts_to_local(item["timestamp"]).strftime("%Y-%m")
        month_videos[m] += 1

    months = sorted(set(month_posts) | set(month_videos))
    trend = []
    for m in months:
        p = month_posts.get(m, 0)
        v = month_videos.get(m, 0)
        total = p + v
        video_pct = round(v / total * 100, 1) if total > 0 else 0
        trend.append({"month": m, "posts": p, "videos": v, "video_pct": video_pct})

    first_pct = trend[0]["video_pct"] if trend else 0
    last_pct = trend[-1]["video_pct"] if trend else 0

    return {
        "trend": trend,
        "total_posts": sum(month_posts.values()),
        "total_videos": sum(month_videos.values()),
        "first_video_pct": first_pct,
        "last_video_pct": last_pct,
        "change_pct": round(last_pct - first_pct, 1),
    }
