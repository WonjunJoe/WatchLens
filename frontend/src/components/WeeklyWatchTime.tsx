import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { InfoTooltip } from "./InfoTooltip";
import { PASTEL_COLORS, TOOLTIP_STYLE, GRID_STROKE, AXIS_TICK } from "../utils/chartConfig";

interface WeeklyWatchTimeData {
  week_label: string;
  min_hours: number;
  max_hours: number;
  change_pct: number | null;
}

export function WeeklyWatchTime({ data }: { data: WeeklyWatchTimeData[] | null }) {
  if (!data || data.length === 0) return null;

  return (
    <section className="bg-[var(--bg-white)] border border-[var(--border-default)] rounded-[16px] p-5 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:-translate-y-[2px] transition-all duration-200">
      <h2 className="text-[15px] font-medium text-[var(--text-primary)] mb-4">
        주별 시청 시간 추이
        <InfoTooltip text="gap-based와 retention 추정을 조합한 주별 시청 시간. 막대 높이는 최대 추정치 기준." />
      </h2>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis dataKey="week_label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis unit="h" allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value) => [`${value}시간`, "최대 추정"]}
          />
          <Bar dataKey="max_hours" name="시청 시간" fill={PASTEL_COLORS[0]} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* Week cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
        {data.map((w) => (
          <div key={w.week_label} className="text-center p-3 bg-[var(--bg-base)] rounded-xl">
            <p className="text-[11px] text-[var(--text-tertiary)]">{w.week_label}</p>
            <p className="text-sm font-medium text-[var(--text-primary)] mt-1">
              {w.min_hours} ~ {w.max_hours}h
            </p>
            {w.change_pct !== null && (
              <p className={`text-[11px] font-medium mt-0.5 ${
                w.change_pct > 0 ? "text-[var(--rose-text)]" : w.change_pct < 0 ? "text-[var(--mint-text)]" : "text-[var(--text-tertiary)]"
              }`}>
                {w.change_pct > 0 ? "+" : ""}{w.change_pct}%
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
