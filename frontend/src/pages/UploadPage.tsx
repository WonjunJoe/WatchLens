import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FileUploader } from "../components/FileUploader";
import { UploadResultCard, type UploadResult } from "../components/UploadResultCard";
import { PeriodSelector } from "../components/PeriodSelector";
import { Database, Sparkles, UploadCloud } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto py-12 px-6"
    >
      {/* Hero Section */}
      <section className="text-center mb-16">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 bg-[var(--accent-lavender)]/10 text-[var(--accent-lavender)] text-[12px] font-black uppercase tracking-widest rounded-full mb-6 border border-[var(--accent-lavender)]/20"
        >
          <Sparkles size={14} />
          2026 High-End Analysis
        </motion.div>
        
        <h1 className="text-[48px] font-black text-[var(--text-primary)] tracking-tighter leading-none mb-6">
          Unveil Your <span className="text-[var(--accent-lavender)]">Identity.</span>
        </h1>
        
        <p className="text-[16px] text-[var(--text-secondary)] font-medium max-w-xl mx-auto leading-relaxed mb-10">
          Google Takeout 데이터를 업로드하여 당신만의 시청 정체성을 발견하세요.<br/>
          도파민 지수, 시청 유형, 그리고 숨겨진 패턴이 공개됩니다.
        </p>

        <button
          onClick={handleLoadExisting}
          className="group inline-flex items-center gap-2.5 px-6 py-3 bg-[var(--text-primary)]/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/10 transition-all duration-300 rounded-2xl text-[14px] font-bold"
        >
          <Database size={16} className="group-hover:rotate-12 transition-transform" />
          기존 데이터로 바로 분석하기
        </button>
      </section>

      {/* Upload Grid */}
      <section className="grid gap-8 md:grid-cols-2 mb-12">
        <div className="clay-card p-2">
          <FileUploader
            label="Watch History"
            accept=".json"
            endpoint="/api/upload/watch-history"
            onResult={(data) => setWatchResult({ type: "watch", ...data })}
            subtitle="watch-history.json"
          />
        </div>
        <div className="clay-card p-2">
          <FileUploader
            label="Search History"
            accept=".json"
            endpoint="/api/upload/search-history"
            onResult={(data) => setSearchResult({ type: "search", ...data })}
            subtitle="search-history.json"
          />
        </div>
      </section>

      {/* Results Section */}
      {(watchResult || searchResult) && (
        <motion.section 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="grid gap-6 md:grid-cols-2 mb-12"
        >
          {watchResult && <UploadResultCard result={watchResult} />}
          {searchResult && <UploadResultCard result={searchResult} />}
        </motion.section>
      )}

      {/* Progress / Period Selector */}
      <AnimatePresence>
        {loadingPeriod && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-12"
          >
            <div className="w-10 h-10 border-4 border-[var(--accent-lavender)]/20 border-t-[var(--accent-lavender)] rounded-full animate-spin mb-4" />
            <p className="text-[var(--text-tertiary)] text-[13px] font-black uppercase tracking-widest">Scanning History...</p>
          </motion.div>
        )}

        {period && !loadingPeriod && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-8 sm:p-12 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <UploadCloud size={120} className="text-[var(--accent-lavender)]" />
            </div>
            <PeriodSelector
              dateFrom={period.date_from}
              dateTo={period.date_to}
              totalDays={period.total_days}
              onSelect={handlePeriodSelect}
            />
          </motion.section>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
