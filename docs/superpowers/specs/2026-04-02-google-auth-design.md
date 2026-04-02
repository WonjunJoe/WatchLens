# Google OAuth 인증 + 유저 데이터 격리

## 배경

현재 WatchLens는 모든 데이터를 하드코딩된 단일 user_id(`00000000-0000-0000-0000-000000000000`)로 저장한다. 퍼블릭 배포(Vercel) 시 누구나 접속하면 마지막 업로드된 유저의 데이터를 볼 수 있는 심각한 보안 문제가 있다.

## 목표

- 유저별 데이터 격리 (내 데이터는 나만 볼 수 있음)
- Google 로그인 원클릭으로 이탈률 최소화
- 기존 서비스 흐름(업로드 → 대시보드)은 유지

## 기술 선택

**Supabase Auth + Google OAuth**

- Supabase에 내장된 Google OAuth provider 사용
- 프론트: `@supabase/supabase-js`로 로그인/세션 관리
- 백엔드: FastAPI에서 Supabase JWT 검증으로 user_id 추출
- DB: RLS(Row Level Security)로 데이터 격리

선택 이유: 이미 Supabase를 사용 중이므로 추가 인프라 없이 최소 코드로 구현 가능.

## 설계

### 1. 인증 플로우

1. 유저가 사이트 접속 → `/login` 페이지 (Google 로그인 버튼)
2. Google 로그인 클릭 → Supabase OAuth 플로우 → 콜백 → `/`(업로드 페이지)로 리다이렉트
3. 이후 방문 시 세션이 살아있으면 자동 로그인, 만료 시 `/login`으로 리다이렉트

### 2. 백엔드 인증

- 모든 API 요청에 `Authorization: Bearer <supabase_access_token>` 헤더 필수
- FastAPI dependency(`get_current_user`)에서 Supabase JWT 검증 → user_id 추출
- 하드코딩된 고정 user_id를 인증된 user_id로 교체
- 토큰 없거나 유효하지 않으면 401 반환

### 3. 데이터 격리

**DB 레벨 (RLS):**
- 대상 테이블: `watch_records`, `search_records`, `youtube_dashboard_results`, `instagram_dashboard_results`, `video_metadata`
- 정책: `SELECT/INSERT/UPDATE/DELETE WHERE user_id = auth.uid()`
- RLS 활성화로 DB 레벨에서 데이터 격리 보장

**백엔드 레벨:**
- 모든 쿼리에서 인증된 user_id로 필터링 (이중 방어)

### 4. 프론트엔드 변경

**새로운 컴포넌트:**
- `LoginPage` (`/login`): Google 로그인 버튼. 이미 로그인 시 `/`로 리다이렉트
- `AuthContext`: Supabase 세션 상태 관리, `onAuthStateChange` 리스너, 로그아웃 함수
- `ProtectedRoute`: 미인증 시 `/login`으로 리다이렉트하는 라우트 래퍼

**기존 코드 변경:**
- API 호출 시 Authorization 헤더 추가 (일괄 처리)
- 헤더/사이드바에 유저 프로필(아바타, 이름) + 로그아웃 버튼
- 로그아웃 시 Context 상태 초기화

**라우팅:**
```
/login          → LoginPage (공개)
/               → UploadPage (인증 필요)
/dashboard      → DashboardPage (인증 필요)
```

### 5. CORS 설정

- 프론트엔드 도메인만 API 호출 허용
- 환경변수로 허용 origin 관리

### 6. 기존 데이터 마이그레이션

- 기존 고정 user_id 데이터는 그대로 유지
- 새 유저 업로드 시 실제 user_id로 저장
- 기존 데이터는 아무 유저에게도 매칭되지 않으므로 자연스럽게 격리

## 보안 체크리스트

- [x] Supabase Auth (업계 표준 OAuth 플로우)
- [x] JWT 서명 검증 (위조 불가)
- [x] RLS로 DB 레벨 데이터 격리 (이중 방어)
- [x] CORS로 허용 도메인 제한
- [x] Supabase JS 클라이언트의 자동 토큰 갱신
