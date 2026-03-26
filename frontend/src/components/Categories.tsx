import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useStats } from "../hooks/useStats";

interface CategoryCount {
  category_name: string;
  count: number;
}

interface CategorySplit {
  longform: CategoryCount[];
  shorts: CategoryCount[];
}

const COLORS = [
  "#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd",
  "#818cf8", "#6d28d9", "#4f46e5", "#4338ca",
  "#7c3aed", "#5b21b6",
];

function CategoryPie({ title, data }: { title: string; data: CategoryCount[] }) {
  if (data.length === 0) return null;

  return (
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-gray-600 mb-2 text-center">{title}</p>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="category_name"
            cx="50%"
            cy="50%"
            outerRadius={90}
            label={({ category_name, percent }) =>
              percent > 0.05 ? `${category_name} ${(percent * 100).toFixed(0)}%` : ""
            }
            labelLine={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Categories() {
  const { data, loading, error } = useStats<CategorySplit>("/api/stats/categories");

  if (loading) return <p className="text-gray-400">카테고리 로딩 중...</p>;
  if (error) return <p className="text-red-500">오류: {error}</p>;
  if (!data) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold mb-4">카테고리 분포</h2>
      <div className="bg-white rounded-xl shadow p-5">
        <div className="flex flex-col md:flex-row gap-6">
          <CategoryPie title="일반 영상 (롱폼)" data={data.longform} />
          <CategoryPie title="Shorts" data={data.shorts} />
        </div>
      </div>
    </section>
  );
}
