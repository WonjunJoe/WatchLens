interface AccountItem {
  username: string;
  likes: number;
  story_likes: number;
  dms_sent: number;
  total: number;
}

interface Props {
  data: { accounts: AccountItem[]; total_engagement: number } | null | undefined;
}

export function IgEngagementBalance({ data }: Props) {
  if (!data || !data.accounts || data.accounts.length === 0) return null;

  const max = data.accounts[0]?.total || 1;

  return (
    <section className="card p-5 animate-fadeIn">
      <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-1">내 관심 분포</h2>
      <p className="text-[12px] text-[var(--text-tertiary)] mb-4">내가 가장 많이 반응한 계정 (좋아요 + 스토리 + DM)</p>

      <div className="space-y-3">
        {data.accounts.map((item) => {
          const pctOfMax = Math.round((item.total / max) * 100);
          const likesPct = item.total > 0 ? Math.round((item.likes / item.total) * 100) : 0;
          const storyPct = item.total > 0 ? Math.round((item.story_likes / item.total) * 100) : 0;
          const dmPct = Math.max(0, 100 - likesPct - storyPct);

          return (
            <div key={item.username}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[13px] text-[var(--text-secondary)] truncate max-w-[50%]">@{item.username}</span>
                <span className="text-[11px] text-[var(--text-tertiary)]">{item.total}회</span>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden bg-gray-100" style={{ width: `${pctOfMax}%` }}>
                {item.likes > 0 && (
                  <div
                    className="h-full"
                    style={{ width: `${likesPct}%`, backgroundColor: "var(--rose)" }}
                    title={`좋아요 ${item.likes}회`}
                  />
                )}
                {item.story_likes > 0 && (
                  <div
                    className="h-full"
                    style={{ width: `${storyPct}%`, backgroundColor: "var(--amber)" }}
                    title={`스토리 좋아요 ${item.story_likes}회`}
                  />
                )}
                {item.dms_sent > 0 && (
                  <div
                    className="h-full"
                    style={{ width: `${dmPct}%`, backgroundColor: "var(--accent)" }}
                    title={`DM 발신 ${item.dms_sent}건`}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[var(--border)]">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "var(--rose)" }} />
          <span className="text-[11px] text-[var(--text-tertiary)]">좋아요</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "var(--amber)" }} />
          <span className="text-[11px] text-[var(--text-tertiary)]">스토리</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "var(--accent)" }} />
          <span className="text-[11px] text-[var(--text-tertiary)]">DM 발신</span>
        </div>
      </div>
    </section>
  );
}
