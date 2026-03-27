import { InfoTooltip } from "./InfoTooltip";
import { Brain, Flame, Activity } from "lucide-react";
import { motion } from "framer-motion";

interface BreakdownItem {
  value: number;
  score: number;
  weight: number;
  description: string;
}

interface DopamineData {
  score: number;
  grade: string;
  breakdown: Record<string, BreakdownItem>;
}

const FACTOR_LABELS: Record<string, string> = {
  shorts_ratio: "Shorts 비율",
  late_night_ratio: "심야 시청",
  short_duration: "짧은 영상",
};

function itemColor(value: number) {
  if (value >= 0.7) return { gradient: "from-[var(--accent-rose)] to-[#FF4D4D]", text: "text-[var(--accent-rose)]", glow: "shadow-[var(--accent-rose)]/20" };
  if (value >= 0.4) return { gradient: "from-[var(--accent-peach)] to-[#FFA500]", text: "text-[var(--accent-peach)]", glow: "shadow-[var(--accent-peach)]/20" };
  return { gradient: "from-[var(--accent-mint)] to-[#00D9A5]", text: "text-[var(--accent-mint)]", glow: "shadow-[var(--accent-mint)]/20" };
}

export function DopamineIndex({ data }: { data: DopamineData | null }) {
  if (!data || !data.breakdown) return null;

  const totalColor = itemColor(data.score / 100);

  return (
    <section className="clay-card p-8 h-full flex flex-col group relative overflow-hidden">
      {/* Background Glow */}
      <div className={`absolute -right-20 -top-20 w-64 h-64 rounded-full blur-[100px] opacity-10 transition-colors duration-500 bg-gradient-to-br ${totalColor.gradient}`} />

      <div className="flex items-center justify-between mb-10 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[var(--accent-rose)]/10 text-[var(--accent-rose)] rounded-2xl flex items-center justify-center shadow-inner">
            <Brain size={24} />
          </div>
          <div>
            <h2 className="text-[20px] font-black text-[var(--text-primary)] tracking-tighter">Dopamine Index</h2>
            <p className="text-[12px] text-[var(--text-tertiary)] font-bold uppercase tracking-widest">Stimulation Level</p>
          </div>
        </div>
        <InfoTooltip text="Shorts 비율(40점) + 심야 시청(30점) + 짧은 영상 비율(30점)의 가중합. 높을수록 자극적 시청 패턴." />
      </div>

      <div className="flex-1 flex flex-col justify-center items-center mb-10 relative z-10">
        <div className="relative mb-4">
          <motion.p 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`text-[84px] font-black tracking-tighter leading-none ${totalColor.text} drop-shadow-sm`}
          >
            {data.score}
          </motion.p>
          <span className="absolute -right-8 bottom-4 text-[20px] font-bold text-[var(--text-tertiary)]">/100</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-1.5 bg-[var(--text-primary)]/5 rounded-full border border-white/5">
          <Flame size={14} className={totalColor.text} />
          <span className="text-[14px] font-black text-[var(--text-secondary)] uppercase tracking-widest">{data.grade}</span>
        </div>
      </div>

      <div className="space-y-6 relative z-10">
        {Object.entries(data.breakdown).map(([key, item], i) => {
          const color = itemColor(item.value);
          return (
            <div key={key} className="space-y-2">
              <div className="flex justify-between items-end">
                <div className="flex items-center gap-2">
                  <Activity size={12} className="text-[var(--text-tertiary)]" />
                  <span className="text-[13px] font-bold text-[var(--text-secondary)]">{FACTOR_LABELS[key] || key}</span>
                </div>
                <span className={`text-[13px] font-black ${color.text}`}>
                  {item.score}<span className="text-[10px] text-[var(--text-tertiary)] font-bold ml-0.5">/ {item.weight}</span>
                </span>
              </div>
              <div className="h-2 bg-[var(--text-primary)]/5 rounded-full overflow-hidden backdrop-blur-md">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${item.value * 100}%` }}
                  transition={{ duration: 1.2, delay: 0.5 + i * 0.1, ease: "circOut" }}
                  className={`h-full rounded-full bg-gradient-to-r ${color.gradient} ${color.glow}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
