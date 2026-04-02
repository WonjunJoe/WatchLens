# Google OAuth 인증 + 유저 데이터 격리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Supabase Auth (Google OAuth)로 유저 인증 + 유저별 데이터 격리를 구현하여, 퍼블릭 배포 시 다른 유저의 데이터가 노출되지 않도록 한다.

**Architecture:** 프론트엔드에서 `@supabase/supabase-js`로 Google OAuth 로그인 → access_token을 모든 API 요청의 Authorization 헤더로 전달 → FastAPI에서 PyJWT로 JWT 검증 후 user_id 추출 → 모든 DB 쿼리에 인증된 user_id 적용. Supabase RLS는 defense-in-depth로 추가.

**Tech Stack:** Supabase Auth, PyJWT, @supabase/supabase-js, FastAPI Depends

---

## File Structure

### 새로 생성할 파일
- `backend/app/auth.py` — JWT 검증 FastAPI dependency
- `frontend/src/lib/supabase.ts` — Supabase 클라이언트 초기화
- `frontend/src/contexts/AuthContext.tsx` — 인증 상태 관리
- `frontend/src/pages/LoginPage.tsx` — Google 로그인 페이지 (기존 LandingPage를 교체하지 않고 별도)
- `frontend/src/components/ProtectedRoute.tsx` — 인증 라우트 가드
- `supabase/migrations/20260402000000_enable_rls.sql` — RLS 정책

### 수정할 파일
- `backend/requirements.txt` — PyJWT 추가
- `backend/app/main.py` — CORS 업데이트
- `backend/app/parsers/watch_history.py` — user_id 파라미터화
- `backend/app/parsers/search_history.py` — user_id 파라미터화
- `backend/app/routers/upload.py` — auth dependency 적용
- `backend/app/routers/stats.py` — auth dependency 적용
- `backend/app/routers/instagram.py` — auth dependency 적용
- `backend/app/routers/wellbeing.py` — auth dependency 적용
- `backend/app/services/youtube.py` — DEFAULT_USER_ID 제거
- `frontend/package.json` — @supabase/supabase-js 추가
- `frontend/src/config.ts` — Supabase 환경변수 추가
- `frontend/src/App.tsx` — AuthProvider + ProtectedRoute 적용
- `frontend/src/contexts/YouTubeDataContext.tsx` — auth 헤더 추가
- `frontend/src/contexts/InstagramDataContext.tsx` — auth 헤더 추가
- `frontend/src/hooks/useSseStream.ts` — auth 헤더 자동 주입
- `frontend/src/components/layout/Sidebar.tsx` — 로그아웃 버튼 추가

---

### Task 1: Supabase RLS 마이그레이션

**Files:**
- Create: `supabase/migrations/20260402000000_enable_rls.sql`

- [ ] **Step 1: RLS 마이그레이션 파일 작성**

```sql
-- Enable RLS on all user-data tables
ALTER TABLE watch_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_dashboard_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_dashboard_results ENABLE ROW LEVEL SECURITY;

-- watch_records: user_id is TEXT, auth.uid() is UUID → cast
CREATE POLICY "Users access own watch_records" ON watch_records
  FOR ALL USING (user_id = auth.uid()::text);

CREATE POLICY "Users access own search_records" ON search_records
  FOR ALL USING (user_id = auth.uid()::text);

-- dashboard results: user_id is UUID
CREATE POLICY "Users access own youtube_results" ON youtube_dashboard_results
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users access own instagram_results" ON instagram_dashboard_results
  FOR ALL USING (user_id = auth.uid());
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260402000000_enable_rls.sql
git commit -m "feat: add RLS policies for user data isolation"
```

---

### Task 2: Backend — JWT 인증 모듈

**Files:**
- Create: `backend/app/auth.py`
- Modify: `backend/requirements.txt`

- [ ] **Step 1: requirements.txt에 PyJWT 추가**

`backend/requirements.txt`에 추가:
```
PyJWT[crypto]==2.*
```

- [ ] **Step 2: auth.py 작성**

```python
"""Supabase JWT authentication for FastAPI."""

import os
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

_bearer = HTTPBearer()

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> str:
    """Decode Supabase JWT and return the user_id (sub claim).

    Raises 401 if the token is missing, expired, or invalid.
    """
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")

    user_id: str | None = payload.get("sub")
    if not user_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing user ID in token")
    return user_id
```

- [ ] **Step 3: 의존성 설치 확인**

Run: `cd /Users/wonjunjoe/Desktop/workspace/05_WatchLens/backend && pip install PyJWT[crypto]`

- [ ] **Step 4: Commit**

```bash
git add backend/app/auth.py backend/requirements.txt
git commit -m "feat: add JWT authentication module for Supabase"
```

---

### Task 3: Backend — Parsers user_id 파라미터화

**Files:**
- Modify: `backend/app/parsers/watch_history.py`
- Modify: `backend/app/parsers/search_history.py`

- [ ] **Step 1: watch_history.py 수정**

`backend/app/parsers/watch_history.py`에서:

1. import에서 `DEFAULT_USER_ID` 제거:
```python
# Before
from config.settings import SUPPORTED_HEADERS, WATCH_TITLE_PREFIX, WATCH_TITLE_SUFFIX_KO, DEFAULT_USER_ID
# After
from config.settings import SUPPORTED_HEADERS, WATCH_TITLE_PREFIX, WATCH_TITLE_SUFFIX_KO
```

2. 함수 시그니처에 `user_id` 파라미터 추가:
```python
# Before
def parse_watch_history(data: list[dict]) -> ParseResult:
# After
def parse_watch_history(data: list[dict], user_id: str) -> ParseResult:
```

3. 레코드 생성 시 파라미터 사용:
```python
# Before (line 54)
"user_id": DEFAULT_USER_ID,
# After
"user_id": user_id,
```

- [ ] **Step 2: search_history.py 수정**

`backend/app/parsers/search_history.py`에서:

1. import에서 `DEFAULT_USER_ID` 제거:
```python
# Before
from config.settings import SUPPORTED_HEADERS, SEARCH_TITLE_PREFIX, SEARCH_TITLE_SUFFIX_KO, DEFAULT_USER_ID
# After
from config.settings import SUPPORTED_HEADERS, SEARCH_TITLE_PREFIX, SEARCH_TITLE_SUFFIX_KO
```

2. 함수 시그니처에 `user_id` 파라미터 추가:
```python
# Before
def parse_search_history(data: list[dict]) -> ParseResult:
# After
def parse_search_history(data: list[dict], user_id: str) -> ParseResult:
```

3. 레코드 생성 시 파라미터 사용:
```python
# Before (line 32)
"user_id": DEFAULT_USER_ID,
# After
"user_id": user_id,
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/parsers/watch_history.py backend/app/parsers/search_history.py
git commit -m "refactor: parameterize user_id in parsers"
```

---

### Task 4: Backend — Routers에 인증 적용

**Files:**
- Modify: `backend/app/routers/upload.py`
- Modify: `backend/app/routers/stats.py`
- Modify: `backend/app/routers/instagram.py`
- Modify: `backend/app/routers/wellbeing.py`
- Modify: `backend/app/services/youtube.py:63`
- Modify: `backend/app/main.py:11-13`

- [ ] **Step 1: upload.py 수정**

1. import 변경:
```python
# Before (line 9)
from fastapi import APIRouter, UploadFile, File, HTTPException
# After
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends

# Before (line 12-13)
from config.settings import (
    MAX_FILE_SIZE_BYTES, DEFAULT_USER_ID, SUPABASE_STORAGE_BUCKET,
    MAX_YOUTUBE_ZIP_SIZE_BYTES,
    TAKEOUT_WATCH_HISTORY_PATTERNS, TAKEOUT_SEARCH_HISTORY_PATTERNS,
)
# After
from config.settings import (
    MAX_FILE_SIZE_BYTES, SUPABASE_STORAGE_BUCKET,
    MAX_YOUTUBE_ZIP_SIZE_BYTES,
    TAKEOUT_WATCH_HISTORY_PATTERNS, TAKEOUT_SEARCH_HISTORY_PATTERNS,
)

# 추가 import
from app.auth import get_current_user
```

2. 스트림 함수들에 `user_id` 파라미터 추가하고 하드코딩 제거:

`_watch_history_stream`:
```python
def _watch_history_stream(file_bytes: bytes, user_id: str) -> Generator[str, None, None]:
```
- line 48: `result = parse_watch_history(data)` → `result = parse_watch_history(data, user_id)`
- line 52: `delete_user_records("watch_records", DEFAULT_USER_ID)` → `delete_user_records("watch_records", user_id)`
- line 53: `delete_youtube_cache(DEFAULT_USER_ID)` → `delete_youtube_cache(user_id)`

`_search_history_stream`:
```python
def _search_history_stream(file_bytes: bytes, user_id: str) -> Generator[str, None, None]:
```
- line 85: `result = parse_search_history(data)` → `result = parse_search_history(data, user_id)`
- line 89: `delete_user_records("search_records", DEFAULT_USER_ID)` → `delete_user_records("search_records", user_id)`

`_youtube_takeout_stream`:
```python
def _youtube_takeout_stream(file_bytes: bytes, user_id: str) -> Generator[str, None, None]:
```
- line 163: `result = parse_watch_history(watch_data)` → `result = parse_watch_history(watch_data, user_id)`
- line 167: `delete_user_records("watch_records", DEFAULT_USER_ID)` → `delete_user_records("watch_records", user_id)`
- line 168: `delete_youtube_cache(DEFAULT_USER_ID)` → `delete_youtube_cache(user_id)`
- line 190: `result = parse_search_history(search_data)` → `result = parse_search_history(search_data, user_id)`
- line 194: `delete_user_records("search_records", DEFAULT_USER_ID)` → `delete_user_records("search_records", user_id)`

3. 엔드포인트에 auth dependency 추가:
```python
@router.post("/youtube-takeout")
async def upload_youtube_takeout(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
):
    file_bytes = await file.read()
    if len(file_bytes) > MAX_YOUTUBE_ZIP_SIZE_BYTES:
        raise HTTPException(413, "파일 크기가 500MB를 초과합니다")
    return StreamingResponse(_youtube_takeout_stream(file_bytes, user_id), media_type="text/event-stream")


@router.post("/watch-history")
async def upload_watch_history(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
):
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(413, "파일 크기가 50MB를 초과합니다")
    return StreamingResponse(_watch_history_stream(file_bytes, user_id), media_type="text/event-stream")


@router.post("/search-history")
async def upload_search_history(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
):
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(413, "파일 크기가 50MB를 초과합니다")
    return StreamingResponse(_search_history_stream(file_bytes, user_id), media_type="text/event-stream")
```

- [ ] **Step 2: stats.py 수정**

1. import 변경:
```python
# Before
from fastapi import APIRouter, Query
# After
from fastapi import APIRouter, Query, Depends

# Before
from config.settings import DEFAULT_USER_ID
# After (이 줄 삭제)

# 추가
from app.auth import get_current_user
```

2. 엔드포인트 시그니처 변경 — Query param `user_id`를 `Depends(get_current_user)`로 교체:

```python
@router.get("/period", response_model=PeriodInfo)
def get_period(user_id: str = Depends(get_current_user)):

@router.get("/dashboard/cached")
def get_cached_dashboard(user_id: str = Depends(get_current_user)):

@router.get("/dashboard")
def get_dashboard(
    date_from: str = Query(...),
    date_to: str = Query(...),
    user_id: str = Depends(get_current_user),
):
```

- [ ] **Step 3: instagram.py 수정**

1. import 변경:
```python
# Before
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
# After
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends

# Before
from config.settings import MAX_ZIP_SIZE_BYTES, DEFAULT_USER_ID
# After
from config.settings import MAX_ZIP_SIZE_BYTES

# 추가
from app.auth import get_current_user
```

2. `_instagram_upload_stream`에 `user_id` 파라미터 추가:
```python
def _instagram_upload_stream(zip_bytes: bytes, user_id: str) -> Generator[str, None, None]:
```
- line 173: `save_instagram_results(DEFAULT_USER_ID, all_results)` → `save_instagram_results(user_id, all_results)`

3. 엔드포인트 변경:
```python
@router.post("/upload")
async def upload_instagram(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
):
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
```

- [ ] **Step 4: wellbeing.py 수정**

1. import 변경:
```python
# Before
from fastapi import APIRouter, Query
# After
from fastapi import APIRouter, Depends

# config.settings import에서 DEFAULT_USER_ID 제거

# 추가
from app.auth import get_current_user
```

2. 엔드포인트 변경:
```python
@router.get("/compute")
def compute_wellbeing_score(user_id: str = Depends(get_current_user)):
```

- [ ] **Step 5: youtube.py에서 DEFAULT_USER_ID 제거**

`backend/app/services/youtube.py` line 63:
```python
# Before
def fetch_and_store_metadata(video_ids: list[str], user_id: str = DEFAULT_USER_ID):
# After
def fetch_and_store_metadata(video_ids: list[str]):
```
import에서 `DEFAULT_USER_ID` 제거. 이 함수는 video_metadata 테이블에 저장하는데, 이 테이블에는 user_id가 없으므로 파라미터 자체가 불필요.

- [ ] **Step 6: main.py CORS 업데이트**

```python
import os

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        FRONTEND_URL,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

- [ ] **Step 7: config/settings.py에서 DEFAULT_USER_ID 제거**

`DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000"` 라인 삭제.
`repository.py`의 import에서도 `DEFAULT_USER_ID` 제거 (사용하지 않으므로).

- [ ] **Step 8: Commit**

```bash
git add backend/
git commit -m "feat: apply JWT auth to all API endpoints, remove hardcoded user_id"
```

---

### Task 5: Frontend — Supabase 클라이언트 + AuthContext

**Files:**
- Create: `frontend/src/lib/supabase.ts`
- Create: `frontend/src/contexts/AuthContext.tsx`
- Modify: `frontend/src/config.ts`
- Modify: `frontend/package.json`

- [ ] **Step 1: @supabase/supabase-js 설치**

Run: `cd /Users/wonjunjoe/Desktop/workspace/05_WatchLens/frontend && npm install @supabase/supabase-js`

- [ ] **Step 2: config.ts에 Supabase 환경변수 추가**

```typescript
export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
```

- [ ] **Step 3: Supabase 클라이언트 생성**

`frontend/src/lib/supabase.ts`:
```typescript
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

- [ ] **Step 4: AuthContext 작성**

`frontend/src/contexts/AuthContext.tsx`:
```tsx
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "../lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/upload` },
    });
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/supabase.ts frontend/src/contexts/AuthContext.tsx frontend/src/config.ts frontend/package.json frontend/package-lock.json
git commit -m "feat: add Supabase client and AuthContext"
```

---

### Task 6: Frontend — LoginPage + ProtectedRoute + 라우팅

**Files:**
- Create: `frontend/src/pages/LoginPage.tsx` (새로운 로그인 전용 페이지)
- Create: `frontend/src/components/ProtectedRoute.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: ProtectedRoute 작성**

`frontend/src/components/ProtectedRoute.tsx`:
```tsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return <Outlet />;
}
```

- [ ] **Step 2: LoginPage 작성**

`frontend/src/pages/LoginPage.tsx`:
```tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate("/upload", { replace: true });
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg)]">
        <div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--bg)]">
      <div className="w-full max-w-sm mx-auto p-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4 mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-[var(--accent)] to-[#7C3AED] rounded-2xl flex items-center justify-center shadow-lg">
            <Eye size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
            WatchLens
          </h1>
          <p className="text-sm text-[var(--text-secondary)] text-center">
            YouTube & Instagram 시청 기록을 분석해보세요
          </p>
        </div>

        {/* Google Login Button */}
        <button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white border border-[var(--border-strong)] rounded-xl text-[15px] font-semibold text-[var(--text-primary)] hover:bg-gray-50 hover:shadow-md transition-all duration-200 shadow-sm"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google로 시작하기
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: App.tsx 업데이트**

```tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { LandingPage } from "./pages/LandingPage";
import { UploadPage } from "./pages/UploadPage";
import { DashboardPage } from "./pages/DashboardPage";
import { InstagramDashboardPage } from "./pages/InstagramDashboardPage";
import { WellbeingPage } from "./pages/WellbeingPage";
import { AuthProvider } from "./contexts/AuthContext";
import { InstagramDataProvider } from "./contexts/InstagramDataContext";
import { YouTubeDataProvider } from "./contexts/YouTubeDataContext";

function App() {
  return (
    <AuthProvider>
      <YouTubeDataProvider>
        <InstagramDataProvider>
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              {/* Protected routes */}
              <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  <Route path="/upload" element={<UploadPage />} />
                  <Route path="/youtube/dashboard" element={<DashboardPage />} />
                  <Route path="/instagram/dashboard" element={<InstagramDashboardPage />} />
                  <Route path="/wellbeing" element={<WellbeingPage />} />
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </InstagramDataProvider>
      </YouTubeDataProvider>
    </AuthProvider>
  );
}

export default App;
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/LoginPage.tsx frontend/src/components/ProtectedRoute.tsx frontend/src/App.tsx
git commit -m "feat: add LoginPage, ProtectedRoute, and update routing"
```

---

### Task 7: Frontend — API 호출에 인증 헤더 추가

**Files:**
- Modify: `frontend/src/hooks/useSseStream.ts`
- Modify: `frontend/src/contexts/YouTubeDataContext.tsx`
- Modify: `frontend/src/contexts/InstagramDataContext.tsx`

- [ ] **Step 1: useSseStream.ts에 auth 헤더 자동 주입**

`frontend/src/hooks/useSseStream.ts`를 수정하여 Supabase 세션에서 토큰을 가져와 자동으로 Authorization 헤더에 추가:

```typescript
import { useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";

interface SseEvent {
  event: string;
  data: any;
}

type SseHandler = (evt: SseEvent) => void;

export function useSseStream() {
  const abortRef = useRef<AbortController | null>(null);

  const stream = useCallback(
    async (
      url: string,
      handler: SseHandler,
      options?: { method?: string; body?: FormData | string; headers?: Record<string, string> },
    ) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const { data: { session } } = await supabase.auth.getSession();
      const authHeaders: Record<string, string> = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {};

      const res = await fetch(url, {
        method: options?.method ?? "GET",
        body: options?.body,
        headers: { ...authHeaders, ...options?.headers },
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`SSE request failed: ${res.status}`);
      }

      const reader = res.body.getReader();
      try {
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const blocks = buffer.split("\n\n");
          buffer = blocks.pop() ?? "";

          for (const block of blocks) {
            const eventMatch = block.match(/^event: (.+)$/m);
            const dataMatch = block.match(/^data: (.+)$/m);
            if (!eventMatch || !dataMatch) continue;
            try {
              handler({ event: eventMatch[1], data: JSON.parse(dataMatch[1]) });
            } catch {
              // skip malformed JSON
            }
          }
        }
      } finally {
        reader.cancel();
      }
    },
    [],
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { stream, abort };
}
```

- [ ] **Step 2: YouTubeDataContext.tsx에 auth 헤더 추가**

`fetchPeriod` 함수의 fetch 호출에 Authorization 헤더 추가:

```typescript
const fetchPeriod = useCallback(async (force?: boolean) => {
  if (cleared && !force) return;
  if (force) setCleared(false);
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {};
    const res = await fetch(`${API_BASE}/api/stats/period`, { headers });
    const d = await res.json();
    if (d.date_from) setPeriod(d);
  } catch {
    // ignore
  }
}, [cleared]);
```

파일 상단에 import 추가:
```typescript
import { supabase } from "../lib/supabase";
```

- [ ] **Step 3: InstagramDataContext.tsx에 auth 헤더 추가**

`fetchFromDb` 함수의 fetch 호출에 Authorization 헤더 추가:

```typescript
const fetchFromDb = useCallback(async (): Promise<boolean> => {
  if (cleared) return false;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {};
    const res = await fetch(`${API_BASE}/api/instagram/dashboard`, { headers });
    if (!res.ok) return false;
    const results = await res.json();
    setData(results);
    return true;
  } catch {
    return false;
  }
}, [cleared]);
```

파일 상단에 import 추가:
```typescript
import { supabase } from "../lib/supabase";
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/hooks/useSseStream.ts frontend/src/contexts/YouTubeDataContext.tsx frontend/src/contexts/InstagramDataContext.tsx
git commit -m "feat: add auth headers to all API calls"
```

---

### Task 8: Frontend — Sidebar에 로그아웃 추가

**Files:**
- Modify: `frontend/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Sidebar에 유저 프로필 + 로그아웃 버튼 추가**

Sidebar.tsx 하단의 Toggle 버튼 위에 유저 정보 + 로그아웃 추가:

import 추가:
```typescript
import { LogOut } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
```

컴포넌트 내부에 추가:
```typescript
const { user, signOut } = useAuth();
```

Toggle 섹션(`<div className="px-3 pb-4">`) 직전에 유저 섹션 추가:
```tsx
{/* User */}
<div className="px-3 pb-2 border-t border-[var(--border)]">
  <div className="flex items-center gap-3 px-3 py-3">
    {user?.user_metadata?.avatar_url ? (
      <img
        src={user.user_metadata.avatar_url}
        alt=""
        className="w-8 h-8 rounded-full flex-shrink-0"
        referrerPolicy="no-referrer"
      />
    ) : (
      <div className="w-8 h-8 rounded-full bg-[var(--accent-light)] flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-bold text-[var(--accent)]">
          {user?.email?.[0]?.toUpperCase() ?? "?"}
        </span>
      </div>
    )}
    {!collapsed && (
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">
          {user?.user_metadata?.full_name ?? user?.email ?? ""}
        </p>
      </div>
    )}
  </div>
  <button
    onClick={signOut}
    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[var(--text-tertiary)] hover:bg-red-50 hover:text-red-500 transition-colors text-[13px]"
  >
    <LogOut size={16} className="flex-shrink-0" />
    {!collapsed && <span>로그아웃</span>}
  </button>
</div>
```

- [ ] **Step 2: 로그아웃 시 데이터 클리어**

Sidebar의 signOut을 래핑하여 Context 데이터도 클리어:

```typescript
const { clear: clearYt } = useYouTubeData();
const { clear: clearIg } = useInstagramData();

const handleSignOut = async () => {
  clearYt();
  clearIg();
  await signOut();
};
```

`signOut` 호출을 `handleSignOut`으로 교체.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/layout/Sidebar.tsx
git commit -m "feat: add user profile and logout to sidebar"
```

---

### Task 9: 환경변수 설정 및 최종 검증

**Files:**
- Create: `frontend/.env.example`
- Create: `backend/.env.example`

- [ ] **Step 1: 환경변수 예시 파일 작성**

`frontend/.env.example`:
```
VITE_API_BASE=http://localhost:8000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

`backend/.env.example`:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
YOUTUBE_API_KEY=your-youtube-api-key
FRONTEND_URL=http://localhost:5173
```

- [ ] **Step 2: LandingPage에 로그인 CTA 연결**

LandingPage의 기존 "시작하기" 버튼이 `/upload`로 링크되어 있을 경우, `/login`으로 변경:
- LandingPage.tsx에서 `/upload`로 향하는 Link/navigate를 `/login`으로 변경

- [ ] **Step 3: 빌드 확인**

Run:
```bash
cd /Users/wonjunjoe/Desktop/workspace/05_WatchLens/frontend && npm run build
```
Expected: 빌드 성공 (타입 에러 없음)

Run:
```bash
cd /Users/wonjunjoe/Desktop/workspace/05_WatchLens/backend && python -c "from app.auth import get_current_user; print('OK')"
```
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add frontend/.env.example backend/.env.example
git commit -m "feat: add env examples and wire login flow"
```

---

## Supabase 콘솔 수동 설정 (코드 외)

구현 완료 후 Supabase 대시보드에서 수동으로 설정해야 하는 항목:

1. **Authentication > Providers > Google** 활성화
   - Google Cloud Console에서 OAuth 2.0 Client ID 생성
   - Authorized redirect URI: `https://<supabase-project>.supabase.co/auth/v1/callback`
   - Client ID와 Client Secret을 Supabase에 입력

2. **Settings > API > JWT Secret** 확인하여 `SUPABASE_JWT_SECRET` 환경변수에 설정

3. **SQL Editor**에서 RLS 마이그레이션 실행 (또는 `supabase db push`)
