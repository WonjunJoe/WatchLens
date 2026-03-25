# PRD: WatchLens — 나의 유튜브 시청 습관 분석 서비스

> **Version:** 1.0 (MVP)
> **Last Updated:** 2026-03-25
> **Author:** [원준]
> **Status:** Draft → Superpowers 핸드오프용

---

## 1. 제품 개요

### 1.1 한 줄 설명
유튜브 시청 기록을 업로드하거나 Google 계정을 연동하면, 나의 시청 습관·취향·중독도를 시각적으로 분석해주고 친구와 비교할 수 있는 웹앱.

### 1.2 왜 만드는가 (Problem Statement)
- 유튜브는 사용자가 **하루 평균 48분**(글로벌 기준)을 쓰는 플랫폼이지만, 본인이 얼마나·어떻게·뭘 보는지에 대한 인사이트를 거의 제공하지 않음.
- 유튜브의 "시청 시간" 기능은 단순 합산 시간만 보여줌. 카테고리별 분석, 시간대 패턴, 관심사 변화 같은 깊은 인사이트가 없음.
- 사람들은 자기 데이터를 분석한 결과를 공유하고 싶어함 (Spotify Wrapped의 성공이 증거).
- Screen Time 데이터와 결합하면 "디지털 웰빙" 관점의 인사이트도 가능.

### 1.3 핵심 유저 시나리오 (듀얼 페르소나)

**시나리오 A — 자기성찰형 ("나 유튜브 너무 많이 보나?")**
> 민수는 최근 유튜브를 너무 많이 본다고 느낀다. WatchLens에 시청 기록을 올리니, 새벽 1~3시 시청이 전체의 23%를 차지하고, "쇼츠" 비중이 3개월 전보다 40% 늘었다는 걸 확인. 도파민 중독 지수가 "경고" 수준이라는 피드백을 받고 시청 습관을 조정하기로 결심한다.

**시나리오 B — 재미/바이럴형 ("내 취향 공유하기")**
> 지현이는 친구와 유튜브 취향이 비슷한지 궁금하다. 둘 다 WatchLens에 데이터를 올리고 비교 기능을 쓰니, 지현이는 "테크/게임" 85%인 반면 친구는 "먹방/여행" 70%로 완전 반대. 결과 카드를 캡처해서 인스타 스토리에 올린다.

### 1.4 핵심 가치 제안
1. **플랫폼이 안 알려주는 인사이트** — 카테고리 분석, 시간대 패턴, 관심사 변화 등 유튜브가 제공하지 않는 분석
2. **도파민/디지털 웰빙 피드백** — 과시청, 쇼츠 중독도, 적정 시청 시간 초과 여부
3. **소셜 비교** — 친구와 시청 습관/취향 비교 기능
4. **기가막힌 시각화** — 공유하고 싶어지는 수준의 비주얼

---

## 2. 핵심 기능 명세

### 2.1 데이터 입력

#### 방법 1: Google Takeout JSON 업로드 (MVP 필수)
- 사용자가 Google Takeout에서 YouTube 시청 기록 JSON 파일을 다운로드 후 업로드
- 파일 포맷: `watch-history.json`
- 파싱 대상 필드: `title`, `titleUrl`, `time`, `subtitles` (채널명), `activityControls`
- 최대 파일 크기: 50MB (수년치 데이터 커버 가능)
- 업로드 시 클라이언트단 파싱 먼저 실행 → 유효성 검증 → 서버 전송

```
지원 데이터 구조 예시:
[
  {
    "header": "YouTube",
    "title": "Watched 영상제목",
    "titleUrl": "https://www.youtube.com/watch?v=xxxxx",
    "subtitles": [{ "name": "채널명", "url": "채널URL" }],
    "time": "2026-01-15T14:32:00.000Z",
    "products": ["YouTube"]
  }
]
```

#### 방법 2: Google OAuth 연동 (MVP v1.1)
- Google OAuth 2.0 → YouTube Data API v3
- 필요 scope: `youtube.readonly`
- 가져오는 데이터: 시청 기록, 좋아요 영상, 구독 채널
- 제한사항: YouTube Data API는 시청 기록 접근이 제한적임 → Takeout 병행 안내 필요
- OAuth 연동 시 자동 주기적 동기화 (일 1회) 가능하도록 설계

#### Screen Time 데이터 (MVP v1.2, 추후 확장)
- iOS Screen Time / Android Digital Wellbeing 데이터는 직접 API 접근 불가
- 대안: 사용자가 스크린샷을 올리면 OCR로 파싱하거나, 수동 입력 폼 제공
- 또는 Apple Health 연동 (HealthKit → Screen Time 카테고리)

### 2.2 분석 모듈

#### 모듈 1: 시간 패턴 분석
| 분석 항목 | 설명 | 시각화 형태 |
|-----------|------|-------------|
| 시간대별 시청 분포 | 0~23시 각 시간대에 몇 건 시청했는지 | 레이디얼/원형 히트맵 (24시간 시계 형태) |
| 요일별 시청 분포 | 월~일 시청 건수 비교 | 가로 바 차트 or 캘린더 히트맵 |
| 일별 시청량 트렌드 | 날짜별 시청 건수 추이 | 라인 차트 + 이동평균선 |
| 야간 시청 비율 | 자정~6시 시청 비중 (수면 패턴 유추) | 도넛 차트 + 경고 배지 |
| 몰아보기 감지 | 연속 시청 30분+ 세션 감지 | 타임라인 하이라이트 |

#### 모듈 2: 콘텐츠/취향 분석
| 분석 항목 | 설명 | 시각화 형태 |
|-----------|------|-------------|
| 카테고리 비중 | YouTube 카테고리별 시청 비율 | 트리맵 or 도넛 차트 |
| 상위 채널 랭킹 | 가장 많이 본 채널 Top 20 | 가로 바 차트 + 채널 썸네일 |
| 상위 키워드 | 시청 영상 제목에서 추출한 키워드 | 워드클라우드 |
| 쇼츠 vs 일반 비율 | Shorts 영상과 일반 영상 비중 | 스택 바 차트 |
| 관심사 변화 타임라인 | 월별 카테고리 비중 변화 추이 | 스택 에어리어 차트 or 범프 차트 |

**카테고리 분류 로직:**
- YouTube Data API로 video ID → category 매핑 (API 할당량 관리 필요)
- API 한도 초과 시: 영상 제목 + 채널명 기반 NLP 분류 (FastAPI 백엔드에서 처리)
- 분류 카테고리: Music, Gaming, Education, Entertainment, Sports, News, Tech, Vlog, Cooking, Comedy, Shorts, 기타

#### 모듈 3: 디지털 웰빙 분석
| 분석 항목 | 설명 | 시각화 형태 |
|-----------|------|-------------|
| 일일 평균 시청 시간 | 예상 시청 시간 산출 (영상당 평균 시청 시간 추정) | 큰 숫자 + 트렌드 화살표 |
| 도파민 중독 지수 | 쇼츠 비중 + 야간시청 + 몰아보기 빈도 복합 점수 | 게이지 차트 (0~100) + 등급 (안전/주의/경고/위험) |
| 적정 시청 시간 초과일 | 하루 2시간 초과 시청한 날의 비율 | 캘린더 히트맵 (초과일 빨간색) |
| 주간 리포트 요약 | 이번 주 총 시청, 전주 대비 변화, 가장 많이 본 카테고리 | 카드형 요약 |

**도파민 중독 지수 산출 공식 (가중 점수):**
```
score = (쇼츠_비율 × 30) + (야간_시청_비율 × 25) + (몰아보기_횟수/주 × 20) + (일평균_시청시간/4h × 25)
등급: 0~30 안전 / 31~55 주의 / 56~75 경고 / 76~100 위험
```

### 2.3 소셜/비교 기능

#### 친구 비교
- 초대 링크 생성 → 친구가 가입 + 데이터 업로드 → 비교 대시보드 활성화
- 비교 항목:
  - 카테고리 비중 레이더 차트 (나 vs 친구)
  - 겹치는 채널 / 겹치는 영상 목록
  - 시청 시간대 비교
  - 도파민 지수 비교
  - "취향 유사도" 점수 (0~100%)
- 비교 결과는 이미지로 저장 가능 (공유용)

#### 공유 카드 생성
- 주요 분석 결과를 SNS 공유용 카드(이미지)로 생성
- 카드 디자인: 1:1 정방형 (인스타 피드), 9:16 (인스타 스토리/릴스)
- 포함 정보: 총 시청 시간, 상위 3 카테고리, 도파민 지수, 대표 채널
- html2canvas 또는 서버사이드 렌더링으로 이미지 생성

---

## 3. 정보 아키텍처 (IA)

```
/ (랜딩 페이지)
├── /login (Google OAuth)
├── /upload (데이터 업로드 — Takeout JSON)
├── /dashboard (메인 대시보드)
│   ├── Overview (요약 카드들)
│   ├── Time Patterns (시간 패턴 탭)
│   ├── Content (콘텐츠/취향 탭)
│   ├── Wellbeing (디지털 웰빙 탭)
│   └── Compare (친구 비교 탭)
├── /share/:id (공유 링크 — 읽기 전용 결과 페이지)
├── /invite/:code (친구 초대 랜딩)
└── /settings (계정, 데이터 삭제, 연동 관리)
```

---

## 4. 기술 아키텍처

### 4.1 스택 구성

| 레이어 | 기술 | 선택 이유 |
|--------|------|-----------|
| **프론트엔드** | React + TypeScript | 타입 안정성, 장기 유지보수. JS보다 TS 권장. |
| **UI 프레임워크** | Tailwind CSS + shadcn/ui | 빠른 프로토타이핑 + 일관된 디자인 컴포넌트 |
| **시각화** | D3.js (커스텀 차트) + Recharts (표준 차트) | D3로 히트맵·레이더·워드클라우드 등 커스텀, Recharts로 라인·바 차트 빠르게 |
| **프론트 호스팅** | Vercel | 자동 배포, 프리뷰, 서버리스 함수 |
| **백엔드** | FastAPI (Python) | YouTube 데이터 파싱, NLP 분류, 점수 산출 등 Python 생태계 활용 |
| **백엔드 호스팅** | Railway 또는 Render | FastAPI 호스팅. Vercel Serverless는 Python 10초 제한이 있어 별도 호스팅 권장 |
| **DB** | Supabase (PostgreSQL) | Auth 내장, Row Level Security, Realtime 기능 |
| **Auth** | Supabase Auth (Google OAuth) | Google 로그인 → YouTube API 토큰까지 하나로 처리 |
| **파일 저장** | Supabase Storage | 업로드된 JSON 원본 보관 (재분석용) |
| **공유 이미지** | html2canvas (클라이언트) 또는 Puppeteer (서버) | 대시보드 → 공유용 이미지 생성 |

### 4.2 데이터 모델 (Supabase PostgreSQL)

```sql
-- 사용자
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  google_access_token TEXT,  -- 암호화 저장
  google_refresh_token TEXT, -- 암호화 저장
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 시청 기록 (파싱된 개별 레코드)
CREATE TABLE watch_records (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  video_id TEXT,              -- YouTube video ID (titleUrl에서 추출)
  video_title TEXT NOT NULL,
  channel_name TEXT,
  channel_url TEXT,
  watched_at TIMESTAMPTZ NOT NULL,
  category TEXT,              -- 분류된 카테고리
  is_shorts BOOLEAN DEFAULT false,
  duration_seconds INT,       -- 영상 길이 (API로 보강 시)
  source TEXT DEFAULT 'takeout', -- 'takeout' | 'oauth'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 분석 결과 캐시 (매번 재계산 방지)
CREATE TABLE analysis_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL,  -- 'time_pattern' | 'category' | 'wellbeing' | 'summary'
  period TEXT NOT NULL,          -- 'all' | '2026-01' | 'last_30d' 등
  result JSONB NOT NULL,
  computed_at TIMESTAMPTZ DEFAULT now()
);

-- 친구 관계
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID REFERENCES users(id) ON DELETE CASCADE,
  user_b UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- 'pending' | 'accepted'
  invite_code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_a, user_b)
);

-- 인덱스
CREATE INDEX idx_watch_records_user_time ON watch_records(user_id, watched_at);
CREATE INDEX idx_watch_records_user_category ON watch_records(user_id, category);
CREATE INDEX idx_analysis_cache_lookup ON analysis_cache(user_id, analysis_type, period);
```

### 4.3 API 엔드포인트 (FastAPI)

```
POST   /api/upload/takeout        — Takeout JSON 파일 업로드 + 파싱
POST   /api/auth/google           — Google OAuth 콜백
GET    /api/analysis/time-pattern  — 시간대/요일 패턴 분석
GET    /api/analysis/categories    — 카테고리 비중 분석
GET    /api/analysis/top-channels  — 상위 채널 랭킹
GET    /api/analysis/timeline      — 관심사 변화 타임라인
GET    /api/analysis/wellbeing     — 디지털 웰빙 점수
GET    /api/analysis/summary       — 전체 요약 (대시보드 Overview용)
POST   /api/compare/:friend_id    — 친구 비교 결과 생성
POST   /api/invite/generate       — 초대 코드 생성
POST   /api/invite/accept         — 초대 수락
GET    /api/share/:share_id       — 공유 결과 조회 (public)
DELETE /api/data                   — 내 데이터 전체 삭제
```

### 4.4 아키텍처 다이어그램

```
[User Browser]
    │
    ├── React App (Vercel)
    │      ├── Google OAuth → Supabase Auth
    │      ├── File Upload → FastAPI
    │      └── Dashboard ← API calls
    │
    ├── FastAPI Server (Railway/Render)
    │      ├── /upload → Parse JSON → Insert watch_records
    │      ├── /analysis/* → Query DB → Compute → Cache → Return
    │      └── YouTube Data API (카테고리 보강)
    │
    └── Supabase
           ├── PostgreSQL (users, watch_records, analysis_cache)
           ├── Auth (Google OAuth)
           └── Storage (원본 JSON 백업)
```

---

## 5. MVP 스코프 및 페이즈

### Phase 1 — 핵심 (2주)
- [ ] Google Takeout JSON 업로드 + 파싱
- [ ] 시간대별/요일별 시청 패턴 분석 + 시각화
- [ ] 카테고리 비중 분석 (제목 기반 간이 분류)
- [ ] 상위 채널 랭킹
- [ ] 도파민 중독 지수 + 적정 시청 시간 초과 분석
- [ ] 기본 대시보드 UI (Overview + 4개 탭)

### Phase 2 — 소셜 (1주 추가)
- [ ] Google OAuth 연동
- [ ] 친구 초대 + 비교 대시보드
- [ ] 공유 카드 이미지 생성

### Phase 3 — 강화 (1주 추가)
- [ ] 관심사 변화 타임라인
- [ ] YouTube Data API로 카테고리 정확도 보강
- [ ] 쇼츠 vs 일반 분류 정교화
- [ ] Screen Time 수동 입력

### Phase 4 — 디자인 시스템 (별도 트랙)
- [ ] 디자인 토큰 정의 (색상, 타이포, 스페이싱)
- [ ] 컴포넌트 라이브러리 구축
- [ ] 다른 프로젝트에도 재사용 가능한 공통 UI 패키지화
- 이 부분은 ProductHunt 상위 서비스 레퍼런스 분석 후 별도 진행

---

## 6. 비기능 요구사항

### 성능
- 5만 건 시청 기록(약 3년치) 업로드 → 분석 완료까지 10초 이내
- 대시보드 초기 로딩 2초 이내 (분석 캐시 활용)

### 프라이버시
- 시청 기록은 유저별 Supabase RLS로 격리
- "데이터 전체 삭제" 기능 필수 (GDPR 대응)
- 친구 비교 시 상대방 원본 데이터 노출 없음 (집계 결과만 공유)
- Google OAuth 토큰 암호화 저장

### 확장성
- 데이터 입력 레이어를 플러그인 구조로 설계 → 인스타, 넷플릭스 등 추후 추가 시 파서만 추가
- 분석 모듈도 독립적으로 추가 가능한 구조

---

## 7. 기술 의사결정 메모

### 왜 FastAPI를 백엔드로 쓰는가?
- YouTube 시청 기록 파싱, NLP 기반 카테고리 분류, 통계 계산 등 Python이 강한 영역
- pandas, scikit-learn 등 데이터 분석 라이브러리 활용 가능
- Vercel Serverless Function은 Python에서 10초 타임아웃 제한 → 별도 서버 필요

### 왜 TypeScript인가?
- 프론트엔드에서 분석 결과 JSON 구조가 복잡함 → 타입 안정성이 버그 방지에 필수
- D3.js와 TypeScript 호환 우수
- 향후 디자인 시스템 컴포넌트 재사용 시 타입 인터페이스 필요

### 왜 D3.js + Recharts 병행인가?
- Recharts: 표준 차트(라인, 바, 파이) 빠르게 구현
- D3.js: 히트맵, 레이더 차트, 워드클라우드, 24시간 시계형 차트 등 커스텀 시각화
- "기가막힌 시각화"를 위해서는 D3의 자유도가 필요

### 카테고리 분류 전략
- Phase 1: 영상 제목 + 채널명에서 키워드 매칭 (정규식 + 룰 기반)
- Phase 3: YouTube Data API로 video_id → categoryId 매핑 (정확도 향상)
- 추후: LLM 기반 분류 (제목/채널로 Claude API 호출 — 비용 고려 필요)

---

## 8. 경쟁/유사 서비스 참고

| 서비스 | 뭘 하는가 | 우리와 차이 |
|--------|-----------|-------------|
| Spotify Wrapped | 연 1회 음악 청취 요약 | 음악 전용, 연 1회, 분석 깊이 얕음 |
| YouTube "시청 시간" | 최근 7일 시청 시간 표시 | 카테고리/패턴 분석 없음, 공유 불가 |
| Social Blade | 채널 분석 도구 | 크리에이터용. 시청자 본인 분석 아님 |
| Screen Time (iOS) | 앱별 사용 시간 | 앱 단위만. 영상별/카테고리별 분석 없음 |

**우리의 포지셔닝:** "내가 유튜브에서 뭘 하는지" 에 대한 가장 깊은 자기 분석 도구 + 소셜 비교

---

## 9. 리스크 및 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| YouTube Data API 할당량 초과 | 카테고리 분류 불가 | 제목 기반 분류를 기본으로, API는 보조 |
| Google Takeout 포맷 변경 | 파싱 실패 | 파서를 모듈화, 포맷 버전 감지 로직 |
| OAuth에서 시청 기록 접근 제한 | 실시간 동기화 불가 | Takeout을 주력으로, OAuth는 보조 |
| 대용량 데이터 처리 시간 | UX 저하 | 업로드 시 프로그레스 바, 백그라운드 처리 + 웹소켓 알림 |
| 개인정보 우려 | 가입 이탈 | 투명한 데이터 정책 명시, 삭제 기능, 로컬 처리 옵션 검토 |

---

## 10. 성공 지표

### MVP 단계 (론칭 후 1개월)
- DAU 100명
- 업로드 완료율 > 70% (업로드 시작 → 대시보드 도달)
- 친구 비교 기능 사용율 > 30%
- 공유 카드 생성 > 50건/주

### 그로스 단계 (론칭 후 3개월)
- MAU 5,000명
- 바이럴 계수 > 1.2 (1명이 1.2명 초대)
- 인스타/트위터 공유 카드 노출 > 1만 회
