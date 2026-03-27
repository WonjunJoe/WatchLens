import { emojiToIcon } from "../utils/iconMap";

interface InsightItem {
  icon: string;
  text: string;
}

const CARD_ACCENTS = [
  { bg: "bg-[var(--lavender-light)]", border: "border-[var(--lavender)]", num: "text-[var(--lavender-text)]", icon: "text-[var(--lavender-text)]" },
  { bg: "bg-[var(--sky-light)]", border: "border-[var(--sky)]", num: "text-[var(--sky-text)]", icon: "text-[var(--sky-text)]" },
  { bg: "bg-[var(--rose-light)]", border: "border-[var(--rose)]", num: "text-[var(--rose-text)]", icon: "text-[var(--rose-text)]" },
  { bg: "bg-[var(--mint-light)]", border: "border-[var(--mint)]", num: "text-[var(--mint-text)]", icon: "text-[var(--mint-text)]" },
  { bg: "bg-[var(--peach-light)]", border: "border-[var(--peach)]", num: "text-[var(--peach-text)]", icon: "text-[var(--peach-text)]" },
];

function extractKeyNumber(text: string): string | null {
  const match = text.match(/(\d+[.,]?\d*[%시건점]?)/);
  return match ? match[1] : null;
}

export function InsightSummary({ data }: { data: InsightItem[] | null }) {
  if (!data || data.length === 0) return null;

  return (
    <section className="bg-[var(--bg-white)] border border-[var(--border-default)] rounded-[16px] p-6 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:-translate-y-[2px] transition-all duration-200">
      <h2 className="text-[15px] font-medium text-[var(--text-primary)] mb-5">한눈에 보는 인사이트</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((item, i) => {
          const keyNum = extractKeyNumber(item.text);
          const accent = CARD_ACCENTS[i % CARD_ACCENTS.length];
          return (
            <div
              key={i}
              className={`${accent.bg} ${accent.border} border rounded-xl px-5 py-5`}
            >
              <div className="flex items-center gap-2.5 mb-2">
                <span className="flex-shrink-0">{emojiToIcon(item.icon, 20, accent.icon)}</span>
                {keyNum && (
                  <p className={`text-xl font-medium ${accent.num} leading-tight`}>{keyNum}</p>
                )}
              </div>
              <p className="text-[13px] text-[var(--text-secondary)] leading-[1.7]">{item.text}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
