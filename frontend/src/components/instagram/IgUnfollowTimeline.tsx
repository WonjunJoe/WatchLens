import { UserMinus } from "lucide-react";

interface UnfollowAccount {
  username: string;
  timestamp: number;
  date: string;
  prior_interactions: number;
}

interface Props {
  data: {
    total_unfollowed: number;
    accounts: UnfollowAccount[];
  } | null | undefined;
}

function interactionColor(count: number) {
  if (count === 0) return "var(--text-tertiary)";
  if (count <= 5) return "var(--amber)";
  return "var(--green)";
}

export function IgUnfollowTimeline({ data }: Props) {
  if (!data || data.total_unfollowed === 0) return null;

  return (
    <section className="card p-5 animate-fadeIn">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <UserMinus size={16} className="text-[var(--rose)]" />
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">최근 언팔로우</h2>
        </div>
        <span className="text-[13px] text-[var(--text-tertiary)]">{data.total_unfollowed}명</span>
      </div>

      <div className="space-y-2">
        {data.accounts.map((acct) => (
          <div key={acct.username} className="flex items-center justify-between py-1.5 border-b border-[var(--border)] last:border-0">
            <div className="flex-1 min-w-0">
              <span className="text-[13px] text-[var(--text-secondary)] truncate block">@{acct.username}</span>
              {acct.date && <span className="text-[11px] text-[var(--text-tertiary)]">{acct.date}</span>}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
              <span
                className="text-[11px] px-1.5 py-0.5 rounded font-medium"
                style={{
                  color: interactionColor(acct.prior_interactions),
                  backgroundColor: `${interactionColor(acct.prior_interactions)}15`,
                }}
              >
                {acct.prior_interactions === 0 ? "상호작용 없음" : `상호작용 ${acct.prior_interactions}회`}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
