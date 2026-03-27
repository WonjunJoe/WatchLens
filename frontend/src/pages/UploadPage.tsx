import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FileUploader } from "../components/FileUploader";
import { UploadResultCard, type UploadResult } from "../components/UploadResultCard";
import { PeriodSelector } from "../components/PeriodSelector";
import { Database } from "lucide-react";

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
      .then((data) => {
        if (data.date_from) setPeriod(data);
      })
      .catch(() => {})
      .finally(() => setLoadingPeriod(false));
  }, [watchResult]);

  const handleLoadExisting = () => {
    setLoadingPeriod(true);
    fetch(`${API_BASE}/api/stats/period`)
      .then((res) => res.json())
      .then((data) => {
        if (data.date_from) setPeriod(data);
      })
      .catch(() => {})
      .finally(() => setLoadingPeriod(false));
  };

  const handlePeriodSelect = (from: string, to: string) => {
    navigate(`/dashboard?from=${from}&to=${to}`);
  };

  return (
    <div className="px-8 py-10">
      {/* Hero */}
      <section className="max-w-2xl mx-auto text-center mb-12">
        <div className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[var(--lavender-light)] text-[var(--lavender-text)] text-[12px] font-medium rounded-full mb-5">
          YouTube 시청 습관 분석
        </div>
        <h1 className="text-[20px] font-medium text-[var(--text-primary)] leading-[1.3] mb-3">
          당신의 시청 패턴을 한눈에 분석하세요
        </h1>
        <p className="text-[14px] text-[var(--text-secondary)] leading-[1.7] max-w-lg mx-auto mb-5">
          Google Takeout 데이터를 업로드하면 시청 시간, Shorts 중독도, 도파민 지수 등 플랫폼이 알려주지 않는 인사이트를 제공합니다.
        </p>
        <button
          onClick={handleLoadExisting}
          className="inline-flex items-center gap-1.5 text-[12px] text-[var(--lavender-text)] hover:text-[var(--text-primary)] transition-all duration-200"
        >
          <Database size={14} />
          기존 데이터로 분석하기
        </button>
      </section>

      {/* Upload Cards */}
      <section className="max-w-2xl mx-auto mb-8">
        <div className="grid gap-5 md:grid-cols-2">
          <FileUploader
            label="시청 기록"
            accept=".json"
            endpoint="/api/upload/watch-history"
            onResult={(data) => setWatchResult({ type: "watch", ...data })}
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
      </section>

      {/* Results */}
      {(watchResult || searchResult) && (
        <section className="max-w-2xl mx-auto mb-8">
          <div className="grid gap-4 md:grid-cols-2">
            {watchResult && <div className="order-1"><UploadResultCard result={watchResult} /></div>}
            {searchResult && <div className="order-2"><UploadResultCard result={searchResult} /></div>}
          </div>
        </section>
      )}

      {loadingPeriod && (
        <p className="text-center text-[var(--text-tertiary)] text-[12px] py-8">데이터 기간 확인 중...</p>
      )}

      {period && (
        <section className="max-w-2xl mx-auto pb-12">
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
