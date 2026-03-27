# WatchLens - Project Instructions

## AI 역할 분리

이 프로젝트는 Claude Code와 Gemini CLI가 동시에 작업한다.

| | Claude Code | Gemini CLI |
|---|---|---|
| **담당** | 백엔드, 오케스트레이션, 전체 설계 | 프론트엔드, 리뷰, 리서치 |
| **작업 디렉토리** | `backend/`, `config/`, `supabase/`, `datas/` | `frontend/` |
| **공용 파일** | CLAUDE.md, README.md, docs/ — Claude가 관리 | 프론트 관련 문서는 Gemini |

## 충돌 방지 규칙

- **Claude는 `frontend/` 디렉토리를 수정하지 않는다** (읽기/리뷰만 가능)
- **Gemini는 `backend/` 디렉토리를 수정하지 않는다** (읽기/리뷰만 가능)
- 공유 설정 파일(`dev.sh` 등)은 수정 전 반드시 사용자에게 확인
- 작업 단위가 끝나면 커밋하여 변경 이력을 명확히 남긴다

## 기술 스택

- Backend: FastAPI + Supabase
- Frontend: React + TypeScript + Vite
- Data: YouTube 시청 기록 분석

## 작업 흐름

1. 기능 구현 → 커밋
2. 상대 CLI가 코드 리뷰
3. 리뷰 반영 → 최종 커밋
