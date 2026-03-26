from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def _mock_watch_records():
    return [
        {"video_id": "v1", "video_title": "Video 1", "channel_name": "Ch A",
         "watched_at": "2026-01-10T14:00:00Z", "is_shorts": False},
        {"video_id": "v2", "video_title": "Video 2", "channel_name": "Ch A",
         "watched_at": "2026-01-10T14:30:00Z", "is_shorts": True},
        {"video_id": "v3", "video_title": "Video 3", "channel_name": "Ch B",
         "watched_at": "2026-01-11T02:00:00Z", "is_shorts": False},
        {"video_id": "v4", "video_title": "Video 4", "channel_name": "Ch A",
         "watched_at": "2026-01-11T23:00:00Z", "is_shorts": True},
    ]


def _mock_supabase_select(data):
    mock_sb = MagicMock()
    mock_table = MagicMock()
    mock_select = MagicMock()
    mock_eq = MagicMock()
    mock_limit = MagicMock()
    mock_result = MagicMock()
    mock_result.data = data
    mock_sb.table.return_value = mock_table
    mock_table.select.return_value = mock_select
    mock_select.eq.return_value = mock_eq
    mock_eq.limit.return_value = mock_limit
    mock_limit.execute.return_value = mock_result
    return mock_sb


@patch("app.routers.stats.get_supabase_client")
def test_summary(mock_get_sb):
    mock_get_sb.return_value = _mock_supabase_select(_mock_watch_records())
    res = client.get("/api/stats/summary")
    assert res.status_code == 200
    data = res.json()
    assert data["total_watched"] == 4
    assert data["total_channels"] == 2
    assert data["shorts_count"] == 2
    assert data["daily_average"] == 2.0


@patch("app.routers.stats.get_supabase_client")
def test_hourly(mock_get_sb):
    mock_get_sb.return_value = _mock_supabase_select(_mock_watch_records())
    res = client.get("/api/stats/hourly")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 24
    hour_14 = next(h for h in data if h["hour"] == 14)
    assert hour_14["count"] == 2


@patch("app.routers.stats.get_supabase_client")
def test_daily(mock_get_sb):
    mock_get_sb.return_value = _mock_supabase_select(_mock_watch_records())
    res = client.get("/api/stats/daily")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 2
    assert data[0]["date"] == "2026-01-10"
    assert data[0]["count"] == 2


@patch("app.routers.stats.get_supabase_client")
def test_top_channels(mock_get_sb):
    mock_get_sb.return_value = _mock_supabase_select(_mock_watch_records())
    res = client.get("/api/stats/top-channels")
    assert res.status_code == 200
    data = res.json()
    assert data[0]["channel_name"] == "Ch A"
    assert data[0]["count"] == 3
    assert data[1]["channel_name"] == "Ch B"
    assert data[1]["count"] == 1


@patch("app.routers.stats.get_supabase_client")
def test_shorts(mock_get_sb):
    mock_get_sb.return_value = _mock_supabase_select(_mock_watch_records())
    res = client.get("/api/stats/shorts")
    assert res.status_code == 200
    data = res.json()
    assert data["shorts_count"] == 2
    assert data["regular_count"] == 2
    assert data["shorts_ratio"] == 0.5


def _mock_search_records():
    return [
        {"query": "python tutorial", "searched_at": "2026-01-10T10:00:00Z"},
        {"query": "python tutorial", "searched_at": "2026-01-10T11:00:00Z"},
        {"query": "react hooks", "searched_at": "2026-01-11T09:00:00Z"},
    ]


@patch("app.routers.stats.get_supabase_client")
def test_search_keywords(mock_get_sb):
    mock_get_sb.return_value = _mock_supabase_select(_mock_search_records())
    res = client.get("/api/stats/search-keywords")
    assert res.status_code == 200
    data = res.json()
    assert data[0]["keyword"] == "python tutorial"
    assert data[0]["count"] == 2
