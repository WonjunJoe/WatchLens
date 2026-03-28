# WatchLens 데이터 소스 매핑 & 신뢰도 평가

> 각 대시보드 KPI가 어떤 파일에서 추출되는지, 그리고 해당 데이터가 얼마나 신뢰할 수 있는지 정리한 문서.

---

## YouTube (Google Takeout)

### 소스 파일

| 파일 | 설명 | 대시보드 KPI |
|---|---|---|
| `Takeout/YouTube/history/watch-history.json` | 시청한 영상 기록 (제목, 채널, URL, 타임스탬프) | Summary, Hourly, Daily, Top Channels, Shorts, Categories, Watch Time, Weekly, Dopamine, Day of Week, Viewer Type, Insights |
| `Takeout/YouTube/history/search-history.json` | 검색 기록 (쿼리, 타임스탬프) | Search Keywords |

### 신뢰도 평가

#### watch-history.json — 신뢰도: **HIGH**

- **의미**: YouTube에서 재생이 시작된 모든 영상. 사용자가 클릭한 것뿐 아니라 **자동재생(autoplay) 영상도 포함**.
- **완전성**: Watch History 설정이 켜져 있으면 계정 생성 시점까지 거의 완벽하게 기록됨. 일시정지 기간은 공백.
- **알려진 제한**:
  - 자동재생 영상이 포함되어 의도적 시청과 패시브 시청 구분 불가
  - 삭제된 영상은 "Watched a video that has been removed"로 표시 (제목/URL 없음)
  - 시청 시작 시점만 기록, 시청 시간(duration watched)은 없음
  - 동일 영상 반복 시청 시 각각 별도 엔트리
  - 외부 사이트 임베드 영상도 포함
- **분석 시 주의**: 자동재생 오염 가능성. 연속으로 같은 채널이 나오면 autoplay일 수 있음.

#### search-history.json — 신뢰도: **HIGH**

- **의미**: YouTube 검색창에서 실제 검색(Enter)한 쿼리. 직접적 사용자 행동.
- **완전성**: Search History 설정이 켜져 있으면 완벽.
- **알려진 제한**:
  - 검색 후 클릭한 결과 정보는 없음
  - 일시정지 기간 표시 없음
- **분석 시 주의**: 가장 깨끗한 데이터. 별도 전처리 불필요.

---

## Instagram (데이터 다운로드)

### 소스 파일

| 파일 경로 | 설명 | 대시보드 KPI | 신뢰도 |
|---|---|---|---|
| `your_instagram_activity/likes/liked_posts.json` | 좋아요 누른 게시물 | Summary, Top 소통 계정, Hourly, Daily, Day of Week | HIGH |
| `your_instagram_activity/story_interactions/story_likes.json` | 스토리 좋아요 | Summary, Top 소통 계정, Hourly, Daily, Day of Week | HIGH |
| `your_instagram_activity/messages/inbox/*/message_*.json` | DM 대화 내역 | Summary, Top 소통 계정, DM 분석, Hourly, Daily, Day of Week | MEDIUM-HIGH |
| `connections/followers_and_following/following.json` | 팔로잉 목록 | Summary, 팔로우 네트워크 성장 | HIGH |
| `connections/followers_and_following/recently_unfollowed_profiles.json` | 최근 언팔 목록 | 팔로우 네트워크 성장 (보조) | LOW-MEDIUM |
| `ads_information/ads_and_topics/posts_viewed.json` | 노출된 게시물 (광고 추적 기반) | 추정 콘텐츠 노출 (광고 기반) | LOW |
| `ads_information/ads_and_topics/videos_watched.json` | 노출된 영상 (광고 추적 기반) | 추정 콘텐츠 노출 (광고 기반) | LOW |
| `preferences/your_topics/recommended_topics.json` | 알고리즘 추정 관심사 | 관심사 카테고리 | LOW |

### 신뢰도 평가 상세

#### liked_posts.json — 신뢰도: **HIGH**

- **의미**: 사용자가 직접 좋아요(더블탭/하트)를 누른 게시물. 명확한 사용자 행동.
- **완전성**: 계정 전체 기간의 좋아요 기록. 단, **좋아요 취소한 게시물은 제거됨** (현재 상태만 반영).
- **알려진 제한**:
  - 좋아요 취소 이력은 추적 불가
  - 원본 게시물이 삭제되어도 엔트리는 남지만 메타데이터 제한적
- **분석 시 주의**: 신뢰도 높음. 타임스탬프(unix seconds) 기반 시간 분석에 적합.

#### story_likes.json — 신뢰도: **HIGH**

- **의미**: 스토리에 하트 반응을 보낸 기록. 2022년경 도입된 기능.
- **완전성**: 기능 도입 이후 완전. 스토리가 24시간 후 만료되어도 좋아요 기록은 유지.
- **알려진 제한**:
  - 2022년 이전 데이터 없음 (기능 자체가 없었음)
  - 스토리 내용/미디어 참조 없음, 작성자 username + 타임스탬프만
- **분석 시 주의**: 신뢰도 높지만 히스토리 깊이가 ~2년으로 제한됨.

#### messages/inbox — 신뢰도: **MEDIUM-HIGH**

- **의미**: DM 전체 대화 기록. 텍스트, 공유된 게시물/릴스, 사진, 리액션 포함.
- **완전성**: 인박스에 남아있는 대화는 완전. **삭제(unsend)한 메시지와 사라지는 모드(vanish mode) 메시지는 미포함**.
- **알려진 제한**:
  - **한글 인코딩 버그**: UTF-8 바이트가 Latin-1로 저장됨. `str.encode('latin-1').decode('utf-8')` 필수
  - 대화가 긴 경우 `message_1.json`, `message_2.json`으로 분할 (역순 정렬)
  - 삭제한 대화방은 포함 여부 불일치
- **분석 시 주의**: 인코딩 처리 필수. 메시지 본문은 저장하지 않고 메타데이터(발신자, 타임스탬프, 건수)만 활용.

#### following.json — 신뢰도: **HIGH**

- **의미**: 현재 팔로잉 중인 계정 목록 + 팔로우 시점 타임스탬프.
- **완전성**: 내보내기 시점의 **현재 상태 스냅샷**. 과거에 팔로우했다가 언팔한 계정은 미포함.
- **알려진 제한**:
  - 역사적 팔로우/언팔 추적 불가 (현재 상태만)
  - 비활성화/삭제된 계정도 username으로 남아있을 수 있음
- **분석 시 주의**: "언제 팔로우했는지" 기반 성장 추이 분석에 적합. 단, 언팔 이력은 반영 안 됨.

#### recently_unfollowed_profiles.json — 신뢰도: **LOW-MEDIUM**

- **의미**: 최근 언팔한 계정 목록.
- **완전성**: **불완전**. "최근"의 기준이 불명확하며 Meta가 보관 기간을 문서화하지 않음. 수 주~수 개월 추정.
- **알려진 제한**:
  - 롤링 윈도우 방식으로 오래된 언팔은 삭제됨
  - 일부 사용자는 언팔했음에도 파일이 비어있는 경우 보고
  - 상대가 차단/탈퇴한 경우 포함 여부 불일치
- **분석 시 주의**: 보조 데이터로만 활용. 이 데이터에 의존하는 핵심 KPI는 만들지 않음.

#### posts_viewed.json — 신뢰도: **LOW**

- **의미**: Instagram 광고 타겟팅 시스템이 추적한 게시물 노출 기록. **사용자 행동이 아닌 알고리즘 추적 데이터**.
- **완전성**: **불완전**. 광고 파이프라인용 데이터로, 실제 본 게시물의 일부만 포함. 보관 기간도 수 주~수 개월로 제한적.
- **알려진 제한**:
  - "조회"의 기준 불명확 (스크롤 지나간 것도 포함 가능)
  - GDPR 준수 목적으로 공개된 데이터, 사용자 기능으로 설계된 것 아님
  - 작성자 username + 타임스탬프만, 게시물 특정 불가
- **분석 시 주의**: 대시보드에 "추정 콘텐츠 노출 (광고 기반)"으로 라벨링. 핵심 KPI에 사용하지 않음.

#### videos_watched.json — 신뢰도: **LOW**

- **의미**: posts_viewed와 동일한 광고 추적 기반. 릴스/IGTV/인피드 영상 노출 기록.
- **완전성**: **불완전**. posts_viewed와 동일한 한계.
- **알려진 제한**:
  - 자동재생 포함 가능, 사용자가 실제로 시청했는지 불분명
  - posts_viewed와 중복 가능성
  - 영상 제목, 시청 시간 등 없음
- **분석 시 주의**: posts_viewed와 합산하여 "추정 콘텐츠 노출 (광고 기반)"으로만 표시.

#### recommended_topics.json — 신뢰도: **LOW**

- **의미**: Instagram 알고리즘이 추정한 사용자 관심사 카테고리. 광고 타겟팅 및 콘텐츠 추천용.
- **완전성**: 내보내기 시점의 스냅샷. 시간에 따라 변동됨.
- **알려진 제한**:
  - 사용자가 선택한 것이 아닌 알고리즘 추정값
  - 신뢰도 점수나 근거 없음
  - 우연한 행동(실수 클릭 등)에도 영향 받음
- **분석 시 주의**: 대시보드에 "Instagram이 추정한 관심사"로 명시. 사용자의 실제 관심사와 다를 수 있음을 안내.

---

## 인코딩 처리

Instagram 데이터 전체에 적용되는 공통 이슈:

```python
def fix_encoding(obj):
    """Instagram JSON의 이중 인코딩(UTF-8→Latin-1) 복원"""
    if isinstance(obj, str):
        try:
            return obj.encode('latin-1').decode('utf-8')
        except (UnicodeDecodeError, UnicodeEncodeError):
            return obj
    elif isinstance(obj, dict):
        return {fix_encoding(k): fix_encoding(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [fix_encoding(i) for i in obj]
    return obj
```

---

## 신뢰도 등급 기준

| 등급 | 기준 |
|---|---|
| **HIGH** | 직접적 사용자 행동 + 타임스탬프. 완전성 높음. |
| **MEDIUM-HIGH** | 사용자 행동 기반이나 전처리 필요하거나 일부 누락 가능. |
| **LOW-MEDIUM** | 불완전한 데이터. 보조 용도로만 활용. |
| **LOW** | 알고리즘/광고 시스템 부산물. 핵심 분석에 부적합. |
