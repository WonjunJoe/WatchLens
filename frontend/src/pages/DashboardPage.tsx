import { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
import { CalendarDays, RefreshCw } from "lucide-react";

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
    setProgress({ loaded: 0, total: 14, step: "연결 중..." });

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
            setProgress({ loaded: payload.loaded, total: payload.total, step: `${payload.loaded}/${payload.total} 분석 완료` });
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-9 h-9 border-2 border-[var(--lavender)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[12px] text-[var(--text-tertiary)]">{progress.step || "데이터 조회 중..."}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    const pct = Math.round((progress.loaded / progress.total) * 100);
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-full max-w-xs">
          <p className="text-[15px] font-medium text-center text-[var(--text-primary)] mb-5">분석 중...</p>
          <div className="h-2 bg-[var(--lavender-light)] rounded-full overflow-hidden mb-3">
            <div className="h-full bg-[var(--lavender)] rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-center text-[12px] text-[var(--text-tertiary)]">{progress.step} ({pct}%)</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-[14px] text-[var(--rose-text)] mb-4">{error}</p>
          <Link to="/" className="text-[12px] text-[var(--lavender-text)] hover:underline">업로드 페이지로 돌아가기</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-8 py-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[20px] font-medium text-[var(--text-primary)] leading-[1.3]">대시보드</h1>
          <div className="flex items-center gap-1.5 mt-1">
            <CalendarDays size={13} className="text-[var(--text-tertiary)]" />
            <span className="text-[12px] text-[var(--text-tertiary)]">{dateFrom} ~ {dateTo}</span>
          </div>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-medium text-[var(--lavender-text)] bg-[var(--lavender-light)] rounded-[12px] hover:shadow-[var(--shadow-md)] hover:-translate-y-[1px] transition-all duration-200"
        >
          <RefreshCw size={14} />
          다시 분석하기
        </Link>
      </div>

      {/* Content */}
      <div className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ViewerType data={data.viewer_type} />
          <InsightSummary data={data.insights} />
        </div>

        <SummaryCards data={data.summary} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <WatchTime data={data.watch_time} />
          <DopamineIndex data={data.dopamine} />
        </div>

        <CalendarHeatmap data={data.daily} />
        <WeeklyWatchTime data={data.weekly_watch_time} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <HourlyChart data={data.hourly} />
          <DayOfWeekChart data={data.day_of_week} />
        </div>

        <DailyChart data={data.daily} />
        <WeeklyComparison data={data.weekly} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <TopChannels data={data.top_channels} />
          <ShortsStats data={data.shorts} />
        </div>

        <Categories data={data.categories} />
        <SearchKeywords data={data.search_keywords} />
      </div>
    </div>
  );
}
