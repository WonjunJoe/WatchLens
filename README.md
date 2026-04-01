# WatchLens

유튜브 시청/검색 기록을 업로드하면, 시청 습관과 취향을 시각적으로 분석해주는 웹앱.

유튜브는 단순 시청 시간만 보여주지만, WatchLens는 카테고리별 분석, 시간대 패턴, Shorts 중독도, 도파민 지수, 시청 유형 분류 등 플랫폼이 알려주지 않는 인사이트를 제공합니다.

## Features

- **Google Takeout 업로드** — JSON 또는 ZIP 파일 드래그앤드롭 업로드 (SSE 실시간 진행 표시)
- **멀티 플랫폼** — YouTube + Instagram 데이터 분석
- **YouTube Data API 연동** — 영상 메타데이터(카테고리, 길이) 자동 수집, Shorts 판별(≤180초)
- **기간 선택** — 업로드 후 최근 30일 / 전체 기간 / 직접 선택 중 택 1
- **YouTube 대시보드 (SSE 스트리밍)** — 단일 API 호출로 14개 섹션 분석 스트리밍
  - 한눈에 보는 인사이트 (규칙 기반 자연어 요약, 카드별 색상 악센트)
  - 요약 카드 4종 (총 시청, 채널 수, 일 평균, Shorts 수)
  - 시간대별/일별/요일별 패턴 차트
  - Top 채널 (롱폼/쇼츠 분리), 카테고리 분포 (파이차트)
  - Shorts 분석 (비율, 일별 추이)
  - 시청 시간 추정 (gap-based + retention-rate 하이브리드)
  - 주간 시청 시간 + 주간 비교 + 주간 리포트
  - 도파민 지수 (Shorts 비율 40 + 심야 시청 30 + 짧은 영상 30)
  - 시청 유형 분류 (4축 MBTI 스타일: N/D, S/L, B/C, F/E → 16가지 유형)
  - GitHub 스타일 캘린더 히트맵
  - 검색 키워드 클라우드 + 검색→시청 전환율
- **Instagram 대시보드** — 팔로우 네트워크, 소통균형, 심야활동 분석, 언팔 타임라인
- **크로스플랫폼 웰빙 대시보드** — YouTube + Instagram 통합 디지털 웰빙 뷰
- **랜딩페이지** — Hero, Features Bento Grid, How-it-works, CTA
- **스토리 공유 카드** — 1080×1920 인스타 스토리 사이즈, YouTube+Instagram 핵심 지표, 클립보드 복사/다운로드

## Tech Stack

| Layer | Stack |
|-------|-------|
| Backend | FastAPI, Python 3.x |
| Frontend | React 19, TypeScript, Tailwind CSS 4, Vite 8 |
| Charts | Recharts |
| Icons | Lucide React |
| Font | Pretendard |
| DB | Supabase (PostgreSQL + Storage) |

## Quick Start

```bash
# 한 번에 실행 (백엔드 + 프론트엔드)
./dev.sh

# 또는 개별 실행
# Backend
cd backend && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # SUPABASE_URL, SUPABASE_KEY, YOUTUBE_API_KEY 설정
uvicorn app.main:app --reload

# Frontend
cd frontend && npm install && npm run dev
```

## Project Structure

```
WatchLens/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI 앱 초기화, CORS, 라우터 등록
│   │   ├── db/supabase.py       # Supabase 클라이언트
│   │   ├── models/schemas.py    # Pydantic 응답 모델
│   │   ├── parsers/
│   │   │   ├── watch_history.py # 시청 기록 JSON 파싱
│   │   │   └── search_history.py# 검색 기록 JSON 파싱
│   │   ├── routers/
│   │   │   ├── upload.py        # 업로드 API (SSE 진행 표시, DB 저장)
│   │   │   └── stats.py         # 대시보드 API (14개 섹션 SSE 스트리밍)
│   │   └── services/
│   │       ├── youtube.py       # YouTube Data API 메타데이터 수집
│   │       ├── indices.py       # 도파민 지수 계산
│   │       └── insights.py      # 자연어 인사이트 생성
│   ├── config/settings.py       # 전역 설정 (임계값, 가중치, 카테고리 맵)
│   └── tests/                   # pytest 테스트 (파서, API, YouTube)
│
├── frontend/src/
│   ├── App.tsx                  # 라우팅 (/ → Upload, /dashboard → Dashboard)
│   ├── index.css                # CSS 변수 (파스텔 팔레트), Pretendard 폰트
│   ├── pages/
│   │   ├── UploadPage.tsx       # 파일 업로드 + 기간 선택
│   │   └── DashboardPage.tsx    # SSE로 14개 섹션 수신 + 렌더링
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Layout.tsx       # 사이드바 + 콘텐츠 래퍼
│   │   │   └── Sidebar.tsx      # 접이식 네비게이션 사이드바
│   │   ├── SummaryCards.tsx      # 요약 카드 4종
│   │   ├── InsightSummary.tsx   # 인사이트 카드 (다색 악센트)
│   │   ├── HourlyChart.tsx      # 시간대별 바 차트
│   │   ├── DailyChart.tsx       # 일별 라인 차트
│   │   ├── DayOfWeekChart.tsx   # 요일별 바 차트
│   │   ├── WatchTime.tsx        # 시청 시간 추정
│   │   ├── WeeklyWatchTime.tsx  # 주간 시청 시간
│   │   ├── WeeklyComparison.tsx # 주간 비교 테이블
│   │   ├── TopChannels.tsx      # Top 채널 (롱폼/쇼츠)
│   │   ├── ShortsStats.tsx      # Shorts 분석 + 추이
│   │   ├── Categories.tsx       # 카테고리 파이차트
│   │   ├── DopamineIndex.tsx    # 도파민 지수 (3요소)
│   │   ├── ViewerType.tsx       # 시청 유형 (4축 16유형)
│   │   ├── CalendarHeatmap.tsx  # GitHub 스타일 히트맵
│   │   ├── SearchKeywords.tsx   # 검색 키워드 클라우드
│   │   ├── FileUploader.tsx     # 파일 업로드 컴포넌트
│   │   ├── UploadResultCard.tsx # 업로드 결과 표시
│   │   ├── PeriodSelector.tsx   # 분석 기간 선택
│   │   └── InfoTooltip.tsx      # 정보 툴팁
│   └── utils/
│       ├── chartConfig.ts       # 차트 공용 색상/스타일
│       └── iconMap.tsx          # 이모지→Lucide 아이콘 매핑
│
├── supabase/migrations/         # DB 스키마 SQL
├── datas/                       # 테스트용 Takeout 데이터
└── dev.sh                       # 백엔드+프론트 동시 실행 스크립트
```

## Architecture

```
[Takeout JSON] → Upload API (SSE) → Parser → Supabase DB
                                          ↓
                              YouTube Data API (metadata)
                                          ↓
[Browser] ← SSE Stream ← Dashboard API ← DB Query + 계산
                              ↓
                    14 sections streamed:
                    summary → hourly → daily → top_channels →
                    shorts → categories → watch_time →
                    weekly_watch_time → weekly → dopamine →
                    day_of_week → viewer_type → search_keywords →
                    insights
```

## Design System

대시보드 디자인 시스템 v2 적용 (2026-04-02 Design Ralph 리디자인)

- **컬러**: Primary #4F6EF7 (blue), Secondary #7C3AED (violet), 그라데이션 배경 (CSS 변수 관리)
- **폰트**: Pretendard Variable, weight 400~800 활용, hero 숫자 38-44px extrabold
- **카드**: rounded-16px, 3단계 그림자 시스템 (sm/md/lg), hover elevation, 컬러 accent top-line
- **차트**: 통일 blue/violet 2-tone 팔레트, 6px bar radius, glass tooltip
- **아이콘**: Lucide React (선형 outline)
- **레이아웃**: 접이식 사이드바 (shadow 분리), 섹션 간격 mb-6 통일

---

## Development Log

### 2026-03-25
- 설계 스펙 작성 + 구현 플랜 수립
- 백엔드 초기화 (FastAPI, settings.py, 프로젝트 구조)
- Supabase 테이블 SQL 작성 + 클라이언트 설정

### 2026-03-26
- Watch History / Search History 파서 구현 (테스트 20개)
- 업로드 API + YouTube Data API 연동
- SSE 기반 대시보드 완성 (13개 섹션)
- 기간 선택 UI, 인사이트, 주간 비교, 도파민 지수

### 2026-03-27
- 도파민 지수 3요소 재설계 (40/30/30), 시청 유형 분류(4축 16유형), 캘린더 히트맵, 요일별 차트
- 인사이트 시각화 개선 (카드형 + 핵심 숫자 강조)
- 프론트엔드 전면 디자인 오버홀 (파스텔 → Blurmorphism + Claymorphism + Framer Motion)
- Bento Grid 2.0, Dual Theme(Light/Dark), Share Card

### 2026-03-28
- 클린 라이트모드 대시보드 리디자인 (미사용 컴포넌트 제거)
- 인사이트 상단 이동, 시청시간 기반 KPI, 카테고리 레이아웃 개선
- 백엔드 스키마/파서 단순화 리팩토링

### 2026-03-29
- **Instagram 분석 대시보드 추가** (PR #1)
- 소프트웨어 아키텍처 문서 작성

### 2026-03-30
- 백엔드 대규모 리팩토링: Repository → Service → Router 3계층 분리
- SSE 에러 핸들링 표준화, `useSseStream` 훅 추출
- YouTube/Instagram 대시보드 각 4~5개 신규 인사이트 기능 추가
- Instagram 소통균형 리팩터, 심야활동 분석, 언팔 타임라인
- YouTube 대시보드 캐시, 검색→시청 전환율, 주간 리포트
- 크로스플랫폼 디지털 웰빙 대시보드 (YouTube + Instagram 통합 뷰)
- 랜딩페이지 구현 (Hero, Features Bento Grid, How-it-works, CTA, Footer)
- YouTube/Instagram 전체 데이터 인터페이스 TypeScript 타이핑
- API_BASE 중앙화, 유틸 함수 추출, 설정값 settings.py 이동

### 2026-03-31
- TypeScript 빌드 에러 해결, 데이터 안전성 강화, 접근성 개선

### 2026-04-01
- Google Takeout ZIP 직접 업로드 지원 (YouTube)
- 인스타 스토리 공유 카드 (1080×1920, YouTube+Instagram 핵심 지표, 클립보드 복사/다운로드)
- 공유 카드 디자인 대개편: 도파민 그라데이션 바, 시청 유형 축 스펙트럼, 프라이버시(이니셜 처리), 타이포 위계, 크로스 인사이트
- 공유 모달 데이터 싱크 수정 (미로드 플랫폼 자동 fetch)
- 업로드 UX 통합: 플랫폼별 업로드 현황 + 통합 대시보드 버튼
- 한국어 Google Takeout 파싱 지원 (시청/검색 기록 제목 + ZIP 경로)
- Top Channels 확장: 시청시간 기준 랭킹, 최근 30일 인기 채널
- Duration cap 중앙화, 공유 카드 스펙트럼 바/도파민 breakdown 개선
- 재업로드 시 stale 데이터 방지 (cleared 상태), 파일명 표시
- Duration cap(1h)을 fetch_video_metadata 내부로 이동 (아키텍처 robust화)
- 재업로드 시 YouTube 캐시 자동 무효화
- 웰빙 대시보드: YouTube+Instagram 모두 업로드 필수, 미업로드 플랫폼 안내

### 2026-04-02
- **YouTube 대시보드 디자인 리디자인** (Design Ralph 자동 그라인드 루프, 7 iterations)
  - 디자인 토큰 시스템: 그라데이션 배경, 3단계 그림자, accent 컬러 (#4F6EF7 / #7C3AED)
  - 타이포그래피 계층: hero 숫자 38-44px extrabold, uppercase section heading
  - 카드 시스템: accent top-line, hover elevation, 통일된 border-radius 16px
  - 차트 통일: blue/violet 2-tone 팔레트, 6px bar radius, glass tooltip
  - 리스트 가독성: zebra rows, gold medal badge, hover 상태
  - 컴포넌트 22개 파일 수정, 평가 점수 19/60 → 37/60

---

## TODO

### Step 1 — 데이터 업로드/파싱 ✅
- [x] Supabase 테이블 + 파서 구현
- [x] 업로드 API + 프론트엔드 UI
- [x] E2E 테스트 통과 (시청 10,533건 / 검색 3,228건)
- [x] Google Takeout ZIP 직접 업로드 지원

### Step 2 — 대시보드/분석/디자인 ✅
- [x] YouTube Data API 연동 (메타데이터 + duration)
- [x] SSE 대시보드 단일 엔드포인트 (14개 섹션)
- [x] 기간 선택 UI (최근 30일 / 전체 / 커스텀)
- [x] 도파민 지수, 시청 유형(4축 16유형), 캘린더 히트맵, 요일별 차트
- [x] 프론트엔드 디자인 오버홀 (Blurmorphism, Claymorphism, Framer Motion, Bento Grid, Dual Theme)
- [x] Instagram 분석 대시보드 (팔로우 네트워크, 소통균형, 심야활동, 언팔 타임라인)
- [x] YouTube/Instagram 각 4~5개 신규 인사이트 기능
- [x] 크로스플랫폼 디지털 웰빙 대시보드 (통합 뷰)
- [x] 랜딩페이지 (Hero, Features, How-it-works, CTA)
- [x] 백엔드 3계층 리팩토링 (Repository → Service → Router)
- [x] TypeScript 타이핑, SSE 훅 추출, API_BASE 중앙화

### Step 3 — 공유/소셜
- [x] 인스타 스토리 공유 카드 (1080×1920, 클립보드 복사/다운로드)
- [x] 공유 카드 디자인 개선 (프라이버시, 컬러, 타이포 위계, 크로스 인사이트)
- [x] 플랫폼 간 데이터 싱크 자동 fetch
- [x] 업로드 UX 통합 (상태 표시 + 통합 대시보드 버튼)
- [ ] 친구와 시청 습관/취향 비교 기능

### Step 4 — Polish & Launch
- [x] YouTube 대시보드 디자인 리디자인 (Design Ralph — 19→37/60)
- [ ] 배포
