interface BalanceItem {
  username: string;
  given: number;
  received: number;
  total: number;
  balance: string;
}

interface Props {
  data: BalanceItem[] | null;
}

function balanceColor(balance: string) {
  if (balance === "균형") return "var(--green)";
  if (balance === "일방적 관심") return "var(--rose)";
  return "var(--accent)";
}

export function IgEngagementBalance({ data }: Props) {
  if (!data || data.length === 0) return null;

  return (
    <section className="card p-5 animate-fadeIn">
      <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-4">소통 균형 분석</h2>
      <p className="text-[12px] text-[var(--text-tertiary)] mb-4">내가 준 반응(좋아요·DM) vs 받은 반응(DM)</p>

      <div className="space-y-3">
        {data.map((item) => {
          const total = item.given + item.received;
          const givenPct = total > 0 ? Math.round((item.given / total) * 100) : 50;
          const color = balanceColor(item.balance);

          return (
            <div key={item.username}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[13px] text-[var(--text-secondary)] truncate max-w-[40%]">@{item.username}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${color}15`, color }}>
                  {item.balance}
                </span>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
                <div
                  className="h-full rounded-l-full"
                  style={{ width: `${givenPct}%`, backgroundColor: "var(--rose)" }}
                  title={`보낸 반응: ${item.given}`}
                />
                <div
                  className="h-full rounded-r-full"
                  style={{ width: `${100 - givenPct}%`, backgroundColor: "var(--accent)" }}
                  title={`받은 반응: ${item.received}`}
                />
              </div>
              <div className="flex justify-between mt-0.5">
                <span className="text-[10px] text-[var(--rose)]">보냄 {item.given}</span>
                <span className="text-[10px] text-[var(--accent)]">받음 {item.received}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[var(--border)]">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "var(--rose)" }} />
          <span className="text-[11px] text-[var(--text-tertiary)]">보낸 반응</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "var(--accent)" }} />
          <span className="text-[11px] text-[var(--text-tertiary)]">받은 반응</span>
        </div>
      </div>
    </section>
  );
}
