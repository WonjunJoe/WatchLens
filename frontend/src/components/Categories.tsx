import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { PASTEL_COLORS, TOOLTIP_STYLE } from "../utils/chartConfig";

interface CategoryCount { category_name: string; count: number; }
interface CategorySplit { longform: CategoryCount[]; shorts: CategoryCount[]; }

function mergeMisc(data: CategoryCount[]): CategoryCount[] {
  const named: CategoryCount[] = [];
  let miscCount = 0;
  for (const item of data) {
    if (item.category_name === "미분류" || item.category_name === "Unknown") {
      miscCount += item.count;
    } else {
      named.push(item);
    }
  }
  const top5 = named.slice(0, 5);
  const restCount = named.slice(5).reduce((s, c) => s + c.count, 0) + miscCount;
  if (restCount > 0) {
    top5.push({ category_name: "기타", count: restCount });
  }
  return top5;
}

function CategoryPie({ title, data }: { title: string; data: CategoryCount[] }) {
  const chartData = mergeMisc(data);
  if (chartData.length === 0) return null;
  const total = chartData.reduce((s, c) => s + c.count, 0);

  return (
    <div className="flex-1 min-w-0">
      <p className="text-[13px] text-[var(--text-secondary)] mb-1 text-center">{title}</p>
      <div className="flex items-center gap-2">
        <div className="w-[140px] h-[140px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="count"
                nameKey="category_name"
                cx="50%"
                cy="50%"
                outerRadius={60}
                innerRadius={35}
                labelLine={false}
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={PASTEL_COLORS[i % PASTEL_COLORS.length]} fillOpacity={0.85} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [`${v}건`, ""]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-1">
          {chartData.map((item, i) => (
            <div key={item.category_name} className="flex items-center gap-2 text-[12px]">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PASTEL_COLORS[i % PASTEL_COLORS.length] }} />
              <span className="text-[var(--text-secondary)] truncate">{item.category_name}</span>
              <span className="text-[var(--text-tertiary)] ml-auto flex-shrink-0">{Math.round(item.count / total * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Categories({ data }: { data: CategorySplit | null }) {
  if (!data) return null;

  return (
    <section className="card p-5 animate-fadeIn">
      <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-4">카테고리 분포</h2>
      <div className="flex flex-col md:flex-row gap-6">
        <CategoryPie title="일반 영상" data={data.longform} />
        <CategoryPie title="Shorts" data={data.shorts} />
      </div>
    </section>
  );
}
