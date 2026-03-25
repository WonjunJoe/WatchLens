from app.parsers.search_history import parse_search_history

def test_parse_normal_record():
    raw = [{
        "header": "YouTube",
        "title": "Searched for claude code",
        "titleUrl": "https://www.youtube.com/results?search_query\u003dclaude+code",
        "time": "2026-02-03T08:25:27.538Z",
        "products": ["YouTube"],
        "activityControls": ["YouTube search history"]
    }]
    result = parse_search_history(raw)
    assert result.total == 1
    assert result.skipped == 0
    assert result.records[0]["query"] == "claude code"

def test_skip_non_youtube_header():
    raw = [{
        "header": "Google Play",
        "title": "Searched for something",
        "titleUrl": "https://example.com",
        "time": "2026-01-15T10:00:00.000Z",
        "products": ["Google Play"],
    }]
    result = parse_search_history(raw)
    assert result.total == 0
    assert result.skipped == 1

def test_skip_non_searched_prefix():
    raw = [{
        "header": "YouTube",
        "title": "Visited some page",
        "titleUrl": "https://www.youtube.com/results?search_query\u003dtest",
        "time": "2026-01-15T10:00:00.000Z",
        "products": ["YouTube"],
        "activityControls": ["YouTube search history"]
    }]
    result = parse_search_history(raw)
    assert result.total == 0
    assert result.skipped == 1

def test_no_title_url():
    raw = [{
        "header": "YouTube",
        "title": "Searched for 테스트 검색어",
        "time": "2026-01-15T10:00:00.000Z",
        "products": ["YouTube"],
        "activityControls": ["YouTube search history"]
    }]
    result = parse_search_history(raw)
    assert result.total == 1
    assert result.records[0]["query"] == "테스트 검색어"
    assert result.records[0]["search_url"] is None

def test_empty_input():
    result = parse_search_history([])
    assert result.total == 0
    assert result.skipped == 0
    assert result.period == ""

def test_search_period_calculation():
    raw = [
        {
            "header": "YouTube",
            "title": "Searched for first",
            "titleUrl": "https://www.youtube.com/results?search_query\u003dfirst",
            "time": "2023-05-19T10:00:00.000Z",
            "products": ["YouTube"],
            "activityControls": ["YouTube search history"]
        },
        {
            "header": "YouTube",
            "title": "Searched for last",
            "titleUrl": "https://www.youtube.com/results?search_query\u003dlast",
            "time": "2026-02-03T10:00:00.000Z",
            "products": ["YouTube"],
            "activityControls": ["YouTube search history"]
        },
    ]
    result = parse_search_history(raw)
    assert result.period == "2023-05-19 ~ 2026-02-03"
