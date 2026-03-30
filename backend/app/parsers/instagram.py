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


_USERNAME_LABELS = {"사용자 이름", "Username", "Nom d'utilisateur", "Benutzername", "ユーザーネーム"}


def _extract_username(label_values: list[dict]) -> str | None:
    """Extract username from Instagram's nested label_values structure."""
    for item in label_values:
        if "dict" in item and isinstance(item["dict"], list):
            for group in item["dict"]:
                if "dict" in group and isinstance(group["dict"], list):
                    for field in group["dict"]:
                        label = fix_encoding(field.get("label", ""))
                        if label in _USERNAME_LABELS:
                            return field.get("value")
    return None


def parse_liked_posts(data: list[dict]) -> list[dict]:
    """Parse liked_posts.json -> [{username, timestamp}]"""
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
    """Parse story_likes.json -> [{username, timestamp}]"""
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
    """Parse message data -> [{sender, timestamp, conversation, participant_count}]"""
    records = []
    for conv_id, conv_data in conversations.items():
        title = fix_encoding(conv_data.get("title", conv_id))
        participant_count = len(conv_data.get("participants", []))
        for msg in conv_data.get("messages", []):
            sender = fix_encoding(msg.get("sender_name", ""))
            records.append({
                "sender": sender,
                "timestamp": msg["timestamp_ms"] // 1000,
                "conversation": title,
                "participant_count": participant_count,
            })
    return records


def parse_following(data: dict) -> list[dict]:
    """Parse following.json -> [{username, timestamp}]"""
    records = []
    for item in data.get("relationships_following", []):
        username = item.get("title", "")
        ts = 0
        if item.get("string_list_data"):
            ts = item["string_list_data"][0].get("timestamp", 0)
        records.append({"username": fix_encoding(username), "timestamp": ts})
    return records


def parse_unfollowed(data: dict) -> list[dict]:
    """Parse recently_unfollowed_profiles.json -> [{username, timestamp}]"""
    records = []
    for item in data.get("relationships_unfollowed_users", []):
        username = item.get("title", "")
        ts = 0
        if item.get("string_list_data"):
            ts = item["string_list_data"][0].get("timestamp", 0)
        records.append({"username": fix_encoding(username), "timestamp": ts})
    return records


def parse_content_viewed(data: list[dict]) -> list[dict]:
    """Parse posts_viewed.json or videos_watched.json -> [{username, timestamp}]"""
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
    """Parse recommended_topics.json -> [topic_name, ...]"""
    topics = []
    for item in data.get("topics_your_topics", []):
        smd = item.get("string_map_data", {})
        for key, val in smd.items():
            if val.get("value"):
                topics.append(val["value"])
    return topics


def _read_json_from_zip(zf: zipfile.ZipFile, path: str) -> any:
    """Read and parse a JSON file from the ZIP, returning None if not found."""
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
    """Parse Instagram ZIP export and return all extracted data."""
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
