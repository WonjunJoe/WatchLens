import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Moon } from "lucide-react";
import { TOOLTIP_STYLE, AXIS_TICK } from "../../utils/chartConfig";

interface Props {
  data: {
    total_actions: number;
    late_actions: number;
    late_ratio: number;
    peak_hour: number;
    top_dm_partners: { name: string; count: number }[];
    trend: { month: string; total: number; late: number; late_pct: number }[];
  } | null;
}

function riskColor(ratio: number) {
  if (ratio >= 40) return "var(--rose)";
  if (ratio >= 20) return "var(--amber)";
  return "var(--green)";
}

export function IgLateNight({ data }: Props) {
  if (!data || data.total_actions === 0) return null;

  const color = riskColor(data.late_ratio);

  return (
    <section className="card p-5 animate-fadeIn">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Moon size={16} style={{ color }} />
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">심야 활동 분석</h2>
        </div>
        <span className="text-[13px] font-medium" style={{ color }}>
          {data.late_ratio}%
        </span>
      </div>

      <div className="flex gap-4 mb-5">
        <div className="flex-1 p-3 bg-gray-50 rounded-lg">
          <p className="text-[11px] text-[var(--text-tertiary)] mb-1">심야 활동</p>
          <p className="text-[20px] font-bold" style={{ color }}>
            {data.late_actions.toLocaleString()}<span className="text-[11px] text-[var(--text-tertiary)] ml-0.5">건</span>
          </p>
        </div>
        <div className="flex-1 p-3 bg-gray-50 rounded-lg">
          <p className="text-[11px] text-[var(--text-tertiary)] mb-1">피크 시간</p>
          <p className="text-[20px] font-bold text-[var(--text-primary)]">
            {data.peak_hour}시
          </p>
        </div>
      </div>

      {/* Monthly trend */}
      {data.trend.length >= 2 && (
        <div className="mb-4">
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={data.trend}>
              <XAxis dataKey="month" tick={AXIS_TICK} tickLine={false} axisLine={false} />
              <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={30} domain={[0, "auto"]} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v: any) => [`${v}%`, "심야 비율"]}
              />
              <Line type="monotone" dataKey="late_pct" stroke={color} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top late-night DM partners */}
      {data.top_dm_partners.length > 0 && (
        <div className="pt-3 border-t border-[var(--border)]">
          <p className="text-[12px] text-[var(--text-tertiary)] mb-2">심야 DM 상대</p>
          <div className="flex flex-wrap gap-2">
            {data.top_dm_partners.map((p) => (
              <span key={p.name} className="text-[12px] px-2 py-1 bg-gray-50 rounded-lg text-[var(--text-secondary)]">
                {p.name} <span className="text-[var(--text-tertiary)]">{p.count}건</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
