import { useEffect, useState, useCallback } from "react";
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
import { CalendarDays, RefreshCw, Loader2 } from "lucide-react";

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

export function DashboardPage() {
  const [params] = useSearchParams();
  const dateFrom = params.get("from") || "";
  const dateTo = params.get("to") || "";

  const [data, setData] = useState<Partial<DashboardState>>({});
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState({ loaded: 0, total: 14, step: "" });
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    if (!dateFrom || !dateTo) {
      setError("날짜 범위가 지정되지 않았습니다.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setData({});
    setProgress({ loaded: 0, total: 14, step: "데이터 로드 중..." });

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
            setProgress({ loaded: payload.loaded, total: payload.total, step: `${payload.loaded}/${payload.total}` });
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
          <Link to="/" className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-[14px] font-medium hover:opacity-90 transition-opacity">
            <RefreshCw size={14} />
            다시 시도
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-12">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[24px] font-bold text-[var(--text-primary)] mb-1">대시보드</h1>
          <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
            <CalendarDays size={14} />
            <span className="text-[14px]">{dateFrom} ~ {dateTo}</span>
          </div>
        </div>
        <Link
          to="/"
          className="flex items-center gap-2 px-4 py-2 text-[14px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={14} />
          새 분석
        </Link>
      </header>

      {/* KPI Cards */}
      <div className="mb-6">
        <SummaryCards data={data.summary} />
      </div>

      {/* Row: Viewer Type + Dopamine + Watch Time — 핵심 정보 상단 배치 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <ViewerType data={data.viewer_type} />
        <DopamineIndex data={data.dopamine} />
        <WatchTime data={data.watch_time} />
      </div>

      {/* Row: Charts 2-col */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <HourlyChart data={data.hourly} />
        <DayOfWeekChart data={data.day_of_week} />
      </div>

      {/* Daily trend full-width */}
      <div className="mb-4">
        <DailyChart data={data.daily} />
      </div>

      {/* Row: Top Channels + Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <TopChannels data={data.top_channels} />
        <Categories data={data.categories} />
      </div>

      {/* Row: Insights + Search Keywords */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <InsightSummary data={data.insights} />
        {data.search_keywords && data.search_keywords.length > 0 && (
          <SearchKeywords data={data.search_keywords} />
        )}
      </div>
    </div>
  );
}
