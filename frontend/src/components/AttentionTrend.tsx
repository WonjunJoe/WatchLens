import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";
import { TOOLTIP_STYLE, AXIS_TICK } from "../utils/chartConfig";

interface Props {
  data: {
    trend: { month: string; avg_duration_min: number; shorts_pct: number }[];
    overall_change_pct: number;
    first_avg_min: number;
    last_avg_min: number;
  } | null | undefined;
}

export function AttentionTrend({ data }: Props) {
  if (!data || data.trend.length < 2) return null;

  const declining = data.overall_change_pct < 0;
  const color = declining ? "var(--rose)" : "var(--green)";
  const Icon = declining ? TrendingDown : TrendingUp;

  return (
    <section className="card p-6 animate-fadeIn" role="region" aria-label="집중도 변화 추이">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[13px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">주의력 변화 트렌드</h2>
        <div className="flex items-center gap-1.5" style={{ color }}>
          <Icon size={14} />
          <span className="text-[13px] font-medium">{data.overall_change_pct > 0 ? "+" : ""}{data.overall_change_pct}%</span>
        </div>
      </div>

      <div className="flex gap-4 mb-5">
        <div className="flex-1 p-3.5 bg-[var(--bg)] rounded-xl border border-[var(--border)]">
          <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">처음 평균</p>
          <p className="text-[22px] font-extrabold text-[var(--text-primary)] tracking-tight">
            {data.first_avg_min}<span className="text-[12px] font-semibold text-[var(--text-tertiary)] ml-0.5">분</span>
          </p>
        </div>
        <div className="flex-1 p-3.5 bg-[var(--bg)] rounded-xl border border-[var(--border)]">
          <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">최근 평균</p>
          <p className="text-[22px] font-extrabold tracking-tight" style={{ color }}>
            {data.last_avg_min}<span className="text-[12px] font-semibold text-[var(--text-tertiary)] ml-0.5">분</span>
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data.trend}>
          <XAxis dataKey="month" tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <YAxis yAxisId="left" tick={AXIS_TICK} tickLine={false} axisLine={false} width={35} />
          <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK} tickLine={false} axisLine={false} width={35} domain={[0, 100]} />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any, name: any) => {
            if (name === "avg_duration_min") return [`${v}분`, "평균 길이"];
            return [`${v}%`, "Shorts 비율"];
          }} />
          <Legend formatter={(value) => value === "avg_duration_min" ? "평균 길이 (분)" : "Shorts 비율 (%)"} wrapperStyle={{ fontSize: "11px", fontWeight: 500, color: "#94A3B8" }} />
          <Line yAxisId="left" type="monotone" dataKey="avg_duration_min" stroke="var(--accent)" strokeWidth={2} dot={false} />
          <Line yAxisId="right" type="monotone" dataKey="shorts_pct" stroke="#7C3AED" strokeWidth={2} dot={false} strokeDasharray="5 5" />
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}
