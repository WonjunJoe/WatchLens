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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
      {CARDS.map((card, i) => (
        <div
          key={card.key}
          className="card p-6 group relative overflow-hidden"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: `linear-gradient(90deg, ${card.color}, ${card.color}60)` }} />
          <div className="flex items-center gap-2.5 mb-4">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
              style={{ backgroundColor: `${card.color}15` }}
            >
              <card.icon size={16} style={{ color: card.color }} />
            </div>
            <span className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest">{card.label}</span>
          </div>
          <p className="text-[38px] font-extrabold text-[var(--text-primary)] leading-none tracking-tighter">
            {card.getValue(data, watchTime ?? null)}
            <span className="text-[14px] font-semibold text-[var(--text-tertiary)] ml-1.5">{card.unit}</span>
          </p>
        </div>
      ))}
    </div>
  );
}
