import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { PASTEL_COLORS, TOOLTIP_STYLE, GRID_STROKE, AXIS_TICK } from "../utils/chartConfig";

interface WeeklyData {
  week_label: string;
  total: number;
  shorts: number;
  longform: number;
  daily_avg: number;
}

export function WeeklyComparison({ data }: { data: WeeklyData[] | null }) {
  if (!data || data.length === 0) return null;

  return (
    <section className="bg-[var(--bg-white)] border border-[var(--border-default)] rounded-[16px] p-5 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:-translate-y-[2px] transition-all duration-200">
      <h2 className="text-[15px] font-medium text-[var(--text-primary)] mb-4">주간 비교</h2>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis dataKey="week_label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="longform" name="일반 영상" fill={PASTEL_COLORS[0]} stackId="a" />
          <Bar dataKey="shorts" name="Shorts" fill={PASTEL_COLORS[1]} stackId="a" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
