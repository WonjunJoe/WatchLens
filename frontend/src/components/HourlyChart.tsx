import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { PASTEL_COLORS, TOOLTIP_STYLE, GRID_STROKE, AXIS_TICK } from "../utils/chartConfig";

interface HourlyCount { hour: number; count: number; }

export function HourlyChart({ data }: { data: HourlyCount[] | null }) {
  if (!data) return null;

  const formatted = data.map((d) => ({ ...d, label: `${d.hour}시` }));

  return (
    <section className="bg-[var(--bg-white)] border border-[var(--border-default)] rounded-[16px] p-5 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:-translate-y-[2px] transition-all duration-200">
      <h2 className="text-[15px] font-medium text-[var(--text-primary)] mb-4">시간대별 시청 분포</h2>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis
            allowDecimals={false}
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            label={{ value: "시청 횟수 (건)", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "#9C9C98" }, offset: 10 }}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value) => [`${value}건`, "시청 횟수"]}
          />
          <Bar dataKey="count" name="시청 횟수" fill={PASTEL_COLORS[0]} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
