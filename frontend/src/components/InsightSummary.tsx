import { emojiToIcon } from "../utils/iconMap";

interface InsightItem {
  icon: string;
  text: string;
}

function formatText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      const inner = part.slice(2, -2);
      return (
        <strong key={i} className="font-semibold text-[var(--text-primary)] underline decoration-[var(--accent)]/30 underline-offset-2">
          {inner}
        </strong>
      );
    }
    return part;
  });
}

export function InsightSummary({ data }: { data: InsightItem[] | null | undefined }) {
  if (!data || data.length === 0) return null;

  return (
    <section className="card p-5" role="region" aria-label="인사이트 요약">
      <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-4">인사이트</h2>
      <div className="space-y-3">
        {data.map((item, i) => (
          <div key={i} className="flex items-start gap-3 p-3 bg-[var(--bg)] rounded-lg">
            <span className="text-[var(--accent)] flex-shrink-0 mt-0.5">
              {emojiToIcon(item.icon, 16)}
            </span>
            <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">{formatText(item.text)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
