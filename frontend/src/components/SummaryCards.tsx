import { Eye, Users, Activity, Zap } from "lucide-react";
import { motion } from "framer-motion";


const CARDS = [
  { key: "total_watched", label: "Total Views", icon: Eye, color: "var(--accent-lavender)" },
  { key: "total_channels", label: "Channels", icon: Users, color: "var(--accent-mint)" },
  { key: "daily_average", label: "Daily Avg", icon: Activity, color: "var(--accent-sky)" },
  { key: "shorts_count", label: "Shorts", icon: Zap, color: "var(--accent-peach)" },
] as const;

export function SummaryCards({ data }: { data: any | null }) {
  if (!data) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
      {CARDS.map((card, i) => {
        const value = data[card.key];
        return (
          <motion.div 
            key={card.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="clay-card p-6 group hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
          >
            {/* Decorative Background Icon */}
            <card.icon 
              size={80} 
              className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500" 
              style={{ color: card.color }}
            />
            
            <div className="flex flex-col justify-between h-full relative z-10">
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-inner"
                style={{ backgroundColor: `${card.color}15`, color: card.color }}
              >
                <card.icon size={22} strokeWidth={2.5} />
              </div>
              
              <div>
                <p className="text-[12px] font-black text-[var(--text-tertiary)] uppercase tracking-[0.15em] mb-1">{card.label}</p>
                <p className="text-[32px] font-black text-[var(--text-primary)] tracking-tighter leading-none">
                  {typeof value === "number" ? Math.round(value).toLocaleString() : value}
                </p>
              </div>
              
              <div className="mt-4 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: card.color }} />
                <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest">Live Insight</span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
