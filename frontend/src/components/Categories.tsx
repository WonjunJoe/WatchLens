import { useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from "recharts";
import { PASTEL_COLORS, TOOLTIP_STYLE } from "../utils/chartConfig";

interface CategoryCount { category_name: string; count: number; }
interface CategorySplit { longform: CategoryCount[]; shorts: CategoryCount[]; }

function CategoryPie({ title, data }: { title: string; data: CategoryCount[] }) {
  const [showAll, setShowAll] = useState(false);

  if (data.length === 0) return null;

  const top5 = data.slice(0, 5);
  const rest = data.slice(5);
  const restTotal = rest.reduce((s, c) => s + c.count, 0);

  const chartData = restTotal > 0
    ? [...top5, { category_name: "기타", count: restTotal }]
    : top5;

  return (
    <div className="flex-1 min-w-0">
      <p className="text-[12px] font-medium text-[var(--text-tertiary)] leading-[1.4] mb-2 text-center">{title}</p>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="count"
            nameKey="category_name"
            cx="50%"
            cy="50%"
            outerRadius={80}
            innerRadius={40}
            label={(props: any) => {
              const { category_name, percent } = props;
              return percent > 0.05 ? `${category_name} ${(percent * 100).toFixed(0)}%` : "";
            }}
            labelLine={false}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={PASTEL_COLORS[i % PASTEL_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} />
        </PieChart>
      </ResponsiveContainer>

      {rest.length > 0 && (
        <div className="mt-2 text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-[11px] text-[var(--lavender-text)] hover:opacity-70 transition-colors"
          >
            {showAll ? "접기" : `기타 ${rest.length}개 카테고리 보기`}
          </button>
          {showAll && (
            <div className="mt-2 flex flex-wrap justify-center gap-1.5">
              {rest.map((c) => (
                <span key={c.category_name} className="text-[10px] px-2 py-0.5 bg-[var(--bg-base)] text-[var(--text-secondary)] rounded-full">
                  {c.category_name} {c.count}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function Categories({ data }: { data: CategorySplit | null }) {
  if (!data) return null;

  return (
    <section className="bg-[var(--bg-white)] border border-[var(--border-default)] rounded-[16px] p-5 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:-translate-y-[2px] transition-all duration-200">
      <h2 className="text-[15px] font-medium text-[var(--text-primary)] mb-4">카테고리 분포</h2>
      <div className="flex flex-col md:flex-row gap-4">
        <CategoryPie title="일반 영상 (롱폼)" data={data.longform} />
        <CategoryPie title="Shorts" data={data.shorts} />
      </div>
    </section>
  );
}
