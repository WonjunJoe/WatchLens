import json
from collections import Counter
from collections.abc import Generator
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
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
    compute_ig_engagement_balance,
    compute_ig_dm_balance,
    compute_ig_following_cleanup,
    compute_ig_lurker_index,
    compute_ig_video_trend,
    compute_ig_late_night,
    compute_ig_unfollow_timeline,
)
from app.services.instagram_insights import generate_ig_insights
from app.db.repository import save_instagram_results, fetch_instagram_results
from app.utils import sse
from config.settings import MAX_ZIP_SIZE_BYTES
from app.auth import get_current_user

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


def _instagram_upload_stream(zip_bytes: bytes, user_id: str) -> Generator[str, None, None]:
    try:
        total_sections = 16
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

        # 9. Engagement balance
        engagement_balance = compute_ig_engagement_balance(liked, story, msgs, my_username)
        loaded += 1
        yield sse("section", {"name": "engagement_balance", "data": engagement_balance, "loaded": loaded, "total": total_sections})

        # 10. DM balance
        dm_balance = compute_ig_dm_balance(msgs, my_username)
        loaded += 1
        yield sse("section", {"name": "dm_balance", "data": dm_balance, "loaded": loaded, "total": total_sections})

        # 11. Following cleanup
        following_cleanup = compute_ig_following_cleanup(following, liked, story, msgs, my_username)
        loaded += 1
        yield sse("section", {"name": "following_cleanup", "data": following_cleanup, "loaded": loaded, "total": total_sections})

        # 12. Lurker index
        lurker_index = compute_ig_lurker_index(liked, story, msgs, viewed)
        loaded += 1
        yield sse("section", {"name": "lurker_index", "data": lurker_index, "loaded": loaded, "total": total_sections})

        # 13. Video trend
        video_trend = compute_ig_video_trend(parsed["posts_viewed"], parsed["videos_watched"])
        loaded += 1
        yield sse("section", {"name": "video_trend", "data": video_trend, "loaded": loaded, "total": total_sections})

        # 14. Late night
        late_night = compute_ig_late_night(liked, story, msgs, my_username)
        loaded += 1
        yield sse("section", {"name": "late_night", "data": late_night, "loaded": loaded, "total": total_sections})

        # 15. Unfollow timeline
        unfollow_timeline = compute_ig_unfollow_timeline(parsed["unfollowed"], liked, story, msgs, my_username)
        loaded += 1
        yield sse("section", {"name": "unfollow_timeline", "data": unfollow_timeline, "loaded": loaded, "total": total_sections})

        # 16. Insights
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
            "engagement_balance": engagement_balance,
            "dm_balance": dm_balance,
            "following_cleanup": following_cleanup,
            "lurker_index": lurker_index,
            "video_trend": video_trend,
            "late_night": late_night,
            "unfollow_timeline": unfollow_timeline,
            "insights": insights,
        }
        try:
            save_instagram_results(user_id, all_results)
        except Exception:
            yield sse("warning", {"message": "대시보드 결과 캐시 저장 실패 (분석 결과에는 영향 없음)"})

        yield sse("done", {"loaded": total_sections, "total": total_sections})
    except Exception as e:
        yield sse("error", {"message": f"Instagram 분석 중 오류: {str(e)}"})


@router.post("/upload")
async def upload_instagram(file: UploadFile = File(...), user_id: str = Depends(get_current_user)):
    if not file.filename or not file.filename.endswith(".zip"):
        raise HTTPException(400, "ZIP 파일만 업로드 가능합니다")
    file_bytes = await file.read()
    if len(file_bytes) > MAX_ZIP_SIZE_BYTES:
        raise HTTPException(413, f"파일 크기가 {MAX_ZIP_SIZE_BYTES // (1024*1024)}MB를 초과합니다")
    return StreamingResponse(_instagram_upload_stream(file_bytes, user_id), media_type="text/event-stream")


@router.get("/dashboard")
def get_instagram_dashboard(user_id: str = Depends(get_current_user)):
    results = fetch_instagram_results(user_id)
    if not results:
        raise HTTPException(404, "저장된 Instagram 대시보드가 없습니다")
    return JSONResponse(content=results)
