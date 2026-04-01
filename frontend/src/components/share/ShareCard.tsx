import { forwardRef } from "react";
import type { YouTubeData, ViewerTypeAxis } from "../../types/youtube";
import type { InstagramData } from "../../types/instagram";

interface ShareCardProps {
  youtube?: YouTubeData;
  instagram?: Partial<InstagramData>;
  period?: string; // "2026.03.01 ~ 03.31"
}

/** Username: "@" + first char + "**" */
function maskUsername(username: string): string {
  if (!username) return "@**";
  return "@" + username.slice(0, 1) + "**";
}

/** Dopamine score color */
function dopamineColor(score: number): string {
  if (score <= 30) return "#22c55e";
  if (score <= 60) return "#eab308";
  if (score <= 80) return "#f97316";
  return "#ef4444";
}

/** Dopamine gradient stops */
function dopamineGradient(score: number): string {
  const pct = Math.min(100, Math.max(0, score));
  if (pct <= 30) return `linear-gradient(to right, #22c55e 0%, #22c55e ${pct}%, #374151 ${pct}%)`;
  if (pct <= 60) return `linear-gradient(to right, #22c55e 0%, #eab308 30%, #eab308 ${pct}%, #374151 ${pct}%)`;
  if (pct <= 80) return `linear-gradient(to right, #22c55e 0%, #eab308 30%, #f97316 60%, #f97316 ${pct}%, #374151 ${pct}%)`;
  return `linear-gradient(to right, #22c55e 0%, #eab308 30%, #f97316 60%, #ef4444 80%, #ef4444 ${pct}%, #374151 ${pct}%)`;
}

/** Letter mapping for each axis: [leftLetter, rightLetter] */
const AXIS_LETTERS: Record<string, [string, string]> = {
  "시간대": ["D", "N"],
  "콘텐츠": ["L", "S"],
  "패턴": ["C", "B"],
  "채널": ["E", "F"],
};

/** Axis spectrum bar with both letters, position dot, and percentage */
function AxisBar({ axis }: { axis: ViewerTypeAxis }) {
  const [leftLetter, rightLetter] = AXIS_LETTERS[axis.axis] ?? ["?", "?"];
  // Backend sends 0~1 ratio → convert to 0~100%
  const pct = Math.min(100, Math.max(0, Math.round(axis.value * 100)));
  const isLeftPick = axis.pick === leftLetter;

  return (
    <div className="flex flex-col gap-[2px]">
      {/* Labels row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-[4px]">
          <span
            className="text-[18px] font-bold"
            style={{ color: isLeftPick ? "#60a5fa" : "rgba(255,255,255,0.2)" }}
          >
            {leftLetter}
          </span>
          <span
            className="text-[15px]"
            style={{ color: isLeftPick ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)" }}
          >
            {axis.left}
          </span>
        </div>
        <div className="flex items-center gap-[4px]">
          <span
            className="text-[15px]"
            style={{ color: !isLeftPick ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)" }}
          >
            {axis.right}
          </span>
          <span
            className="text-[18px] font-bold"
            style={{ color: !isLeftPick ? "#60a5fa" : "rgba(255,255,255,0.2)" }}
          >
            {rightLetter}
          </span>
        </div>
      </div>
      {/* Bar row with percentage */}
      <div className="flex items-center gap-[8px]">
        <div className="relative flex-1 h-[8px] bg-white/10 rounded-full">
          <div
            className="absolute top-0 left-0 h-full rounded-full"
            style={{
              width: `${pct}%`,
              background: "linear-gradient(to right, rgba(96,165,250,0.2), rgba(96,165,250,0.5))",
            }}
          />
          <div
            className="absolute top-1/2 rounded-full"
            style={{
              left: `${pct}%`,
              transform: "translate(-50%, -50%)",
              width: 12,
              height: 12,
              backgroundColor: "#60a5fa",
              boxShadow: "0 0 6px rgba(96,165,250,0.5)",
            }}
          />
        </div>
        <span className="text-[15px] text-white/50 w-[40px] text-right shrink-0">{pct}%</span>
      </div>
    </div>
  );
}

export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  ({ youtube, instagram, period }, ref) => {
    const yt = youtube;
    const ig = instagram;

    // YouTube metrics
    const totalWatched = yt?.summary?.total_watched ?? 0;
    const dailyAvg = yt?.summary?.daily_average ?? 0;
    const shortsRatio = yt?.shorts ? Math.round(yt.shorts.shorts_ratio * 100) : 0;
    const dopamineScore = yt?.dopamine?.score ?? 0;
    const dopamineBreakdown = yt?.dopamine?.breakdown;
    const viewerCode = yt?.viewer_type?.code ?? "-";
    const viewerAxes = yt?.viewer_type?.axes ?? [];
    const topChannels = (yt?.top_channels?.longform ?? []).slice(0, 2);

    // Watch time
    const totalHoursAvg = yt?.watch_time
      ? Math.round((yt.watch_time.total_min_hours + yt.watch_time.total_max_hours) / 2)
      : null;
    const dailyHoursAvg = yt?.watch_time
      ? ((yt.watch_time.daily_min_hours + yt.watch_time.daily_max_hours) / 2).toFixed(1)
      : null;

    // Instagram metrics
    const totalLikes = ig?.summary?.total_likes ?? 0;
    const totalConversations = ig?.summary?.total_conversations ?? 0;
    const totalMessages = ig?.summary?.total_messages ?? 0;
    // late_ratio is already 0~100 from backend (multiplied by 100 server-side)
    const lateRatio = ig?.late_night ? Math.round(ig.late_night.late_ratio) : 0;
    const followingCount = ig?.summary?.following_count ?? 0;
    const topAccounts = (ig?.top_accounts ?? []).slice(0, 2);

    const hasYoutube = !!yt?.summary;
    const hasInstagram = !!ig?.summary;

    // Period days calculation from period string
    const periodDaysMatch = period?.match(/(\d+)일/);
    const periodDays = periodDaysMatch ? parseInt(periodDaysMatch[1]) : null;

    // Cross-platform insight
    const ytDailyHours = yt?.watch_time
      ? ((yt.watch_time.daily_min_hours + yt.watch_time.daily_max_hours) / 2).toFixed(1)
      : null;
    const igDailyLikes = hasInstagram && periodDays
      ? (totalLikes / periodDays).toFixed(1)
      : null;

    // Period display: extract "최근 N일" from summary period or compute from dates
    const totalDays = yt?.summary?.period
      ? (() => {
          const m = yt.summary.period.match(/(\d+)/);
          return m ? m[1] : null;
        })()
      : null;

    return (
      <div
        ref={ref}
        style={{ width: 1080, height: 1920 }}
        className="bg-gradient-to-b from-[#0f172a] to-[#1e293b] text-white flex flex-col px-[72px] py-[64px] font-sans"
      >
        {/* Header */}
        <div className="text-center mb-[36px]">
          <h1 className="text-[56px] font-bold tracking-tight">WatchLens</h1>
          {period && (
            <p className="text-[26px] text-white/60 mt-[10px]">
              {period}
              {totalDays && <span className="ml-[16px]">· 최근 {totalDays}일</span>}
            </p>
          )}
        </div>

        {/* YouTube Section */}
        {hasYoutube && (
          <div className="mb-[28px]">
            <div className="flex items-center gap-[16px] mb-[32px]">
              <div className="w-[48px] h-[4px] bg-red-500 rounded-full" />
              <span className="text-[32px] font-semibold text-red-400">YouTube</span>
            </div>

            {/* Hero Row: Dopamine + Viewer Type */}
            <div className="grid grid-cols-2 gap-[20px] mb-[28px]">
              {/* Dopamine */}
              <div className="bg-red-500/5 rounded-[20px] p-[24px]">
                <p className="text-[24px] text-white/50 mb-[4px]">도파민 지수</p>
                <p
                  className="text-[80px] font-bold leading-none"
                  style={{ color: dopamineColor(dopamineScore) }}
                >
                  {dopamineScore}
                  <span className="text-[32px] text-white/30 ml-[8px]">/ 100</span>
                </p>
                {/* Gradient bar */}
                <div
                  className="mt-[12px] rounded-full"
                  style={{
                    height: 12,
                    background: dopamineGradient(dopamineScore),
                  }}
                />
                {/* Breakdown - visual mini bars */}
                {dopamineBreakdown && (
                  <div className="mt-[14px] flex flex-col gap-[8px]">
                    {Object.entries(dopamineBreakdown).map(([, item]) => (
                      <div key={item.description} className="flex flex-col gap-[2px]">
                        <div className="flex justify-between text-[16px]">
                          <span className="text-white/50">{item.description}</span>
                          <span className="text-white/40">{item.score}</span>
                        </div>
                        <div className="h-[4px] bg-white/10 rounded-full">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, Math.round(item.value * 100))}%`,
                              backgroundColor: dopamineColor(dopamineScore),
                              opacity: 0.7,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Viewer Type */}
              <div className="bg-red-500/5 rounded-[20px] p-[24px]">
                <p className="text-[24px] text-white/50 mb-[4px]">시청 유형</p>
                <p className="text-[72px] font-bold leading-none tracking-[0.08em]">{viewerCode}</p>
                {/* Axes with position indicators */}
                <div className="mt-[16px] flex flex-col gap-[10px]">
                  {viewerAxes.map((axis) => (
                    <AxisBar key={axis.axis} axis={axis} />
                  ))}
                </div>
              </div>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-3 gap-[20px] mb-[20px]">
              <div className="bg-red-500/5 rounded-[20px] p-[24px] text-center">
                <p className="text-[24px] text-white/50">총 시청</p>
                <p className="text-[36px] font-bold mt-[8px]">
                  {totalWatched.toLocaleString()}회
                </p>
              </div>
              <div className="bg-red-500/5 rounded-[20px] p-[24px] text-center">
                <p className="text-[24px] text-white/50">일 평균</p>
                <p className="text-[36px] font-bold mt-[8px]">{dailyAvg}회</p>
              </div>
              <div className="bg-red-500/5 rounded-[20px] p-[24px] text-center">
                <p className="text-[24px] text-white/50">Shorts 비율</p>
                <p className="text-[36px] font-bold mt-[8px]" style={{ color: "#f97316" }}>
                  {shortsRatio}%
                </p>
              </div>
            </div>

            {/* Watch Time Row */}
            {totalHoursAvg !== null && (
              <div className="grid grid-cols-2 gap-[20px] mb-[20px]">
                <div className="bg-red-500/5 rounded-[20px] p-[24px] text-center">
                  <p className="text-[24px] text-white/50">총 시청시간</p>
                  <p className="text-[36px] font-bold mt-[8px]">약 {totalHoursAvg}시간</p>
                </div>
                <div className="bg-red-500/5 rounded-[20px] p-[24px] text-center">
                  <p className="text-[24px] text-white/50">일 평균 시청시간</p>
                  <p className="text-[36px] font-bold mt-[8px]">약 {dailyHoursAvg}시간/일</p>
                </div>
              </div>
            )}

            {/* Top 2 Channels - horizontal */}
            {topChannels.length > 0 && (
              <div className="bg-red-500/5 rounded-[20px] p-[24px]">
                <p className="text-[24px] text-white/50 mb-[16px]">Top 채널</p>
                <div className="grid grid-cols-2 gap-[16px]">
                  {topChannels.map((ch, i) => (
                    <div
                      key={ch.channel_name}
                      className="flex items-center gap-[12px] bg-white/5 rounded-[12px] px-[20px] py-[14px]"
                    >
                      <span className="text-[28px] font-bold text-white/30">
                        {i + 1}
                      </span>
                      <span className="text-[26px] font-medium flex-1 truncate">
                        {ch.channel_name}
                      </span>
                      <span className="text-[24px] text-white/50 shrink-0">
                        {ch.count.toLocaleString()}회
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instagram Section */}
        {hasInstagram && (
          <div className="mb-[28px]">
            <div className="flex items-center gap-[16px] mb-[32px]">
              <div className="w-[48px] h-[4px] bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
              <span className="text-[32px] font-semibold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Instagram
              </span>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-2 gap-[20px] mb-[20px]">
              <div className="bg-purple-500/5 rounded-[20px] p-[24px] text-center">
                <p className="text-[24px] text-white/50">좋아요</p>
                <p className="text-[36px] font-bold mt-[8px]">
                  {totalLikes.toLocaleString()}회
                </p>
              </div>
              <div className="bg-purple-500/5 rounded-[20px] p-[24px] text-center">
                <p className="text-[24px] text-white/50">DM</p>
                <p className="text-[36px] font-bold mt-[8px]">{totalConversations}명 · {totalMessages}건</p>
              </div>
            </div>

            {/* Score Row */}
            <div className="grid grid-cols-2 gap-[20px] mb-[20px]">
              <div className="bg-purple-500/5 rounded-[20px] p-[24px] text-center">
                <p className="text-[24px] text-white/50">팔로잉</p>
                <p className="text-[36px] font-bold mt-[8px]">
                  {followingCount.toLocaleString()}명
                </p>
              </div>
              <div className="bg-purple-500/5 rounded-[20px] p-[24px] text-center">
                <p className="text-[24px] text-white/50">심야 활동</p>
                <p className="text-[36px] font-bold mt-[8px]">{lateRatio}%</p>
              </div>
            </div>

            {/* Top 2 Accounts - horizontal */}
            {topAccounts.length > 0 && (
              <div className="bg-purple-500/5 rounded-[20px] p-[24px]">
                <p className="text-[24px] text-white/50 mb-[16px]">Top 소통</p>
                <div className="grid grid-cols-2 gap-[16px]">
                  {topAccounts.map((acc, i) => (
                    <div
                      key={acc.username}
                      className="flex items-center gap-[12px] bg-white/5 rounded-[12px] px-[20px] py-[14px]"
                    >
                      <span className="text-[28px] font-bold text-white/30">
                        {i + 1}
                      </span>
                      <span className="text-[26px] font-medium flex-1 truncate">
                        {maskUsername(acc.username)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Cross-Platform Insight */}
        {hasYoutube && hasInstagram && ytDailyHours && igDailyLikes && (
          <div className="bg-white/5 rounded-[20px] p-[24px] mb-[20px] text-center">
            <p className="text-[26px] text-white/70">
              YouTube 하루 약 {ytDailyHours}시간 · Instagram 하루 좋아요 {igDailyLikes}회
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-auto pt-[32px]">
          <p className="text-[24px] text-white/30">watchlens.app</p>
        </div>
      </div>
    );
  }
);

ShareCard.displayName = "ShareCard";
