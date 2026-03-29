"""Tests for the centralized DB repository layer."""

from unittest.mock import MagicMock, patch, call


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_supabase_mock():
    """Return a MagicMock that mimics the Supabase client's fluent API."""
    sb = MagicMock()
    # Make every chained call return the same mock so fluent chains work
    sb.table.return_value = sb
    sb.select.return_value = sb
    sb.eq.return_value = sb
    sb.gte.return_value = sb
    sb.lte.return_value = sb
    sb.in_.return_value = sb
    sb.order.return_value = sb
    sb.limit.return_value = sb
    sb.range.return_value = sb
    sb.delete.return_value = sb
    sb.insert.return_value = sb
    return sb


# ---------------------------------------------------------------------------
# fetch_watch_records
# ---------------------------------------------------------------------------

def test_fetch_watch_records_returns_filtered_data():
    sb = _make_supabase_mock()
    # Simulate a single page response (fewer than PAGE_SIZE rows → loop exits)
    sb.execute.return_value = MagicMock(data=[
        {"video_id": "v1", "video_title": "Test", "channel_name": "Ch", "watched_at": "2024-01-01T00:00:00Z", "is_shorts": False},
    ])

    with patch("app.db.repository.get_supabase_client", return_value=sb):
        from app.db.repository import fetch_watch_records
        result = fetch_watch_records("user-1", "2024-01-01T00:00:00Z", "2024-01-31T23:59:59Z")

    assert len(result) == 1
    assert result[0]["video_id"] == "v1"
    # Verify correct table and filters were applied
    sb.table.assert_called_with("watch_records")
    sb.eq.assert_any_call("user_id", "user-1")


# ---------------------------------------------------------------------------
# fetch_video_metadata
# ---------------------------------------------------------------------------

def test_fetch_video_metadata_returns_correct_tuple():
    sb = _make_supabase_mock()
    sb.execute.return_value = MagicMock(data=[
        {"video_id": "v1", "duration_seconds": 120, "category_name": "Music"},
        {"video_id": "v2", "duration_seconds": None, "category_name": "Gaming"},
    ])

    with patch("app.db.repository.get_supabase_client", return_value=sb):
        from app.db.repository import fetch_video_metadata
        id_to_duration, id_to_category = fetch_video_metadata(["v1", "v2"])

    # v1 has duration; v2 does not → only v1 in id_to_duration
    assert id_to_duration == {"v1": 120}
    assert id_to_category == {"v1": "Music", "v2": "Gaming"}
    sb.table.assert_called_with("video_metadata")


# ---------------------------------------------------------------------------
# delete_user_records
# ---------------------------------------------------------------------------

def test_delete_user_records_calls_correct_table():
    sb = _make_supabase_mock()
    sb.execute.return_value = MagicMock(data=[])

    with patch("app.db.repository.get_supabase_client", return_value=sb):
        from app.db.repository import delete_user_records
        delete_user_records("watch_records", "user-1")

    sb.table.assert_called_with("watch_records")
    sb.delete.assert_called_once()
    sb.eq.assert_any_call("user_id", "user-1")


# ---------------------------------------------------------------------------
# batch_insert
# ---------------------------------------------------------------------------

def test_batch_insert_calls_insert_on_table():
    sb = _make_supabase_mock()
    sb.execute.return_value = MagicMock(data=[])

    records = [{"video_id": f"v{i}", "user_id": "user-1"} for i in range(3)]

    with patch("app.db.repository.get_supabase_client", return_value=sb):
        from app.db.repository import batch_insert
        batch_insert("watch_records", records)

    sb.table.assert_called_with("watch_records")
    # insert should have been called at least once
    sb.insert.assert_called()
    # All records fit in one chunk (3 < DB_CHUNK_SIZE), so insert called once
    assert sb.insert.call_count == 1
