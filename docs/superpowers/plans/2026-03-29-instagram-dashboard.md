# Instagram 대시보드 + 아키텍처 리팩토링 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** WatchLens에 Instagram 분석 대시보드를 추가하고, YouTube/Instagram이 독립적으로 동작하는 구조로 리팩토링한다.

**Architecture:** ZIP 업로드 → 서버에서 파싱 + KPI 계산 → SSE 스트리밍 + DB에 결과 저장. 프론트는 React Context로 캐싱하여 대시보드 재진입 시 즉시 렌더링. YouTube도 동일 패턴으로 통일.

**Tech Stack:** FastAPI, Python zipfile, Supabase (jsonb), React 19, TypeScript, Recharts, react-router-dom

---

## File Structure

### Backend (신규/수정)

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `backend/app/parsers/instagram.py` | ZIP 해제, 각 JSON 파싱, 인코딩 fix, 레코드 추출 |
| Create | `backend/app/services/instagram_stats.py` | 9개 KPI 섹션 계산 함수 |
| Create | `backend/app/services/instagram_insights.py` | Rule-based 인사이트 생성 |
| Create | `backend/app/routers/instagram.py` | POST /api/instagram/upload (SSE), GET /api/instagram/dashboard |
| Modify | `backend/config/settings.py` | Instagram 관련 상수 추가 |
| Modify | `backend/app/main.py` | Instagram 라우터 등록 |
| Create | `backend/tests/test_instagram_parser.py` | 파서 단위 테스트 |
| Create | `backend/tests/test_instagram_stats.py` | KPI 계산 단위 테스트 |
| Create | `backend/tests/test_instagram_api.py` | 업로드 API 통합 테스트 |

### Frontend (신규/수정)

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `frontend/src/contexts/InstagramDataContext.tsx` | Instagram 결과 캐싱 Context |
| Create | `frontend/src/pages/HomePage.tsx` | 홈 화면 + YouTube/Instagram 업로드 |
| Create | `frontend/src/pages/InstagramDashboardPage.tsx` | Instagram 대시보드 |
| Create | `frontend/src/components/instagram/IgSummaryCards.tsx` | Summary 4카드 |
| Create | `frontend/src/components/instagram/IgInsightSummary.tsx` | 인사이트 요약 |
| Create | `frontend/src/components/instagram/IgTopAccounts.tsx` | Top 소통 계정 |
| Create | `frontend/src/components/instagram/IgHourlyChart.tsx` | 시간대별 활동 |
| Create | `frontend/src/components/instagram/IgDayOfWeekChart.tsx` | 요일별 패턴 |
| Create | `frontend/src/components/instagram/IgDailyChart.tsx` | 일별 트렌드 |
| Create | `frontend/src/components/instagram/IgDmAnalysis.tsx` | DM 활동 분석 |
| Create | `frontend/src/components/instagram/IgTopics.tsx` | 관심사 카테고리 |
| Create | `frontend/src/components/instagram/IgFollowNetwork.tsx` | 팔로우 네트워크 |
| Modify | `frontend/src/App.tsx` | 라우팅 추가 (/, /youtube/dashboard, /instagram/dashboard) |
| Modify | `frontend/src/components/layout/Sidebar.tsx` | 사이드바 메뉴 3개로 변경 |
| Rename | `frontend/src/pages/DashboardPage.tsx` → keep | YouTube 대시보드 (경로만 변경) |

---

## Task 1: Backend — config/settings.py에 Instagram 상수 추가

**Files:**
- Modify: `backend/config/settings.py:1-54`

- [ ] **Step 1: settings.py에 Instagram 설정 추가**

`backend/config/settings.py` 파일 끝에 다음을 추가:

```python
# ---------------------------------------------------------------------------
# Instagram
# ---------------------------------------------------------------------------
INSTAGRAM_SOURCE_FILES = {
    "liked_posts": "your_instagram_activity/likes/liked_posts.json",
    "story_likes": "your_instagram_activity/story_interactions/story_likes.json",
    "messages_inbox": "your_instagram_activity/messages/inbox",
    "following": "connections/followers_and_following/following.json",
    "unfollowed": "connections/followers_and_following/recently_unfollowed_profiles.json",
    "posts_viewed": "ads_information/ads_and_topics/posts_viewed.json",
    "videos_watched": "ads_information/ads_and_topics/videos_watched.json",
    "topics": "preferences/your_topics/recommended_topics.json",
}
MAX_ZIP_SIZE_MB = 100
MAX_ZIP_SIZE_BYTES = MAX_ZIP_SIZE_MB * 1024 * 1024
```

- [ ] **Step 2: Commit**

```bash
git add backend/config/settings.py
git commit -m "feat: add Instagram config constants to settings.py"
```

---

## Task 2: Backend — Instagram 파서 (TDD)

**Files:**
- Create: `backend/app/parsers/instagram.py`
- Create: `backend/tests/test_instagram_parser.py`

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/test_instagram_parser.py`:

```python
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
    # "이름" encoded as Latin-1 bytes
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
    assert result[0]["timestamp"] == 1700000000  # ms → seconds
    assert result[0]["conversation"] == "conv1"


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
    """Helper: create an in-memory ZIP with given path→data pairs."""
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/wonjunjoe/Desktop/workspace/05_WatchLens/backend && python -m pytest tests/test_instagram_parser.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.parsers.instagram'`

- [ ] **Step 3: Write the parser implementation**

Create `backend/app/parsers/instagram.py`:

```python
"""Instagram data export ZIP parser.

Handles ZIP extraction, JSON parsing, and Korean encoding fix
for Instagram's data download format.
"""

import json
import zipfile
import io
import os
from config.settings import INSTAGRAM_SOURCE_FILES


def fix_encoding(obj):
    """Fix Instagram's double-encoding: UTF-8 bytes stored as Latin-1 codepoints."""
    if isinstance(obj, str):
        try:
            return obj.encode("latin-1").decode("utf-8")
        except (UnicodeDecodeError, UnicodeEncodeError):
            return obj
    elif isinstance(obj, dict):
        return {fix_encoding(k): fix_encoding(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [fix_encoding(i) for i in obj]
    return obj


def _extract_username(label_values: list[dict]) -> str | None:
    """Extract username from Instagram's nested label_values structure."""
    for item in label_values:
        if "dict" in item and isinstance(item["dict"], list):
            for group in item["dict"]:
                if "dict" in group and isinstance(group["dict"], list):
                    for field in group["dict"]:
                        label = fix_encoding(field.get("label", ""))
                        if label == "사용자 이름":
                            return field.get("value")
    return None


def parse_liked_posts(data: list[dict]) -> list[dict]:
    """Parse liked_posts.json → [{username, timestamp}]"""
    records = []
    for item in data:
        username = _extract_username(item.get("label_values", []))
        if username:
            records.append({
                "username": username,
                "timestamp": item["timestamp"],
            })
    return records


def parse_story_likes(data: list[dict]) -> list[dict]:
    """Parse story_likes.json → [{username, timestamp}]"""
    records = []
    for item in data:
        username = _extract_username(item.get("label_values", []))
        if username:
            records.append({
                "username": username,
                "timestamp": item["timestamp"],
            })
    return records


def parse_messages(conversations: dict[str, dict]) -> list[dict]:
    """Parse message data → [{sender, timestamp, conversation}]

    Args:
        conversations: dict mapping conversation_id → parsed message_*.json merged data
    """
    records = []
    for conv_id, conv_data in conversations.items():
        title = fix_encoding(conv_data.get("title", conv_id))
        for msg in conv_data.get("messages", []):
            sender = fix_encoding(msg.get("sender_name", ""))
            records.append({
                "sender": sender,
                "timestamp": msg["timestamp_ms"] // 1000,
                "conversation": title,
            })
    return records


def parse_following(data: dict) -> list[dict]:
    """Parse following.json → [{username, timestamp}]"""
    records = []
    for item in data.get("relationships_following", []):
        username = item.get("title", "")
        ts = 0
        if item.get("string_list_data"):
            ts = item["string_list_data"][0].get("timestamp", 0)
        records.append({"username": fix_encoding(username), "timestamp": ts})
    return records


def parse_unfollowed(data: dict) -> list[dict]:
    """Parse recently_unfollowed_profiles.json → [{username, timestamp}]"""
    records = []
    for item in data.get("relationships_unfollowed_users", []):
        username = item.get("title", "")
        ts = 0
        if item.get("string_list_data"):
            ts = item["string_list_data"][0].get("timestamp", 0)
        records.append({"username": fix_encoding(username), "timestamp": ts})
    return records


def parse_content_viewed(data: list[dict]) -> list[dict]:
    """Parse posts_viewed.json or videos_watched.json → [{username, timestamp}]"""
    records = []
    for item in data:
        username = _extract_username(item.get("label_values", []))
        if username:
            records.append({
                "username": username,
                "timestamp": item.get("timestamp", 0),
            })
    return records


def parse_topics(data: dict) -> list[str]:
    """Parse recommended_topics.json → [topic_name, ...]"""
    topics = []
    for item in data.get("topics_your_topics", []):
        smd = item.get("string_map_data", {})
        for key, val in smd.items():
            if val.get("value"):
                topics.append(val["value"])
    return topics


def _read_json_from_zip(zf: zipfile.ZipFile, path: str) -> any:
    """Read and parse a JSON file from the ZIP, returning None if not found."""
    # ZIP might have a top-level folder prefix; search for the suffix
    for name in zf.namelist():
        if name.endswith(path) or name.endswith("/" + path):
            with zf.open(name) as f:
                return json.loads(f.read())
    return None


def _read_messages_from_zip(zf: zipfile.ZipFile, inbox_path: str) -> dict[str, dict]:
    """Read all message_*.json files from inbox subdirectories."""
    conversations = {}
    for name in zf.namelist():
        if inbox_path not in name:
            continue
        if not name.endswith(".json") or "message_" not in os.path.basename(name):
            continue

        parts = name.split("/")
        # Find the conversation folder name (parent of message_*.json)
        msg_idx = next((i for i, p in enumerate(parts) if p.startswith("message_")), None)
        if msg_idx is None or msg_idx == 0:
            continue
        conv_id = parts[msg_idx - 1]

        with zf.open(name) as f:
            data = json.loads(f.read())

        if conv_id not in conversations:
            conversations[conv_id] = {
                "participants": data.get("participants", []),
                "messages": [],
                "title": fix_encoding(data.get("title", conv_id)),
            }
        conversations[conv_id]["messages"].extend(data.get("messages", []))

    return conversations


def parse_instagram_zip(zip_bytes: bytes) -> dict:
    """Parse Instagram ZIP export and return all extracted data.

    Returns dict with keys: liked_posts, story_likes, messages, following,
    unfollowed, posts_viewed, videos_watched, topics
    """
    src = INSTAGRAM_SOURCE_FILES

    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        liked_raw = _read_json_from_zip(zf, src["liked_posts"]) or []
        story_raw = _read_json_from_zip(zf, src["story_likes"]) or []
        following_raw = _read_json_from_zip(zf, src["following"]) or {}
        unfollowed_raw = _read_json_from_zip(zf, src["unfollowed"]) or {}
        posts_viewed_raw = _read_json_from_zip(zf, src["posts_viewed"]) or []
        videos_watched_raw = _read_json_from_zip(zf, src["videos_watched"]) or []
        topics_raw = _read_json_from_zip(zf, src["topics"]) or {}
        conversations = _read_messages_from_zip(zf, src["messages_inbox"])

    return {
        "liked_posts": parse_liked_posts(liked_raw),
        "story_likes": parse_story_likes(story_raw),
        "messages": parse_messages(conversations),
        "following": parse_following(following_raw),
        "unfollowed": parse_unfollowed(unfollowed_raw),
        "posts_viewed": parse_content_viewed(posts_viewed_raw),
        "videos_watched": parse_content_viewed(videos_watched_raw),
        "topics": parse_topics(topics_raw),
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/wonjunjoe/Desktop/workspace/05_WatchLens/backend && python -m pytest tests/test_instagram_parser.py -v`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/parsers/instagram.py backend/tests/test_instagram_parser.py
git commit -m "feat: add Instagram ZIP parser with encoding fix"
```

---

## Task 3: Backend — Instagram KPI 계산 서비스 (TDD)

**Files:**
- Create: `backend/app/services/instagram_stats.py`
- Create: `backend/tests/test_instagram_stats.py`

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/test_instagram_stats.py`:

```python
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


# --- Summary ---

def test_summary_basic():
    liked = [_make_like("a", 1700000000), _make_like("b", 1700100000)]
    story = [_make_like("a", 1700050000)]
    msgs = [_make_msg("me", 1700000000), _make_msg("friend", 1700001000)]
    following = [_make_follow("x", 1700000000)]
    viewed = [{"username": "z", "timestamp": 1700000000}]

    result = compute_ig_summary(liked, story, msgs, following, viewed)
    assert result["total_likes"] == 3  # 2 posts + 1 story
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


# --- Hourly ---

def test_hourly_distribution():
    # timestamp 1700000000 = 2023-11-14 21:13:20 UTC → KST 06:13 (hour 6)
    # We'll use 1700028000 = 2023-11-15 05:00:00 UTC → KST 14:00 (hour 14)
    liked = [_make_like("a", 1700028000)]
    story = []
    msgs = [_make_msg("b", 1700028000)]
    result = compute_ig_hourly(liked, story, msgs)
    assert len(result) == 24
    hour_14 = next(h for h in result if h["hour"] == 14)
    assert hour_14["count"] == 2  # 1 like + 1 msg


# --- Top Accounts ---

def test_top_accounts():
    liked = [_make_like("alice", 100), _make_like("alice", 200), _make_like("bob", 300)]
    story = [_make_like("alice", 150)]
    msgs = [_make_msg("alice", 100, "c1"), _make_msg("bob", 200, "c2"), _make_msg("bob", 300, "c2")]
    result = compute_ig_top_accounts(liked, story, msgs, "me")
    assert result[0]["username"] == "alice"  # 2 likes + 1 story + 1 msg = 4
    assert result[0]["likes"] == 2
    assert result[0]["story_likes"] == 1
    assert result[0]["messages"] == 1


# --- DM Analysis ---

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


# --- Follow Network ---

def test_follow_network():
    following = [
        _make_follow("a", 1672531200),  # 2023-01-01
        _make_follow("b", 1675209600),  # 2023-02-01
        _make_follow("c", 1675209600),  # 2023-02-01
    ]
    unfollowed = [_make_follow("z", 1675209600)]
    result = compute_ig_follow_network(following, unfollowed)
    assert len(result["monthly_growth"]) == 2
    assert result["monthly_growth"][0]["cumulative"] == 1  # Jan: 1
    assert result["monthly_growth"][1]["cumulative"] == 3  # Feb: +2 = 3
    assert len(result["recent_unfollowed"]) == 1
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/wonjunjoe/Desktop/workspace/05_WatchLens/backend && python -m pytest tests/test_instagram_stats.py -v`
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Write the stats implementation**

Create `backend/app/services/instagram_stats.py`:

```python
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/wonjunjoe/Desktop/workspace/05_WatchLens/backend && python -m pytest tests/test_instagram_stats.py -v`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/instagram_stats.py backend/tests/test_instagram_stats.py
git commit -m "feat: add Instagram KPI computation functions"
```

---

## Task 4: Backend — Instagram 인사이트 생성

**Files:**
- Create: `backend/app/services/instagram_insights.py`

- [ ] **Step 1: Write instagram_insights.py**

Create `backend/app/services/instagram_insights.py`:

```python
"""Rule-based insight generation for Instagram data."""

from config.settings import LATE_NIGHT_HOURS


def generate_ig_insights(
    summary: dict,
    hourly: list[dict],
    top_accounts: list[dict],
    dm_analysis: dict,
) -> list[dict]:
    insights = []
    total_likes = summary.get("total_likes", 0)
    if total_likes == 0 and summary.get("total_messages", 0) == 0:
        return [{"icon": "📭", "text": "분석할 데이터가 없습니다."}]

    # 1. Story vs Post likes ratio
    post_likes = summary.get("post_likes", 0)
    story_likes = summary.get("story_likes", 0)
    if post_likes > 0 and story_likes > 0:
        if story_likes > post_likes:
            ratio = round(story_likes / post_likes, 1)
            insights.append({
                "icon": "📖",
                "text": f"스토리 좋아요가 게시물 좋아요보다 **{ratio}배** 많습니다 — 스토리 중심 소비 패턴이에요.",
            })
        else:
            ratio = round(post_likes / story_likes, 1)
            insights.append({
                "icon": "📷",
                "text": f"게시물 좋아요가 스토리 좋아요보다 **{ratio}배** 많습니다 — 피드 중심 소비 패턴이에요.",
            })

    # 2. Peak activity hour
    if hourly:
        peak = max(hourly, key=lambda h: h["count"])
        if peak["count"] > 0:
            insights.append({
                "icon": "⏰",
                "text": f"가장 활발한 시간대는 **{peak['hour']}시**입니다. ({peak['count']}건)",
            })

    # 3. Late night activity
    if hourly:
        total_activity = sum(h["count"] for h in hourly)
        late_count = sum(h["count"] for h in hourly if h["hour"] in LATE_NIGHT_HOURS)
        if total_activity > 0:
            late_pct = round(late_count / total_activity * 100)
            if late_pct >= 25:
                insights.append({
                    "icon": "🌙",
                    "text": f"심야 활동(22~04시)이 전체의 **{late_pct}%**를 차지합니다.",
                })

    # 4. Top account concentration
    if top_accounts and total_likes > 0:
        top3_total = sum(a["total"] for a in top_accounts[:3])
        all_total = sum(a["total"] for a in top_accounts)
        if all_total > 0:
            concentration = round(top3_total / all_total * 100)
            top_name = top_accounts[0]["username"]
            insights.append({
                "icon": "💬",
                "text": f"상위 3명과의 소통이 전체의 **{concentration}%**를 차지합니다. 1위: **@{top_name}**",
            })

    # 5. DM sent/received ratio
    sent = dm_analysis.get("sent", 0)
    received = dm_analysis.get("received", 0)
    total_msgs = sent + received
    if total_msgs > 10:
        sent_pct = round(sent / total_msgs * 100)
        if sent_pct >= 60:
            insights.append({
                "icon": "📤",
                "text": f"DM의 **{sent_pct}%**를 내가 먼저 보냈습니다 — 적극적인 대화 스타일이에요.",
            })
        elif sent_pct <= 40:
            insights.append({
                "icon": "📥",
                "text": f"DM의 **{100 - sent_pct}%**를 상대방이 먼저 보냈습니다 — 수신 위주 대화 패턴이에요.",
            })

    return insights[:7]
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/instagram_insights.py
git commit -m "feat: add Instagram insight generation"
```

---

## Task 5: Backend — Instagram 업로드 라우터 + main.py 등록

**Files:**
- Create: `backend/app/routers/instagram.py`
- Modify: `backend/app/main.py:1-23`

- [ ] **Step 1: Create the router**

Create `backend/app/routers/instagram.py`:

```python
import json
from collections.abc import Generator
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import StreamingResponse, JSONResponse
from app.parsers.instagram import parse_instagram_zip
from app.services.instagram_stats import (
    compute_ig_summary,
    compute_ig_hourly,
    compute_ig_daily,
    compute_ig_day_of_week,
    compute_ig_top_accounts,
    compute_ig_dm_analysis,
    compute_ig_follow_network,
)
from app.services.instagram_insights import generate_ig_insights
from app.db.supabase import get_supabase_client
from app.utils import sse
from config.settings import MAX_ZIP_SIZE_BYTES, DEFAULT_USER_ID

router = APIRouter(prefix="/api/instagram", tags=["instagram"])

# The username used in DMs to identify "me"
# Extracted from the ZIP data during parsing
_MY_USERNAME = "조원준 Joe"  # Will be detected from message data


def _detect_my_username(messages: list[dict]) -> str:
    """Detect the user's display name from DM sender_name frequency.
    The account owner typically appears as sender in many conversations."""
    if not messages:
        return ""
    from collections import Counter
    # Group by conversation, find the name that appears in the most conversations
    conv_senders: dict[str, set] = {}
    for m in messages:
        conv_senders.setdefault(m["conversation"], set()).add(m["sender"])

    name_conv_count = Counter()
    for conv, senders in conv_senders.items():
        for s in senders:
            name_conv_count[s] += 1

    if name_conv_count:
        return name_conv_count.most_common(1)[0][0]
    return ""


def _instagram_upload_stream(zip_bytes: bytes) -> Generator[str, None, None]:
    total_sections = 9
    loaded = 0

    yield sse("progress", {"step": "ZIP 압축 해제 및 파싱 중...", "loaded": 0, "total": total_sections})

    try:
        parsed = parse_instagram_zip(zip_bytes)
    except Exception as e:
        yield sse("error", {"detail": f"ZIP 파싱 실패: {str(e)}"})
        return

    liked = parsed["liked_posts"]
    story = parsed["story_likes"]
    msgs = parsed["messages"]
    following = parsed["following"]
    unfollowed = parsed["unfollowed"]
    viewed = parsed["posts_viewed"] + parsed["videos_watched"]
    topics = parsed["topics"]

    my_username = _detect_my_username(msgs)

    yield sse("progress", {"step": "KPI 계산 중...", "loaded": 0, "total": total_sections})

    # 1. Summary
    summary = compute_ig_summary(liked, story, msgs, following, viewed)
    loaded += 1
    yield sse("section", {"name": "summary", "data": summary, "loaded": loaded, "total": total_sections})

    # 2. Top accounts
    top_accounts = compute_ig_top_accounts(liked, story, msgs, my_username)
    loaded += 1
    yield sse("section", {"name": "top_accounts", "data": top_accounts, "loaded": loaded, "total": total_sections})

    # 3. Hourly
    hourly = compute_ig_hourly(liked, story, msgs)
    loaded += 1
    yield sse("section", {"name": "hourly", "data": hourly, "loaded": loaded, "total": total_sections})

    # 4. Day of week
    day_of_week = compute_ig_day_of_week(liked, story, msgs)
    loaded += 1
    yield sse("section", {"name": "day_of_week", "data": day_of_week, "loaded": loaded, "total": total_sections})

    # 5. Daily trend
    daily = compute_ig_daily(liked, story, msgs)
    loaded += 1
    yield sse("section", {"name": "daily", "data": daily, "loaded": loaded, "total": total_sections})

    # 6. DM analysis
    dm_analysis = compute_ig_dm_analysis(msgs, my_username)
    loaded += 1
    yield sse("section", {"name": "dm_analysis", "data": dm_analysis, "loaded": loaded, "total": total_sections})

    # 7. Topics
    loaded += 1
    yield sse("section", {"name": "topics", "data": topics, "loaded": loaded, "total": total_sections})

    # 8. Follow network
    follow_network = compute_ig_follow_network(following, unfollowed)
    loaded += 1
    yield sse("section", {"name": "follow_network", "data": follow_network, "loaded": loaded, "total": total_sections})

    # 9. Insights
    insights = generate_ig_insights(summary, hourly, top_accounts, dm_analysis)
    loaded += 1
    yield sse("section", {"name": "insights", "data": insights, "loaded": loaded, "total": total_sections})

    # Save results to DB
    all_results = {
        "summary": summary,
        "top_accounts": top_accounts,
        "hourly": hourly,
        "day_of_week": day_of_week,
        "daily": daily,
        "dm_analysis": dm_analysis,
        "topics": topics,
        "follow_network": follow_network,
        "insights": insights,
    }
    try:
        sb = get_supabase_client()
        sb.table("instagram_dashboard_results").delete().eq("user_id", DEFAULT_USER_ID).execute()
        sb.table("instagram_dashboard_results").insert({
            "user_id": DEFAULT_USER_ID,
            "results": all_results,
        }).execute()
    except Exception:
        pass  # DB save failure is non-fatal

    yield sse("done", {"loaded": total_sections, "total": total_sections})


@router.post("/upload")
async def upload_instagram(file: UploadFile = File(...)):
    file_bytes = await file.read()
    if len(file_bytes) > MAX_ZIP_SIZE_BYTES:
        raise HTTPException(413, f"파일 크기가 {MAX_ZIP_SIZE_BYTES // (1024*1024)}MB를 초과합니다")
    if not file.filename or not file.filename.endswith(".zip"):
        raise HTTPException(400, "ZIP 파일만 업로드 가능합니다")
    return StreamingResponse(_instagram_upload_stream(file_bytes), media_type="text/event-stream")


@router.get("/dashboard")
def get_instagram_dashboard(user_id: str = Query(default=DEFAULT_USER_ID)):
    sb = get_supabase_client()
    resp = sb.table("instagram_dashboard_results").select("results").eq(
        "user_id", user_id
    ).order("created_at", desc=True).limit(1).execute()

    if not resp.data:
        raise HTTPException(404, "저장된 Instagram 대시보드가 없습니다")

    return JSONResponse(content=resp.data[0]["results"])
```

- [ ] **Step 2: Register router in main.py**

Modify `backend/app/main.py` — add import and include_router:

```python
# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.upload import router as upload_router
from app.routers.stats import router as stats_router
from app.routers.instagram import router as instagram_router

app = FastAPI(title="WatchLens API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload_router)
app.include_router(stats_router)
app.include_router(instagram_router)

@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/routers/instagram.py backend/app/main.py
git commit -m "feat: add Instagram upload/dashboard API endpoints"
```

---

## Task 6: Database — instagram_dashboard_results 테이블 생성

**Files:**
- Create: `supabase/migrations/20260329000000_instagram_dashboard_results.sql`

- [ ] **Step 1: Create migration file**

Create `supabase/migrations/20260329000000_instagram_dashboard_results.sql`:

```sql
create table if not exists instagram_dashboard_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  results jsonb not null,
  created_at timestamptz default now()
);

create index if not exists idx_ig_dashboard_user_id
  on instagram_dashboard_results(user_id);
```

- [ ] **Step 2: Apply migration**

Run: `cd /Users/wonjunjoe/Desktop/workspace/05_WatchLens && npx supabase db push` (or apply via Supabase dashboard)

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260329000000_instagram_dashboard_results.sql
git commit -m "feat: add instagram_dashboard_results table migration"
```

---

## Task 7: Frontend — InstagramDataContext

**Files:**
- Create: `frontend/src/contexts/InstagramDataContext.tsx`

- [ ] **Step 1: Create the context**

Create `frontend/src/contexts/InstagramDataContext.tsx`:

```tsx
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

const API_BASE = "http://localhost:8000";

interface InstagramData {
  summary: any;
  top_accounts: any;
  hourly: any;
  day_of_week: any;
  daily: any;
  dm_analysis: any;
  topics: any;
  follow_network: any;
  insights: any;
}

interface InstagramContextValue {
  data: Partial<InstagramData>;
  setSection: (name: string, value: any) => void;
  setAll: (data: InstagramData) => void;
  clear: () => void;
  fetchFromDb: () => Promise<boolean>;
}

const InstagramDataContext = createContext<InstagramContextValue | null>(null);

export function InstagramDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Partial<InstagramData>>({});

  const setSection = useCallback((name: string, value: any) => {
    setData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const setAll = useCallback((newData: InstagramData) => {
    setData(newData);
  }, []);

  const clear = useCallback(() => {
    setData({});
  }, []);

  const fetchFromDb = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/api/instagram/dashboard`);
      if (!res.ok) return false;
      const results = await res.json();
      setData(results);
      return true;
    } catch {
      return false;
    }
  }, []);

  return (
    <InstagramDataContext.Provider value={{ data, setSection, setAll, clear, fetchFromDb }}>
      {children}
    </InstagramDataContext.Provider>
  );
}

export function useInstagramData() {
  const ctx = useContext(InstagramDataContext);
  if (!ctx) throw new Error("useInstagramData must be used within InstagramDataProvider");
  return ctx;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/contexts/InstagramDataContext.tsx
git commit -m "feat: add InstagramDataContext for result caching"
```

---

## Task 8: Frontend — 라우팅 + 사이드바 + HomePage 리팩토링

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/layout/Sidebar.tsx`
- Create: `frontend/src/pages/HomePage.tsx`

- [ ] **Step 1: Create HomePage**

Create `frontend/src/pages/HomePage.tsx`:

```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileUploader } from "../components/FileUploader";
import { UploadResultCard, type UploadResult } from "../components/UploadResultCard";
import { PeriodSelector } from "../components/PeriodSelector";
import { useInstagramData } from "../contexts/InstagramDataContext";
import { Eye, Loader2 } from "lucide-react";

const API_BASE = "http://localhost:8000";

interface PeriodInfo {
  date_from: string;
  date_to: string;
  total_days: number;
}

export function HomePage() {
  const navigate = useNavigate();
  const { setSection } = useInstagramData();

  // YouTube state
  const [watchResult, setWatchResult] = useState<UploadResult | null>(null);
  const [searchResult, setSearchResult] = useState<UploadResult | null>(null);
  const [period, setPeriod] = useState<PeriodInfo | null>(null);
  const [loadingPeriod, setLoadingPeriod] = useState(false);

  // Instagram state
  const [igUploading, setIgUploading] = useState(false);
  const [igProgress, setIgProgress] = useState({ step: "", loaded: 0, total: 9 });
  const [igDone, setIgDone] = useState(false);
  const [igError, setIgError] = useState<string | null>(null);

  const handleWatchResult = (data: any) => {
    setWatchResult({ type: "watch", ...data });
    setLoadingPeriod(true);
    fetch(`${API_BASE}/api/stats/period`)
      .then((res) => res.json())
      .then((d) => { if (d.date_from) setPeriod(d); })
      .catch(() => {})
      .finally(() => setLoadingPeriod(false));
  };

  const handlePeriodSelect = (from: string, to: string) => {
    navigate(`/youtube/dashboard?from=${from}&to=${to}`);
  };

  const handleInstagramUpload = async (file: File) => {
    setIgError(null);
    setIgDone(false);
    setIgUploading(true);
    setIgProgress({ step: "업로드 중...", loaded: 0, total: 9 });

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE}/api/instagram/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail || `업로드 실패 (${res.status})`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("스트림을 읽을 수 없습니다");

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() || "";

        for (const block of blocks) {
          const eventMatch = block.match(/^event: (.+)$/m);
          const dataMatch = block.match(/^data: (.+)$/m);
          if (!eventMatch || !dataMatch) continue;

          const event = eventMatch[1];
          const payload = JSON.parse(dataMatch[1]);

          if (event === "progress") {
            setIgProgress({ step: payload.step, loaded: payload.loaded || 0, total: payload.total || 9 });
          } else if (event === "section") {
            setSection(payload.name, payload.data);
            setIgProgress({ step: `${payload.loaded}/${payload.total}`, loaded: payload.loaded, total: payload.total });
          } else if (event === "done") {
            setIgDone(true);
          } else if (event === "error") {
            throw new Error(payload.detail);
          }
        }
      }
    } catch (e: any) {
      setIgError(e.message);
    } finally {
      setIgUploading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8">
      {/* Hero */}
      <section className="text-center mb-12">
        <div className="w-14 h-14 mx-auto mb-4 bg-[var(--accent)] rounded-2xl flex items-center justify-center">
          <Eye size={24} className="text-white" />
        </div>
        <h1 className="text-[28px] font-bold text-[var(--text-primary)] mb-2">WatchLens</h1>
        <p className="text-[16px] text-[var(--text-secondary)] max-w-lg mx-auto">
          YouTube와 Instagram 사용 패턴을 분석하여 나만의 인사이트를 발견하세요.
        </p>
      </section>

      {/* Upload Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* YouTube */}
        <div className="card p-6">
          <h2 className="text-[16px] font-semibold text-[var(--text-primary)] mb-1">YouTube</h2>
          <p className="text-[13px] text-[var(--text-tertiary)] mb-4">Google Takeout의 watch-history.json</p>
          <FileUploader
            label="시청 기록"
            accept=".json"
            endpoint="/api/upload/watch-history"
            onResult={handleWatchResult}
            subtitle="watch-history.json"
          />
          {watchResult && (
            <div className="mt-4">
              <UploadResultCard result={watchResult} />
            </div>
          )}
          {searchResult && (
            <div className="mt-4">
              <UploadResultCard result={searchResult} />
            </div>
          )}
          {loadingPeriod && (
            <div className="flex justify-center py-4">
              <Loader2 size={20} className="text-[var(--accent)] animate-spin" />
            </div>
          )}
          {period && !loadingPeriod && (
            <div className="mt-4">
              <PeriodSelector
                dateFrom={period.date_from}
                dateTo={period.date_to}
                totalDays={period.total_days}
                onSelect={handlePeriodSelect}
              />
            </div>
          )}
        </div>

        {/* Instagram */}
        <div className="card p-6">
          <h2 className="text-[16px] font-semibold text-[var(--text-primary)] mb-1">Instagram</h2>
          <p className="text-[13px] text-[var(--text-tertiary)] mb-4">Instagram 데이터 다운로드 ZIP 파일</p>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) handleInstagramUpload(file);
            }}
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer border-gray-200 hover:border-[var(--accent)] hover:bg-[var(--accent-light)] transition-colors"
          >
            <label className="cursor-pointer block">
              <p className="text-[14px] font-medium text-[var(--text-primary)] mb-0.5">Instagram 데이터</p>
              <p className="text-[13px] text-[var(--text-tertiary)] mb-0.5">.zip 파일</p>
              <p className="text-[12px] text-[var(--text-tertiary)]">드래그 또는 클릭 (최대 100MB)</p>
              <input
                type="file"
                accept=".zip"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleInstagramUpload(file);
                }}
                className="hidden"
                disabled={igUploading}
              />
            </label>
          </div>

          {igUploading && (
            <div className="mt-4">
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-[var(--accent)] rounded-full transition-all"
                  style={{ width: `${Math.round((igProgress.loaded / igProgress.total) * 100)}%` }}
                />
              </div>
              <p className="text-[var(--accent)] text-[12px]">{igProgress.step}</p>
            </div>
          )}
          {igError && <p className="text-[var(--rose)] text-[12px] mt-3">{igError}</p>}
          {igDone && (
            <div className="mt-4">
              <button
                onClick={() => navigate("/instagram/dashboard")}
                className="w-full py-2.5 bg-[var(--accent)] text-white rounded-lg text-[14px] font-medium hover:opacity-90 transition-opacity"
              >
                Instagram 대시보드 보기
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Helper text */}
      <p className="text-center text-[13px] text-[var(--text-tertiary)]">
        둘 중 하나만 업로드해도 해당 대시보드가 생성됩니다.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Update Sidebar**

Replace `frontend/src/components/layout/Sidebar.tsx` MENU array (lines 9-12):

```tsx
const MENU = [
  { label: "홈", icon: Upload, path: "/" },
  { label: "YouTube 대시보드", icon: BarChart3, path: "/youtube" },
  { label: "Instagram 대시보드", icon: Eye, path: "/instagram" },
];
```

Also update the `Eye` import — it's already imported. Replace the `Upload` in the import with `Home`:

Change line 2:
```tsx
import { Home, BarChart3, PanelLeftClose, PanelLeftOpen, Eye } from "lucide-react";
```

And update the MENU:
```tsx
const MENU = [
  { label: "홈", icon: Home, path: "/" },
  { label: "YouTube 대시보드", icon: BarChart3, path: "/youtube" },
  { label: "Instagram 대시보드", icon: Eye, path: "/instagram" },
];
```

- [ ] **Step 3: Update App.tsx routing**

Replace `frontend/src/App.tsx`:

```tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { HomePage } from "./pages/HomePage";
import { DashboardPage } from "./pages/DashboardPage";
import { InstagramDashboardPage } from "./pages/InstagramDashboardPage";
import { InstagramDataProvider } from "./contexts/InstagramDataContext";

function App() {
  return (
    <InstagramDataProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/youtube/dashboard" element={<DashboardPage />} />
            <Route path="/instagram/dashboard" element={<InstagramDashboardPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </InstagramDataProvider>
  );
}

export default App;
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/HomePage.tsx frontend/src/components/layout/Sidebar.tsx frontend/src/App.tsx
git commit -m "feat: add HomePage with dual upload, update routing and sidebar"
```

---

## Task 9: Frontend — Instagram 대시보드 컴포넌트 (9개)

**Files:**
- Create: `frontend/src/components/instagram/IgSummaryCards.tsx`
- Create: `frontend/src/components/instagram/IgInsightSummary.tsx`
- Create: `frontend/src/components/instagram/IgTopAccounts.tsx`
- Create: `frontend/src/components/instagram/IgHourlyChart.tsx`
- Create: `frontend/src/components/instagram/IgDayOfWeekChart.tsx`
- Create: `frontend/src/components/instagram/IgDailyChart.tsx`
- Create: `frontend/src/components/instagram/IgDmAnalysis.tsx`
- Create: `frontend/src/components/instagram/IgTopics.tsx`
- Create: `frontend/src/components/instagram/IgFollowNetwork.tsx`

- [ ] **Step 1: Create IgSummaryCards**

Create `frontend/src/components/instagram/IgSummaryCards.tsx`:

```tsx
import { Heart, MessageCircle, UserPlus, Eye } from "lucide-react";

interface Props {
  data: any;
}

export function IgSummaryCards({ data }: Props) {
  if (!data) return null;

  const cards = [
    { label: "총 좋아요", value: data.total_likes?.toLocaleString() ?? "0", sub: `게시물 ${data.post_likes ?? 0} + 스토리 ${data.story_likes ?? 0}`, icon: Heart, color: "var(--rose)" },
    { label: "DM 대화", value: data.total_conversations?.toLocaleString() ?? "0", sub: `총 ${data.total_messages?.toLocaleString() ?? 0}건 메시지`, icon: MessageCircle, color: "var(--accent)" },
    { label: "팔로잉", value: data.following_count?.toLocaleString() ?? "0", sub: "", icon: UserPlus, color: "var(--green)" },
    { label: "추정 콘텐츠 노출", value: data.content_viewed?.toLocaleString() ?? "0", sub: "광고 기반 추정치", icon: Eye, color: "var(--amber)" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <c.icon size={16} style={{ color: c.color }} />
            <span className="text-[13px] text-[var(--text-secondary)]">{c.label}</span>
          </div>
          <p className="text-[24px] font-bold text-[var(--text-primary)]">{c.value}</p>
          {c.sub && <p className="text-[12px] text-[var(--text-tertiary)] mt-1">{c.sub}</p>}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create IgInsightSummary**

Create `frontend/src/components/instagram/IgInsightSummary.tsx`:

```tsx
interface Props {
  data: any;
}

export function IgInsightSummary({ data }: Props) {
  if (!data || !Array.isArray(data) || data.length === 0) return null;

  return (
    <div className="card p-5">
      <div className="space-y-2">
        {data.map((item: any, i: number) => (
          <p key={i} className="text-[14px] text-[var(--text-primary)] leading-relaxed">
            <span className="mr-2">{item.icon}</span>
            <span dangerouslySetInnerHTML={{ __html: item.text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }} />
          </p>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create IgTopAccounts**

Create `frontend/src/components/instagram/IgTopAccounts.tsx`:

```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface Props {
  data: any;
}

export function IgTopAccounts({ data }: Props) {
  if (!data || !Array.isArray(data) || data.length === 0) return null;

  return (
    <div className="card p-5">
      <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-4">Top 소통 계정</h3>
      <ResponsiveContainer width="100%" height={Math.max(300, data.length * 40)}>
        <BarChart data={data} layout="vertical" margin={{ left: 80, right: 20 }}>
          <XAxis type="number" tick={{ fontSize: 12 }} />
          <YAxis dataKey="username" type="category" tick={{ fontSize: 12 }} width={80} />
          <Tooltip />
          <Legend />
          <Bar dataKey="likes" name="좋아요" stackId="a" fill="var(--rose)" />
          <Bar dataKey="story_likes" name="스토리" stackId="a" fill="var(--amber)" />
          <Bar dataKey="messages" name="DM" stackId="a" fill="var(--accent)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 4: Create IgHourlyChart**

Create `frontend/src/components/instagram/IgHourlyChart.tsx`:

```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  data: any;
}

export function IgHourlyChart({ data }: Props) {
  if (!data || !Array.isArray(data)) return null;

  return (
    <div className="card p-5">
      <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-4">시간대별 활동</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <XAxis dataKey="hour" tick={{ fontSize: 11 }} tickFormatter={(h) => `${h}시`} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip labelFormatter={(h) => `${h}시`} />
          <Bar dataKey="count" name="활동" fill="var(--accent)" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 5: Create IgDayOfWeekChart**

Create `frontend/src/components/instagram/IgDayOfWeekChart.tsx`:

```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  data: any;
}

export function IgDayOfWeekChart({ data }: Props) {
  if (!data || !Array.isArray(data)) return null;

  return (
    <div className="card p-5">
      <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-4">요일별 활동</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <XAxis dataKey="day" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="avg" name="일 평균" fill="var(--accent)" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 6: Create IgDailyChart**

Create `frontend/src/components/instagram/IgDailyChart.tsx`:

```tsx
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  data: any;
}

export function IgDailyChart({ data }: Props) {
  if (!data || !Array.isArray(data) || data.length === 0) return null;

  return (
    <div className="card p-5">
      <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-4">일별 활동 트렌드</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Line type="monotone" dataKey="count" name="활동" stroke="var(--accent)" strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 7: Create IgDmAnalysis**

Create `frontend/src/components/instagram/IgDmAnalysis.tsx`:

```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  data: any;
}

export function IgDmAnalysis({ data }: Props) {
  if (!data) return null;

  const total = (data.sent ?? 0) + (data.received ?? 0);
  const sentPct = total > 0 ? Math.round((data.sent / total) * 100) : 0;

  return (
    <div className="card p-5">
      <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-4">DM 활동 분석</h3>

      {/* Sent/Received ratio bar */}
      <div className="mb-6">
        <div className="flex justify-between text-[12px] text-[var(--text-secondary)] mb-1">
          <span>보낸 메시지 ({sentPct}%)</span>
          <span>받은 메시지 ({100 - sentPct}%)</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
          <div className="h-full bg-[var(--accent)]" style={{ width: `${sentPct}%` }} />
          <div className="h-full bg-[var(--amber)]" style={{ width: `${100 - sentPct}%` }} />
        </div>
      </div>

      {/* Top conversations */}
      {data.top_conversations && data.top_conversations.length > 0 && (
        <>
          <h4 className="text-[13px] font-medium text-[var(--text-secondary)] mb-3">Top 대화 상대</h4>
          <ResponsiveContainer width="100%" height={Math.max(200, data.top_conversations.length * 35)}>
            <BarChart data={data.top_conversations} layout="vertical" margin={{ left: 100, right: 20 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="conversation" type="category" tick={{ fontSize: 11 }} width={100} />
              <Tooltip />
              <Bar dataKey="count" name="메시지" fill="var(--accent)" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 8: Create IgTopics**

Create `frontend/src/components/instagram/IgTopics.tsx`:

```tsx
interface Props {
  data: any;
}

export function IgTopics({ data }: Props) {
  if (!data || !Array.isArray(data) || data.length === 0) return null;

  return (
    <div className="card p-5">
      <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-1">관심사 카테고리</h3>
      <p className="text-[12px] text-[var(--text-tertiary)] mb-4">Instagram이 추정한 관심사</p>
      <div className="flex flex-wrap gap-2">
        {data.map((topic: string, i: number) => (
          <span
            key={i}
            className="px-3 py-1.5 bg-[var(--accent-light)] text-[var(--accent)] text-[13px] rounded-full"
          >
            {topic}
          </span>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 9: Create IgFollowNetwork**

Create `frontend/src/components/instagram/IgFollowNetwork.tsx`:

```tsx
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  data: any;
}

export function IgFollowNetwork({ data }: Props) {
  if (!data) return null;

  const growth = data.monthly_growth ?? [];
  const unfollowed = data.recent_unfollowed ?? [];

  return (
    <div className="card p-5">
      <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-4">팔로우 네트워크 성장</h3>

      {growth.length > 0 && (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={growth}>
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="cumulative" name="누적 팔로잉" stroke="var(--green)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}

      {unfollowed.length > 0 && (
        <div className="mt-4">
          <h4 className="text-[13px] font-medium text-[var(--text-secondary)] mb-2">최근 언팔로우</h4>
          <div className="flex flex-wrap gap-2">
            {unfollowed.map((u: any, i: number) => (
              <span key={i} className="px-2 py-1 bg-gray-100 text-[12px] text-[var(--text-secondary)] rounded">
                @{u.username}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 10: Commit**

```bash
git add frontend/src/components/instagram/
git commit -m "feat: add 9 Instagram dashboard components"
```

---

## Task 10: Frontend — InstagramDashboardPage

**Files:**
- Create: `frontend/src/pages/InstagramDashboardPage.tsx`

- [ ] **Step 1: Create the page**

Create `frontend/src/pages/InstagramDashboardPage.tsx`:

```tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useInstagramData } from "../contexts/InstagramDataContext";
import { IgSummaryCards } from "../components/instagram/IgSummaryCards";
import { IgInsightSummary } from "../components/instagram/IgInsightSummary";
import { IgTopAccounts } from "../components/instagram/IgTopAccounts";
import { IgHourlyChart } from "../components/instagram/IgHourlyChart";
import { IgDayOfWeekChart } from "../components/instagram/IgDayOfWeekChart";
import { IgDailyChart } from "../components/instagram/IgDailyChart";
import { IgDmAnalysis } from "../components/instagram/IgDmAnalysis";
import { IgTopics } from "../components/instagram/IgTopics";
import { IgFollowNetwork } from "../components/instagram/IgFollowNetwork";
import { Loader2, RefreshCw, Upload } from "lucide-react";

export function InstagramDashboardPage() {
  const { data, fetchFromDb } = useInstagramData();
  const [loading, setLoading] = useState(false);
  const [noData, setNoData] = useState(false);

  useEffect(() => {
    // If context already has data, skip DB fetch
    if (data.summary) return;

    setLoading(true);
    fetchFromDb().then((found) => {
      if (!found) setNoData(true);
      setLoading(false);
    });
  }, [data.summary, fetchFromDb]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="text-[var(--accent)] animate-spin mb-4" />
        <p className="text-[14px] text-[var(--text-secondary)]">대시보드 불러오는 중...</p>
      </div>
    );
  }

  if (noData && !data.summary) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="card p-8 text-center max-w-sm">
          <Upload size={32} className="mx-auto mb-4 text-[var(--text-tertiary)]" />
          <p className="text-[16px] font-semibold text-[var(--text-primary)] mb-2">아직 데이터가 없습니다</p>
          <p className="text-[14px] text-[var(--text-secondary)] mb-6">Instagram 데이터를 먼저 업로드해주세요.</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-[14px] font-medium hover:opacity-90 transition-opacity"
          >
            업로드하러 가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-12">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-[24px] font-bold text-[var(--text-primary)]">Instagram 대시보드</h1>
        <Link
          to="/"
          className="flex items-center gap-2 px-4 py-2 text-[14px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={14} />
          새 분석
        </Link>
      </header>

      {/* Insights */}
      <div className="mb-4">
        <IgInsightSummary data={data.insights} />
      </div>

      {/* Summary Cards */}
      <div className="mb-6">
        <IgSummaryCards data={data.summary} />
      </div>

      {/* Top Accounts + DM Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <IgTopAccounts data={data.top_accounts} />
        <IgDmAnalysis data={data.dm_analysis} />
      </div>

      {/* Hourly + Day of Week */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <IgHourlyChart data={data.hourly} />
        <IgDayOfWeekChart data={data.day_of_week} />
      </div>

      {/* Daily trend */}
      <div className="mb-4">
        <IgDailyChart data={data.daily} />
      </div>

      {/* Topics + Follow Network */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <IgTopics data={data.topics} />
        <IgFollowNetwork data={data.follow_network} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/InstagramDashboardPage.tsx
git commit -m "feat: add Instagram dashboard page"
```

---

## Task 11: Integration Test — 전체 플로우 확인

**Files:**
- Create: `backend/tests/test_instagram_api.py`

- [ ] **Step 1: Write integration test**

Create `backend/tests/test_instagram_api.py`:

```python
import json
import zipfile
import io
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def _make_liked_posts(n: int = 3) -> list[dict]:
    return [
        {
            "timestamp": 1774681840 + i * 1000,
            "media": [],
            "label_values": [
                {"label": "URL", "value": f"https://www.instagram.com/p/{i}/"},
                {
                    "dict": [{"dict": [
                        {"label": "URL", "value": ""},
                        {"label": "\u00ec\u009d\u00b4\u00eb\u00a6\u0084", "value": f"User {i}"},
                        {"label": "\u00ec\u0082\u00ac\u00ec\u009a\u00a9\u00ec\u009e\u0090 \u00ec\u009d\u00b4\u00eb\u00a6\u0084", "value": f"user{i}"},
                    ], "title": ""}],
                    "title": "\u00ec\u0086\u008c\u00ec\u009c\u00a0\u00ec\u009e\u0090",
                }
            ],
            "fbid": str(i),
        }
        for i in range(n)
    ]


def _make_test_zip() -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr(
            "your_instagram_activity/likes/liked_posts.json",
            json.dumps(_make_liked_posts()),
        )
        zf.writestr(
            "your_instagram_activity/story_interactions/story_likes.json",
            json.dumps([]),
        )
        zf.writestr(
            "connections/followers_and_following/following.json",
            json.dumps({"relationships_following": []}),
        )
        zf.writestr(
            "preferences/your_topics/recommended_topics.json",
            json.dumps({"topics_your_topics": []}),
        )
    return buf.getvalue()


def test_upload_returns_sse_stream():
    zip_bytes = _make_test_zip()
    response = client.post(
        "/api/instagram/upload",
        files={"file": ("data.zip", zip_bytes, "application/zip")},
    )
    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]

    text = response.text
    assert "event: section" in text
    assert "event: done" in text
    assert '"name": "summary"' in text


def test_upload_rejects_non_zip():
    response = client.post(
        "/api/instagram/upload",
        files={"file": ("data.json", b'{"test": true}', "application/json")},
    )
    assert response.status_code == 400
```

- [ ] **Step 2: Run integration test**

Run: `cd /Users/wonjunjoe/Desktop/workspace/05_WatchLens/backend && python -m pytest tests/test_instagram_api.py -v`
Expected: PASS (may need mock for Supabase — if DB save fails, upload still returns SSE with data)

- [ ] **Step 3: Run all tests**

Run: `cd /Users/wonjunjoe/Desktop/workspace/05_WatchLens/backend && python -m pytest tests/ -v`
Expected: All PASS

- [ ] **Step 4: Commit**

```bash
git add backend/tests/test_instagram_api.py
git commit -m "test: add Instagram API integration tests"
```

---

## Task 12: Manual E2E Test

- [ ] **Step 1: Start backend**

Run: `cd /Users/wonjunjoe/Desktop/workspace/05_WatchLens/backend && uvicorn app.main:app --reload`

- [ ] **Step 2: Start frontend**

Run: `cd /Users/wonjunjoe/Desktop/workspace/05_WatchLens/frontend && npm run dev`

- [ ] **Step 3: Test the flow**

1. Open `http://localhost:5173`
2. Verify HomePage shows with YouTube + Instagram upload sections side-by-side
3. Upload the Instagram ZIP from `/Users/wonjunjoe/Downloads/instagram-on.xu_-2026-03-28-pKPtDOov` (zip it first if needed)
4. Verify SSE progress appears and "Instagram 대시보드 보기" button shows on completion
5. Click button → navigate to `/instagram/dashboard`
6. Verify all 9 sections render with data
7. Navigate away and back → verify data loads from context (no re-fetch)
8. Refresh page → verify data loads from DB

- [ ] **Step 4: Fix any issues found and commit**

```bash
git add -A
git commit -m "fix: address issues from E2E testing"
```

---

## Task 13: Final — DashboardPage 경로 업데이트

**Files:**
- Modify: `frontend/src/pages/DashboardPage.tsx:132`

The existing DashboardPage still has `<Link to="/">` for the "다시 시도" link. Update it so the "새 분석" button links to `/` (HomePage):

- [ ] **Step 1: Verify DashboardPage links**

Check that `DashboardPage.tsx` line 132 and line 153 already link to `/`. They do — no change needed since `/` is now HomePage.

- [ ] **Step 2: Final commit with all changes**

```bash
git add -A
git commit -m "feat: complete Instagram dashboard integration"
```
