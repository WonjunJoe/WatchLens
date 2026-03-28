from dataclasses import dataclass, field
from pydantic import BaseModel


class UploadResponse(BaseModel):
    total: int
    skipped: int
    period: str
    original_file_stored: bool


class PeriodInfo(BaseModel):
    date_from: str
    date_to: str
    total_days: int


@dataclass
class ParseResult:
    records: list = field(default_factory=list)
    total: int = 0
    skipped: int = 0
    period: str = ""
