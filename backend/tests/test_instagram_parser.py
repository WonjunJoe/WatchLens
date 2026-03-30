import json
import zipfile
import io
from app.parsers.instagram import (
    fix_encoding,
    parse_liked_posts,
    parse_story_likes,
    parse_messages,
    parse_following,
    parse_unfollowed,
    parse_content_viewed,
    parse_topics,
    parse_instagram_zip,
)


def test_fix_encoding_korean():
    broken = "\u00ec\u009d\u00b4\u00eb\u00a6\u0084"
    assert fix_encoding(broken) == "이름"


def test_fix_encoding_ascii_passthrough():
    assert fix_encoding("hello") == "hello"


def test_fix_encoding_nested_dict():
    data = {"\u00ec\u009d\u00b4\u00eb\u00a6\u0084": {"value": "\u00ed\u0085\u008c\u00ec\u008a\u00a4\u00ed\u008a\u00b8"}}
    result = fix_encoding(data)
    assert "이름" in result
    assert result["이름"]["value"] == "테스트"


def test_parse_liked_posts():
    data = [
        {
            "timestamp": 1774681840,
            "media": [],
            "label_values": [
                {"label": "URL", "value": "https://www.instagram.com/reel/ABC/", "href": "https://www.instagram.com/reel/ABC/"},
                {
                    "dict": [{"dict": [
                        {"label": "URL", "value": ""},
                        {"label": "\u00ec\u009d\u00b4\u00eb\u00a6\u0084", "value": "Test User"},
                        {"label": "\u00ec\u0082\u00ac\u00ec\u009a\u00a9\u00ec\u009e\u0090 \u00ec\u009d\u00b4\u00eb\u00a6\u0084", "value": "testuser"},
                    ], "title": ""}],
                    "title": "\u00ec\u0086\u008c\u00ec\u009c\u00a0\u00ec\u009e\u0090",
                }
            ],
            "fbid": "123",
        }
    ]
    result = parse_liked_posts(data)
    assert len(result) == 1
    assert result[0]["username"] == "testuser"
    assert result[0]["timestamp"] == 1774681840


def test_parse_liked_posts_empty():
    assert parse_liked_posts([]) == []


def test_parse_story_likes():
    data = [
        {
            "timestamp": 1774705958,
            "media": [],
            "label_values": [
                {"label": "URL", "value": "https://www.instagram.com/stories/user1/123", "href": "https://www.instagram.com/stories/user1/123"},
                {
                    "dict": [{"dict": [
                        {"label": "URL", "value": ""},
                        {"label": "\u00ec\u009d\u00b4\u00eb\u00a6\u0084", "value": "User One"},
                        {"label": "\u00ec\u0082\u00ac\u00ec\u009a\u00a9\u00ec\u009e\u0090 \u00ec\u009d\u00b4\u00eb\u00a6\u0084", "value": "user1"},
                    ], "title": ""}],
                    "title": "\u00ec\u0086\u008c\u00ec\u009c\u00a0\u00ec\u009e\u0090",
                }
            ],
            "fbid": "456",
        }
    ]
    result = parse_story_likes(data)
    assert len(result) == 1
    assert result[0]["username"] == "user1"
    assert result[0]["timestamp"] == 1774705958


def test_parse_messages():
    conversations = {
        "conv1": {
            "participants": [{"name": "Alice"}, {"name": "Bob"}],
            "messages": [
                {"sender_name": "Alice", "timestamp_ms": 1700000000000, "content": "hi", "is_geoblocked_for_viewer": False},
                {"sender_name": "Bob", "timestamp_ms": 1700000001000, "content": "hello", "is_geoblocked_for_viewer": False},
            ],
            "title": "conv1",
        }
    }
    result = parse_messages(conversations)
    assert len(result) == 2
    assert result[0]["sender"] == "Alice"
    assert result[0]["timestamp"] == 1700000000
    assert result[0]["conversation"] == "conv1"
    assert result[0]["participant_count"] == 2


def test_parse_following():
    data = {
        "relationships_following": [
            {"title": "user1", "string_list_data": [{"href": "https://www.instagram.com/_u/user1", "timestamp": 1774630864}]},
            {"title": "user2", "string_list_data": [{"href": "https://www.instagram.com/_u/user2", "timestamp": 1770000000}]},
        ]
    }
    result = parse_following(data)
    assert len(result) == 2
    assert result[0]["username"] == "user1"
    assert result[0]["timestamp"] == 1774630864


def test_parse_content_viewed():
    data = [
        {
            "timestamp": 1774133227,
            "media": [],
            "label_values": [
                {"label": "URL", "value": "https://www.instagram.com/p/ABC/", "href": "https://www.instagram.com/p/ABC/"},
                {
                    "dict": [{"dict": [
                        {"label": "URL", "value": ""},
                        {"label": "\u00ec\u009d\u00b4\u00eb\u00a6\u0084", "value": "Creator"},
                        {"label": "\u00ec\u0082\u00ac\u00ec\u009a\u00a9\u00ec\u009e\u0090 \u00ec\u009d\u00b4\u00eb\u00a6\u0084", "value": "creator1"},
                    ], "title": ""}],
                    "title": "\u00ec\u0086\u008c\u00ec\u009c\u00a0\u00ec\u009e\u0090",
                }
            ],
        }
    ]
    result = parse_content_viewed(data)
    assert len(result) == 1
    assert result[0]["username"] == "creator1"


def test_parse_topics():
    data = {
        "topics_your_topics": [
            {"title": "", "media_map_data": {}, "string_map_data": {"\u00ec\u009d\u00b4\u00eb\u00a6\u0084": {"href": "", "value": "Basketball", "timestamp": 0}}},
            {"title": "", "media_map_data": {}, "string_map_data": {"\u00ec\u009d\u00b4\u00eb\u00a6\u0084": {"href": "", "value": "Music", "timestamp": 0}}},
        ]
    }
    result = parse_topics(data)
    assert result == ["Basketball", "Music"]


def _make_test_zip(files: dict[str, any]) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        for path, data in files.items():
            zf.writestr(path, json.dumps(data, ensure_ascii=False))
    return buf.getvalue()


def test_parse_instagram_zip_minimal():
    liked = [
        {
            "timestamp": 1774681840, "media": [], "fbid": "1",
            "label_values": [
                {"label": "URL", "value": "https://www.instagram.com/p/X/"},
                {"dict": [{"dict": [
                    {"label": "URL", "value": ""},
                    {"label": "\u00ec\u009d\u00b4\u00eb\u00a6\u0084", "value": "Name"},
                    {"label": "\u00ec\u0082\u00ac\u00ec\u009a\u00a9\u00ec\u009e\u0090 \u00ec\u009d\u00b4\u00eb\u00a6\u0084", "value": "user1"},
                ], "title": ""}], "title": "\u00ec\u0086\u008c\u00ec\u009c\u00a0\u00ec\u009e\u0090"}
            ],
        }
    ]
    zip_bytes = _make_test_zip({
        "your_instagram_activity/likes/liked_posts.json": liked,
    })
    result = parse_instagram_zip(zip_bytes)
    assert len(result["liked_posts"]) == 1
    assert result["story_likes"] == []
    assert result["messages"] == []
