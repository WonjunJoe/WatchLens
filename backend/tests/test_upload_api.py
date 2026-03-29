"""API-level tests for /api/upload endpoints (SSE streaming)."""

import io
import json
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

SAMPLE_WATCH = [
    {
        "header": "YouTube",
        "title": "Watched 테스트 영상",
        "titleUrl": "https://www.youtube.com/watch?v\u003dABC",
        "subtitles": [{"name": "채널", "url": "https://www.youtube.com/channel/UC"}],
        "time": "2026-01-15T14:00:00.000Z",
        "products": ["YouTube"],
        "activityControls": ["YouTube watch history"],
    }
]

SAMPLE_SEARCH = [
    {
        "header": "YouTube",
        "title": "Searched for 테스트",
        "titleUrl": "https://www.youtube.com/results?search_query\u003d%ED%85%8C%EC%8A%A4%ED%8A%B8",
        "time": "2026-01-15T14:00:00.000Z",
        "products": ["YouTube"],
        "activityControls": ["YouTube search history"],
    }
]


def _parse_sse_events(text: str) -> list[tuple[str, dict]]:
    """Parse SSE text into list of (event_name, data_dict)."""
    events = []
    for block in text.split("\n\n"):
        if not block.strip():
            continue
        evt, data = None, None
        for line in block.split("\n"):
            if line.startswith("event: "):
                evt = line[7:]
            elif line.startswith("data: "):
                data = line[6:]
        if evt and data:
            events.append((evt, json.loads(data)))
    return events


@patch("app.routers.upload.fetch_and_store_metadata")
@patch("app.routers.upload.store_original_file", return_value=True)
@patch("app.routers.upload.batch_insert")
@patch("app.routers.upload.delete_user_records")
def test_upload_watch_history(mock_del, mock_ins, mock_store, mock_meta):
    file_content = json.dumps(SAMPLE_WATCH).encode("utf-8")
    res = client.post(
        "/api/upload/watch-history",
        files={"file": ("watch-history.json", io.BytesIO(file_content), "application/json")},
    )
    assert res.status_code == 200
    events = _parse_sse_events(res.text)
    done_events = [e for e in events if e[0] == "done"]
    assert len(done_events) == 1
    assert done_events[0][1]["total"] == 1
    assert done_events[0][1]["skipped"] == 0
    mock_del.assert_called_once()
    mock_ins.assert_called_once()


@patch("app.routers.upload.store_original_file", return_value=True)
@patch("app.routers.upload.batch_insert")
@patch("app.routers.upload.delete_user_records")
def test_upload_search_history(mock_del, mock_ins, mock_store):
    file_content = json.dumps(SAMPLE_SEARCH).encode("utf-8")
    res = client.post(
        "/api/upload/search-history",
        files={"file": ("search-history.json", io.BytesIO(file_content), "application/json")},
    )
    assert res.status_code == 200
    events = _parse_sse_events(res.text)
    done_events = [e for e in events if e[0] == "done"]
    assert len(done_events) == 1
    assert done_events[0][1]["total"] == 1


def test_upload_invalid_json():
    file_content = b"not a json"
    res = client.post(
        "/api/upload/watch-history",
        files={"file": ("watch-history.json", io.BytesIO(file_content), "application/json")},
    )
    assert res.status_code == 200  # SSE stream always returns 200
    events = _parse_sse_events(res.text)
    error_events = [e for e in events if e[0] == "error"]
    assert len(error_events) == 1
