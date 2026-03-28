import { emojiToIcon } from "../utils/iconMap";

interface InsightItem {
  icon: string;
  text: string;
}

export function InsightSummary({ data }: { data: InsightItem[] | null }) {
  if (!data || data.length === 0) return null;

  return (
    <section className="card p-5">
      <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-4">인사이트</h2>
      <div className="space-y-3">
        {data.map((item, i) => (
          <div key={i} className="flex items-start gap-3 p-3 bg-[var(--bg)] rounded-lg">
            <span className="text-[var(--accent)] flex-shrink-0 mt-0.5">
              {emojiToIcon(item.icon, 16)}
            </span>
            <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">{item.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
