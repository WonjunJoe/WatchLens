import { InfoTooltip } from "./InfoTooltip";

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

function itemColor(value: number) {
  if (value >= 0.7) return { bar: "bg-[var(--rose)]", text: "text-[var(--rose-text)]" };
  if (value >= 0.4) return { bar: "bg-[var(--peach)]", text: "text-[var(--peach-text)]" };
  return { bar: "bg-[var(--mint)]", text: "text-[var(--mint-text)]" };
}

export function DopamineIndex({ data }: { data: DopamineData | null }) {
  if (!data || !data.breakdown) return null;

  const totalColor = itemColor(data.score / 100);

  return (
    <section className="bg-[var(--bg-white)] border border-[var(--border-default)] rounded-[16px] p-5 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:-translate-y-[2px] transition-all duration-200">
      <h2 className="text-[15px] font-medium text-[var(--text-primary)] mb-4">
        도파민 지수
        <InfoTooltip text="Shorts 비율(40점) + 심야 시청(30점) + 짧은 영상 비율(30점)의 가중합. 0~100점으로, 높을수록 자극적 시청 패턴." />
      </h2>

      {/* Score */}
      <div className="text-center mb-5">
        <p className={`text-4xl font-medium ${totalColor.text}`}>{data.score}</p>
        <p className="text-[12px] text-[var(--text-tertiary)] leading-[1.4] mt-1">/ 100 — {data.grade}</p>
      </div>

      <div className="h-2 bg-[var(--bg-base)] rounded-full overflow-hidden mb-6">
        <div
          className={`h-full rounded-full transition-all ${totalColor.bar}`}
          style={{ width: `${data.score}%` }}
        />
      </div>

      {/* Breakdown */}
      <div className="space-y-3">
        {Object.entries(data.breakdown).map(([key, item]) => {
          const color = itemColor(item.value);
          return (
            <div key={key} className="flex items-center gap-3">
              <div className="w-20 text-[12px] text-[var(--text-secondary)] text-right flex-shrink-0">
                {FACTOR_LABELS[key] || key}
                <InfoTooltip text={`${item.description}. ${item.weight}점 중 ${item.score}점`} />
              </div>
              <div className="flex-1">
                <div className="h-1.5 bg-[var(--bg-base)] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${color.bar}`}
                    style={{ width: `${item.value * 100}%` }}
                  />
                </div>
              </div>
              <span className={`text-[12px] font-medium w-10 text-right ${color.text}`}>
                {item.score}/{item.weight}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
