from app.services.youtube import parse_duration, _build_metadata_record


# --- parse_duration tests ---

def test_parse_duration_minutes_and_seconds():
    assert parse_duration("PT3M20S") == 200


def test_parse_duration_seconds_only():
    assert parse_duration("PT45S") == 45


def test_parse_duration_hours():
    assert parse_duration("PT1H2M3S") == 3723


def test_parse_duration_minutes_only():
    assert parse_duration("PT5M") == 300


def test_parse_duration_empty():
    assert parse_duration("") == 0


def test_parse_duration_zero():
    assert parse_duration("PT0S") == 0


# --- _build_metadata_record tests ---

def test_build_metadata_record():
    item = {
        "id": "abc123",
        "snippet": {
            "title": "Test Video",
            "channelId": "UC123",
            "categoryId": "20",
            "tags": ["gaming", "fps"],
            "defaultLanguage": "ko",
            "publishedAt": "2026-01-15T10:00:00Z",
        },
        "contentDetails": {"duration": "PT3M20S"},
        "statistics": {
            "viewCount": "1234567",
            "likeCount": "45000",
            "commentCount": "320",
        },
    }
    record = _build_metadata_record(item)
    assert record["video_id"] == "abc123"
    assert record["title"] == "Test Video"
    assert record["channel_id"] == "UC123"
    assert record["category_id"] == 20
    assert record["category_name"] == "Gaming"
    assert record["tags"] == ["gaming", "fps"]
    assert record["duration_seconds"] == 200
    assert record["view_count"] == 1234567
    assert record["like_count"] == 45000
    assert record["comment_count"] == 320


def test_build_metadata_record_missing_optional_fields():
    item = {
        "id": "xyz789",
        "snippet": {
            "title": "Minimal Video",
            "channelId": "UC456",
            "categoryId": "99",
            "publishedAt": "2026-02-01T00:00:00Z",
        },
        "contentDetails": {"duration": "PT30S"},
        "statistics": {},
    }
    record = _build_metadata_record(item)
    assert record["video_id"] == "xyz789"
    assert record["tags"] == []
    assert record["default_language"] is None
    assert record["category_name"] == "Unknown"
    assert record["duration_seconds"] == 30
    assert record["view_count"] is None
    assert record["like_count"] is None
    assert record["comment_count"] is None
