import { Flame } from "lucide-react";

interface Props {
  data: {
    total_sessions: number;
    binge_sessions: number;
    binge_ratio: number;
    total_binge_videos: number;
    longest_binge: number;
    top_binge_channels: { channel: string; count: number }[];
  } | null;
}

function ratioColor(ratio: number) {
  if (ratio >= 30) return "var(--rose)";
  if (ratio >= 15) return "var(--amber)";
  return "var(--green)";
}

export function BingeSessions({ data }: Props) {
  if (!data || data.total_sessions === 0) return null;

  const color = ratioColor(data.binge_ratio);

  return (
    <section className="card p-5 animate-fadeIn">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">몰아보기 감지</h2>
        <span
          className="text-[12px] px-2 py-0.5 rounded-full font-medium"
          style={{ backgroundColor: `${color}15`, color }}
        >
          {data.binge_ratio}% 몰아보기
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-[22px] font-bold" style={{ color }}>
            {data.binge_sessions}
          </p>
          <p className="text-[11px] text-[var(--text-tertiary)]">몰아보기 세션</p>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-[22px] font-bold text-[var(--text-primary)]">
            {data.total_binge_videos}
          </p>
          <p className="text-[11px] text-[var(--text-tertiary)]">몰아본 영상</p>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-[22px] font-bold text-[var(--text-primary)]">
            {data.longest_binge}
          </p>
          <p className="text-[11px] text-[var(--text-tertiary)]">최장 연속</p>
        </div>
      </div>

      {/* Binge ratio bar */}
      <div className="mb-5">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[12px] text-[var(--text-secondary)]">전체 세션 중 몰아보기 비율</span>
          <span className="text-[12px] font-medium" style={{ color }}>
            {data.binge_sessions}/{data.total_sessions}
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${Math.min(data.binge_ratio, 100)}%`, backgroundColor: color }}
          />
        </div>
      </div>

      {data.top_binge_channels.length > 0 && (
        <div>
          <p className="text-[12px] text-[var(--text-tertiary)] mb-2">몰아보기 빈출 채널</p>
          <div className="space-y-1.5">
            {data.top_binge_channels.map((ch, i) => (
              <div key={ch.channel} className="flex items-center gap-2 text-[12px]">
                <Flame size={12} style={{ color: i === 0 ? "var(--rose)" : "var(--text-tertiary)" }} />
                <span className="text-[var(--text-secondary)] truncate">{ch.channel}</span>
                <span className="text-[var(--text-tertiary)] ml-auto">{ch.count}건</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
