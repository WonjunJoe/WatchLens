import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";
import { PASTEL_COLORS, TOOLTIP_STYLE, GRID_STROKE, AXIS_TICK } from "../utils/chartConfig";

interface DayOfWeekData {
  day: string;
  day_index: number;
  total: number;
  avg: number;
  weeks: number;
}

export function DayOfWeekChart({ data }: { data: DayOfWeekData[] | null }) {
  if (!data || data.length === 0) return null;

  const maxAvg = Math.max(...data.map((d) => d.avg));
  const peakDay = data.find((d) => d.avg === maxAvg);
  const isWeekendHeavy =
    (data[5]?.avg || 0) + (data[6]?.avg || 0) > (data[0]?.avg || 0) + (data[1]?.avg || 0);

  return (
    <section className="bg-[var(--bg-white)] border border-[var(--border-default)] rounded-[16px] p-5 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:-translate-y-[2px] transition-all duration-200">
      <h2 className="text-[15px] font-medium text-[var(--text-primary)] mb-4">요일별 시청 패턴</h2>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis dataKey="day" tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis
            allowDecimals={false}
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            label={{ value: "일평균 (건)", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "#9C9C98" }, offset: 10 }}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value: any, _: any, entry: any) => [
              `${value}건 (${entry.payload.weeks}주 평균)`,
              "일평균",
            ]}
          />
          <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
            {data.map((d) => (
              <Cell
                key={d.day}
                fill={d.day_index >= 5 ? "#F2C6C2" : PASTEL_COLORS[0]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {peakDay && (
        <p className="text-[12px] text-[var(--text-tertiary)] leading-[1.4] mt-3 text-center">
          {peakDay.day}요일에 가장 많이 시청 (평균 {peakDay.avg}건)
          {isWeekendHeavy ? " · 주말 시청이 더 많은 편" : " · 평일 시청이 더 많은 편"}
        </p>
      )}
    </section>
  );
}
