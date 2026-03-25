from pydantic import BaseModel


class WatchUploadResponse(BaseModel):
    total: int
    skipped: int
    shorts: int
    period: str
    original_file_stored: bool


class SearchUploadResponse(BaseModel):
    total: int
    skipped: int
    period: str
    original_file_stored: bool
