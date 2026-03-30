"""API-level tests for /api/stats endpoints.

Computation logic is tested in test_stats_service.py.
These tests verify HTTP layer + SSE streaming + repository integration.
"""

import json
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


# ---------------------------------------------------------------------------
# GET /api/stats/period
# ---------------------------------------------------------------------------

@patch("app.routers.stats.fetch_period", return_value=("2026-01-10T00:00:00Z", "2026-01-20T00:00:00Z"))
def test_period_returns_date_range(mock_fp):
    res = client.get("/api/stats/period")
    assert res.status_code == 200
    data = res.json()
    assert data["date_from"] == "2026-01-10"
    assert data["date_to"] == "2026-01-20"
    assert data["total_days"] == 11


@patch("app.routers.stats.fetch_period", return_value=("", ""))
def test_period_empty_returns_zeros(mock_fp):
    res = client.get("/api/stats/period")
    assert res.status_code == 200
    data = res.json()
    assert data["total_days"] == 0


# ---------------------------------------------------------------------------
# GET /api/stats/dashboard (SSE)
# ---------------------------------------------------------------------------

def _mock_records():
    return [
        {"video_id": "v1", "video_title": "Video 1", "channel_name": "Ch A",
         "watched_at": "2026-01-10T14:00:00Z", "is_shorts": False},
        {"video_id": "v2", "video_title": "Video 2", "channel_name": "Ch B",
         "watched_at": "2026-01-10T14:30:00Z", "is_shorts": True},
    ]


@patch("app.routers.stats.fetch_video_metadata", return_value=({}, {}))
@patch("app.routers.stats.fetch_search_records", return_value=[])
@patch("app.routers.stats.fetch_watch_records")
def test_dashboard_streams_all_sections(mock_watch, mock_search, mock_meta):
    mock_watch.return_value = _mock_records()

    res = client.get("/api/stats/dashboard?date_from=2026-01-10&date_to=2026-01-10")
    assert res.status_code == 200

    # Parse SSE events
    events = []
    for block in res.text.split("\n\n"):
        if not block.strip():
            continue
        event_match = None
        data_match = None
        for line in block.split("\n"):
            if line.startswith("event: "):
                event_match = line[7:]
            elif line.startswith("data: "):
                data_match = line[6:]
        if event_match and data_match:
            events.append((event_match, json.loads(data_match)))

    # Should have: 1 progress + 14 sections + 1 done = 16 events
    event_types = [e[0] for e in events]
    assert event_types[0] == "progress"
    assert event_types[-1] == "done"

    section_names = [e[1]["name"] for e in events if e[0] == "section"]
    assert len(section_names) == 19
    assert "summary" in section_names
    assert "insights" in section_names
