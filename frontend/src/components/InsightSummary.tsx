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
    <section className="card p-6 relative overflow-hidden" role="region" aria-label="인사이트 요약">
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: "linear-gradient(90deg, var(--accent), var(--accent)60)" }} />
      <h2 className="text-[13px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-5">인사이트</h2>
      <div className="space-y-3">
        {data.map((item, i) => (
          <div key={i} className="flex items-start gap-3.5 p-4 bg-gradient-to-r from-[var(--bg)] to-transparent rounded-xl border border-[var(--border)] transition-all duration-200 hover:border-[var(--accent)]/15 hover:from-[var(--accent-light)]">
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
