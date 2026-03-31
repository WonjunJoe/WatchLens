# Share Card (인스타 스토리 공유) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** YouTube/Instagram 대시보드 핵심 지표를 인스타 스토리 사이즈(1080×1920) 카드로 렌더링하고, 클립보드에 이미지로 복사하는 공유 모달 구현

**Architecture:** 대시보드 페이지 우상단 공유 버튼 → 모달(backdrop blur 오버레이) → html-to-image로 카드 → 클립보드 복사. 데이터는 기존 YouTubeDataContext / InstagramDataContext에서 직접 읽어서 싱크 보장.

**Tech Stack:** React, html-to-image, Tailwind CSS, Lucide React

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `frontend/src/components/share/ShareModal.tsx` | 모달 오버레이 + 복사 버튼 로직 |
| Create | `frontend/src/components/share/ShareCard.tsx` | 1080×1920 카드 레이아웃 (캡처 대상) |
| Modify | `frontend/src/pages/DashboardPage.tsx` | 공유 버튼 추가 + ShareModal 연결 |
| Modify | `frontend/src/pages/InstagramDashboardPage.tsx` | 공유 버튼 추가 + ShareModal 연결 |

---

### Task 1: html-to-image 설치

- [ ] **Step 1: 패키지 설치**

```bash
cd frontend && npm install html-to-image
```

- [ ] **Step 2: 설치 확인**

```bash
cd frontend && node -e "require('html-to-image'); console.log('ok')"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore: add html-to-image dependency"
```

---

### Task 2: ShareCard 컴포넌트

카드 자체의 레이아웃. 캡처 대상이므로 Tailwind만으로 스타일링하고, 외부 의존 없이 순수 HTML/CSS.

**Files:**
- Create: `frontend/src/components/share/ShareCard.tsx`

- [ ] **Step 1: ShareCard 컴포넌트 작성**

```tsx
import { forwardRef } from "react";
import type { YouTubeData } from "../../types/youtube";
import type { InstagramData } from "../../types/instagram";

interface ShareCardProps {
  youtube?: YouTubeData;
  instagram?: Partial<InstagramData>;
  period?: string; // "2026.03.01 ~ 03.31"
}

export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  ({ youtube, instagram, period }, ref) => {
    const yt = youtube;
    const ig = instagram;

    // YouTube 핵심 지표
    const totalWatched = yt?.summary?.total_watched ?? 0;
    const dailyAvg = yt?.summary?.daily_average ?? 0;
    const shortsRatio = yt?.shorts
      ? Math.round(yt.shorts.shorts_ratio * 100)
      : 0;
    const dopamineScore = yt?.dopamine?.score ?? 0;
    const dopamineGrade = yt?.dopamine?.grade ?? "-";
    const viewerCode = yt?.viewer_type?.code ?? "-";
    const viewerName = yt?.viewer_type?.type_name ?? "";
    const topChannels = (yt?.top_channels?.longform ?? []).slice(0, 3);

    // Instagram 핵심 지표
    const totalLikes = ig?.summary?.total_likes ?? 0;
    const totalConversations = ig?.summary?.total_conversations ?? 0;
    const lateRatio = ig?.late_night
      ? Math.round(ig.late_night.late_ratio * 100)
      : 0;
    const lurkerScore = ig?.lurker_index?.lurker_score ?? 0;
    const topAccounts = (ig?.top_accounts ?? []).slice(0, 3);

    const hasYoutube = !!yt?.summary;
    const hasInstagram = !!ig?.summary;

    return (
      <div
        ref={ref}
        style={{ width: 1080, height: 1920 }}
        className="bg-gradient-to-b from-[#0f172a] to-[#1e293b] text-white flex flex-col px-[72px] py-[96px] font-sans"
      >
        {/* Header */}
        <div className="text-center mb-[64px]">
          <h1 className="text-[56px] font-bold tracking-tight">WatchLens</h1>
          {period && (
            <p className="text-[28px] text-white/60 mt-[12px]">{period}</p>
          )}
        </div>

        {/* YouTube Section */}
        {hasYoutube && (
          <div className="flex-1">
            <div className="flex items-center gap-[16px] mb-[40px]">
              <div className="w-[48px] h-[4px] bg-red-500 rounded-full" />
              <span className="text-[32px] font-semibold text-red-400">
                YouTube
              </span>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-3 gap-[24px] mb-[40px]">
              <div className="bg-white/5 rounded-[20px] p-[32px] text-center">
                <p className="text-[28px] text-white/50">총 시청</p>
                <p className="text-[48px] font-bold mt-[8px]">
                  {totalWatched.toLocaleString()}
                </p>
              </div>
              <div className="bg-white/5 rounded-[20px] p-[32px] text-center">
                <p className="text-[28px] text-white/50">일 평균</p>
                <p className="text-[48px] font-bold mt-[8px]">{dailyAvg}</p>
              </div>
              <div className="bg-white/5 rounded-[20px] p-[32px] text-center">
                <p className="text-[28px] text-white/50">Shorts</p>
                <p className="text-[48px] font-bold mt-[8px]">{shortsRatio}%</p>
              </div>
            </div>

            {/* Dopamine + Viewer Type Row */}
            <div className="grid grid-cols-2 gap-[24px] mb-[40px]">
              <div className="bg-white/5 rounded-[20px] p-[32px]">
                <p className="text-[28px] text-white/50 mb-[8px]">도파민 지수</p>
                <p className="text-[56px] font-bold">
                  {dopamineScore}
                  <span className="text-[32px] text-white/40 ml-[8px]">
                    / 100
                  </span>
                </p>
                <p className="text-[24px] text-white/40 mt-[4px]">
                  {dopamineGrade}
                </p>
              </div>
              <div className="bg-white/5 rounded-[20px] p-[32px]">
                <p className="text-[28px] text-white/50 mb-[8px]">시청 유형</p>
                <p className="text-[56px] font-bold">{viewerCode}</p>
                <p className="text-[24px] text-white/40 mt-[4px]">
                  {viewerName}
                </p>
              </div>
            </div>

            {/* Top Channels */}
            {topChannels.length > 0 && (
              <div className="bg-white/5 rounded-[20px] p-[32px] mb-[24px]">
                <p className="text-[28px] text-white/50 mb-[16px]">
                  Top 채널
                </p>
                <div className="flex gap-[24px]">
                  {topChannels.map((ch, i) => (
                    <span key={ch.channel_name} className="text-[30px]">
                      <span className="text-white/40">{i + 1}.</span>{" "}
                      {ch.channel_name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instagram Section */}
        {hasInstagram && (
          <div className="flex-1">
            <div className="flex items-center gap-[16px] mb-[40px]">
              <div className="w-[48px] h-[4px] bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
              <span className="text-[32px] font-semibold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Instagram
              </span>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-2 gap-[24px] mb-[40px]">
              <div className="bg-white/5 rounded-[20px] p-[32px] text-center">
                <p className="text-[28px] text-white/50">총 좋아요</p>
                <p className="text-[48px] font-bold mt-[8px]">
                  {totalLikes.toLocaleString()}
                </p>
              </div>
              <div className="bg-white/5 rounded-[20px] p-[32px] text-center">
                <p className="text-[28px] text-white/50">DM 대화</p>
                <p className="text-[48px] font-bold mt-[8px]">
                  {totalConversations}명
                </p>
              </div>
            </div>

            {/* Lurker + Late Night Row */}
            <div className="grid grid-cols-2 gap-[24px] mb-[40px]">
              <div className="bg-white/5 rounded-[20px] p-[32px]">
                <p className="text-[28px] text-white/50 mb-[8px]">
                  Lurker 지수
                </p>
                <p className="text-[56px] font-bold">
                  {lurkerScore}
                  <span className="text-[32px] text-white/40 ml-[8px]">
                    / 100
                  </span>
                </p>
              </div>
              <div className="bg-white/5 rounded-[20px] p-[32px]">
                <p className="text-[28px] text-white/50 mb-[8px]">심야 활동</p>
                <p className="text-[56px] font-bold">{lateRatio}%</p>
              </div>
            </div>

            {/* Top Accounts */}
            {topAccounts.length > 0 && (
              <div className="bg-white/5 rounded-[20px] p-[32px]">
                <p className="text-[28px] text-white/50 mb-[16px]">
                  Top 소통
                </p>
                <div className="flex gap-[24px]">
                  {topAccounts.map((acc, i) => (
                    <span key={acc.username} className="text-[30px]">
                      <span className="text-white/40">{i + 1}.</span> @
                      {acc.username}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-auto pt-[48px]">
          <p className="text-[24px] text-white/30">watchlens.app</p>
        </div>
      </div>
    );
  }
);

ShareCard.displayName = "ShareCard";
```

- [ ] **Step 2: 빌드 확인**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/share/ShareCard.tsx
git commit -m "feat: add ShareCard component (1080x1920 story layout)"
```

---

### Task 3: ShareModal 컴포넌트

모달 오버레이 + 카드 미리보기 + 클립보드 복사 로직.

**Files:**
- Create: `frontend/src/components/share/ShareModal.tsx`

- [ ] **Step 1: ShareModal 컴포넌트 작성**

```tsx
import { useRef, useState, useCallback } from "react";
import { toPng } from "html-to-image";
import { X, Copy, Check, Download } from "lucide-react";
import { ShareCard } from "./ShareCard";
import type { YouTubeData } from "../../types/youtube";
import type { InstagramData } from "../../types/instagram";

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  youtube?: YouTubeData;
  instagram?: Partial<InstagramData>;
  period?: string;
}

export function ShareModal({
  open,
  onClose,
  youtube,
  instagram,
  period,
}: ShareModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const generateImage = useCallback(async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    setGenerating(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        width: 1080,
        height: 1920,
        pixelRatio: 1,
      });
      const res = await fetch(dataUrl);
      return await res.blob();
    } finally {
      setGenerating(false);
    }
  }, []);

  const handleCopy = useCallback(async () => {
    const blob = await generateImage();
    if (!blob) return;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: download instead
      handleDownload(blob);
    }
  }, [generateImage]);

  const handleDownload = useCallback(
    async (existingBlob?: Blob) => {
      const blob = existingBlob ?? (await generateImage());
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "watchlens-share.png";
      a.click();
      URL.revokeObjectURL(url);
    },
    [generateImage]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal Content */}
      <div
        className="relative z-10 flex flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <X size={20} />
        </button>

        {/* Card preview (scaled down to fit screen) */}
        <div
          className="rounded-2xl overflow-hidden shadow-2xl"
          style={{
            width: 1080 * 0.3,
            height: 1920 * 0.3,
          }}
        >
          <div
            style={{
              transform: "scale(0.3)",
              transformOrigin: "top left",
            }}
          >
            <ShareCard
              ref={cardRef}
              youtube={youtube}
              instagram={instagram}
              period={period}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mt-2">
          <button
            onClick={handleCopy}
            disabled={generating}
            className="flex items-center gap-2 px-6 py-3 bg-white text-[#0f172a] rounded-xl font-medium text-[14px] hover:bg-white/90 transition-colors disabled:opacity-50"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "복사됨!" : generating ? "생성 중..." : "이미지 복사"}
          </button>
          <button
            onClick={() => handleDownload()}
            disabled={generating}
            className="flex items-center gap-2 px-6 py-3 bg-white/10 text-white rounded-xl font-medium text-[14px] hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            <Download size={16} />
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 빌드 확인**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/share/ShareModal.tsx
git commit -m "feat: add ShareModal with clipboard copy and download"
```

---

### Task 4: DashboardPage에 공유 버튼 연결

**Files:**
- Modify: `frontend/src/pages/DashboardPage.tsx`

- [ ] **Step 1: DashboardPage에 공유 버튼 + ShareModal 추가**

상단 임포트에 추가:
```tsx
import { Share2 } from "lucide-react";
import { ShareModal } from "../components/share/ShareModal";
import { useInstagramData } from "../contexts/InstagramDataContext";
```

컴포넌트 내부 state 추가 (기존 state들 아래):
```tsx
const [shareOpen, setShareOpen] = useState(false);
const { data: igData } = useInstagramData();
```

기간 텍스트 포맷 헬퍼 (컴포넌트 내부):
```tsx
const sharePeriod = dateFrom && dateTo
  ? `${dateFrom.replace(/-/g, ".")} ~ ${dateTo.slice(5).replace(/-/g, ".")}`
  : undefined;
```

헤더 영역에 공유 버튼 추가 (기존 새로고침 버튼 옆):
```tsx
<button
  onClick={() => setShareOpen(true)}
  className="p-2 rounded-lg hover:bg-[var(--accent-light)] text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors"
  title="스토리 공유"
>
  <Share2 size={18} />
</button>
```

컴포넌트 return 맨 끝(닫는 div 직전)에 모달 추가:
```tsx
<ShareModal
  open={shareOpen}
  onClose={() => setShareOpen(false)}
  youtube={data}
  instagram={igData}
  period={sharePeriod}
/>
```

- [ ] **Step 2: 빌드 확인**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/DashboardPage.tsx
git commit -m "feat: add share button to YouTube dashboard"
```

---

### Task 5: InstagramDashboardPage에 공유 버튼 연결

**Files:**
- Modify: `frontend/src/pages/InstagramDashboardPage.tsx`

- [ ] **Step 1: InstagramDashboardPage에 공유 버튼 + ShareModal 추가**

상단 임포트에 추가:
```tsx
import { Share2 } from "lucide-react";
import { ShareModal } from "../components/share/ShareModal";
import { useYouTubeData } from "../contexts/YouTubeDataContext";
```

컴포넌트 내부 state 추가:
```tsx
const [shareOpen, setShareOpen] = useState(false);
const { data: ytData } = useYouTubeData();
```

헤더 영역에 공유 버튼 추가 (기존 새로고침 버튼 옆):
```tsx
<button
  onClick={() => setShareOpen(true)}
  className="p-2 rounded-lg hover:bg-[var(--accent-light)] text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors"
  title="스토리 공유"
>
  <Share2 size={18} />
</button>
```

컴포넌트 return 맨 끝에 모달 추가:
```tsx
<ShareModal
  open={shareOpen}
  onClose={() => setShareOpen(false)}
  youtube={ytData}
  instagram={data}
/>
```

- [ ] **Step 2: 빌드 확인**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/InstagramDashboardPage.tsx
git commit -m "feat: add share button to Instagram dashboard"
```

---

### Task 6: 빌드 + 수동 테스트

- [ ] **Step 1: 전체 빌드 확인**

```bash
cd frontend && npm run build
```

Expected: 에러 없음

- [ ] **Step 2: dev 서버에서 수동 확인**

확인 항목:
1. YouTube 대시보드 → 우상단 Share2 아이콘 버튼 존재
2. 버튼 클릭 → 모달 열림 (배경 blur + 어두운 오버레이)
3. 카드 미리보기가 축소되어 중앙에 표시
4. "이미지 복사" 클릭 → 클립보드에 PNG 복사
5. "저장" 클릭 → watchlens-share.png 다운로드
6. 배경 클릭 또는 X 버튼 → 모달 닫힘
7. Instagram 대시보드에서도 동일하게 동작

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: share card — 인스타 스토리 공유 기능 (1080×1920)"
```
