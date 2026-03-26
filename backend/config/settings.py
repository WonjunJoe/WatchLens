# backend/config/settings.py

MAX_FILE_SIZE_MB = 50
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

SUPPORTED_HEADERS = ["YouTube"]

WATCH_TITLE_PREFIX = "Watched "
SEARCH_TITLE_PREFIX = "Searched for "

DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000"

SUPABASE_STORAGE_BUCKET = "takeout-backups"

YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3/videos"
YOUTUBE_BATCH_SIZE = 50
SHORTS_MAX_DURATION_SECONDS = 60

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
