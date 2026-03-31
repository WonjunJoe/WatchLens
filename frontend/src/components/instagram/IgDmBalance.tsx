interface DmBalanceItem {
  conversation: string;
  sent: number;
  received: number;
  total: number;
  sent_pct: number;
  is_group: boolean;
}

interface Props {
  data: DmBalanceItem[] | null | undefined;
}

export function IgDmBalance({ data }: Props) {
  if (!data || data.length === 0) return null;

  return (
    <section className="card p-5 animate-fadeIn">
      <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-4">DM 대화 밸런스</h2>
      <p className="text-[12px] text-[var(--text-tertiary)] mb-4">대화별 내가 보낸 비율</p>

      <div className="space-y-3">
        {data.map((item) => {
          const sentColor = item.sent_pct >= 65 ? "var(--rose)" : item.sent_pct >= 45 ? "var(--green)" : "var(--accent)";
          const label = item.sent_pct >= 65 ? "내가 주도" : item.sent_pct >= 45 ? "균형" : "상대 주도";

          return (
            <div key={item.conversation}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 truncate max-w-[50%]">
                  <span className="text-[13px] text-[var(--text-secondary)] truncate">{item.conversation}</span>
                  {item.is_group && (
                    <span className="text-[10px] px-1 py-0.5 rounded bg-gray-100 text-[var(--text-tertiary)] whitespace-nowrap">그룹</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[var(--text-tertiary)]">{item.total}건</span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: `${sentColor}15`, color: sentColor }}>
                    {label}
                  </span>
                </div>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
                <div
                  className="h-full rounded-l-full"
                  style={{ width: `${item.sent_pct}%`, backgroundColor: "var(--accent)" }}
                />
                <div
                  className="h-full rounded-r-full"
                  style={{ width: `${100 - item.sent_pct}%`, backgroundColor: "var(--amber)" }}
                />
              </div>
              <div className="flex justify-between mt-0.5">
                <span className="text-[10px] text-[var(--accent)]">보냄 {item.sent_pct}%</span>
                <span className="text-[10px] text-[var(--amber)]">받음 {100 - item.sent_pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
