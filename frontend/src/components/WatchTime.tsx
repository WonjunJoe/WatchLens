import { Clock, TrendingUp } from "lucide-react";

interface WatchTimeStats {
  total_min_hours: number;
  total_max_hours: number;
  daily_min_hours: number;
  daily_max_hours: number;
  gap_based_count: number;
  estimated_count: number;
}

export function WatchTime({ data }: { data: WatchTimeStats | null }) {
  if (!data) return null;

  return (
    <section className="card p-5">
      <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-5">추정 시청 시간</h2>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <div className="flex items-center gap-1.5 text-[var(--text-secondary)] mb-2">
            <Clock size={14} />
            <span className="text-[13px]">총 시청</span>
          </div>
          <p className="text-[32px] font-bold text-[var(--text-primary)] leading-none">
            {data.total_min_hours}
            <span className="text-[16px] text-[var(--text-tertiary)] mx-1">~</span>
            {data.total_max_hours}
            <span className="text-[14px] text-[var(--text-tertiary)] ml-1">시간</span>
          </p>
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-[var(--text-secondary)] mb-2">
            <TrendingUp size={14} />
            <span className="text-[13px]">일 평균</span>
          </div>
          <p className="text-[32px] font-bold text-[var(--accent)] leading-none">
            {data.daily_min_hours.toFixed(1)}
            <span className="text-[16px] text-[var(--text-tertiary)] mx-1">~</span>
            {data.daily_max_hours.toFixed(1)}
            <span className="text-[14px] text-[var(--text-tertiary)] ml-1">시간/일</span>
          </p>
        </div>
      </div>
    </section>
  );
}
