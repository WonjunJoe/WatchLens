import json
import io
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
        "activityControls": ["YouTube watch history"]
    }
]

SAMPLE_SEARCH = [
    {
        "header": "YouTube",
        "title": "Searched for 테스트",
        "titleUrl": "https://www.youtube.com/results?search_query\u003d%ED%85%8C%EC%8A%A4%ED%8A%B8",
        "time": "2026-01-15T14:00:00.000Z",
        "products": ["YouTube"],
        "activityControls": ["YouTube search history"]
    }
]


@patch("app.routers.upload.get_supabase_client")
def test_upload_watch_history(mock_client):
    mock_sb = MagicMock()
    mock_client.return_value = mock_sb
    mock_sb.table.return_value.delete.return_value.eq.return_value.execute.return_value = None
    mock_sb.table.return_value.insert.return_value.execute.return_value = None
    mock_sb.storage.from_.return_value.upload.return_value = None

    file_content = json.dumps(SAMPLE_WATCH).encode("utf-8")
    response = client.post(
        "/api/upload/watch-history",
        files={"file": ("watch-history.json", io.BytesIO(file_content), "application/json")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["skipped"] == 0
    assert data["original_file_stored"] is True


@patch("app.routers.upload.get_supabase_client")
def test_upload_search_history(mock_client):
    mock_sb = MagicMock()
    mock_client.return_value = mock_sb
    mock_sb.table.return_value.delete.return_value.eq.return_value.execute.return_value = None
    mock_sb.table.return_value.insert.return_value.execute.return_value = None
    mock_sb.storage.from_.return_value.upload.return_value = None

    file_content = json.dumps(SAMPLE_SEARCH).encode("utf-8")
    response = client.post(
        "/api/upload/search-history",
        files={"file": ("search-history.json", io.BytesIO(file_content), "application/json")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["skipped"] == 0


def test_upload_invalid_json():
    file_content = b"not a json"
    response = client.post(
        "/api/upload/watch-history",
        files={"file": ("watch-history.json", io.BytesIO(file_content), "application/json")},
    )
    assert response.status_code == 400
