import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FileUploader } from "../components/FileUploader";
import { UploadResultCard, type UploadResult } from "../components/UploadResultCard";
import { PeriodSelector } from "../components/PeriodSelector";
import { useInstagramData } from "../contexts/InstagramDataContext";
import { useYouTubeData } from "../contexts/YouTubeDataContext";
import { Eye, Loader2 } from "lucide-react";
import { useSseStream } from "../hooks/useSseStream";

const API_BASE = "http://localhost:8000";

export function UploadPage() {
  const navigate = useNavigate();
  const { setSection } = useInstagramData();
  const { period, fetchPeriod } = useYouTubeData();

  // YouTube state
  const [watchResult, setWatchResult] = useState<UploadResult | null>(null);
  const [searchResult, setSearchResult] = useState<UploadResult | null>(null);
  const [loadingPeriod, setLoadingPeriod] = useState(false);

  // On mount, check if YouTube data already exists in DB
  useEffect(() => {
    fetchPeriod();
  }, [fetchPeriod]);

  // Instagram state
  const [igUploading, setIgUploading] = useState(false);
  const [igProgress, setIgProgress] = useState({ step: "", loaded: 0, total: 16 });
  const [igDone, setIgDone] = useState(false);
  const [igError, setIgError] = useState<string | null>(null);

  const handleWatchResult = (data: any) => {
    setWatchResult({ type: "watch", ...data });
    setLoadingPeriod(true);
    fetchPeriod().finally(() => setLoadingPeriod(false));
  };

  const handlePeriodSelect = (from: string, to: string) => {
    navigate(`/youtube/dashboard?from=${from}&to=${to}`);
  };

  const { stream } = useSseStream();

  const handleInstagramUpload = async (file: File) => {
    setIgError(null);
    setIgDone(false);
    setIgUploading(true);
    setIgProgress({ step: "업로드 중...", loaded: 0, total: 16 });

    try {
      const formData = new FormData();
      formData.append("file", file);

      await stream(
        `${API_BASE}/api/instagram/upload`,
        ({ event, data: payload }) => {
          if (event === "progress") {
            setIgProgress({ step: payload.step, loaded: payload.loaded || 0, total: payload.total || 9 });
          } else if (event === "section") {
            setSection(payload.name, payload.data);
            setIgProgress({ step: `${payload.loaded}/${payload.total}`, loaded: payload.loaded, total: payload.total });
          } else if (event === "done") {
            setIgDone(true);
          } else if (event === "error") {
            setIgError(payload.detail || payload.message);
          }
        },
        { method: "POST", body: formData },
      );
    } catch (e: any) {
      setIgError(e.message);
    } finally {
      setIgUploading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8">
      {/* Hero — 충분한 여백으로 스크롤 유도 */}
      <section className="text-center mb-16 pt-12">
        <div className="w-16 h-16 mx-auto mb-6 bg-[var(--accent)] rounded-2xl flex items-center justify-center">
          <Eye size={28} className="text-white" />
        </div>
        <h1 className="text-[32px] font-bold text-[var(--text-primary)] mb-3">WatchLens</h1>
        <p className="text-[17px] text-[var(--text-secondary)] max-w-xl mx-auto leading-relaxed">
          YouTube와 Instagram 사용 패턴을 분석하여<br />나만의 인사이트를 발견하세요.
        </p>
      </section>

      {/* Upload Grid — 양쪽 높이 맞춤 */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 items-start">
        {/* YouTube */}
        <div className="card p-6">
          <h2 className="text-[16px] font-semibold text-[var(--text-primary)] mb-1">YouTube</h2>
          <p className="text-[13px] text-[var(--text-tertiary)] mb-4">Google Takeout에서 내보낸 JSON 파일</p>
          <div className="space-y-3">
            <FileUploader
              label="시청 기록"
              accept=".json"
              endpoint="/api/upload/watch-history"
              onResult={handleWatchResult}
              subtitle="watch-history.json"
            />
            <FileUploader
              label="검색 기록"
              accept=".json"
              endpoint="/api/upload/search-history"
              onResult={(data) => setSearchResult({ type: "search", ...data })}
              subtitle="search-history.json"
            />
          </div>
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
              <p className="text-[12px] text-[var(--text-tertiary)]">드래그 또는 클릭 (최대 500MB)</p>
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
