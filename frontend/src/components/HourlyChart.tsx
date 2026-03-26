import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useStats } from "../hooks/useStats";

interface HourlyCount {
  hour: number;
  count: number;
}

export function HourlyChart() {
  const { data, loading, error } = useStats<HourlyCount[]>("/api/stats/hourly");

  if (loading) return <p className="text-gray-400">시간대별 로딩 중...</p>;
  if (error) return <p className="text-red-500">오류: {error}</p>;
  if (!data) return null;

  const formatted = data.map((d) => ({
    ...d,
    label: `${d.hour}시`,
  }));

  return (
    <section>
      <h2 className="text-lg font-semibold mb-4">시간대별 시청 분포</h2>
      <div className="bg-white rounded-xl shadow p-5">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={formatted}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" name="시청 수" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
