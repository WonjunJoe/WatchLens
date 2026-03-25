# WatchLens

YouTube 시청/검색 데이터를 분석하여 디지털 습관 인사이트를 제공하는 서비스.

## Tech Stack

- **Backend:** FastAPI (Python), Supabase (PostgreSQL + Storage)
- **Frontend:** React + TypeScript, Tailwind CSS, Vite
- **Infra:** Supabase, Vercel/Railway (예정)

## Project Structure

```
backend/
  app/
    parsers/       # JSON 파싱 로직 (watch, search)
    routers/       # API 엔드포인트
    models/        # Pydantic 스키마
    db/            # Supabase 클라이언트
  config/          # 설정값 (settings.py)
  tests/           # pytest 테스트
frontend/
  src/
    components/    # FileUploader, UploadResultCard
    pages/         # UploadPage
supabase/
  migrations/      # SQL 마이그레이션
docs/
  superpowers/     # 설계 스펙 + 구현 플랜
```

---

## Development Log

### 2026-03-25

| 작업 | 설명 |
|------|------|
| Step 1 설계 | JSON 업로드/파싱 설계 스펙 작성 + 리뷰 반영 (v1.1) |
| 구현 플랜 작성 | Task 1~10 단위 구현 계획 수립 |
| 백엔드 초기화 | FastAPI 프로젝트 구조, settings.py, requirements.txt |
| DB 마이그레이션 | watch_records, search_records 테이블 SQL 작성 |
| Supabase 설정 | 클라이언트 모듈 + .env + .gitignore |

### 2026-03-26

| 작업 | 설명 |
|------|------|
| Watch History 파서 | Google Takeout watch-history.json 파싱 + 14개 테스트 |
| Search History 파서 | Google Takeout search-history.json 파싱 + 6개 테스트 |
| Pydantic 스키마 | WatchUploadResponse, SearchUploadResponse 응답 모델 |
| 업로드 API | POST /api/upload/watch-history, search-history + 3개 테스트 |
| 프론트엔드 초기화 | Vite + React + TypeScript + Tailwind CSS |
| 업로드 UI | FileUploader (드래그앤드롭), UploadResultCard, UploadPage |

---

## Step 1 완료 현황 (JSON 업로드 + 파싱)

- [x] 프로젝트 초기화 + 설정
- [x] Supabase 테이블 SQL 작성
- [x] Supabase 클라이언트 설정
- [x] Watch History 파서 (14 tests)
- [x] Search History 파서 (6 tests)
- [x] Pydantic 응답 모델
- [x] 업로드 API 엔드포인트 (3 tests)
- [x] 프론트엔드 초기화
- [x] 업로드 UI 컴포넌트
- [ ] Supabase 프로젝트 생성 + 실제 E2E 테스트

## Next Steps

- Supabase 프로젝트 생성 및 테이블 마이그레이션 실행
- 실제 데이터로 E2E 수동 테스트
- Step 2: 대시보드 + 분석 기능 기획
