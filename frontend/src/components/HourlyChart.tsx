import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell
} from "recharts";
import { TOOLTIP_STYLE, GRID_STROKE, AXIS_TICK } from "../utils/chartConfig";
import { Clock } from "lucide-react";

interface HourlyCount { hour: number; count: number; }

export function HourlyChart({ data }: { data: HourlyCount[] | null }) {
  if (!data) return null;

  const formatted = data.map((d) => ({ ...d, label: `${d.hour}h` }));
  const maxCount = Math.max(...data.map(d => d.count)) || 1;

  return (
    <section className="glass-card p-8 h-[350px] flex flex-col group overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--accent-mint)]/10 text-[var(--accent-mint)] rounded-2xl flex items-center justify-center shadow-inner">
            <Clock size={20} />
          </div>
          <div>
            <h2 className="text-[18px] font-black text-[var(--text-primary)] tracking-tighter">Hourly Activity</h2>
            <p className="text-[11px] text-[var(--text-tertiary)] font-bold uppercase tracking-widest">Temporal Distribution</p>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={formatted} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="8 8" stroke={GRID_STROKE} vertical={false} />
            <XAxis 
              dataKey="label" 
              tick={AXIS_TICK} 
              axisLine={false} 
              tickLine={false} 
              interval={2}
              dy={10}
            />
            <YAxis
              allowDecimals={false}
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              cursor={{ fill: 'var(--text-primary)', opacity: 0.03 }}
              formatter={(value) => [`${value} Views`, "Count"]}
            />
            <Bar 
              dataKey="count" 
              name="Views" 
              radius={[10, 10, 10, 10]}
              animationDuration={1500}
            >
              {formatted.map((entry, index) => {
                const opacity = 0.3 + (entry.count / maxCount) * 0.7;
                return (
                  <Cell 
                    key={`cell-${index}`} 
                    fill="var(--accent-mint)" 
                    fillOpacity={opacity}
                    className="hover:fill-[var(--accent-lavender)] transition-colors duration-300"
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
