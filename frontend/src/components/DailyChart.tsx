import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useStats } from "../hooks/useStats";

interface DailyCount {
  date: string;
  count: number;
}

export function DailyChart() {
  const { data, loading, error } = useStats<DailyCount[]>("/api/stats/daily");

  if (loading) return <p className="text-gray-400">일별 로딩 중...</p>;
  if (error) return <p className="text-red-500">오류: {error}</p>;
  if (!data || data.length === 0) return null;

  const formatted = data.map((d) => ({
    ...d,
    label: d.date.slice(5), // "MM-DD"
  }));

  return (
    <section>
      <h2 className="text-lg font-semibold mb-4">일별 시청 추이</h2>
      <div className="bg-white rounded-xl shadow p-5">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={formatted}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} />
            <Tooltip labelFormatter={(v) => `날짜: ${v}`} />
            <Line
              type="monotone"
              dataKey="count"
              name="시청 수"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
