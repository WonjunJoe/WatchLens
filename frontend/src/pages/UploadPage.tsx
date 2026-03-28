import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FileUploader } from "../components/FileUploader";
import { UploadResultCard, type UploadResult } from "../components/UploadResultCard";
import { PeriodSelector } from "../components/PeriodSelector";
import { Database, Loader2 } from "lucide-react";

const API_BASE = "http://localhost:8000";

interface PeriodInfo {
  date_from: string;
  date_to: string;
  total_days: number;
}

export function UploadPage() {
  const navigate = useNavigate();
  const [watchResult, setWatchResult] = useState<UploadResult | null>(null);
  const [searchResult, setSearchResult] = useState<UploadResult | null>(null);
  const [period, setPeriod] = useState<PeriodInfo | null>(null);
  const [loadingPeriod, setLoadingPeriod] = useState(false);

  useEffect(() => {
    if (!watchResult) return;
    setLoadingPeriod(true);
    fetch(`${API_BASE}/api/stats/period`)
      .then((res) => res.json())
      .then((data) => { if (data.date_from) setPeriod(data); })
      .catch(() => {})
      .finally(() => setLoadingPeriod(false));
  }, [watchResult]);

  const handleLoadExisting = () => {
    setLoadingPeriod(true);
    fetch(`${API_BASE}/api/stats/period`)
      .then((res) => res.json())
      .then((data) => { if (data.date_from) setPeriod(data); })
      .catch(() => {})
      .finally(() => setLoadingPeriod(false));
  };

  const handlePeriodSelect = (from: string, to: string) => {
    navigate(`/dashboard?from=${from}&to=${to}`);
  };

  return (
    <div className="max-w-3xl mx-auto py-8">
      {/* Header */}
      <section className="mb-10">
        <h1 className="text-[24px] font-bold text-[var(--text-primary)] mb-2">데이터 업로드</h1>
        <p className="text-[15px] text-[var(--text-secondary)] mb-4">
          Google Takeout에서 내보낸 YouTube 시청 기록을 업로드하세요.
        </p>
        <button
          onClick={handleLoadExisting}
          className="inline-flex items-center gap-2 px-4 py-2 text-[14px] text-[var(--text-secondary)] border border-[var(--border)] rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Database size={14} />
          기존 데이터로 분석
        </button>
      </section>

      {/* Upload Grid */}
      <section className="grid gap-4 md:grid-cols-2 mb-8">
        <div className="card p-1">
          <FileUploader
            label="시청 기록"
            accept=".json"
            endpoint="/api/upload/watch-history"
            onResult={(data) => setWatchResult({ type: "watch", ...data })}
            subtitle="watch-history.json"
          />
        </div>
        <div className="card p-1">
          <FileUploader
            label="검색 기록"
            accept=".json"
            endpoint="/api/upload/search-history"
            onResult={(data) => setSearchResult({ type: "search", ...data })}
            subtitle="search-history.json"
          />
        </div>
      </section>

      {/* Results */}
      {(watchResult || searchResult) && (
        <section className="grid gap-4 md:grid-cols-2 mb-8">
          {watchResult && <UploadResultCard result={watchResult} />}
          {searchResult && <UploadResultCard result={searchResult} />}
        </section>
      )}

      {/* Loading / Period Selector */}
      {loadingPeriod && (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="text-[var(--accent)] animate-spin" />
        </div>
      )}

      {period && !loadingPeriod && (
        <section className="card p-6">
          <PeriodSelector
            dateFrom={period.date_from}
            dateTo={period.date_to}
            totalDays={period.total_days}
            onSelect={handlePeriodSelect}
          />
        </section>
      )}
    </div>
  );
}
