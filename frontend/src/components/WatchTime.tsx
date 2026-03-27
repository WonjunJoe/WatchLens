import { InfoTooltip } from "./InfoTooltip";
import { Clock, Timer, Zap } from "lucide-react";

interface WatchTimeStats {
  total_min_hours: number;
  total_max_hours: number;
  daily_min_hours: number;
  daily_max_hours: number;
  gap_based_count: number;
  estimated_count: number;
}

function getTimeAnalogy(hours: number): string {
  if (hours < 0.5) return "가벼운 산책 한 번";
  if (hours < 1) return "드라마 한 편 정주행";
  if (hours < 2) return "영화 한 편의 여유";
  if (hours < 3) return "책 한 권의 지식";
  if (hours < 5) return "새로운 취미 입문";
  if (hours < 8) return "완벽한 하루의 업무량";
  return "인생의 상당한 조각";
}

export function WatchTime({ data }: { data: WatchTimeStats | null }) {
  if (!data) return null;

  const total = data.gap_based_count + data.estimated_count;
  const gapPct = total > 0 ? Math.round((data.gap_based_count / total) * 100) : 0;
  const dailyAvg = (data.daily_min_hours + data.daily_max_hours) / 2;

  return (
    <section className="clay-card p-8 h-full flex flex-col justify-between group hover:shadow-2xl transition-all duration-500">
      <div>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[var(--accent-lavender)]/10 text-[var(--accent-lavender)] rounded-2xl flex items-center justify-center shadow-inner">
              <Clock size={24} />
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-[var(--text-primary)] tracking-tight">
                추정 시청 시간
              </h2>
              <p className="text-[12px] text-[var(--text-tertiary)] font-medium">Estimated Watch Time</p>
            </div>
          </div>
          <InfoTooltip text={`실측 비율: ${gapPct}%. 나머지는 평균 시청률로 추정 (Shorts 85%, 롱폼 50%). 1시간 초과 영상은 1시간 cap.`} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[var(--text-tertiary)] mb-1">
              <Timer size={14} />
              <span className="text-[13px] font-semibold uppercase tracking-wider">Total Time</span>
            </div>
            <p className="text-[42px] font-black text-[var(--text-primary)] tracking-tighter leading-none">
              {data.total_min_hours}<span className="text-[20px] font-bold text-[var(--text-tertiary)] ml-1">~</span>{data.total_max_hours}
              <span className="text-[16px] font-bold text-[var(--text-tertiary)] ml-2 uppercase">Hrs</span>
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[var(--accent-lavender)] mb-1">
              <Zap size={14} />
              <span className="text-[13px] font-semibold uppercase tracking-wider">Daily Average</span>
            </div>
            <p className="text-[42px] font-black text-[var(--accent-lavender)] tracking-tighter leading-none">
              {data.daily_min_hours.toFixed(1)}<span className="text-[20px] font-bold opacity-40 ml-1">~</span>{data.daily_max_hours.toFixed(1)}
              <span className="text-[16px] font-bold opacity-60 ml-2 uppercase">Hrs/Day</span>
            </p>
          </div>
        </div>
      </div>

      <div className="mt-10 pt-8 border-t border-[var(--border-subtle)]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] font-bold text-[var(--text-secondary)]">{getTimeAnalogy(dailyAvg)}</span>
          <span className="text-[11px] font-black text-[var(--accent-lavender)] uppercase tracking-widest bg-[var(--accent-lavender)]/10 px-2 py-0.5 rounded-md">Analogy</span>
        </div>
        <div className="h-2 bg-[var(--text-primary)]/5 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-[var(--accent-lavender)] to-[var(--accent-sky)] rounded-full transition-all duration-1000"
            style={{ width: `${Math.min((dailyAvg / 8) * 100, 100)}%` }}
          />
        </div>
      </div>
    </section>
  );
}
