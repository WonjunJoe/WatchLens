import { InfoTooltip } from "./InfoTooltip";

interface WatchTimeStats {
  total_min_hours: number;
  total_max_hours: number;
  daily_min_hours: number;
  daily_max_hours: number;
  gap_based_count: number;
  estimated_count: number;
}

function getTimeAnalogy(hours: number): string {
  if (hours < 0.5) return "짧은 산책을 할 수 있는 시간";
  if (hours < 1) return "드라마 한 편을 볼 수 있는 시간";
  if (hours < 2) return "영화 한 편을 볼 수 있는 시간";
  if (hours < 3) return "책 한 권을 읽을 수 있는 시간";
  if (hours < 5) return "새로운 요리를 배울 수 있는 시간";
  if (hours < 8) return "온라인 강의를 완강할 수 있는 시간";
  return "하루 종일 일한 것과 같은 시간";
}

export function WatchTime({ data }: { data: WatchTimeStats | null }) {
  if (!data) return null;

  const total = data.gap_based_count + data.estimated_count;
  const gapPct = total > 0 ? Math.round((data.gap_based_count / total) * 100) : 0;
  const dailyAvg = (data.daily_min_hours + data.daily_max_hours) / 2;

  return (
    <section className="bg-[var(--bg-white)] border border-[var(--border-default)] rounded-[16px] p-5 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:-translate-y-[2px] transition-all duration-200">
      <h2 className="text-[15px] font-medium text-[var(--text-primary)] mb-4">
        추정 시청 시간
        <InfoTooltip text={`실측 비율: ${gapPct}%. 나머지는 평균 시청률로 추정 (Shorts 85%, 롱폼 50%). 1시간 초과 영상은 1시간 cap.`} />
      </h2>
      <div className="space-y-5">
        <div>
          <p className="text-[12px] text-[var(--text-tertiary)] leading-[1.4] mb-1">총 시청 시간</p>
          <p className="text-2xl font-medium text-[var(--text-primary)]">
            {data.total_min_hours} ~ {data.total_max_hours}
            <span className="text-sm font-normal text-[var(--text-tertiary)] ml-1">시간</span>
          </p>
        </div>
        <div className="h-px bg-[var(--border-default)]" />
        <div>
          <p className="text-[12px] text-[var(--text-tertiary)] leading-[1.4] mb-1">일 평균</p>
          <p className="text-2xl font-medium text-[var(--lavender-text)]">
            {data.daily_min_hours} ~ {data.daily_max_hours}
            <span className="text-sm font-normal text-[var(--text-tertiary)] ml-1">시간/일</span>
          </p>
          <p className="text-[12px] text-[var(--text-tertiary)] leading-[1.4] mt-2">{getTimeAnalogy(dailyAvg)}</p>
        </div>
      </div>
    </section>
  );
}
