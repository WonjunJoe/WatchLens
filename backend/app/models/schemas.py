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
