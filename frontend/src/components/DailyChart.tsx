import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";
import { TOOLTIP_STYLE, GRID_STROKE, AXIS_TICK } from "../utils/chartConfig";
import { Activity } from "lucide-react";

interface DailyCount { date: string; count: number; }

export function DailyChart({ data }: { data: DailyCount[] | null }) {
  if (!data || data.length === 0) return null;

  const formatted = data.map((d) => ({ ...d, label: d.date.slice(5) }));
  const interval = Math.max(1, Math.floor(formatted.length / 10));

  return (
    <section className="glass-card p-8 h-[400px] flex flex-col group overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--accent-sky)]/10 text-[var(--accent-sky)] rounded-2xl flex items-center justify-center shadow-inner">
            <Activity size={20} />
          </div>
          <div>
            <h2 className="text-[18px] font-black text-[var(--text-primary)] tracking-tighter">Daily Trends</h2>
            <p className="text-[11px] text-[var(--text-tertiary)] font-bold uppercase tracking-widest">Growth & Engagement</p>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formatted} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent-sky)" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="var(--accent-sky)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="6 6" stroke={GRID_STROKE} vertical={false} />
            <XAxis
              dataKey="label"
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
              interval={interval}
              dy={15}
            />
            <YAxis
              allowDecimals={false}
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
              dx={-5}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              itemStyle={{ color: "var(--text-primary)" }}
              labelFormatter={(v) => `${v}일 시청 기록`}
              formatter={(value) => [`${value} Views`, "Total"]}
              cursor={{ stroke: "var(--accent-sky)", strokeWidth: 2, strokeDasharray: "4 4" }}
            />
            <Area 
              type="monotone" 
              dataKey="count" 
              stroke="var(--accent-sky)" 
              strokeWidth={4} 
              fillOpacity={1} 
              fill="url(#colorCount)" 
              animationDuration={2000}
              activeDot={{ r: 6, fill: "var(--accent-sky)", stroke: "white", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
