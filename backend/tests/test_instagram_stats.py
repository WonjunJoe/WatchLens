from app.services.instagram_stats import (
    compute_ig_summary,
    compute_ig_hourly,
    compute_ig_daily,
    compute_ig_day_of_week,
    compute_ig_top_accounts,
    compute_ig_dm_analysis,
    compute_ig_follow_network,
)


def _make_like(username: str, ts: int) -> dict:
    return {"username": username, "timestamp": ts}


def _make_msg(sender: str, ts: int, conv: str = "conv1") -> dict:
    return {"sender": sender, "timestamp": ts, "conversation": conv}


def _make_follow(username: str, ts: int) -> dict:
    return {"username": username, "timestamp": ts}


def test_summary_basic():
    liked = [_make_like("a", 1700000000), _make_like("b", 1700100000)]
    story = [_make_like("a", 1700050000)]
    msgs = [_make_msg("me", 1700000000), _make_msg("friend", 1700001000)]
    following = [_make_follow("x", 1700000000)]
    viewed = [{"username": "z", "timestamp": 1700000000}]

    result = compute_ig_summary(liked, story, msgs, following, viewed)
    assert result["total_likes"] == 3
    assert result["post_likes"] == 2
    assert result["story_likes"] == 1
    assert result["total_messages"] == 2
    assert result["total_conversations"] == 1
    assert result["following_count"] == 1
    assert result["content_viewed"] == 1


def test_summary_empty():
    result = compute_ig_summary([], [], [], [], [])
    assert result["total_likes"] == 0
    assert result["total_messages"] == 0


def test_hourly_distribution():
    liked = [_make_like("a", 1700028000)]
    story = []
    msgs = [_make_msg("b", 1700028000)]
    result = compute_ig_hourly(liked, story, msgs)
    assert len(result) == 24
    hour_15 = next(h for h in result if h["hour"] == 15)
    assert hour_15["count"] == 2


def test_top_accounts():
    liked = [_make_like("alice", 100), _make_like("alice", 200), _make_like("bob", 300)]
    story = [_make_like("alice", 150)]
    msgs = [_make_msg("alice", 100, "c1"), _make_msg("bob", 200, "c2"), _make_msg("bob", 300, "c2")]
    result = compute_ig_top_accounts(liked, story, msgs, "me")
    assert result[0]["username"] == "alice"
    assert result[0]["likes"] == 2
    assert result[0]["story_likes"] == 1
    assert result[0]["messages"] == 1


def test_dm_analysis():
    msgs = [
        _make_msg("me", 100, "conv1"),
        _make_msg("me", 200, "conv1"),
        _make_msg("friend", 300, "conv1"),
        _make_msg("other", 400, "conv2"),
    ]
    result = compute_ig_dm_analysis(msgs, "me")
    assert result["sent"] == 2
    assert result["received"] == 2
    assert result["top_conversations"][0]["conversation"] == "conv1"
    assert result["top_conversations"][0]["count"] == 3


def test_follow_network():
    following = [
        _make_follow("a", 1672531200),
        _make_follow("b", 1675209600),
        _make_follow("c", 1675209600),
    ]
    unfollowed = [_make_follow("z", 1675209600)]
    result = compute_ig_follow_network(following, unfollowed)
    assert len(result["monthly_growth"]) == 2
    assert result["monthly_growth"][0]["cumulative"] == 1
    assert result["monthly_growth"][1]["cumulative"] == 3
    assert len(result["recent_unfollowed"]) == 1
