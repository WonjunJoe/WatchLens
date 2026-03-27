import { emojiToIcon } from "../utils/iconMap";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";

interface InsightItem {
  icon: string;
  text: string;
}

const ACCENT_COLORS = [
  "var(--accent-lavender)",
  "var(--accent-sky)",
  "var(--accent-rose)",
  "var(--accent-mint)",
  "var(--accent-peach)",
];

function extractKeyNumber(text: string): string | null {
  const match = text.match(/(\d+[.,]?\d*[%시건점]?)/);
  return match ? match[1] : null;
}

export function InsightSummary({ data }: { data: InsightItem[] | null }) {
  if (!data || data.length === 0) return null;

  return (
    <section className="glass-card p-10 h-full flex flex-col group relative overflow-hidden">
      <div className="flex items-center justify-between mb-10 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[var(--accent-sky)]/15 text-[var(--accent-sky)] rounded-2xl flex items-center justify-center shadow-inner">
            <Zap size={28} />
          </div>
          <div>
            <h2 className="text-[24px] font-black text-[var(--text-primary)] tracking-tight">Smart Insights</h2>
            <p className="text-[12px] text-[var(--text-tertiary)] font-bold uppercase tracking-widest">AI-Generated Analysis</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10 h-full overflow-y-auto pr-2 custom-scrollbar">
        {data.map((item, i) => {
          const keyNum = extractKeyNumber(item.text);
          const color = ACCENT_COLORS[i % ACCENT_COLORS.length];
          return (
            <motion.div
              key={i}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              className="group/item relative p-6 rounded-[2rem] bg-[var(--text-primary)]/5 hover:bg-white dark:hover:bg-[var(--surface-clay)] transition-all duration-500 border border-transparent hover:border-white/20 hover:shadow-2xl overflow-hidden"
            >
              <div 
                className="absolute -right-4 -bottom-4 w-24 h-24 blur-3xl opacity-0 group-hover/item:opacity-20 transition-opacity duration-500" 
                style={{ backgroundColor: color }}
              />
              
              <div className="flex items-start gap-4 mb-4">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: `${color}15`, color: color }}
                >
                  {emojiToIcon(item.icon, 20)}
                </div>
                {keyNum && (
                  <p className="text-[28px] font-black tracking-tighter leading-none" style={{ color }}>{keyNum}</p>
                )}
              </div>
              <p className="text-[14px] text-[var(--text-secondary)] font-medium leading-relaxed group-hover/item:text-[var(--text-primary)] transition-colors">
                {item.text}
              </p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
