import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { PASTEL_COLORS, TOOLTIP_STYLE, GRID_STROKE, AXIS_TICK } from "../utils/chartConfig";

interface DailyTrend { date: string; shorts_ratio: number; }
interface ShortsData {
  shorts_count: number;
  regular_count: number;
  shorts_ratio: number;
  daily_trend: DailyTrend[];
}

export function ShortsStats({ data }: { data: ShortsData | null }) {
  if (!data) return null;

  const trend = data.daily_trend.map((d) => ({
    ...d,
    label: d.date.slice(5),
    percent: Math.round(d.shorts_ratio * 100),
  }));

  return (
    <section className="bg-[var(--bg-white)] border border-[var(--border-default)] rounded-[16px] p-5 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:-translate-y-[2px] transition-all duration-200">
      <h2 className="text-[15px] font-medium text-[var(--text-primary)] mb-4">Shorts 분석</h2>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="text-center p-3 bg-[var(--bg-base)] rounded-xl">
          <p className="text-lg font-medium text-[var(--text-primary)]">{data.shorts_count.toLocaleString()}</p>
          <p className="text-[11px] text-[var(--text-tertiary)]">Shorts</p>
        </div>
        <div className="text-center p-3 bg-[var(--bg-base)] rounded-xl">
          <p className="text-lg font-medium text-[var(--text-primary)]">{data.regular_count.toLocaleString()}</p>
          <p className="text-[11px] text-[var(--text-tertiary)]">일반 영상</p>
        </div>
        <div className="text-center p-3 bg-[var(--lavender-light)] rounded-xl">
          <p className="text-lg font-medium text-[var(--lavender-text)]">{Math.round(data.shorts_ratio * 100)}%</p>
          <p className="text-[11px] text-[var(--text-tertiary)]">Shorts 비율</p>
        </div>
      </div>

      {trend.length > 0 && (
        <>
          <p className="text-[12px] text-[var(--text-tertiary)] leading-[1.4] mb-3">일별 Shorts 비율 추이 (3일 이동평균)</p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis unit="%" allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v) => `${v}%`}
              />
              <Area type="monotone" dataKey="percent" name="Shorts 비율" stroke={PASTEL_COLORS[0]} fill="#E8E0F3" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </>
      )}
    </section>
  );
}
