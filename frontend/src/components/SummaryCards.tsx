import { Eye, Users, Activity, Zap } from "lucide-react";

interface SummaryData {
  total_watched: number;
  total_channels: number;
  period: string;
  daily_average: number;
  shorts_count: number;
}

const CARDS = [
  { key: "total_watched", label: "총 시청 수", icon: Eye, accent: "lavender" },
  { key: "total_channels", label: "채널 수", icon: Users, accent: "mint" },
  { key: "daily_average", label: "일 평균", icon: Activity, accent: "sky" },
  { key: "shorts_count", label: "Shorts", icon: Zap, accent: "peach" },
] as const;

const ACCENT = {
  lavender: { bg: "bg-[var(--lavender-light)]", text: "text-[var(--lavender-text)]" },
  mint: { bg: "bg-[var(--mint-light)]", text: "text-[var(--mint-text)]" },
  sky: { bg: "bg-[var(--sky-light)]", text: "text-[var(--sky-text)]" },
  peach: { bg: "bg-[var(--peach-light)]", text: "text-[var(--peach-text)]" },
};

export function SummaryCards({ data }: { data: SummaryData | null }) {
  if (!data) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {CARDS.map((card) => {
        const a = ACCENT[card.accent];
        const value = data[card.key];
        return (
          <div key={card.key} className="bg-[var(--bg-white)] border border-[var(--border-default)] rounded-[16px] p-5 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:-translate-y-[2px] transition-all duration-200">
            <div className={`w-8 h-8 ${a.bg} rounded-[12px] flex items-center justify-center mb-3`}>
              <card.icon size={15} className={a.text} />
            </div>
            <p className="text-[12px] text-[var(--text-tertiary)] leading-[1.4] mb-1">{card.label}</p>
            <p className="text-[20px] font-medium text-[var(--text-primary)] leading-[1.3]">
              {typeof value === "number" ? value.toLocaleString() : value}
            </p>
          </div>
        );
      })}
    </div>
  );
}
