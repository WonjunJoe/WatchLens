import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useInstagramData } from "../contexts/InstagramDataContext";
import { IgSummaryCards } from "../components/instagram/IgSummaryCards";
import { IgInsightSummary } from "../components/instagram/IgInsightSummary";
import { IgTopAccounts } from "../components/instagram/IgTopAccounts";
import { IgHourlyChart } from "../components/instagram/IgHourlyChart";
import { IgDayOfWeekChart } from "../components/instagram/IgDayOfWeekChart";
import { IgDailyChart } from "../components/instagram/IgDailyChart";
import { IgDmAnalysis } from "../components/instagram/IgDmAnalysis";
import { IgTopics } from "../components/instagram/IgTopics";
import { IgFollowNetwork } from "../components/instagram/IgFollowNetwork";
import { Loader2, RefreshCw, Upload } from "lucide-react";

export function InstagramDashboardPage() {
  const { data, fetchFromDb } = useInstagramData();
  const [loading, setLoading] = useState(false);
  const [noData, setNoData] = useState(false);

  useEffect(() => {
    if (data.summary) return;

    setLoading(true);
    fetchFromDb().then((found) => {
      if (!found) setNoData(true);
      setLoading(false);
    });
  }, [data.summary, fetchFromDb]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="text-[var(--accent)] animate-spin mb-4" />
        <p className="text-[14px] text-[var(--text-secondary)]">대시보드 불러오는 중...</p>
      </div>
    );
  }

  if (noData && !data.summary) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="card p-8 text-center max-w-sm">
          <Upload size={32} className="mx-auto mb-4 text-[var(--text-tertiary)]" />
          <p className="text-[16px] font-semibold text-[var(--text-primary)] mb-2">아직 데이터가 없습니다</p>
          <p className="text-[14px] text-[var(--text-secondary)] mb-6">Instagram 데이터를 먼저 업로드해주세요.</p>
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-[14px] font-medium hover:opacity-90 transition-opacity"
          >
            업로드하러 가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-12">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-[24px] font-bold text-[var(--text-primary)]">Instagram 대시보드</h1>
        <Link
          to="/upload"
          className="flex items-center gap-2 px-4 py-2 text-[14px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={14} />
          새 분석
        </Link>
      </header>

      {/* Insights */}
      <div className="mb-4">
        <IgInsightSummary data={data.insights} />
      </div>

      {/* Summary Cards */}
      <div className="mb-6">
        <IgSummaryCards data={data.summary} />
      </div>

      {/* Top Accounts + DM Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <IgTopAccounts data={data.top_accounts} />
        <IgDmAnalysis data={data.dm_analysis} />
      </div>

      {/* Hourly + Day of Week */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <IgHourlyChart data={data.hourly} />
        <IgDayOfWeekChart data={data.day_of_week} />
      </div>

      {/* Daily trend */}
      <div className="mb-4">
        <IgDailyChart data={data.daily} />
      </div>

      {/* Topics + Follow Network */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <IgTopics data={data.topics} />
        <IgFollowNetwork data={data.follow_network} />
      </div>
    </div>
  );
}
