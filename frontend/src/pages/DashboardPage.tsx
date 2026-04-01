import { useEffect, useState, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { SummaryCards } from "../components/SummaryCards";
import { WatchTime } from "../components/WatchTime";
import { HourlyChart } from "../components/HourlyChart";
import { DailyChart } from "../components/DailyChart";
import { TopChannels } from "../components/TopChannels";
import { Categories } from "../components/Categories";
import { SearchKeywords } from "../components/SearchKeywords";
import { InsightSummary } from "../components/InsightSummary";
import { DopamineIndex } from "../components/DopamineIndex";
import { ViewerType } from "../components/ViewerType";
import { DayOfWeekChart } from "../components/DayOfWeekChart";
import { ContentDiversity } from "../components/ContentDiversity";
import { AttentionTrend } from "../components/AttentionTrend";
import { TimeCost } from "../components/TimeCost";
import { BingeSessions } from "../components/BingeSessions";
import { SearchWatchFlow } from "../components/SearchWatchFlow";
import { WeeklyReport } from "../components/WeeklyReport";
import { CalendarDays, RefreshCw, Loader2, Share2 } from "lucide-react";
import { useSseStream } from "../hooks/useSseStream";
import { useYouTubeData, type YouTubeData } from "../contexts/YouTubeDataContext";
import { ShareModal } from "../components/share/ShareModal";
import { API_BASE } from "../config";

export function DashboardPage() {
  const [params] = useSearchParams();
  const paramFrom = params.get("from") || "";
  const paramTo = params.get("to") || "";

  const { data, period, setSection, clear, fetchPeriod } = useYouTubeData();
  const [shareOpen, setShareOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState({ loaded: 0, total: 19, step: "" });
  const [error, setError] = useState<string | null>(null);

  // Use URL params if present, otherwise fall back to period from DB
  const dateFrom = paramFrom || period?.date_from || "";
  const dateTo = paramTo || period?.date_to || "";

  const { stream } = useSseStream();
  const fetchedRef = useRef(false);

  // If no URL params and no period yet, try fetching period from DB
  useEffect(() => {
    if (!paramFrom && !paramTo && !period) {
      fetchPeriod();
    }
  }, [paramFrom, paramTo, period, fetchPeriod]);

  useEffect(() => {
    if (fetchedRef.current) return;

    if (!dateFrom || !dateTo) {
      if (!paramFrom && !paramTo && !period) {
        return; // Period fetch still in progress
      }
      setError("데이터가 없습니다. YouTube 시청 기록을 먼저 업로드해주세요.");
      setLoading(false);
      return;
    }

    if (data.summary) {
      setLoading(false);
      return;
    }

    fetchedRef.current = true;

    async function loadDashboard() {
      setLoading(true);
      setError(null);

      // Try cache first (instant) — only when using default period (no explicit URL params)
      if (!paramFrom && !paramTo) {
        try {
          const cacheRes = await fetch(`${API_BASE}/api/stats/dashboard/cached`);
          if (cacheRes.ok) {
            const cached = await cacheRes.json();
            // Validate cache: must match period and contain latest fields (by_time)
            if (
              cached.results &&
              cached.date_from === dateFrom &&
              cached.date_to === dateTo &&
              cached.results.top_channels?.by_time
            ) {
              for (const [key, value] of Object.entries(cached.results as Record<string, any>)) {
                setSection(key, value as YouTubeData[keyof YouTubeData]);
              }
              setLoading(false);
              return;
            }
          }
        } catch {
          // Cache miss — fall through to SSE
        }
      }

      // SSE stream (computes fresh + saves to cache)
      clear();
      setProgress({ loaded: 0, total: 19, step: "데이터 로드 중..." });
      try {
        await stream(
          `${API_BASE}/api/stats/dashboard?date_from=${dateFrom}&date_to=${dateTo}`,
          ({ event, data: payload }) => {
            if (event === "progress") {
              setProgress({ loaded: payload.loaded || 0, total: payload.total || 19, step: payload.step || "" });
            } else if (event === "section") {
              setSection(payload.name, payload.data);
              setProgress({ loaded: payload.loaded, total: payload.total, step: `${payload.loaded}/${payload.total}` });
            } else if (event === "done") {
              setLoading(false);
            } else if (event === "error") {
              setError(payload.message || payload.detail || "알 수 없는 오류");
            }
          },
        );
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [dateFrom, dateTo]);

  // Loading state
  if (loading) {
    const pct = Math.round((progress.loaded / progress.total) * 100);
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="text-[var(--accent)] animate-spin mb-4" />
        {progress.loaded > 0 ? (
          <>
            <div className="w-64 h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
              <div className="h-full bg-[var(--accent)] rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[13px] text-[var(--text-tertiary)]">{progress.step}</p>
          </>
        ) : (
          <p className="text-[14px] text-[var(--text-secondary)]">{progress.step}</p>
        )}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="card p-8 text-center max-w-sm">
          <p className="text-[16px] font-semibold text-[var(--text-primary)] mb-2">오류 발생</p>
          <p className="text-[14px] text-[var(--text-secondary)] mb-6">{error}</p>
          <Link to="/upload" className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-[14px] font-medium hover:opacity-90 transition-opacity">
            <RefreshCw size={14} />
            다시 시도
          </Link>
        </div>
      </div>
    );
  }

  const sharePeriod = dateFrom && dateTo
    ? `${dateFrom.replace(/-/g, ".")} ~ ${dateTo.slice(5).replace(/-/g, ".")}`
    : undefined;

  return (
    <div className="pb-12">
      {/* Header */}
      <header className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-[32px] font-extrabold text-[var(--text-primary)] tracking-tighter mb-1.5">대시보드</h1>
          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
            <CalendarDays size={14} className="opacity-60" />
            <span className="text-[13px] font-medium tracking-wide">{dateFrom} ~ {dateTo}</span>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShareOpen(true)}
            className="p-2.5 rounded-xl hover:bg-[var(--accent-light)] text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-all duration-200 hover:shadow-sm"
            title="스토리 공유"
          >
            <Share2 size={18} />
          </button>
          <Link
            to="/upload"
            className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold text-[var(--text-secondary)] hover:text-[var(--accent)] border border-[var(--border-strong)] rounded-xl hover:bg-[var(--accent-light)] hover:border-[var(--accent)]/20 transition-all duration-200"
          >
            <RefreshCw size={14} />
            새 분석
          </Link>
        </div>
      </header>

      {/* Insights — 핵심 요약 최상단 */}
      <div className="mb-6">
        <InsightSummary data={data.insights} />
      </div>

      {/* KPI Cards */}
      <div className="mb-8">
        <SummaryCards data={data.summary} watchTime={data.watch_time} />
      </div>

      {/* Row: Viewer Type + Dopamine + Watch Time — 핵심 정보 상단 배치 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <ViewerType data={data.viewer_type} />
        <DopamineIndex data={data.dopamine} />
        <WatchTime data={data.watch_time} />
      </div>

      {/* Row: Charts 2-col */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <HourlyChart data={data.hourly} />
        <DayOfWeekChart data={data.day_of_week} />
      </div>

      {/* Weekly Report full-width */}
      <div className="mb-6">
        <WeeklyReport weekly={data.weekly} weeklyWatchTime={data.weekly_watch_time} />
      </div>

      {/* Daily trend full-width */}
      <div className="mb-6">
        <DailyChart data={data.daily} />
      </div>

      {/* Top Channels (recent + full period) */}
      <div className="flex flex-col gap-5 mb-6">
        <TopChannels data={data.top_channels} />
      </div>

      {/* Categories */}
      <div className="mb-6">
        <Categories data={data.categories} />
      </div>

      {/* Row: Content Diversity + Binge Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <ContentDiversity data={data.content_diversity} />
        <BingeSessions data={data.binge_sessions} />
      </div>

      {/* Attention Trend full-width */}
      <div className="mb-6">
        <AttentionTrend data={data.attention_trend} />
      </div>

      {/* Time Cost full-width */}
      <div className="mb-6">
        <TimeCost data={data.time_cost} />
      </div>

      {/* Search Keywords + Search→Watch Flow */}
      {data.search_keywords && data.search_keywords.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-6">
          <SearchKeywords data={data.search_keywords} />
          <SearchWatchFlow data={data.search_watch_flow} />
        </div>
      )}

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        period={sharePeriod}
      />
    </div>
  );
}
