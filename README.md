# WatchLens

유튜브 시청/검색 기록을 업로드하면, 시청 습관과 취향을 시각적으로 분석해주는 웹앱.

유튜브는 단순 시청 시간만 보여주지만, WatchLens는 카테고리별 분석, 시간대 패턴, Shorts 중독도, 관심사 변화 등 플랫폼이 알려주지 않는 인사이트를 제공합니다.

## Features

- **Google Takeout 업로드** — watch-history.json, search-history.json을 드래그앤드롭으로 업로드
- **자동 파싱** — 시청 기록(영상 제목, 채널, Shorts 여부), 검색 기록을 자동 분류
- **데이터 저장** — Supabase DB에 구조화된 레코드 저장 + 원본 파일 백업
- **대시보드** (예정) — 카테고리별 시청 비율, 시간대 패턴, Shorts 비중 시각화
- **소셜 비교** (예정) — 친구와 시청 습관/취향 비교

## Tech Stack

- **Backend:** FastAPI, Python
- **Frontend:** React, TypeScript, Tailwind CSS, Vite
- **DB / Storage:** Supabase (PostgreSQL + Storage)

## Quick Start

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # SUPABASE_URL, SUPABASE_KEY 설정
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

---

## Development Log

### 2026-03-25
- Step 1 설계 스펙 작성 + 구현 플랜 수립
- 백엔드 초기화 (FastAPI, settings.py, 프로젝트 구조)
- Supabase 테이블 SQL 작성 + 클라이언트 설정

### 2026-03-26
- Watch History / Search History 파서 구현 (테스트 20개)
- 업로드 API 엔드포인트 구현 (테스트 3개)
- 프론트엔드 초기화 + 업로드 UI (FileUploader, 결과 카드)
- Supabase 연동 E2E 테스트 통과 (시청 10,533건 / 검색 3,228건)

---

## TODO

### Step 1 ✅ 데이터 업로드/파싱
- [x] Supabase 테이블 + 파서 구현
- [x] 업로드 API + 프론트엔드 UI
- [x] E2E 테스트 통과 (시청 10,533건 / 검색 3,228건)

### Step 2 🔧 대시보드/분석 ← 현재
- [x] brainstorming: 분석 항목 + 아키텍처 결정 → [설계 스펙](docs/superpowers/specs/2026-03-26-dashboard-analytics-design.md)
- [ ] Shorts ≤60초 가설 검증
- [ ] 리팩토링: `is_shorts` 판별 YouTube API 전환, `source` 필드 제거
- [ ] YouTube Data API 연동 (메타데이터 + duration, 업로드 시 배치)
- [ ] 분석 API 7개 구현
- [ ] 프론트엔드 대시보드 (Recharts, 싱글 페이지)

### Step 3 소셜 비교
- [ ] 친구와 시청 습관/취향 비교 기능

### Step 4 Polish & Launch
- [ ] 대시보드 디자인 리터치
- [ ] 배포
