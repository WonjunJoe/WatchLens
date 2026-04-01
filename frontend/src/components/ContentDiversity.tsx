import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Shuffle } from "lucide-react";
import { TOOLTIP_STYLE, AXIS_TICK } from "../utils/chartConfig";

interface Props {
  data: {
    score: number;
    category_count: number;
    top_categories: { category: string; count: number; pct: number }[];
    monthly_trend: { month: string; score: number }[];
  } | null | undefined;
}

function scoreColor(score: number) {
  if (score >= 60) return "var(--green)";
  if (score >= 35) return "var(--amber)";
  return "var(--rose)";
}

function scoreLabel(score: number) {
  if (score >= 60) return "다양함";
  if (score >= 35) return "보통";
  return "편중됨";
}

export function ContentDiversity({ data }: Props) {
  if (!data) return null;

  const color = scoreColor(data.score);

  return (
    <section className="card p-6 animate-fadeIn" role="region" aria-label="콘텐츠 다양성">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[13px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">콘텐츠 다양성</h2>
        <span
          className="text-[12px] px-2 py-0.5 rounded-full font-medium"
          style={{ backgroundColor: `${color}15`, color }}
        >
          {scoreLabel(data.score)}
        </span>
      </div>

      <div className="flex items-center gap-4 mb-5">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}12` }}>
          <Shuffle size={22} style={{ color }} />
        </div>
        <div>
          <p className="text-[44px] font-extrabold leading-none tracking-tighter" style={{ color }}>
            {data.score}
            <span className="text-[15px] font-semibold text-[var(--text-tertiary)] ml-1">/100</span>
          </p>
          <p className="text-[12px] font-medium text-[var(--text-tertiary)] mt-1">{data.category_count}개 카테고리 시청</p>
        </div>
      </div>

      {data.top_categories.length > 0 && (
        <div className="mb-5 space-y-2">
          {data.top_categories.map((cat) => (
            <div key={cat.category} className="flex items-center gap-2">
              <span className="text-[12px] text-[var(--text-secondary)] w-20 truncate">{cat.category}</span>
              <div className="flex-1 h-2 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${cat.pct}%`, backgroundColor: "var(--accent)" }}
                />
              </div>
              <span className="text-[12px] text-[var(--text-tertiary)] w-10 text-right">{cat.pct}%</span>
            </div>
          ))}
        </div>
      )}

      {data.monthly_trend.length > 1 && (
        <div>
          <p className="text-[12px] text-[var(--text-tertiary)] mb-2">월별 다양성 추이</p>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={data.monthly_trend}>
              <XAxis dataKey="month" tick={AXIS_TICK} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} tick={AXIS_TICK} tickLine={false} axisLine={false} width={30} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [`${v}점`, "다양성"]} />
              <Line
                type="monotone"
                dataKey="score"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
