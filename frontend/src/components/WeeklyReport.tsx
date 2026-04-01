import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import { TOOLTIP_STYLE, AXIS_TICK } from "../utils/chartConfig";

interface WeeklyItem {
  week_label: string;
  total: number;
  shorts: number;
  longform: number;
  daily_avg: number;
}

interface WatchTimeItem {
  week_label: string;
  min_hours: number;
  max_hours: number;
  change_pct: number | null;
}

interface Props {
  weekly: WeeklyItem[] | null | undefined;
  weeklyWatchTime: WatchTimeItem[] | null | undefined;
}

export function WeeklyReport({ weekly, weeklyWatchTime }: Props) {
  if (!weekly || weekly.length < 2) return null;

  const latest = weekly[weekly.length - 1];
  const prev = weekly[weekly.length - 2];
  const changePct = prev.total > 0 ? Math.round(((latest.total - prev.total) / prev.total) * 100) : 0;
  const increasing = changePct > 0;

  return (
    <section className="card p-6 animate-fadeIn" role="region" aria-label="주간 리포트">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[13px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">주간 시청 추이</h2>
        <div className="flex items-center gap-1.5" style={{ color: increasing ? "var(--rose)" : "var(--green)" }}>
          {increasing ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span className="text-[13px] font-medium">전주 대비 {changePct > 0 ? "+" : ""}{changePct}%</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={weekly}>
          <XAxis dataKey="week_label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={35} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(v: any, name: any) => {
              if (name === "shorts") return [`${v}개`, "Shorts"];
              if (name === "longform") return [`${v}개`, "롱폼"];
              return [`${v}`, name];
            }}
          />
          <Legend formatter={(v) => v === "shorts" ? "Shorts" : "롱폼"} wrapperStyle={{ fontSize: "11px", fontWeight: 500, color: "#94A3B8" }} />
          <Bar dataKey="longform" stackId="a" fill="#4F6EF7" radius={[0, 0, 0, 0]} />
          <Bar dataKey="shorts" stackId="a" fill="#7C3AED" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* Watch time trend */}
      {weeklyWatchTime && weeklyWatchTime.length >= 2 && (
        <div className="mt-4 pt-3 border-t border-[var(--border)]">
          <p className="text-[12px] text-[var(--text-tertiary)] mb-2">주간 시청 시간 (추정)</p>
          <div className="flex gap-2.5 overflow-x-auto pb-1">
            {weeklyWatchTime.slice(-6).map((w) => (
              <div key={w.week_label} className="flex-shrink-0 text-center px-3 py-2 bg-[var(--bg)] rounded-xl border border-[var(--border)]">
                <p className="text-[10px] font-medium text-[var(--text-tertiary)] mb-0.5">{w.week_label}</p>
                <p className="text-[15px] font-bold text-[var(--text-primary)]">{w.max_hours}h</p>
                {w.change_pct != null && w.change_pct !== 0 && (
                  <p className={`text-[10px] font-medium ${w.change_pct > 0 ? "text-[var(--rose)]" : "text-[var(--green)]"}`}>
                    {w.change_pct > 0 ? "+" : ""}{w.change_pct}%
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
