import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";
import { TOOLTIP_STYLE, GRID_STROKE, AXIS_TICK } from "../utils/chartConfig";

interface DayOfWeekData {
  day: string;
  day_index: number;
  total: number;
  avg: number;
  weeks: number;
}

export function DayOfWeekChart({ data }: { data: DayOfWeekData[] | null | undefined }) {
  if (!data || data.length === 0) return null;

  return (
    <section className="card p-6 h-[340px] flex flex-col" role="region" aria-label="요일별 시청 분포">
      <h2 className="text-[13px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-4">요일별 평균</h2>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
            <XAxis dataKey="day" tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(v: any, _: any, entry: any) => [`${v}건 (${entry.payload.weeks}주 평균)`, "일평균"]}
            />
            <Bar dataKey="avg" radius={[6, 6, 0, 0]}>
              {data.map((d) => (
                <Cell key={d.day} fill={d.day_index >= 5 ? "#7C3AED" : "#4F6EF7"} fillOpacity={d.day_index >= 5 ? 0.8 : 0.65} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
