# backend/config/settings.py

MAX_FILE_SIZE_MB = 50
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

SUPPORTED_HEADERS = ["YouTube"]

MAX_YOUTUBE_ZIP_SIZE_MB = 500
MAX_YOUTUBE_ZIP_SIZE_BYTES = MAX_YOUTUBE_ZIP_SIZE_MB * 1024 * 1024

# Paths inside Google Takeout ZIP to search for
TAKEOUT_WATCH_HISTORY_PATTERNS = [
    "YouTube and YouTube Music/history/watch-history.json",
    "YouTube 및 YouTube Music/history/watch-history.json",
]
TAKEOUT_SEARCH_HISTORY_PATTERNS = [
    "YouTube and YouTube Music/history/search-history.json",
    "YouTube 및 YouTube Music/history/search-history.json",
]

WATCH_TITLE_PREFIX = "Watched "
SEARCH_TITLE_PREFIX = "Searched for "

DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000"

SUPABASE_STORAGE_BUCKET = "takeout-backups"

# Timezone offset (hours from UTC). KST = +9
USER_TZ_OFFSET_HOURS = 9

YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3/videos"
YOUTUBE_BATCH_SIZE = 50
DB_CHUNK_SIZE = 500
DB_PAGE_SIZE = 1000  # Pagination size for fetching rows from Supabase
SHORTS_MAX_DURATION_SECONDS = 180

# Watch time estimation
WATCH_TIME_CAP_SECONDS = 3600  # Cap video duration at 1 hour for estimation
AVG_RETENTION_SHORTS = 0.85
AVG_RETENTION_LONGFORM = 0.5

# Dopamine index weights (sum = 100)
# Score 0-100: higher = more dopamine-seeking pattern
DOPAMINE_WEIGHTS = {
    "shorts_ratio": 40,        # High Shorts ratio → higher dopamine
    "late_night_ratio": 30,    # Late night (22:00-04:00) viewing ratio
    "short_duration": 30,      # Average viewed duration under 5 min
}
LATE_NIGHT_HOURS = list(range(22, 24)) + list(range(0, 4))  # 22:00-03:59

# Binge session detection
BINGE_GAP_MINUTES = 30   # Max gap between consecutive watches in one session
BINGE_MIN_COUNT = 5      # Minimum videos in a session to qualify as "binge"

YOUTUBE_CATEGORY_MAP = {
    1: "Film & Animation",
    2: "Autos & Vehicles",
    10: "Music",
    15: "Pets & Animals",
    17: "Sports",
    19: "Travel & Events",
    20: "Gaming",
    22: "People & Blogs",
    23: "Comedy",
    24: "Entertainment",
    25: "News & Politics",
    26: "Howto & Style",
    27: "Education",
    28: "Science & Technology",
    29: "Nonprofits & Activism",
}

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
MAX_ZIP_SIZE_MB = 500
MAX_ZIP_SIZE_BYTES = MAX_ZIP_SIZE_MB * 1024 * 1024

# ---------------------------------------------------------------------------
# Wellbeing
# ---------------------------------------------------------------------------
WELLBEING_WEIGHTS = {
    "dopamine": 30,
    "binge": 15,
    "watch_intensity": 15,
    "lurker": 20,
    "late_night": 20,
}
WELLBEING_GRADE_THRESHOLDS = [(80, "매우 건강"), (60, "양호"), (40, "주의"), (20, "경고"), (0, "위험")]
BINGE_SCORE_MULTIPLIER = 2
WATCH_INTENSITY_MAX_HOURS = 4
LATE_NIGHT_SCORE_MULTIPLIER = 2
