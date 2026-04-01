from app.models.schemas import ParseResult
from app.utils import parse_period
from config.settings import SUPPORTED_HEADERS, SEARCH_TITLE_PREFIX, SEARCH_TITLE_SUFFIX_KO, DEFAULT_USER_ID


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

        # Extract query from English or Korean format
        if title.startswith(SEARCH_TITLE_PREFIX):
            query = title[len(SEARCH_TITLE_PREFIX):]
        elif title.endswith(SEARCH_TITLE_SUFFIX_KO):
            query = title[: -len(SEARCH_TITLE_SUFFIX_KO)]
        else:
            skipped += 1
            continue
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
