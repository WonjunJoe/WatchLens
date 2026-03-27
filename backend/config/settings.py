# backend/config/settings.py

MAX_FILE_SIZE_MB = 50
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

SUPPORTED_HEADERS = ["YouTube"]

WATCH_TITLE_PREFIX = "Watched "
SEARCH_TITLE_PREFIX = "Searched for "

DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000"

SUPABASE_STORAGE_BUCKET = "takeout-backups"

# Timezone offset (hours from UTC). KST = +9
USER_TZ_OFFSET_HOURS = 9

YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3/videos"
YOUTUBE_BATCH_SIZE = 50
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
