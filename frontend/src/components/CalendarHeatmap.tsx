import { useMemo, useState } from "react";

interface DailyCount { date: string; count: number; }

const DAY_LABELS = ["월", "", "수", "", "금", "", "일"];
const MONTH_NAMES = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

function getColor(count: number, max: number): string {
  if (count === 0) return "#F5F5F4";
  const ratio = count / max;
  if (ratio > 0.75) return "#8B7AB0";
  if (ratio > 0.5) return "#A8A0C4";
  if (ratio > 0.25) return "#C9BDE0";
  return "#E8E0F3";
}

interface WeekColumn {
  days: { date: string; count: number; dayOfWeek: number }[];
}

export function CalendarHeatmap({ data }: { data: DailyCount[] | null }) {
  const [tooltip, setTooltip] = useState<{ date: string; count: number; x: number; y: number } | null>(null);

  const { weeks, months, max } = useMemo(() => {
    if (!data || data.length === 0) return { weeks: [], months: [], max: 0 };

    const countMap = new Map<string, number>();
    let maxCount = 0;
    for (const d of data) {
      countMap.set(d.date, d.count);
      if (d.count > maxCount) maxCount = d.count;
    }

    // Build full date range from first to last
    const startDate = new Date(data[0].date + "T00:00:00");
    const endDate = new Date(data[data.length - 1].date + "T00:00:00");

    // Adjust start to Monday
    const startDay = startDate.getDay();
    const mondayOffset = startDay === 0 ? -6 : 1 - startDay;
    startDate.setDate(startDate.getDate() + mondayOffset);

    const allWeeks: WeekColumn[] = [];
    const monthLabels: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;
    const current = new Date(startDate);

    while (current <= endDate) {
      const week: WeekColumn = { days: [] };
      for (let d = 0; d < 7; d++) {
        const dateStr = current.toISOString().slice(0, 10);
        const count = countMap.get(dateStr) || 0;
        const dayOfWeek = d; // 0=Mon, 6=Sun
        week.days.push({ date: dateStr, count, dayOfWeek });

        if (d === 0 && current.getMonth() !== lastMonth) {
          lastMonth = current.getMonth();
          monthLabels.push({ label: MONTH_NAMES[lastMonth], weekIndex: allWeeks.length });
        }

        current.setDate(current.getDate() + 1);
      }
      allWeeks.push(week);
    }

    return { weeks: allWeeks, months: monthLabels, max: maxCount };
  }, [data]);

  if (!data || data.length === 0) return null;

  const cellSize = 13;
  const cellGap = 3;
  const step = cellSize + cellGap;
  const leftPad = 28;
  const topPad = 20;
  const svgWidth = leftPad + weeks.length * step + 10;
  const svgHeight = topPad + 7 * step + 10;

  return (
    <section className="bg-[var(--bg-white)] border border-[var(--border-default)] rounded-[16px] p-5 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:-translate-y-[2px] transition-all duration-200">
      <h2 className="text-[15px] font-medium text-[var(--text-primary)] mb-4">시청 캘린더</h2>

      <div className="overflow-x-auto">
        <svg
          width={svgWidth}
          height={svgHeight}
          className="block"
          onMouseLeave={() => setTooltip(null)}
        >
          {/* Month labels */}
          {months.map((m, i) => (
            <text
              key={i}
              x={leftPad + m.weekIndex * step}
              y={12}
              className="fill-[var(--text-tertiary)]"
              fontSize={10}
            >
              {m.label}
            </text>
          ))}

          {/* Day labels */}
          {DAY_LABELS.map((label, i) => (
            label ? (
              <text
                key={i}
                x={0}
                y={topPad + i * step + cellSize - 2}
                className="fill-[var(--text-tertiary)]"
                fontSize={10}
              >
                {label}
              </text>
            ) : null
          ))}

          {/* Cells */}
          {weeks.map((week, wi) =>
            week.days.map((day) => (
              <rect
                key={day.date}
                x={leftPad + wi * step}
                y={topPad + day.dayOfWeek * step}
                width={cellSize}
                height={cellSize}
                rx={2}
                fill={getColor(day.count, max)}
                className="cursor-pointer"
                onMouseEnter={(e) => {
                  const rect = (e.target as SVGRectElement).getBoundingClientRect();
                  setTooltip({ date: day.date, count: day.count, x: rect.x, y: rect.y });
                }}
                onMouseLeave={() => setTooltip(null)}
              />
            ))
          )}
        </svg>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 px-3 py-1.5 bg-[var(--text-primary)] text-white text-[12px] rounded-lg pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y - 36 }}
        >
          {tooltip.date} — {tooltip.count}건
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-end gap-1.5 mt-3">
        <span className="text-[10px] text-[var(--text-tertiary)]">적음</span>
        {["#F5F5F4", "#E8E0F3", "#C9BDE0", "#A8A0C4", "#8B7AB0"].map((color) => (
          <div key={color} className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
        ))}
        <span className="text-[10px] text-[var(--text-tertiary)]">많음</span>
      </div>
    </section>
  );
}
