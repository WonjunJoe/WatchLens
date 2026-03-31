import { Clock, Users, Activity, Zap } from "lucide-react";

interface WatchTimeData {
  total_min_hours: number;
  total_max_hours: number;
  daily_min_hours: number;
  daily_max_hours: number;
}

interface CardDef {
  key: string;
  label: string;
  icon: typeof Clock;
  color: string;
  getValue: (summary: any, wt: WatchTimeData | null) => string;
  unit: string;
}

const CARDS: CardDef[] = [
  {
    key: "total_time",
    label: "총 시청시간",
    icon: Clock,
    color: "var(--accent)",
    getValue: (_, wt) => wt ? `${wt.total_min_hours}~${wt.total_max_hours}` : "—",
    unit: "시간",
  },
  { key: "total_channels", label: "채널 수", icon: Users, color: "var(--green)", getValue: (s) => Math.round(s.total_channels).toLocaleString(), unit: "개" },
  {
    key: "daily_time",
    label: "일 평균",
    icon: Activity,
    color: "var(--amber)",
    getValue: (_, wt) => wt ? `${wt.daily_min_hours}~${wt.daily_max_hours}` : "—",
    unit: "시간",
  },
  { key: "shorts_count", label: "Shorts", icon: Zap, color: "var(--rose)", getValue: (s) => Math.round(s.shorts_count).toLocaleString(), unit: "건" },
];

export function SummaryCards({ data, watchTime }: { data: any | null; watchTime?: WatchTimeData | null | undefined }) {
  if (!data) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {CARDS.map((card, i) => (
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
            {card.getValue(data, watchTime ?? null)}
            <span className="text-[14px] font-medium text-[var(--text-tertiary)] ml-1">{card.unit}</span>
          </p>
        </div>
      ))}
    </div>
  );
}
