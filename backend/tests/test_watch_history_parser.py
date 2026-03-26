from app.parsers.watch_history import parse_watch_history, extract_video_id

def test_parse_normal_record():
    raw = [{
        "header": "YouTube",
        "title": "Watched 테스트 영상 제목",
        "titleUrl": "https://www.youtube.com/watch?v\u003dABC123",
        "subtitles": [{"name": "테스트채널", "url": "https://www.youtube.com/channel/UC123"}],
        "time": "2026-01-15T14:32:00.000Z",
        "products": ["YouTube"],
        "activityControls": ["YouTube watch history"]
    }]
    result = parse_watch_history(raw)
    assert result.total == 1
    assert result.skipped == 0
    assert len(result.records) == 1
    rec = result.records[0]
    assert rec["video_id"] == "ABC123"
    assert rec["video_title"] == "테스트 영상 제목"
    assert rec["channel_name"] == "테스트채널"

def test_skip_no_title_url():
    raw = [{
        "header": "YouTube",
        "title": "Viewed a post that is no longer available",
        "time": "2026-01-15T17:00:00.000Z",
        "products": ["YouTube"],
        "activityControls": ["YouTube watch history"]
    }]
    result = parse_watch_history(raw)
    assert result.total == 0
    assert result.skipped == 1

def test_skip_non_youtube_header():
    raw = [{
        "header": "Google Play",
        "title": "Watched something",
        "titleUrl": "https://example.com",
        "time": "2026-01-15T17:00:00.000Z",
        "products": ["Google Play"],
    }]
    result = parse_watch_history(raw)
    assert result.total == 0
    assert result.skipped == 1

def test_skip_non_watched_prefix():
    raw = [{
        "header": "YouTube",
        "title": "Visited some page",
        "titleUrl": "https://www.youtube.com/watch?v\u003dXYZ",
        "time": "2026-01-15T17:00:00.000Z",
        "products": ["YouTube"],
        "activityControls": ["YouTube watch history"]
    }]
    result = parse_watch_history(raw)
    assert result.total == 0
    assert result.skipped == 1

def test_no_subtitles():
    raw = [{
        "header": "YouTube",
        "title": "Watched 채널 없는 영상",
        "titleUrl": "https://www.youtube.com/watch?v\u003dNOCH",
        "time": "2026-01-15T18:00:00.000Z",
        "products": ["YouTube"],
        "activityControls": ["YouTube watch history"]
    }]
    result = parse_watch_history(raw)
    assert result.total == 1
    assert result.records[0]["channel_name"] is None

def test_video_id_from_youtu_be():
    raw = [{
        "header": "YouTube",
        "title": "Watched 짧은 URL 영상",
        "titleUrl": "https://youtu.be/SHORT123",
        "subtitles": [{"name": "채널", "url": "https://www.youtube.com/channel/UC"}],
        "time": "2026-01-15T19:00:00.000Z",
        "products": ["YouTube"],
        "activityControls": ["YouTube watch history"]
    }]
    result = parse_watch_history(raw)
    assert result.records[0]["video_id"] == "SHORT123"

def test_video_id_from_shorts_url():
    raw = [{
        "header": "YouTube",
        "title": "Watched 쇼츠 영상",
        "titleUrl": "https://www.youtube.com/shorts/GHI789",
        "subtitles": [{"name": "채널", "url": "https://www.youtube.com/channel/UC789"}],
        "time": "2026-01-15T16:00:00.000Z",
        "products": ["YouTube"],
        "activityControls": ["YouTube watch history"]
    }]
    result = parse_watch_history(raw)
    assert result.records[0]["video_id"] == "GHI789"

def test_video_id_with_extra_params():
    raw = [{
        "header": "YouTube",
        "title": "Watched 파라미터 있는 영상",
        "titleUrl": "https://www.youtube.com/watch?v\u003dABC123&t\u003d30",
        "subtitles": [{"name": "채널", "url": "https://www.youtube.com/channel/UC"}],
        "time": "2026-01-15T15:00:00.000Z",
        "products": ["YouTube"],
        "activityControls": ["YouTube watch history"]
    }]
    result = parse_watch_history(raw)
    assert result.records[0]["video_id"] == "ABC123"

def test_video_id_unknown_url_pattern():
    raw = [{
        "header": "YouTube",
        "title": "Watched 플레이리스트",
        "titleUrl": "https://www.youtube.com/playlist?list\u003dPLxxx",
        "subtitles": [{"name": "채널", "url": "https://www.youtube.com/channel/UC"}],
        "time": "2026-01-15T15:00:00.000Z",
        "products": ["YouTube"],
        "activityControls": ["YouTube watch history"]
    }]
    result = parse_watch_history(raw)
    assert result.records[0]["video_id"] is None

def test_empty_input():
    result = parse_watch_history([])
    assert result.total == 0
    assert result.skipped == 0
    assert result.period == ""

def test_watch_period_calculation():
    raw = [
        {
            "header": "YouTube",
            "title": "Watched 첫번째",
            "titleUrl": "https://www.youtube.com/watch?v\u003dA",
            "time": "2026-01-10T10:00:00.000Z",
            "products": ["YouTube"],
            "activityControls": ["YouTube watch history"]
        },
        {
            "header": "YouTube",
            "title": "Watched 두번째",
            "titleUrl": "https://www.youtube.com/watch?v\u003dB",
            "time": "2026-02-20T10:00:00.000Z",
            "products": ["YouTube"],
            "activityControls": ["YouTube watch history"]
        },
    ]
    result = parse_watch_history(raw)
    assert result.period == "2026-01-10 ~ 2026-02-20"
