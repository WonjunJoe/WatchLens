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


class ShortsStats(BaseModel):
    shorts_count: int
    regular_count: int
    shorts_ratio: float
    weekly_trend: list[dict]


class CategoryCount(BaseModel):
    category_name: str
    count: int


class KeywordCount(BaseModel):
    keyword: str
    count: int
