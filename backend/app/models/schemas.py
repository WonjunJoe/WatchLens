from pydantic import BaseModel


class WatchUploadResponse(BaseModel):
    total: int
    skipped: int
    period: str
    original_file_stored: bool


class SearchUploadResponse(BaseModel):
    total: int
    skipped: int
    period: str
    original_file_stored: bool


class SummaryStats(BaseModel):
    total_watched: int
    total_channels: int
    period: str
    daily_average: float
    shorts_count: int


class HourlyCount(BaseModel):
    hour: int
    count: int


class DailyCount(BaseModel):
    date: str
    count: int


class ChannelCount(BaseModel):
    channel_name: str
    count: int


class TopChannelsSplit(BaseModel):
    longform: list[ChannelCount]
    shorts: list[ChannelCount]


class ShortsStats(BaseModel):
    shorts_count: int
    regular_count: int
    shorts_ratio: float
    daily_trend: list[dict]


class CategoryCount(BaseModel):
    category_name: str
    count: int


class CategorySplit(BaseModel):
    longform: list[CategoryCount]
    shorts: list[CategoryCount]


class KeywordCount(BaseModel):
    keyword: str
    count: int


class WatchTimeStats(BaseModel):
    total_min_hours: float
    total_max_hours: float
    daily_min_hours: float
    daily_max_hours: float
    gap_based_count: int
    estimated_count: int


class BingeSession(BaseModel):
    start_time: str
    end_time: str
    video_count: int
    duration_minutes: int
    channels: list[str]


class BingeStats(BaseModel):
    sessions: list[BingeSession]
    total_binge_videos: int
    total_binge_hours: float


class WeeklyComparison(BaseModel):
    week_label: str     # e.g. "01/06 ~ 01/12"
    total: int
    shorts: int
    longform: int
    daily_avg: float


class DiversityStats(BaseModel):
    top5_concentration: float    # top-5 channels as % of total views
    top5_channels: list[dict]    # [{name, count, percent}]
    unique_channels: int
    total_views: int
    entropy_normalized: float    # 0 = one channel, 1 = perfectly spread


class DopamineStats(BaseModel):
    score: int                    # 0-100
    grade: str                    # e.g. "높음", "보통", "낮음"
    breakdown: dict               # {factor_name: {value, score, weight, description}}


class InsightItem(BaseModel):
    icon: str       # emoji or symbol
    text: str


class PeriodInfo(BaseModel):
    date_from: str
    date_to: str
    total_days: int
