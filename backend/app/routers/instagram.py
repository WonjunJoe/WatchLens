import json
from collections import Counter
from collections.abc import Generator
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import StreamingResponse, JSONResponse
from app.parsers.instagram import parse_instagram_zip
from app.services.instagram_stats import (
    compute_ig_summary,
    compute_ig_hourly,
    compute_ig_daily,
    compute_ig_day_of_week,
    compute_ig_top_accounts,
    compute_ig_dm_analysis,
    compute_ig_follow_network,
)
from app.services.instagram_insights import generate_ig_insights
from app.db.repository import save_instagram_results, fetch_instagram_results
from app.utils import sse
from config.settings import MAX_ZIP_SIZE_BYTES, DEFAULT_USER_ID

router = APIRouter(prefix="/api/instagram", tags=["instagram"])


def _detect_my_username(messages: list[dict]) -> str:
    """Detect the user's display name from DM sender_name frequency."""
    if not messages:
        return ""
    conv_senders: dict[str, set] = {}
    for m in messages:
        conv_senders.setdefault(m["conversation"], set()).add(m["sender"])

    name_conv_count = Counter()
    for conv, senders in conv_senders.items():
        for s in senders:
            name_conv_count[s] += 1

    if name_conv_count:
        return name_conv_count.most_common(1)[0][0]
    return ""


def _instagram_upload_stream(zip_bytes: bytes) -> Generator[str, None, None]:
    total_sections = 9
    loaded = 0

    yield sse("progress", {"step": "ZIP 압축 해제 및 파싱 중...", "loaded": 0, "total": total_sections})

    try:
        parsed = parse_instagram_zip(zip_bytes)
    except Exception as e:
        yield sse("error", {"detail": f"ZIP 파싱 실패: {str(e)}"})
        return

    liked = parsed["liked_posts"]
    story = parsed["story_likes"]
    msgs = parsed["messages"]
    following = parsed["following"]
    unfollowed = parsed["unfollowed"]
    viewed = parsed["posts_viewed"] + parsed["videos_watched"]
    topics = parsed["topics"]

    my_username = _detect_my_username(msgs)

    yield sse("progress", {"step": "KPI 계산 중...", "loaded": 0, "total": total_sections})

    # 1. Summary
    summary = compute_ig_summary(liked, story, msgs, following, viewed)
    loaded += 1
    yield sse("section", {"name": "summary", "data": summary, "loaded": loaded, "total": total_sections})

    # 2. Top accounts
    top_accounts = compute_ig_top_accounts(liked, story, msgs, my_username)
    loaded += 1
    yield sse("section", {"name": "top_accounts", "data": top_accounts, "loaded": loaded, "total": total_sections})

    # 3. Hourly
    hourly = compute_ig_hourly(liked, story, msgs)
    loaded += 1
    yield sse("section", {"name": "hourly", "data": hourly, "loaded": loaded, "total": total_sections})

    # 4. Day of week
    day_of_week = compute_ig_day_of_week(liked, story, msgs)
    loaded += 1
    yield sse("section", {"name": "day_of_week", "data": day_of_week, "loaded": loaded, "total": total_sections})

    # 5. Daily trend
    daily = compute_ig_daily(liked, story, msgs)
    loaded += 1
    yield sse("section", {"name": "daily", "data": daily, "loaded": loaded, "total": total_sections})

    # 6. DM analysis
    dm_analysis = compute_ig_dm_analysis(msgs, my_username)
    loaded += 1
    yield sse("section", {"name": "dm_analysis", "data": dm_analysis, "loaded": loaded, "total": total_sections})

    # 7. Topics
    loaded += 1
    yield sse("section", {"name": "topics", "data": topics, "loaded": loaded, "total": total_sections})

    # 8. Follow network
    follow_network = compute_ig_follow_network(following, unfollowed)
    loaded += 1
    yield sse("section", {"name": "follow_network", "data": follow_network, "loaded": loaded, "total": total_sections})

    # 9. Insights
    insights = generate_ig_insights(summary, hourly, top_accounts, dm_analysis)
    loaded += 1
    yield sse("section", {"name": "insights", "data": insights, "loaded": loaded, "total": total_sections})

    # Save results to DB
    all_results = {
        "summary": summary,
        "top_accounts": top_accounts,
        "hourly": hourly,
        "day_of_week": day_of_week,
        "daily": daily,
        "dm_analysis": dm_analysis,
        "topics": topics,
        "follow_network": follow_network,
        "insights": insights,
    }
    try:
        save_instagram_results(DEFAULT_USER_ID, all_results)
    except Exception:
        pass  # DB save failure is non-fatal

    yield sse("done", {"loaded": total_sections, "total": total_sections})


@router.post("/upload")
async def upload_instagram(file: UploadFile = File(...)):
    if not file.filename or not file.filename.endswith(".zip"):
        raise HTTPException(400, "ZIP 파일만 업로드 가능합니다")
    file_bytes = await file.read()
    if len(file_bytes) > MAX_ZIP_SIZE_BYTES:
        raise HTTPException(413, f"파일 크기가 {MAX_ZIP_SIZE_BYTES // (1024*1024)}MB를 초과합니다")
    return StreamingResponse(_instagram_upload_stream(file_bytes), media_type="text/event-stream")


@router.get("/dashboard")
def get_instagram_dashboard(user_id: str = Query(default=DEFAULT_USER_ID)):
    results = fetch_instagram_results(user_id)
    if not results:
        raise HTTPException(404, "저장된 Instagram 대시보드가 없습니다")
    return JSONResponse(content=results)
