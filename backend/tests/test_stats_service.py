"""Tests for stats_service pure computation functions."""

import pytest
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


def _make_record(watched_at="2024-06-15T12:00:00Z", is_shorts=False, video_id="v1", channel="ch1"):
    return {
        "video_id": video_id,
        "video_title": "test",
        "channel_name": channel,
        "watched_at": watched_at,
        "is_shorts": is_shorts,
    }


# ---------------------------------------------------------------------------
# compute_summary
# ---------------------------------------------------------------------------

def test_compute_summary_basic():
    records = [
        _make_record(watched_at="2024-06-15T12:00:00Z", is_shorts=True, channel="ch1"),
        _make_record(watched_at="2024-06-15T13:00:00Z", is_shorts=False, channel="ch2"),
    ]
    result = compute_summary(records)
    assert result["total_watched"] == 2
    assert result["shorts_count"] == 1
    assert result["total_channels"] == 2
    assert result["daily_average"] > 0
    assert result["period"] != ""


def test_compute_summary_empty():
    result = compute_summary([])
    assert result["total_watched"] == 0
    assert result["shorts_count"] == 0
    assert result["total_channels"] == 0
    assert result["period"] == ""


# ---------------------------------------------------------------------------
# compute_hourly
# ---------------------------------------------------------------------------

def test_compute_hourly_24_slots():
    # "2024-06-15T03:00:00Z" => 12:00 KST (UTC+9)
    records = [_make_record(watched_at="2024-06-15T03:00:00Z")]
    result = compute_hourly(records)
    assert len(result) == 24
    hour_12 = next(r for r in result if r["hour"] == 12)
    assert hour_12["count"] == 1
    # All other hours should be 0
    for r in result:
        if r["hour"] != 12:
            assert r["count"] == 0


# ---------------------------------------------------------------------------
# compute_daily
# ---------------------------------------------------------------------------

def test_compute_daily_sorted():
    records = [
        _make_record(watched_at="2024-06-17T00:00:00Z"),  # 2024-06-17 09:00 KST
        _make_record(watched_at="2024-06-15T00:00:00Z"),  # 2024-06-15 09:00 KST
        _make_record(watched_at="2024-06-16T00:00:00Z"),  # 2024-06-16 09:00 KST
    ]
    result = compute_daily(records)
    dates = [r["date"] for r in result]
    assert dates == sorted(dates)
    assert len(result) == 3


# ---------------------------------------------------------------------------
# compute_top_channels
# ---------------------------------------------------------------------------

def test_compute_top_channels_split():
    records = [
        _make_record(is_shorts=False, channel="longform_ch"),
        _make_record(is_shorts=False, channel="longform_ch"),
        _make_record(is_shorts=True, channel="shorts_ch"),
    ]
    result = compute_top_channels(records)
    assert "longform" in result
    assert "shorts" in result
    longform_names = [r["channel_name"] for r in result["longform"]]
    shorts_names = [r["channel_name"] for r in result["shorts"]]
    assert "longform_ch" in longform_names
    assert "shorts_ch" in shorts_names
    assert "shorts_ch" not in longform_names
    assert "longform_ch" not in shorts_names


# ---------------------------------------------------------------------------
# compute_shorts
# ---------------------------------------------------------------------------

def test_compute_shorts_ratio():
    # 3 shorts + 7 longform = ratio 0.3
    records = (
        [_make_record(is_shorts=True)] * 3
        + [_make_record(is_shorts=False)] * 7
    )
    result = compute_shorts(records)
    assert result["shorts_count"] == 3
    assert result["regular_count"] == 7
    assert result["shorts_ratio"] == 0.3


# ---------------------------------------------------------------------------
# compute_categories
# ---------------------------------------------------------------------------

def test_compute_categories_maps_correctly():
    records = [
        _make_record(video_id="v1", is_shorts=False),
        _make_record(video_id="v2", is_shorts=True),
        _make_record(video_id="v3", is_shorts=False),  # no category -> 미분류
    ]
    id_to_category = {"v1": "Gaming", "v2": "Music"}
    result = compute_categories(records, id_to_category)
    longform_cats = {r["category_name"] for r in result["longform"]}
    shorts_cats = {r["category_name"] for r in result["shorts"]}
    assert "Gaming" in longform_cats
    assert "미분류" in longform_cats
    assert "Music" in shorts_cats


def test_compute_categories_unknown_maps_to_미분류():
    records = [_make_record(video_id="v1", is_shorts=False)]
    id_to_category = {"v1": "Unknown"}
    result = compute_categories(records, id_to_category)
    longform_cats = {r["category_name"] for r in result["longform"]}
    assert "미분류" in longform_cats
    assert "Unknown" not in longform_cats


# ---------------------------------------------------------------------------
# compute_watch_time
# ---------------------------------------------------------------------------

def test_compute_watch_time_empty():
    result = compute_watch_time([], {})
    assert result["total_min_hours"] == 0
    assert result["total_max_hours"] == 0
    assert result["daily_min_hours"] == 0
    assert result["daily_max_hours"] == 0
    assert result["gap_based_count"] == 0
    assert result["estimated_count"] == 0


def test_compute_watch_time_with_duration():
    records = [_make_record(video_id="v1", is_shorts=False)]
    id_to_duration = {"v1": 3600}  # 1 hour video
    result = compute_watch_time(records, id_to_duration)
    # With AVG_RETENTION_LONGFORM=0.5: min = 0.5h, max = 1.0h
    assert result["total_min_hours"] == 0.5
    assert result["total_max_hours"] == 1.0
    assert result["estimated_count"] == 1


# ---------------------------------------------------------------------------
# compute_search_keywords
# ---------------------------------------------------------------------------

def test_compute_search_keywords_top30():
    # Create 35 unique keywords
    records = [{"query": f"keyword_{i}"} for i in range(35)]
    result = compute_search_keywords(records)
    assert len(result) <= 30


def test_compute_search_keywords_sorted_by_count():
    records = [{"query": "popular"}, {"query": "popular"}, {"query": "rare"}]
    result = compute_search_keywords(records)
    assert result[0]["keyword"] == "popular"
    assert result[0]["count"] == 2


# ---------------------------------------------------------------------------
# compute_weekly (view count aggregation)
# ---------------------------------------------------------------------------

def test_compute_weekly_aggregation():
    # Two records in the same week
    records = [
        _make_record(watched_at="2024-06-10T00:00:00Z", is_shorts=False),  # Mon KST
        _make_record(watched_at="2024-06-11T00:00:00Z", is_shorts=True),   # Tue KST
    ]
    result = compute_weekly(records)
    assert len(result) >= 1
    week = result[0]
    assert "week_label" in week
    assert "total" in week
    assert "shorts" in week
    assert "longform" in week
    assert "daily_avg" in week
    assert week["total"] == week["shorts"] + week["longform"]


def test_compute_weekly_empty():
    assert compute_weekly([]) == []


# ---------------------------------------------------------------------------
# compute_day_of_week
# ---------------------------------------------------------------------------

def test_compute_day_of_week_7_days():
    records = [_make_record(watched_at="2024-06-15T00:00:00Z")]  # Saturday KST
    result = compute_day_of_week(records)
    assert len(result) == 7
    days = [r["day"] for r in result]
    assert days == ["월", "화", "수", "목", "금", "토", "일"]
    for entry in result:
        assert "day_index" in entry
        assert "total" in entry
        assert "avg" in entry
        assert "weeks" in entry


# ---------------------------------------------------------------------------
# compute_viewer_type
# ---------------------------------------------------------------------------

def test_compute_viewer_type_returns_4char_code():
    records = [
        _make_record(watched_at="2024-06-15T12:00:00Z", is_shorts=False, channel="ch1"),
        _make_record(watched_at="2024-06-15T13:00:00Z", is_shorts=False, channel="ch1"),
    ]
    shorts_data = {"shorts_ratio": 0.0}
    hourly = [{"hour": h, "count": 0} for h in range(24)]
    result = compute_viewer_type(records, shorts_data, hourly)
    assert len(result["code"]) == 4
    assert len(result["axes"]) == 4
    assert result["type_name"] != ""


def test_compute_viewer_type_empty():
    result = compute_viewer_type([], {}, [])
    assert result["code"] == "----"
    assert result["axes"] == []
