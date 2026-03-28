# Instagram 대시보드 + 아키텍처 리팩토링 설계

> WatchLens에 Instagram 분석 대시보드를 추가하고, YouTube/Instagram이 독립적으로 동작하도록 아키텍처를 정리한다.

---

## 1. 라우팅 & 네비게이션

### 라우트 구조

| 경로 | 페이지 | 설명 |
|---|---|---|
| `/` | HomePage | 홈 화면 + YouTube/Instagram 업로드 영역 |
| `/youtube/dashboard` | YouTubeDashboardPage | YouTube 대시보드 |
| `/instagram/dashboard` | InstagramDashboardPage | Instagram 대시보드 |

### 사이드바 메뉴

```
홈               → /
YouTube 대시보드  → /youtube/dashboard
Instagram 대시보드 → /instagram/dashboard
```

### HomePage 레이아웃

- 상단: 서비스 소개 (WatchLens 타이틀 + 설명)
- 중단: YouTube 업로드 / Instagram 업로드 나란히 배치
- 하단: "둘 중 하나만 업로드해도 해당 대시보드가 생성됩니다" 안내

---

## 2. 백엔드 아키텍처

### 공통 패턴 (YouTube & Instagram 동일)

```
파일 업로드 → 서버 파싱 → KPI 계산 → SSE 스트리밍 + DB에 결과 저장
```

- 원본 레코드(watch_records 등)는 DB에 저장하지 않음
- 계산된 KPI 결과(JSON)만 DB에 저장
- 대시보드 진입 시 DB에서 결과를 읽어오기만 함 (재계산 없음)

### YouTube 변경사항

기존 로직 리팩토링:
- 기존: 원본 레코드 DB 저장 → 대시보드 열 때마다 DB 조회 + 재계산
- 변경: 업로드 시 계산 완료 → 결과만 DB 저장 → 대시보드는 결과 GET

### Instagram 신규

#### 업로드 API

```
POST /api/instagram/upload
Content-Type: multipart/form-data (ZIP 파일)

응답: SSE 스트리밍
  → progress: "ZIP 압축 해제 중..."
  → progress: "데이터 파싱 중..."
  → section: {name: "summary", data: {...}}
  → section: {name: "top_accounts", data: {...}}
  → ...
  → done: {total_records: N}
```

#### 결과 조회 API

```
GET /api/instagram/dashboard
응답: 저장된 KPI 결과 JSON
```

#### 파일 구조 (신규)

```
backend/app/
├── parsers/instagram.py          # ZIP 해제 + JSON 파싱 + 인코딩 fix
├── routers/instagram.py          # POST /api/instagram/upload, GET /api/instagram/dashboard
└── services/instagram_stats.py   # KPI 계산 함수들
```

#### 파싱 대상 파일 (ZIP 내부)

| 파일 경로 | 용도 | 신뢰도 |
|---|---|---|
| `your_instagram_activity/likes/liked_posts.json` | 좋아요 패턴, Top 계정 | HIGH |
| `your_instagram_activity/story_interactions/story_likes.json` | 스토리 반응 패턴 | HIGH |
| `your_instagram_activity/messages/inbox/*/message_*.json` | DM 활동 분석 | MEDIUM-HIGH |
| `connections/followers_and_following/following.json` | 팔로우 네트워크 | HIGH |
| `connections/followers_and_following/recently_unfollowed_profiles.json` | 최근 언팔 (보조) | LOW-MEDIUM |
| `ads_information/ads_and_topics/posts_viewed.json` | 추정 콘텐츠 노출 | LOW |
| `ads_information/ads_and_topics/videos_watched.json` | 추정 콘텐츠 노출 | LOW |
| `preferences/your_topics/recommended_topics.json` | 관심사 카테고리 | LOW |

#### 인코딩 처리

모든 Instagram JSON 파싱 시 이중 인코딩(UTF-8 → Latin-1) 복원 적용:

```python
def fix_encoding(obj):
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

## 3. Instagram 대시보드 KPI (9개 섹션)

### 3.1 Summary Cards (4장)

| 카드 | 값 | 소스 |
|---|---|---|
| 총 좋아요 | 게시물 + 스토리 합산 | liked_posts + story_likes |
| DM 대화 | 대화 수 + 총 메시지 수 | messages/inbox |
| 팔로잉 | 현재 팔로잉 수 | following.json |
| 추정 콘텐츠 노출 (광고 기반) | 게시물 + 영상 합산 | posts_viewed + videos_watched |

### 3.2 Insight Summary

Rule-based 자연어 인사이트 3~5개. 예시:
- "스토리 좋아요가 게시물 좋아요보다 1.5배 많아요 — 스토리 중심 소비 패턴"
- "상위 3명과의 소통이 전체의 40%를 차지해요"
- "새벽 1~3시 활동이 전체의 25% — 야행성 사용 패턴"

### 3.3 Top 소통 계정 (Top 10)

좋아요 + 스토리 좋아요 + DM 메시지 수를 종합한 랭킹.
- 계정별 수평 막대그래프
- 각 항목(좋아요/스토리/DM) 색상 구분 stacked bar

### 3.4 시간대별 활동 히트맵

좋아요 + 스토리 좋아요 + DM 타임스탬프 기반 24시간 분포.
- YouTube HourlyChart와 동일한 바 차트 형태

### 3.5 요일별 활동 패턴

월~일 평균 활동량. YouTube DayOfWeekChart와 동일 형태.

### 3.6 일별 활동 트렌드

전체 기간 일별 활동량 라인 차트. 좋아요 + DM 합산.

### 3.7 DM 활동 분석

- Top 10 대화 상대 (메시지 수 기준 막대그래프)
- 내가 보낸 vs 받은 비율 (도넛 차트 또는 비율 바)

### 3.8 관심사 카테고리

recommended_topics 34개를 태그 그리드로 표시.
"Instagram이 추정한 관심사" 라벨 명시.

### 3.9 팔로우 네트워크 성장

- 팔로잉 타임라인: 월별 누적 라인 차트 (following.json 타임스탬프 기반)
- 최근 언팔 목록: 간단한 리스트 (recently_unfollowed, 보조 데이터)

---

## 4. 프론트엔드 구조

### 컴포넌트 구조

```
frontend/src/
├── contexts/
│   ├── YouTubeDataContext.tsx      # YouTube 결과 캐싱
│   └── InstagramDataContext.tsx    # Instagram 결과 캐싱
├── pages/
│   ├── HomePage.tsx                # 홈 + 양쪽 업로드
│   ├── DashboardPage.tsx           # 기존 → YouTubeDashboardPage로 리네임
│   └── InstagramDashboardPage.tsx  # 신규
├── components/
│   ├── instagram/                  # Instagram 전용 컴포넌트
│   │   ├── IgSummaryCards.tsx
│   │   ├── IgInsightSummary.tsx
│   │   ├── IgTopAccounts.tsx
│   │   ├── IgHourlyChart.tsx
│   │   ├── IgDayOfWeekChart.tsx
│   │   ├── IgDailyChart.tsx
│   │   ├── IgDmAnalysis.tsx
│   │   ├── IgTopics.tsx
│   │   └── IgFollowNetwork.tsx
│   └── home/
│       ├── YouTubeUploadSection.tsx
│       └── InstagramUploadSection.tsx
```

### 데이터 캐싱 흐름

```
React Context (YouTubeDataContext / InstagramDataContext)
  ├── data: null (초기)
  ├── 업로드 완료 → SSE 결과를 context에 저장
  ├── 대시보드 진입 → context에 data 있으면 바로 렌더링
  └── 새로고침 (context 소실) → DB에서 GET → context에 복원 → 렌더링
```

- YouTube/Instagram 각각 독립 Context. 서로 영향 없음.
- 업로드 안 한 대시보드 진입 시: "아직 데이터가 없습니다. 업로드하시겠어요?" + 홈 페이지 링크

### 차트 스타일

YouTube 대시보드와 동일한 디자인 시스템 (색상, 폰트, 카드 스타일) 사용.
accent 색상으로 구분: YouTube = indigo(`#6366F1`), Instagram = gradient pink/orange 계열 고려.

---

## 5. DB 스키마 (결과 저장)

### 신규 테이블

```sql
-- YouTube 대시보드 결과
create table youtube_dashboard_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  results jsonb not null,        -- 14개 섹션 결과 전체
  period_from date,
  period_to date,
  created_at timestamptz default now()
);

-- Instagram 대시보드 결과
create table instagram_dashboard_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  results jsonb not null,        -- 9개 섹션 결과 전체
  created_at timestamptz default now()
);
```

기존 `watch_records`, `search_records`, `video_metadata` 테이블은 유지하되, 새 업로드 플로우에서는 사용하지 않음. (추후 마이그레이션 시 정리)

---

## 6. config/settings.py 추가 항목

```python
# Instagram
INSTAGRAM_SOURCE_FILES = {
    "liked_posts": "your_instagram_activity/likes/liked_posts.json",
    "story_likes": "your_instagram_activity/story_interactions/story_likes.json",
    "messages_inbox": "your_instagram_activity/messages/inbox",
    "following": "connections/followers_and_following/following.json",
    "unfollowed": "connections/followers_and_following/recently_unfollowed_profiles.json",
    "posts_viewed": "ads_information/ads_and_topics/posts_viewed.json",
    "videos_watched": "ads_information/ads_and_topics/videos_watched.json",
    "topics": "preferences/your_topics/recommended_topics.json",
}
MAX_ZIP_SIZE_MB = 100
```

---

## 7. 에러 처리

- ZIP 파일이 아닌 경우: 400 에러 + "ZIP 파일만 업로드 가능합니다"
- ZIP 내 필요한 파일이 없는 경우: 누락된 파일은 건너뛰고 있는 데이터만으로 대시보드 생성. "일부 데이터가 누락되어 해당 섹션은 표시되지 않습니다" 안내.
- ZIP 크기 초과: 400 에러 + 크기 제한 안내
- 인코딩 fix 실패: 원본 문자열 그대로 사용 (graceful fallback)
