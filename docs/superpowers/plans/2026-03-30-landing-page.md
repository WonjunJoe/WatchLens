# WatchLens 랜딩 페이지 + 업로드 페이지 분리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 현재 HomePage(업로드 기능)를 UploadPage로 분리하고, Supanova Design 원칙을 적용한 프리미엄 랜딩 페이지를 새 HomePage로 만든다.

**Architecture:** 랜딩 페이지(`/`)는 Layout(사이드바) 밖에서 풀스크린으로 렌더링. 업로드 페이지(`/upload`)는 기존 Layout 안에서 렌더링. 사이드바 메뉴와 대시보드 내 링크를 모두 새 경로에 맞게 업데이트.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, lucide-react, React Router v7

**Design Direction (Supanova):**
- Vibe: Vantablack Luxe — 딥 다크 배경(`#050505`), 글래스 이펙트 카드
- Layout: Split Hero (좌: 텍스트, 우: 비주얼) + Bento Grid 기능 소개
- Accent: Indigo (`#6366F1` — 기존 accent 컬러 유지)
- Typography: Pretendard (이미 로드됨), `break-keep-all`, `leading-snug`
- Motion: CSS `@keyframes` + `IntersectionObserver` 스크롤 애니메이션
- No external animation library (기존 패턴 유지)

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Rename | `src/pages/HomePage.tsx` → `src/pages/UploadPage.tsx` | 업로드 기능 (기존 코드 그대로, export명만 변경) |
| Create | `src/pages/LandingPage.tsx` | 프리미엄 랜딩 페이지 (Supanova 디자인) |
| Modify | `src/App.tsx` | 라우팅: `/` → LandingPage (Layout 밖), `/upload` → UploadPage (Layout 안) |
| Modify | `src/components/layout/Sidebar.tsx` | 메뉴 업데이트: "홈" → `/`, "업로드" 추가 → `/upload` |
| Modify | `src/pages/DashboardPage.tsx` | "새 분석" 링크 `/` → `/upload` |
| Modify | `src/pages/InstagramDashboardPage.tsx` | "돌아가기" 링크 `/` → `/upload` |
| Modify | `src/index.css` | 랜딩 페이지용 CSS 애니메이션 추가 |
| Modify | `frontend/index.html` | `<title>` 태그를 "WatchLens"로 변경 |

---

### Task 1: HomePage → UploadPage 리네이밍

**Files:**
- Rename: `src/pages/HomePage.tsx` → `src/pages/UploadPage.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: HomePage.tsx를 UploadPage.tsx로 복사 + export명 변경**

```bash
cp frontend/src/pages/HomePage.tsx frontend/src/pages/UploadPage.tsx
```

`src/pages/UploadPage.tsx` — export명만 변경:
```tsx
// Line 13: 함수명 변경
export function UploadPage() {
```
나머지 코드는 모두 동일.

- [ ] **Step 2: App.tsx에서 import 및 라우팅 변경**

`src/App.tsx`:
```tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { UploadPage } from "./pages/UploadPage";
import { DashboardPage } from "./pages/DashboardPage";
import { InstagramDashboardPage } from "./pages/InstagramDashboardPage";
import { InstagramDataProvider } from "./contexts/InstagramDataContext";
import { YouTubeDataProvider } from "./contexts/YouTubeDataContext";

function App() {
  return (
    <YouTubeDataProvider>
      <InstagramDataProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/youtube/dashboard" element={<DashboardPage />} />
              <Route path="/instagram/dashboard" element={<InstagramDashboardPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </InstagramDataProvider>
    </YouTubeDataProvider>
  );
}

export default App;
```

Note: `/` 라우트는 Task 3에서 LandingPage와 함께 추가.

- [ ] **Step 3: 기존 HomePage.tsx 삭제**

```bash
rm frontend/src/pages/HomePage.tsx
```

- [ ] **Step 4: 빌드 확인**

```bash
cd frontend && npm run build
```
Expected: 빌드 성공 (LandingPage는 아직 없으므로 `/` 경로는 404)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: rename HomePage to UploadPage, route to /upload"
```

---

### Task 2: 사이드바 + 대시보드 링크 업데이트

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/pages/DashboardPage.tsx:102,123`
- Modify: `src/pages/InstagramDashboardPage.tsx:47,63`

- [ ] **Step 1: Sidebar 메뉴 업데이트**

`src/components/layout/Sidebar.tsx` — MENU 배열 변경:
```tsx
import { Home, BarChart3, PanelLeftClose, PanelLeftOpen, Eye, Upload } from "lucide-react";

const MENU = [
  { label: "홈", icon: Home, path: "/" },
  { label: "업로드", icon: Upload, path: "/upload" },
  { label: "YouTube 대시보드", icon: BarChart3, path: "/youtube/dashboard" },
  { label: "Instagram 대시보드", icon: Eye, path: "/instagram/dashboard" },
];
```

- [ ] **Step 2: DashboardPage.tsx — "새 분석" 링크를 `/upload`로 변경**

`src/pages/DashboardPage.tsx`에서 `to="/"`를 모두 `to="/upload"`로 변경:
- Line 102: `<Link to="/upload" ...>` (에러 시 "새 분석" 버튼)
- Line 123: `to="/upload"` (헤더의 "새 분석" 링크)

- [ ] **Step 3: InstagramDashboardPage.tsx — "돌아가기" 링크를 `/upload`로 변경**

`src/pages/InstagramDashboardPage.tsx`에서 `to="/"`를 모두 `to="/upload"`로 변경:
- Line 47: `to="/upload"` (로딩 실패 시 돌아가기)
- Line 63: `to="/upload"` (헤더의 돌아가기)

- [ ] **Step 4: 빌드 확인**

```bash
cd frontend && npm run build
```
Expected: 빌드 성공

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: update sidebar menu and dashboard links for /upload route"
```

---

### Task 3: 랜딩 페이지 CSS 애니메이션 추가

**Files:**
- Modify: `src/index.css`
- Modify: `frontend/index.html`

- [ ] **Step 1: index.css에 랜딩 페이지용 애니메이션 추가**

`src/index.css` — 기존 코드 뒤에 추가:
```css
/* Landing page animations */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(2rem);
    filter: blur(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-15px); }
}

@keyframes gradientRotate {
  0% { transform: rotate(0deg) scale(1); }
  50% { transform: rotate(180deg) scale(1.1); }
  100% { transform: rotate(360deg) scale(1); }
}

.animate-fadeInUp {
  animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.animate-float {
  animation: float 6s ease-in-out infinite;
}

.animate-gradient-rotate {
  animation: gradientRotate 20s linear infinite;
}

/* Stagger delay utility */
.stagger-1 { animation-delay: 80ms; }
.stagger-2 { animation-delay: 160ms; }
.stagger-3 { animation-delay: 240ms; }
.stagger-4 { animation-delay: 320ms; }
.stagger-5 { animation-delay: 400ms; }

/* Noise texture overlay */
.noise-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  pointer-events: none;
  opacity: 0.03;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
}

/* Glass effect */
.glass {
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
}
```

- [ ] **Step 2: index.html 타이틀 변경**

`frontend/index.html`:
```html
<title>WatchLens — 나의 디지털 습관을 분석하다</title>
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "style: add landing page CSS animations and glass effects"
```

---

### Task 4: 랜딩 페이지 컴포넌트 생성 — Hero 섹션

**Files:**
- Create: `src/pages/LandingPage.tsx`

- [ ] **Step 1: LandingPage.tsx 생성 — 기본 구조 + Navigation + Hero**

`src/pages/LandingPage.tsx`:
```tsx
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Eye, ArrowRight, BarChart3, Clock, Users, TrendingUp, MessageCircle, Search } from "lucide-react";

export function LandingPage() {
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-fadeInUp");
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll("[data-reveal]").forEach((el) => {
      el.classList.add("opacity-0");
      observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <div className="min-h-[100dvh] bg-[#050505] text-white overflow-x-hidden" style={{ wordBreak: "keep-all" }}>
      {/* Noise overlay */}
      <div className="noise-overlay" />

      {/* Background gradient orbs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full animate-gradient-rotate"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full animate-gradient-rotate"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)", animationDelay: "-10s" }}
        />
      </div>

      {/* Floating Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 flex justify-center pt-5 px-4">
        <div className="glass rounded-full px-6 py-3 flex items-center gap-8 max-w-2xl w-full justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
              <Eye size={16} className="text-white" />
            </div>
            <span className="text-[15px] font-bold tracking-tight">WatchLens</span>
          </Link>
          <div className="hidden sm:flex items-center gap-6 text-[13px] text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors" style={{ transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)" }}>기능</a>
            <a href="#how-it-works" className="hover:text-white transition-colors" style={{ transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)" }}>사용법</a>
          </div>
          <Link
            to="/upload"
            className="bg-indigo-500 hover:bg-indigo-400 text-white text-[13px] font-medium px-5 py-2 rounded-full flex items-center gap-2 active:scale-[0.98] hover:scale-[1.02]"
            style={{ transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)" }}
          >
            시작하기
          </Link>
        </div>
      </nav>

      {/* Hero Section — Split Layout */}
      <section className="relative z-10 min-h-[100dvh] flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left — Text */}
            <div className="pt-24 lg:pt-0">
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.15em] font-medium bg-indigo-500/10 text-indigo-400 mb-6 animate-fadeInUp">
                YouTube · Instagram 분석
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-snug tracking-tight mb-6 animate-fadeInUp stagger-1">
                나의 디지털 습관을<br />
                데이터로 마주하다
              </h1>
              <p className="text-lg md:text-xl text-zinc-400 leading-relaxed max-w-[50ch] mb-10 animate-fadeInUp stagger-2">
                Google Takeout과 Instagram 데이터를 업로드하면,
                시청 패턴·DM 분석·관심사 추적까지 한눈에 보여드립니다.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 animate-fadeInUp stagger-3">
                <Link
                  to="/upload"
                  className="group bg-indigo-500 hover:bg-indigo-400 text-white font-medium px-8 py-4 rounded-full text-lg flex items-center justify-center gap-3 active:scale-[0.98] hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(99,102,241,0.3)]"
                  style={{ transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)" }}
                >
                  무료로 분석 시작하기
                  <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:translate-x-1" style={{ transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)" }}>
                    <ArrowRight size={16} />
                  </span>
                </Link>
              </div>
            </div>

            {/* Right — Visual (Dashboard Preview Mock) */}
            <div className="hidden lg:block relative">
              <div className="animate-float">
                <div className="relative p-1.5 rounded-[2rem] bg-white/5 ring-1 ring-white/10">
                  <div className="bg-zinc-900/80 rounded-[calc(2rem-0.375rem)] p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
                    {/* Mock dashboard cards */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                        <div className="text-[11px] text-zinc-500 mb-1">총 시청</div>
                        <div className="text-2xl font-bold text-white">2,847</div>
                        <div className="text-[11px] text-emerald-400 mt-1">+12.3%</div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                        <div className="text-[11px] text-zinc-500 mb-1">시청 시간</div>
                        <div className="text-2xl font-bold text-white">186h</div>
                        <div className="text-[11px] text-amber-400 mt-1">일 1.2h</div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                        <div className="text-[11px] text-zinc-500 mb-1">Shorts 비율</div>
                        <div className="text-2xl font-bold text-white">34%</div>
                        <div className="text-[11px] text-rose-400 mt-1">주의</div>
                      </div>
                    </div>
                    {/* Mock chart area */}
                    <div className="bg-white/5 rounded-xl p-4 border border-white/5 h-32 flex items-end gap-1">
                      {[40, 65, 45, 80, 55, 90, 70, 60, 85, 50, 75, 95].map((h, i) => (
                        <div key={i} className="flex-1 bg-indigo-500/40 rounded-t" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 나머지 섹션은 Task 5, 6에서 추가 */}
    </div>
  );
}
```

- [ ] **Step 2: App.tsx에 LandingPage 라우트 추가**

`src/App.tsx`:
```tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { LandingPage } from "./pages/LandingPage";
import { UploadPage } from "./pages/UploadPage";
import { DashboardPage } from "./pages/DashboardPage";
import { InstagramDashboardPage } from "./pages/InstagramDashboardPage";
import { InstagramDataProvider } from "./contexts/InstagramDataContext";
import { YouTubeDataProvider } from "./contexts/YouTubeDataContext";

function App() {
  return (
    <YouTubeDataProvider>
      <InstagramDataProvider>
        <BrowserRouter>
          <Routes>
            {/* Landing page — Layout 밖 (사이드바 없음, 풀스크린) */}
            <Route path="/" element={<LandingPage />} />
            {/* App pages — Layout 안 (사이드바 있음) */}
            <Route element={<Layout />}>
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/youtube/dashboard" element={<DashboardPage />} />
              <Route path="/instagram/dashboard" element={<InstagramDashboardPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </InstagramDataProvider>
    </YouTubeDataProvider>
  );
}

export default App;
```

- [ ] **Step 3: 빌드 확인**

```bash
cd frontend && npm run build
```
Expected: 빌드 성공

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add LandingPage with hero section and floating nav"
```

---

### Task 5: 랜딩 페이지 — Features 섹션 (Bento Grid)

**Files:**
- Modify: `src/pages/LandingPage.tsx`

- [ ] **Step 1: Hero 섹션 아래에 Features 섹션 추가**

`src/pages/LandingPage.tsx` — `{/* 나머지 섹션은 Task 5, 6에서 추가 */}` 주석을 다음으로 교체:

```tsx
      {/* Features Section — Bento Grid */}
      <section id="features" className="relative z-10 py-24 md:py-32 lg:py-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16" data-reveal>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.15em] font-medium bg-indigo-500/10 text-indigo-400 mb-4">
              주요 기능
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-snug tracking-tight">
              당신의 데이터가 말해주는<br />숨겨진 패턴
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {/* Card 1 — Wide (col-span-4) */}
            <div data-reveal className="md:col-span-4 p-1.5 rounded-[2rem] bg-white/5 ring-1 ring-white/10">
              <div className="bg-zinc-900/80 rounded-[calc(2rem-0.375rem)] p-8 h-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-5">
                  <BarChart3 size={24} className="text-indigo-400" />
                </div>
                <h3 className="text-xl font-bold mb-2 leading-snug">시청 패턴 분석</h3>
                <p className="text-zinc-400 text-[15px] leading-relaxed max-w-[50ch]">
                  시간대별·요일별·일별 시청 트렌드를 시각화합니다.
                  가장 많이 보는 시간대, 몰아보기 패턴, 주말과 평일의 차이까지 한눈에 파악하세요.
                </p>
              </div>
            </div>

            {/* Card 2 — Narrow (col-span-2) */}
            <div data-reveal className="md:col-span-2 p-1.5 rounded-[2rem] bg-white/5 ring-1 ring-white/10">
              <div className="bg-zinc-900/80 rounded-[calc(2rem-0.375rem)] p-8 h-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-5">
                  <Clock size={24} className="text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold mb-2 leading-snug">시청 시간 추적</h3>
                <p className="text-zinc-400 text-[15px] leading-relaxed">
                  주간·월간 누적 시청 시간과 Shorts 비율을 추적합니다.
                </p>
              </div>
            </div>

            {/* Card 3 — Narrow (col-span-2) */}
            <div data-reveal className="md:col-span-2 p-1.5 rounded-[2rem] bg-white/5 ring-1 ring-white/10">
              <div className="bg-zinc-900/80 rounded-[calc(2rem-0.375rem)] p-8 h-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-5">
                  <TrendingUp size={24} className="text-amber-400" />
                </div>
                <h3 className="text-xl font-bold mb-2 leading-snug">도파민 지수</h3>
                <p className="text-zinc-400 text-[15px] leading-relaxed">
                  짧은 영상 소비 비율과 심야 시청 패턴으로 도파민 의존도를 측정합니다.
                </p>
              </div>
            </div>

            {/* Card 4 — Wide (col-span-4) */}
            <div data-reveal className="md:col-span-4 p-1.5 rounded-[2rem] bg-white/5 ring-1 ring-white/10">
              <div className="bg-zinc-900/80 rounded-[calc(2rem-0.375rem)] p-8 h-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-5">
                  <MessageCircle size={24} className="text-rose-400" />
                </div>
                <h3 className="text-xl font-bold mb-2 leading-snug">Instagram DM 분석</h3>
                <p className="text-zinc-400 text-[15px] leading-relaxed max-w-[50ch]">
                  가장 많이 대화한 상대, 답장 속도, 활발한 시간대를 분석합니다.
                  좋아요·스토리 반응·관심 주제까지 종합적으로 보여드립니다.
                </p>
              </div>
            </div>

            {/* Card 5 — Full width (col-span-3) */}
            <div data-reveal className="md:col-span-3 p-1.5 rounded-[2rem] bg-white/5 ring-1 ring-white/10">
              <div className="bg-zinc-900/80 rounded-[calc(2rem-0.375rem)] p-8 h-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center mb-5">
                  <Users size={24} className="text-cyan-400" />
                </div>
                <h3 className="text-xl font-bold mb-2 leading-snug">채널 · 계정 랭킹</h3>
                <p className="text-zinc-400 text-[15px] leading-relaxed">
                  가장 많이 시청한 YouTube 채널과 Instagram에서 가장 많이 소통한 계정을 순위로 보여드립니다.
                </p>
              </div>
            </div>

            {/* Card 6 (col-span-3) */}
            <div data-reveal className="md:col-span-3 p-1.5 rounded-[2rem] bg-white/5 ring-1 ring-white/10">
              <div className="bg-zinc-900/80 rounded-[calc(2rem-0.375rem)] p-8 h-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
                <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-5">
                  <Search size={24} className="text-violet-400" />
                </div>
                <h3 className="text-xl font-bold mb-2 leading-snug">검색 키워드 분석</h3>
                <p className="text-zinc-400 text-[15px] leading-relaxed">
                  YouTube 검색 기록에서 자주 찾는 키워드와 관심사 변화를 추적합니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 나머지 섹션은 Task 6에서 추가 */}
```

- [ ] **Step 2: 빌드 확인**

```bash
cd frontend && npm run build
```
Expected: 빌드 성공

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add features bento grid section to landing page"
```

---

### Task 6: 랜딩 페이지 — How It Works + CTA + Footer

**Files:**
- Modify: `src/pages/LandingPage.tsx`

- [ ] **Step 1: `{/* 나머지 섹션은 Task 6에서 추가 */}` 주석을 다음으로 교체**

```tsx
      {/* How It Works */}
      <section id="how-it-works" className="relative z-10 py-24 md:py-32 lg:py-40 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16" data-reveal>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.15em] font-medium bg-indigo-500/10 text-indigo-400 mb-4">
              사용법
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-snug tracking-tight">
              3단계로 시작하세요
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6" data-reveal>
            {[
              {
                step: "01",
                title: "데이터 내보내기",
                desc: "Google Takeout에서 YouTube 기록을, Instagram에서 내 데이터를 다운로드하세요.",
              },
              {
                step: "02",
                title: "파일 업로드",
                desc: "다운로드한 JSON 또는 ZIP 파일을 WatchLens에 업로드하세요. 모든 처리는 실시간으로 진행됩니다.",
              },
              {
                step: "03",
                title: "인사이트 확인",
                desc: "시청 패턴, DM 분석, 도파민 지수 등 다양한 인사이트를 대시보드에서 확인하세요.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center md:text-left">
                <div className="text-5xl font-bold text-indigo-500/20 mb-4">{item.step}</div>
                <h3 className="text-xl font-bold mb-2 leading-snug">{item.title}</h3>
                <p className="text-zinc-400 text-[15px] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section — Full Bleed */}
      <section className="relative z-10 py-24 md:py-32 lg:py-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative p-1.5 rounded-[2rem] bg-white/5 ring-1 ring-white/10 overflow-hidden" data-reveal>
            <div className="bg-zinc-900/80 rounded-[calc(2rem-0.375rem)] px-8 py-16 md:py-24 text-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] relative">
              {/* Background glow */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(circle at 50% 50%, rgba(99,102,241,0.1) 0%, transparent 60%)" }}
              />
              <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-snug tracking-tight mb-4">
                  지금 바로 시작해보세요
                </h2>
                <p className="text-zinc-400 text-lg leading-relaxed max-w-[45ch] mx-auto mb-10">
                  당신의 데이터는 서버에 저장되지 않습니다.
                  업로드하고, 분석하고, 나만의 인사이트를 발견하세요.
                </p>
                <Link
                  to="/upload"
                  className="group inline-flex items-center gap-3 bg-indigo-500 hover:bg-indigo-400 text-white font-medium px-8 py-4 rounded-full text-lg active:scale-[0.98] hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(99,102,241,0.3)]"
                  style={{ transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)" }}
                >
                  분석 시작하기
                  <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:translate-x-1" style={{ transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)" }}>
                    <ArrowRight size={16} />
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-indigo-500 rounded-lg flex items-center justify-center">
                <Eye size={14} className="text-white" />
              </div>
              <span className="text-[14px] font-bold text-zinc-400">WatchLens</span>
            </div>
            <p className="text-[13px] text-zinc-600">
              개인 프로젝트 · 데이터는 브라우저에서만 처리됩니다
            </p>
          </div>
        </div>
      </footer>
    </div>
```

주의: 이 코드는 LandingPage 컴포넌트의 마지막 `</div>` 직전에 삽입. 기존 Features 섹션의 `{/* 나머지 섹션은 Task 6에서 추가 */}` 주석을 교체.

- [ ] **Step 2: 빌드 확인**

```bash
cd frontend && npm run build
```
Expected: 빌드 성공

- [ ] **Step 3: 브라우저에서 `/` 접속하여 확인**

```bash
cd frontend && npm run dev
```
확인 사항:
- `/` → 다크 랜딩 페이지 (사이드바 없음)
- `/upload` → 기존 업로드 페이지 (사이드바 있음)
- 스크롤 시 `data-reveal` 요소가 페이드인
- 네비게이션 링크 동작 확인

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add how-it-works, CTA, and footer to landing page"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | HomePage → UploadPage 리네이밍 | UploadPage.tsx, App.tsx |
| 2 | 사이드바 + 대시보드 링크 업데이트 | Sidebar.tsx, DashboardPage.tsx, InstagramDashboardPage.tsx |
| 3 | CSS 애니메이션 + index.html 타이틀 | index.css, index.html |
| 4 | 랜딩 페이지 Hero + Navigation | LandingPage.tsx, App.tsx |
| 5 | 랜딩 페이지 Features (Bento Grid) | LandingPage.tsx |
| 6 | 랜딩 페이지 How It Works + CTA + Footer | LandingPage.tsx |
