import { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion, type Variants } from "framer-motion";
import { SummaryCards } from "../components/SummaryCards";
import { WatchTime } from "../components/WatchTime";
import { HourlyChart } from "../components/HourlyChart";
import { DailyChart } from "../components/DailyChart";
import { TopChannels } from "../components/TopChannels";
import { ShortsStats } from "../components/ShortsStats";
import { Categories } from "../components/Categories";
import { SearchKeywords } from "../components/SearchKeywords";
import { InsightSummary } from "../components/InsightSummary";
import { WeeklyComparison } from "../components/WeeklyComparison";
import { DopamineIndex } from "../components/DopamineIndex";
import { WeeklyWatchTime } from "../components/WeeklyWatchTime";
import { ViewerType } from "../components/ViewerType";
import { CalendarHeatmap } from "../components/CalendarHeatmap";
import { DayOfWeekChart } from "../components/DayOfWeekChart";
import { ShareCard } from "../components/ShareCard";
import { CalendarDays, RefreshCw, Sparkles, Loader2, Share2 } from "lucide-react";

const API_BASE = "http://localhost:8000";

interface DashboardState {
  summary: any;
  hourly: any;
  daily: any;
  top_channels: any;
  shorts: any;
  categories: any;
  watch_time: any;
  weekly_watch_time: any;
  weekly: any;
  dopamine: any;
  day_of_week: any;
  viewer_type: any;
  search_keywords: any;
  insights: any;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 300, damping: 24 }
  }
};

export function DashboardPage() {
  const [params] = useSearchParams();
  const dateFrom = params.get("from") || "";
  const dateTo = params.get("to") || "";

  const [data, setData] = useState<Partial<DashboardState>>({});
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState({ loaded: 0, total: 14, step: "" });
  const [error, setError] = useState<string | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);

  const fetchDashboard = useCallback(async () => {
    if (!dateFrom || !dateTo) {
      setError("날짜 범위가 지정되지 않았습니다.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setData({});
    setProgress({ loaded: 0, total: 14, step: "고급 엔진 연결 중..." });

    try {
      const res = await fetch(
        `${API_BASE}/api/stats/dashboard?date_from=${dateFrom}&date_to=${dateTo}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

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
            setProgress({ loaded: payload.loaded || 0, total: payload.total || 14, step: payload.step || "" });
          } else if (event === "section") {
            setData((prev) => ({ ...prev, [payload.name]: payload.data }));
            setProgress({ loaded: payload.loaded, total: payload.total, step: `${payload.loaded}/${payload.total} 데이터 조각 매핑 중...` });
          } else if (event === "done") {
            setLoading(false);
          }
        }
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading && progress.loaded === 0 && !error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="relative w-20 h-20 mx-auto mb-8">
            <div className="absolute inset-0 bg-[var(--accent-lavender)]/20 rounded-full blur-2xl animate-pulse" />
            <Loader2 size={40} className="text-[var(--accent-lavender)] animate-spin absolute inset-0 m-auto" />
          </div>
          <h2 className="text-[24px] font-bold text-[var(--text-primary)] mb-2 tracking-tight">AI Insights Engine</h2>
          <p className="text-[14px] text-[var(--text-tertiary)] font-medium uppercase tracking-[0.2em]">{progress.step}</p>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    const pct = Math.round((progress.loaded / progress.total) * 100);
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <div className="w-full max-w-sm px-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[14px] font-bold text-[var(--text-primary)]">데이터 아트워크 렌더링</span>
            <span className="text-[14px] font-bold text-[var(--accent-lavender)]">{pct}%</span>
          </div>
          <div className="h-1.5 bg-[var(--text-primary)]/5 rounded-full overflow-hidden mb-6 backdrop-blur-sm">
            <motion.div 
              className="h-full bg-gradient-to-r from-[var(--accent-lavender)] to-[var(--accent-sky)] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <p className="text-center text-[12px] text-[var(--text-tertiary)] font-medium animate-pulse">{progress.step}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="clay-card p-10 text-center max-w-md">
          <div className="w-16 h-16 bg-[var(--accent-rose)]/10 text-[var(--accent-rose)] rounded-3xl flex items-center justify-center mx-auto mb-6">
            <RefreshCw size={24} />
          </div>
          <h2 className="text-[20px] font-bold text-[var(--text-primary)] mb-2">분석에 실패했습니다</h2>
          <p className="text-[14px] text-[var(--text-secondary)] mb-8 leading-relaxed">{error}</p>
          <Link to="/" className="inline-flex items-center justify-center px-6 py-3 bg-[var(--text-primary)] text-[var(--bg-base)] rounded-2xl text-[14px] font-bold hover:scale-[1.02] active:scale-[0.98] transition-all">
            다시 시도하기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="pb-20"
    >
      {/* Header Area */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <motion.div variants={itemVariants}>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--accent-lavender)]/10 text-[var(--accent-lavender)] rounded-full text-[11px] font-bold uppercase tracking-wider mb-3">
            <Sparkles size={12} />
            Analysis Complete
          </div>
          <h1 className="text-[42px] font-bold text-[var(--text-primary)] tracking-tight leading-none mb-4">Your Lens.</h1>
          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
            <div className="flex items-center gap-1.5 px-3 py-1.5 glass-card !rounded-full text-[13px] font-medium">
              <CalendarDays size={14} />
              {dateFrom} — {dateTo}
            </div>
          </div>
        </motion.div>
        
        <motion.div variants={itemVariants} className="flex gap-4">
          <button
            onClick={() => setIsShareOpen(true)}
            className="group flex items-center gap-2.5 px-6 py-4 bg-[var(--accent-lavender)] text-black rounded-3xl hover:scale-[1.05] active:scale-[0.95] transition-all duration-300 shadow-xl shadow-[var(--accent-lavender)]/20"
          >
            <Share2 size={18} />
            <span className="text-[15px] font-bold">Share Identity</span>
          </button>
          
          <Link
            to="/"
            className="group flex items-center gap-2.5 px-6 py-4 bg-[var(--text-primary)] text-[var(--bg-base)] rounded-3xl hover:scale-[1.05] active:scale-[0.95] transition-all duration-300 shadow-xl shadow-[var(--text-primary)]/10"
          >
            <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
            <span className="text-[15px] font-bold">New Analysis</span>
          </Link>
        </motion.div>
      </header>

      {/* Main Bento Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Row 1: Viewer Type & Insight Summary */}
        <motion.div variants={itemVariants} className="col-span-12 lg:col-span-5">
          <ViewerType data={data.viewer_type} />
        </motion.div>
        <motion.div variants={itemVariants} className="col-span-12 lg:col-span-7">
          <InsightSummary data={data.insights} />
        </motion.div>

        {/* Row 2: Summary Cards (Full Width) */}
        <motion.div variants={itemVariants} className="col-span-12">
          <SummaryCards data={data.summary} />
        </motion.div>

        {/* Row 3: Watch Time (P1) & Dopamine (P3) */}
        <motion.div variants={itemVariants} className="col-span-12 lg:col-span-8">
          <WatchTime data={data.watch_time} />
        </motion.div>
        <motion.div variants={itemVariants} className="col-span-12 lg:col-span-4">
          <DopamineIndex data={data.dopamine} />
        </motion.div>

        {/* Row 4: Calendar Heatmap */}
        <motion.div variants={itemVariants} className="col-span-12">
          <CalendarHeatmap data={data.daily} />
        </motion.div>

        {/* Row 5: Weekly Watch Time & Shorts Stats */}
        <motion.div variants={itemVariants} className="col-span-12 lg:col-span-8">
          <WeeklyWatchTime data={data.weekly_watch_time} />
        </motion.div>
        <motion.div variants={itemVariants} className="col-span-12 lg:col-span-4">
          <ShortsStats data={data.shorts} />
        </motion.div>

        {/* Row 6: Top Channels (P2) & Charts */}
        <motion.div variants={itemVariants} className="col-span-12 lg:col-span-6">
          <TopChannels data={data.top_channels} />
        </motion.div>
        <motion.div variants={itemVariants} className="col-span-12 lg:col-span-6 grid grid-cols-1 gap-6">
          <HourlyChart data={data.hourly} />
          <DayOfWeekChart data={data.day_of_week} />
        </motion.div>

        {/* Row 7: Daily Detailed Chart */}
        <motion.div variants={itemVariants} className="col-span-12">
          <DailyChart data={data.daily} />
        </motion.div>

        {/* Row 8: Weekly Comparison & Categories */}
        <motion.div variants={itemVariants} className="col-span-12 lg:col-span-6">
          <WeeklyComparison data={data.weekly} />
        </motion.div>
        <motion.div variants={itemVariants} className="col-span-12 lg:col-span-6">
          <Categories data={data.categories} />
        </motion.div>

        {/* Row 9: Search Keywords */}
        <motion.div variants={itemVariants} className="col-span-12">
          <SearchKeywords data={data.search_keywords} />
        </motion.div>
      </div>

      <ShareCard 
        isOpen={isShareOpen} 
        onClose={() => setIsShareOpen(false)} 
        data={{
          viewerType: data.viewer_type,
          watchTime: data.watch_time,
          topChannel: data.top_channels?.longform?.[0],
          dopamine: data.dopamine?.score || 0
        }}
      />
    </motion.div>
  );
}
