from app.models.schemas import ParseResult
from app.utils import parse_period
from config.settings import SUPPORTED_HEADERS, SEARCH_TITLE_PREFIX, DEFAULT_USER_ID


def parse_search_history(data: list[dict]) -> ParseResult:
    records = []
    skipped = 0
    timestamps = []

    for entry in data:
        header = entry.get("header", "")
        if header not in SUPPORTED_HEADERS:
            skipped += 1
            continue

        title = entry.get("title", "")
        if not title.startswith(SEARCH_TITLE_PREFIX):
            skipped += 1
            continue

        query = title[len(SEARCH_TITLE_PREFIX):]
        search_url = entry.get("titleUrl")
        time_str = entry["time"]
        timestamps.append(time_str)

        records.append({
            "user_id": DEFAULT_USER_ID,
            "query": query,
            "search_url": search_url,
            "searched_at": time_str,
        })

    return ParseResult(
        records=records,
        total=len(records),
        skipped=skipped,
        period=parse_period(timestamps),
    )
