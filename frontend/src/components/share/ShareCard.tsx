import { forwardRef } from "react";
import type { YouTubeData } from "../../types/youtube";
import type { InstagramData } from "../../types/instagram";

interface ShareCardProps {
  youtube?: YouTubeData;
  instagram?: Partial<InstagramData>;
  period?: string; // "2026.03.01 ~ 03.31"
}

export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  ({ youtube, instagram, period }, ref) => {
    const yt = youtube;
    const ig = instagram;

    // YouTube 핵심 지표
    const totalWatched = yt?.summary?.total_watched ?? 0;
    const dailyAvg = yt?.summary?.daily_average ?? 0;
    const shortsRatio = yt?.shorts
      ? Math.round(yt.shorts.shorts_ratio * 100)
      : 0;
    const dopamineScore = yt?.dopamine?.score ?? 0;
    const dopamineGrade = yt?.dopamine?.grade ?? "-";
    const viewerCode = yt?.viewer_type?.code ?? "-";
    const viewerName = yt?.viewer_type?.type_name ?? "";
    const topChannels = (yt?.top_channels?.longform ?? []).slice(0, 3);

    // Instagram 핵심 지표
    const totalLikes = ig?.summary?.total_likes ?? 0;
    const totalConversations = ig?.summary?.total_conversations ?? 0;
    const lateRatio = ig?.late_night
      ? Math.round(ig.late_night.late_ratio * 100)
      : 0;
    const lurkerScore = ig?.lurker_index?.lurker_score ?? 0;
    const topAccounts = (ig?.top_accounts ?? []).slice(0, 3);

    const hasYoutube = !!yt?.summary;
    const hasInstagram = !!ig?.summary;

    return (
      <div
        ref={ref}
        style={{ width: 1080, height: 1920 }}
        className="bg-gradient-to-b from-[#0f172a] to-[#1e293b] text-white flex flex-col px-[72px] py-[96px] font-sans"
      >
        {/* Header */}
        <div className="text-center mb-[64px]">
          <h1 className="text-[56px] font-bold tracking-tight">WatchLens</h1>
          {period && (
            <p className="text-[28px] text-white/60 mt-[12px]">{period}</p>
          )}
        </div>

        {/* YouTube Section */}
        {hasYoutube && (
          <div className="flex-1">
            <div className="flex items-center gap-[16px] mb-[40px]">
              <div className="w-[48px] h-[4px] bg-red-500 rounded-full" />
              <span className="text-[32px] font-semibold text-red-400">
                YouTube
              </span>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-3 gap-[24px] mb-[40px]">
              <div className="bg-white/5 rounded-[20px] p-[32px] text-center">
                <p className="text-[28px] text-white/50">총 시청</p>
                <p className="text-[48px] font-bold mt-[8px]">
                  {totalWatched.toLocaleString()}
                </p>
              </div>
              <div className="bg-white/5 rounded-[20px] p-[32px] text-center">
                <p className="text-[28px] text-white/50">일 평균</p>
                <p className="text-[48px] font-bold mt-[8px]">{dailyAvg}</p>
              </div>
              <div className="bg-white/5 rounded-[20px] p-[32px] text-center">
                <p className="text-[28px] text-white/50">Shorts</p>
                <p className="text-[48px] font-bold mt-[8px]">{shortsRatio}%</p>
              </div>
            </div>

            {/* Dopamine + Viewer Type Row */}
            <div className="grid grid-cols-2 gap-[24px] mb-[40px]">
              <div className="bg-white/5 rounded-[20px] p-[32px]">
                <p className="text-[28px] text-white/50 mb-[8px]">도파민 지수</p>
                <p className="text-[56px] font-bold">
                  {dopamineScore}
                  <span className="text-[32px] text-white/40 ml-[8px]">
                    / 100
                  </span>
                </p>
                <p className="text-[24px] text-white/40 mt-[4px]">
                  {dopamineGrade}
                </p>
              </div>
              <div className="bg-white/5 rounded-[20px] p-[32px]">
                <p className="text-[28px] text-white/50 mb-[8px]">시청 유형</p>
                <p className="text-[56px] font-bold">{viewerCode}</p>
                <p className="text-[24px] text-white/40 mt-[4px]">
                  {viewerName}
                </p>
              </div>
            </div>

            {/* Top Channels */}
            {topChannels.length > 0 && (
              <div className="bg-white/5 rounded-[20px] p-[32px] mb-[24px]">
                <p className="text-[28px] text-white/50 mb-[16px]">
                  Top 채널
                </p>
                <div className="flex gap-[24px]">
                  {topChannels.map((ch, i) => (
                    <span key={ch.channel_name} className="text-[30px]">
                      <span className="text-white/40">{i + 1}.</span>{" "}
                      {ch.channel_name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instagram Section */}
        {hasInstagram && (
          <div className="flex-1">
            <div className="flex items-center gap-[16px] mb-[40px]">
              <div className="w-[48px] h-[4px] bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
              <span className="text-[32px] font-semibold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Instagram
              </span>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-2 gap-[24px] mb-[40px]">
              <div className="bg-white/5 rounded-[20px] p-[32px] text-center">
                <p className="text-[28px] text-white/50">총 좋아요</p>
                <p className="text-[48px] font-bold mt-[8px]">
                  {totalLikes.toLocaleString()}
                </p>
              </div>
              <div className="bg-white/5 rounded-[20px] p-[32px] text-center">
                <p className="text-[28px] text-white/50">DM 대화</p>
                <p className="text-[48px] font-bold mt-[8px]">
                  {totalConversations}명
                </p>
              </div>
            </div>

            {/* Lurker + Late Night Row */}
            <div className="grid grid-cols-2 gap-[24px] mb-[40px]">
              <div className="bg-white/5 rounded-[20px] p-[32px]">
                <p className="text-[28px] text-white/50 mb-[8px]">
                  Lurker 지수
                </p>
                <p className="text-[56px] font-bold">
                  {lurkerScore}
                  <span className="text-[32px] text-white/40 ml-[8px]">
                    / 100
                  </span>
                </p>
              </div>
              <div className="bg-white/5 rounded-[20px] p-[32px]">
                <p className="text-[28px] text-white/50 mb-[8px]">심야 활동</p>
                <p className="text-[56px] font-bold">{lateRatio}%</p>
              </div>
            </div>

            {/* Top Accounts */}
            {topAccounts.length > 0 && (
              <div className="bg-white/5 rounded-[20px] p-[32px]">
                <p className="text-[28px] text-white/50 mb-[16px]">
                  Top 소통
                </p>
                <div className="flex gap-[24px]">
                  {topAccounts.map((acc, i) => (
                    <span key={acc.username} className="text-[30px]">
                      <span className="text-white/40">{i + 1}.</span> @
                      {acc.username}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-auto pt-[48px]">
          <p className="text-[24px] text-white/30">watchlens.app</p>
        </div>
      </div>
    );
  }
);

ShareCard.displayName = "ShareCard";
