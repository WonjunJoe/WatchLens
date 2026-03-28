import { Eye, Users, Activity, Zap } from "lucide-react";

const CARDS = [
  { key: "total_watched", label: "총 시청", icon: Eye, color: "var(--accent)", unit: "건" },
  { key: "total_channels", label: "채널 수", icon: Users, color: "var(--green)", unit: "개" },
  { key: "daily_average", label: "일 평균", icon: Activity, color: "var(--amber)", unit: "건" },
  { key: "shorts_count", label: "Shorts", icon: Zap, color: "var(--rose)", unit: "건" },
] as const;

export function SummaryCards({ data }: { data: any | null }) {
  if (!data) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {CARDS.map((card, i) => {
        const value = data[card.key];
        return (
          <div
            key={card.key}
            className="card p-5 hover:shadow-md transition-shadow duration-200"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-center gap-2 mb-3">
              <card.icon size={16} style={{ color: card.color }} />
              <span className="text-[13px] text-[var(--text-secondary)]">{card.label}</span>
            </div>
            <p className="text-[28px] font-bold text-[var(--text-primary)] leading-none">
              {typeof value === "number" ? Math.round(value).toLocaleString() : value}
              <span className="text-[14px] font-medium text-[var(--text-tertiary)] ml-1">{card.unit}</span>
            </p>
          </div>
        );
      })}
    </div>
  );
}
