import { Clock, TrendingUp } from "lucide-react";

interface WatchTimeStats {
  total_min_hours: number;
  total_max_hours: number;
  daily_min_hours: number;
  daily_max_hours: number;
  gap_based_count: number;
  estimated_count: number;
}

export function WatchTime({ data }: { data: WatchTimeStats | null | undefined }) {
  if (!data) return null;

  return (
    <section className="card p-6 animate-fadeIn">
      <h2 className="text-[13px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-5">추정 시청 시간</h2>
      <div className="space-y-5">
        <div>
          <div className="flex items-center gap-1.5 text-[var(--text-secondary)] mb-2">
            <Clock size={14} />
            <span className="text-[13px]">총 시청</span>
          </div>
          <p className="text-[30px] font-extrabold text-[var(--text-primary)] leading-tight tracking-tight">
            {data.total_min_hours} ~ {data.total_max_hours}
            <span className="text-[14px] font-semibold text-[var(--text-tertiary)] ml-1">시간</span>
          </p>
        </div>
        <div className="border-t border-[var(--border)] pt-4">
          <div className="flex items-center gap-1.5 text-[var(--text-secondary)] mb-2">
            <TrendingUp size={14} />
            <span className="text-[13px] font-medium">일 평균</span>
          </div>
          <p className="text-[30px] font-extrabold text-[var(--accent)] leading-tight tracking-tight">
            {data.daily_min_hours.toFixed(1)} ~ {data.daily_max_hours.toFixed(1)}
            <span className="text-[14px] font-semibold text-[var(--text-tertiary)] ml-1">시간/일</span>
          </p>
        </div>
      </div>
    </section>
  );
}
