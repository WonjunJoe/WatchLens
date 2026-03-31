import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell
} from "recharts";
import { TOOLTIP_STYLE, GRID_STROKE, AXIS_TICK } from "../utils/chartConfig";

interface HourlyCount { hour: number; count: number; }

export function HourlyChart({ data }: { data: HourlyCount[] | null | undefined }) {
  if (!data) return null;

  const formatted = data.map((d) => ({ ...d, label: `${d.hour}시` }));
  const maxCount = Math.max(...data.map(d => d.count)) || 1;

  return (
    <section className="card p-5 h-[320px] flex flex-col" role="region" aria-label="시간대별 시청 분포">
      <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-4">시간대별 시청</h2>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={formatted} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
            <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} interval={2} />
            <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}건`, "시청"]} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {formatted.map((entry, i) => (
                <Cell key={i} fill="#6366F1" fillOpacity={0.3 + (entry.count / maxCount) * 0.7} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
