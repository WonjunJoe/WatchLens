import { Brain } from "lucide-react";

interface BreakdownItem {
  value: number;
  score: number;
  weight: number;
  description: string;
}

interface DopamineData {
  score: number;
  grade: string;
  breakdown: Record<string, BreakdownItem>;
}

const FACTOR_LABELS: Record<string, string> = {
  shorts_ratio: "Shorts 비율",
  late_night_ratio: "심야 시청",
  short_duration: "짧은 영상",
};

function scoreColor(score: number) {
  if (score >= 70) return "var(--rose)";
  if (score >= 40) return "var(--amber)";
  return "var(--green)";
}

export function DopamineIndex({ data }: { data: DopamineData | null | undefined }) {
  if (!data || !data.breakdown) return null;

  const color = scoreColor(data.score);

  return (
    <section className="card p-6 animate-fadeIn" role="region" aria-label="도파민 지수">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[13px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">도파민 지수</h2>
        <span className="text-[12px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${color}15`, color }}>
          {data.grade}
        </span>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}12` }}>
          <Brain size={22} style={{ color }} />
        </div>
        <div>
          <p className="text-[44px] font-extrabold leading-none tracking-tighter" style={{ color }}>
            {data.score}
            <span className="text-[15px] font-semibold text-[var(--text-tertiary)] ml-1">/100</span>
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(data.breakdown).map(([key, item]) => (
          <div key={key}>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[13px] text-[var(--text-secondary)]">{FACTOR_LABELS[key] || key}</span>
              <span className="text-[13px] font-medium" style={{ color: scoreColor(item.weight > 0 ? (item.score / item.weight * 100) : 0) }}>
                {item.score}/{item.weight}
              </span>
            </div>
            <div className="h-2.5 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${item.value * 100}%`,
                  backgroundColor: scoreColor(item.weight > 0 ? (item.score / item.weight * 100) : 0),
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
