import { Link } from "react-router-dom";
import { SummaryCards } from "../components/SummaryCards";
import { WatchTime } from "../components/WatchTime";
import { HourlyChart } from "../components/HourlyChart";
import { DailyChart } from "../components/DailyChart";
import { TopChannels } from "../components/TopChannels";
import { ShortsStats } from "../components/ShortsStats";
import { Categories } from "../components/Categories";
import { SearchKeywords } from "../components/SearchKeywords";

export function DashboardPage() {
  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">WatchLens Dashboard</h1>
        <Link to="/" className="text-blue-600 hover:underline text-sm">
          ← 업로드 페이지
        </Link>
      </div>
      <div className="space-y-8">
        <SummaryCards />
        <WatchTime />
        <HourlyChart />
        <DailyChart />
        <TopChannels />
        <ShortsStats />
        <Categories />

        <hr className="border-gray-300" />

        <SearchKeywords />
      </div>

      <div className="mt-12 text-center">
        <Link
          to="/"
          className="inline-block px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          다시 업로드하기
        </Link>
      </div>
    </div>
  );
}
