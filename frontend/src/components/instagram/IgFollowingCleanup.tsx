import { UserX } from "lucide-react";

interface Props {
  data: {
    total_following: number;
    no_interaction_count: number;
    no_interaction_pct: number;
    no_interaction_sample: string[];
    low_interaction: { username: string; count: number }[];
  } | null;
}

function pctColor(pct: number) {
  if (pct >= 70) return "var(--rose)";
  if (pct >= 40) return "var(--amber)";
  return "var(--green)";
}

export function IgFollowingCleanup({ data }: Props) {
  if (!data || !data.total_following) return null;

  const color = pctColor(data.no_interaction_pct);

  return (
    <section className="card p-5 animate-fadeIn">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">팔로잉 정리 추천</h2>
        <span className="text-[12px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${color}15`, color }}>
          {data.no_interaction_pct}% 미소통
        </span>
      </div>

      <div className="flex items-center gap-4 mb-5">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}10` }}>
          <UserX size={24} style={{ color }} />
        </div>
        <div>
          <p className="text-[32px] font-bold leading-none" style={{ color }}>
            {data.no_interaction_count}
            <span className="text-[14px] text-[var(--text-tertiary)] ml-1">/ {data.total_following}</span>
          </p>
          <p className="text-[12px] text-[var(--text-tertiary)] mt-1">소통 없는 팔로잉 계정</p>
        </div>
      </div>

      {/* Ratio bar */}
      <div className="mb-5">
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
          <div
            className="h-full rounded-l-full"
            style={{ width: `${100 - data.no_interaction_pct}%`, backgroundColor: "var(--green)" }}
          />
          <div
            className="h-full rounded-r-full"
            style={{ width: `${data.no_interaction_pct}%`, backgroundColor: color }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-[var(--green)]">소통 있음</span>
          <span className="text-[10px]" style={{ color }}>소통 없음</span>
        </div>
      </div>

      {data.no_interaction_sample.length > 0 && (
        <div className="mb-4">
          <p className="text-[12px] text-[var(--text-tertiary)] mb-2">소통 없는 계정 (일부)</p>
          <div className="flex flex-wrap gap-1.5">
            {data.no_interaction_sample.map((u) => (
              <span key={u} className="px-2 py-0.5 bg-gray-100 text-[11px] text-[var(--text-secondary)] rounded">
                @{u}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.low_interaction.length > 0 && (
        <div>
          <p className="text-[12px] text-[var(--text-tertiary)] mb-2">소통 매우 적은 계정 (1~2건)</p>
          <div className="flex flex-wrap gap-1.5">
            {data.low_interaction.map((item) => (
              <span key={item.username} className="px-2 py-0.5 bg-gray-100 text-[11px] text-[var(--text-secondary)] rounded">
                @{item.username} ({item.count})
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
