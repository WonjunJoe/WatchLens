import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileUploader } from "../components/FileUploader";
import { UploadResultCard, type UploadResult } from "../components/UploadResultCard";
import { PeriodSelector } from "../components/PeriodSelector";
import { useInstagramData } from "../contexts/InstagramDataContext";
import { Eye, Loader2 } from "lucide-react";

const API_BASE = "http://localhost:8000";

interface PeriodInfo {
  date_from: string;
  date_to: string;
  total_days: number;
}

export function HomePage() {
  const navigate = useNavigate();
  const { setSection } = useInstagramData();

  // YouTube state
  const [watchResult, setWatchResult] = useState<UploadResult | null>(null);
  const [searchResult, setSearchResult] = useState<UploadResult | null>(null);
  const [period, setPeriod] = useState<PeriodInfo | null>(null);
  const [loadingPeriod, setLoadingPeriod] = useState(false);

  // Instagram state
  const [igUploading, setIgUploading] = useState(false);
  const [igProgress, setIgProgress] = useState({ step: "", loaded: 0, total: 9 });
  const [igDone, setIgDone] = useState(false);
  const [igError, setIgError] = useState<string | null>(null);

  const handleWatchResult = (data: any) => {
    setWatchResult({ type: "watch", ...data });
    setLoadingPeriod(true);
    fetch(`${API_BASE}/api/stats/period`)
      .then((res) => res.json())
      .then((d) => { if (d.date_from) setPeriod(d); })
      .catch(() => {})
      .finally(() => setLoadingPeriod(false));
  };

  const handlePeriodSelect = (from: string, to: string) => {
    navigate(`/youtube/dashboard?from=${from}&to=${to}`);
  };

  const handleInstagramUpload = async (file: File) => {
    setIgError(null);
    setIgDone(false);
    setIgUploading(true);
    setIgProgress({ step: "업로드 중...", loaded: 0, total: 9 });

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE}/api/instagram/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail || `업로드 실패 (${res.status})`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("스트림을 읽을 수 없습니다");

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() || "";

        for (const block of blocks) {
          const eventMatch = block.match(/^event: (.+)$/m);
          const dataMatch = block.match(/^data: (.+)$/m);
          if (!eventMatch || !dataMatch) continue;

          const event = eventMatch[1];
          const payload = JSON.parse(dataMatch[1]);

          if (event === "progress") {
            setIgProgress({ step: payload.step, loaded: payload.loaded || 0, total: payload.total || 9 });
          } else if (event === "section") {
            setSection(payload.name, payload.data);
            setIgProgress({ step: `${payload.loaded}/${payload.total}`, loaded: payload.loaded, total: payload.total });
          } else if (event === "done") {
            setIgDone(true);
          } else if (event === "error") {
            throw new Error(payload.detail);
          }
        }
      }
    } catch (e: any) {
      setIgError(e.message);
    } finally {
      setIgUploading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8">
      {/* Hero */}
      <section className="text-center mb-12">
        <div className="w-14 h-14 mx-auto mb-4 bg-[var(--accent)] rounded-2xl flex items-center justify-center">
          <Eye size={24} className="text-white" />
        </div>
        <h1 className="text-[28px] font-bold text-[var(--text-primary)] mb-2">WatchLens</h1>
        <p className="text-[16px] text-[var(--text-secondary)] max-w-lg mx-auto">
          YouTube와 Instagram 사용 패턴을 분석하여 나만의 인사이트를 발견하세요.
        </p>
      </section>

      {/* Upload Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* YouTube */}
        <div className="card p-6">
          <h2 className="text-[16px] font-semibold text-[var(--text-primary)] mb-1">YouTube</h2>
          <p className="text-[13px] text-[var(--text-tertiary)] mb-4">Google Takeout의 watch-history.json</p>
          <FileUploader
            label="시청 기록"
            accept=".json"
            endpoint="/api/upload/watch-history"
            onResult={handleWatchResult}
            subtitle="watch-history.json"
          />
          {watchResult && (
            <div className="mt-4">
              <UploadResultCard result={watchResult} />
            </div>
          )}
          {searchResult && (
            <div className="mt-4">
              <UploadResultCard result={searchResult} />
            </div>
          )}
          {loadingPeriod && (
            <div className="flex justify-center py-4">
              <Loader2 size={20} className="text-[var(--accent)] animate-spin" />
            </div>
          )}
          {period && !loadingPeriod && (
            <div className="mt-4">
              <PeriodSelector
                dateFrom={period.date_from}
                dateTo={period.date_to}
                totalDays={period.total_days}
                onSelect={handlePeriodSelect}
              />
            </div>
          )}
        </div>

        {/* Instagram */}
        <div className="card p-6">
          <h2 className="text-[16px] font-semibold text-[var(--text-primary)] mb-1">Instagram</h2>
          <p className="text-[13px] text-[var(--text-tertiary)] mb-4">Instagram 데이터 다운로드 ZIP 파일</p>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) handleInstagramUpload(file);
            }}
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer border-gray-200 hover:border-[var(--accent)] hover:bg-[var(--accent-light)] transition-colors"
          >
            <label className="cursor-pointer block">
              <p className="text-[14px] font-medium text-[var(--text-primary)] mb-0.5">Instagram 데이터</p>
              <p className="text-[13px] text-[var(--text-tertiary)] mb-0.5">.zip 파일</p>
              <p className="text-[12px] text-[var(--text-tertiary)]">드래그 또는 클릭 (최대 100MB)</p>
              <input
                type="file"
                accept=".zip"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleInstagramUpload(file);
                }}
                className="hidden"
                disabled={igUploading}
              />
            </label>
          </div>

          {igUploading && (
            <div className="mt-4">
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-[var(--accent)] rounded-full transition-all"
                  style={{ width: `${Math.round((igProgress.loaded / igProgress.total) * 100)}%` }}
                />
              </div>
              <p className="text-[var(--accent)] text-[12px]">{igProgress.step}</p>
            </div>
          )}
          {igError && <p className="text-[var(--rose)] text-[12px] mt-3">{igError}</p>}
          {igDone && (
            <div className="mt-4">
              <button
                onClick={() => navigate("/instagram/dashboard")}
                className="w-full py-2.5 bg-[var(--accent)] text-white rounded-lg text-[14px] font-medium hover:opacity-90 transition-opacity"
              >
                Instagram 대시보드 보기
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Helper text */}
      <p className="text-center text-[13px] text-[var(--text-tertiary)]">
        둘 중 하나만 업로드해도 해당 대시보드가 생성됩니다.
      </p>
    </div>
  );
}
