import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { PASTEL_COLORS, TOOLTIP_STYLE, GRID_STROKE, AXIS_TICK } from "../utils/chartConfig";

interface DailyCount { date: string; count: number; }

export function DailyChart({ data }: { data: DailyCount[] | null }) {
  if (!data || data.length === 0) return null;

  const formatted = data.map((d) => ({ ...d, label: d.date.slice(5) }));

  // Show tick every 7 days
  const interval = Math.max(1, Math.floor(formatted.length / 14));

  return (
    <section className="bg-[var(--bg-white)] border border-[var(--border-default)] rounded-[16px] p-5 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:-translate-y-[2px] transition-all duration-200">
      <h2 className="text-[15px] font-medium text-[var(--text-primary)] mb-4">일별 시청 추이</h2>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis
            dataKey="label"
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            interval={interval}
          />
          <YAxis
            allowDecimals={false}
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            label={{ value: "시청 수 (건)", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "#9C9C98" }, offset: 10 }}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelFormatter={(v) => `날짜: ${v}`}
            formatter={(value) => [`${value}건`, "시청 수"]}
          />
          <Line type="monotone" dataKey="count" name="시청 수" stroke={PASTEL_COLORS[0]} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}
