import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";
import { TOOLTIP_STYLE, GRID_STROKE, AXIS_TICK } from "../utils/chartConfig";

interface DailyCount { date: string; count: number; }

export function DailyChart({ data }: { data: DailyCount[] | null }) {
  if (!data || data.length === 0) return null;

  const formatted = data.map((d) => ({ ...d, label: d.date.slice(5) }));
  const interval = Math.max(1, Math.floor(formatted.length / 8));

  return (
    <section className="card p-5 h-[320px] flex flex-col">
      <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-4">일별 추이</h2>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formatted} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366F1" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
            <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} interval={interval} />
            <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}건`, "시청"]} />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#6366F1"
              strokeWidth={2}
              fill="url(#colorCount)"
              activeDot={{ r: 4, fill: "#6366F1", stroke: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
