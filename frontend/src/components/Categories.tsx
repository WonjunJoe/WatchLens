import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { PASTEL_COLORS, TOOLTIP_STYLE } from "../utils/chartConfig";

interface CategoryCount { category_name: string; count: number; }
interface CategorySplit { longform: CategoryCount[]; shorts: CategoryCount[]; }

function CategoryPie({ title, data }: { title: string; data: CategoryCount[] }) {
  if (data.length === 0) return null;

  const top5 = data.slice(0, 5);
  const rest = data.slice(5);
  const restTotal = rest.reduce((s, c) => s + c.count, 0);
  const chartData = restTotal > 0
    ? [...top5, { category_name: "기타", count: restTotal }]
    : top5;

  return (
    <div className="flex-1 min-w-0">
      <p className="text-[13px] text-[var(--text-secondary)] mb-2 text-center">{title}</p>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="count"
            nameKey="category_name"
            cx="50%"
            cy="50%"
            outerRadius={75}
            innerRadius={40}
            label={(p: any) => p.percent > 0.05 ? `${p.category_name} ${(p.percent * 100).toFixed(0)}%` : ""}
            labelLine={false}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={PASTEL_COLORS[i % PASTEL_COLORS.length]} fillOpacity={0.8} />
            ))}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Categories({ data }: { data: CategorySplit | null }) {
  if (!data) return null;

  return (
    <section className="card p-5">
      <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-4">카테고리 분포</h2>
      <div className="flex flex-col md:flex-row gap-4">
        <CategoryPie title="일반 영상" data={data.longform} />
        <CategoryPie title="Shorts" data={data.shorts} />
      </div>
    </section>
  );
}
