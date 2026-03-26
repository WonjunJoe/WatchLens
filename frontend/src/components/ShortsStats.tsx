import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useStats } from "../hooks/useStats";

interface DailyTrend {
  date: string;
  shorts_ratio: number;
}

interface ShortsData {
  shorts_count: number;
  regular_count: number;
  shorts_ratio: number;
  daily_trend: DailyTrend[];
}

export function ShortsStats() {
  const { data, loading, error } = useStats<ShortsData>("/api/stats/shorts");

  if (loading) return <p className="text-gray-400">Shorts 로딩 중...</p>;
  if (error) return <p className="text-red-500">오류: {error}</p>;
  if (!data) return null;

  const trend = data.daily_trend.map((d) => ({
    ...d,
    label: d.date.slice(5), // MM-DD
    percent: Math.round(d.shorts_ratio * 100),
  }));

  return (
    <section>
      <h2 className="text-lg font-semibold mb-4">Shorts 분석</h2>
      <div className="bg-white rounded-xl shadow p-5">
        <div className="grid grid-cols-3 gap-4 mb-6 text-center">
          <div>
            <p className="text-2xl font-bold">{data.shorts_count.toLocaleString()}</p>
            <p className="text-sm text-gray-500">Shorts</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{data.regular_count.toLocaleString()}</p>
            <p className="text-sm text-gray-500">일반 영상</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{Math.round(data.shorts_ratio * 100)}%</p>
            <p className="text-sm text-gray-500">Shorts 비율</p>
          </div>
        </div>

        {trend.length > 0 && (
          <>
            <p className="text-sm text-gray-500 mb-2">일별 Shorts 비율 추이 (3일 이동평균)</p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis unit="%" allowDecimals={false} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Area
                  type="monotone"
                  dataKey="percent"
                  name="Shorts 비율"
                  stroke="#8b5cf6"
                  fill="#c4b5fd"
                />
              </AreaChart>
            </ResponsiveContainer>
          </>
        )}
      </div>
    </section>
  );
}
