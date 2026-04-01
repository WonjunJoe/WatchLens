import { Heart, MessageCircle, UserPlus } from "lucide-react";

interface Props {
  data: any;
}

export function IgSummaryCards({ data }: Props) {
  if (!data) return null;

  const cards = [
    { label: "총 좋아요", value: data.total_likes?.toLocaleString() ?? "0", sub: `게시물 ${data.post_likes ?? 0} + 스토리 ${data.story_likes ?? 0}`, icon: Heart, color: "var(--rose)" },
    { label: "DM 대화", value: data.total_conversations?.toLocaleString() ?? "0", sub: `총 ${data.total_messages?.toLocaleString() ?? 0}건 메시지`, icon: MessageCircle, color: "var(--accent)" },
    { label: "팔로잉", value: data.following_count?.toLocaleString() ?? "0", sub: "", icon: UserPlus, color: "var(--green)" },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <c.icon size={16} style={{ color: c.color }} />
            <span className="text-[13px] text-[var(--text-secondary)]">{c.label}</span>
          </div>
          <p className="text-[24px] font-bold text-[var(--text-primary)]">{c.value}</p>
          {c.sub && <p className="text-[12px] text-[var(--text-tertiary)] mt-1">{c.sub}</p>}
        </div>
      ))}
    </div>
  );
}
