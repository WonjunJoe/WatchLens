import { motion } from "framer-motion";
import { UserCheck, Fingerprint, Sparkles } from "lucide-react";

interface Axis {
  axis: string;
  left: string;
  right: string;
  value: number;
  pick: string;
}

interface ViewerTypeData {
  code: string;
  type_name: string;
  description: string;
  axes: Axis[];
}

function AxisBar({ axis, index }: { axis: Axis, index: number }) {
  const pct = Math.round(axis.value * 100);
  const isRight = axis.pick === axis.pick.toUpperCase() && ["N", "S", "B", "F"].includes(axis.pick);

  return (
    <div className="space-y-3 relative group">
      <div className="flex justify-between items-center text-[12px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">
        <span className={!isRight ? "text-[var(--accent-lavender)]" : ""}>{axis.left}</span>
        <span className={isRight ? "text-[var(--accent-lavender)]" : ""}>{axis.right}</span>
      </div>
      <div className="relative h-3 bg-[var(--text-primary)]/5 rounded-full overflow-hidden backdrop-blur-sm">
        <motion.div
          initial={{ width: 0, left: !isRight ? "0%" : "auto", right: isRight ? "0%" : "auto" }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.5, delay: 0.8 + index * 0.1, ease: "circOut" }}
          className={`absolute top-0 h-full bg-gradient-to-r from-[var(--accent-lavender)] to-[var(--accent-sky)] rounded-full shadow-[0_0_15px_rgba(190,176,217,0.4)]`}
        />
      </div>
      <div className="flex justify-between items-center text-[10px] font-bold text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity">
        <span>{!isRight ? `${pct}%` : ""}</span>
        <span>{isRight ? `${pct}%` : ""}</span>
      </div>
    </div>
  );
}

export function ViewerType({ data }: { data: ViewerTypeData | null }) {
  if (!data || data.code === "----") return null;

  return (
    <section className="clay-card p-10 h-full flex flex-col group relative overflow-hidden bg-gradient-to-br from-[var(--surface-clay)] to-[var(--accent-lavender)]/5">
      {/* Decorative Elements */}
      <div className="absolute -right-10 -top-10 w-40 h-40 bg-[var(--accent-lavender)]/10 rounded-full blur-3xl" />
      
      <div className="flex items-center justify-between mb-12 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[var(--accent-lavender)]/15 text-[var(--accent-lavender)] rounded-2xl flex items-center justify-center shadow-inner">
            <UserCheck size={28} />
          </div>
          <div>
            <h2 className="text-[24px] font-black text-[var(--text-primary)] tracking-tight">Your Identity</h2>
            <p className="text-[12px] text-[var(--text-tertiary)] font-bold uppercase tracking-widest">Watching Persona</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-[var(--text-primary)]/5 rounded-full border border-white/5">
          <Fingerprint size={14} className="text-[var(--accent-lavender)]" />
          <span className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Biometric Profile</span>
        </div>
      </div>

      <div className="text-center mb-12 relative z-10">
        <div className="inline-flex items-center gap-3 p-2 bg-[var(--text-primary)]/5 rounded-[2.5rem] mb-6 backdrop-blur-md border border-white/10">
          {data.code.split("").map((c, i) => (
            <motion.span 
              key={i} 
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="w-12 h-12 bg-white dark:bg-[var(--surface-clay)] text-[var(--accent-lavender)] rounded-full flex items-center justify-center text-[18px] font-black shadow-xl"
            >
              {c}
            </motion.span>
          ))}
        </div>
        <h3 className="text-[36px] font-black text-[var(--text-primary)] tracking-tighter leading-none mb-4 flex items-center justify-center gap-2">
          {data.type_name}
          <Sparkles size={24} className="text-[var(--accent-peach)]" />
        </h3>
        <p className="text-[16px] text-[var(--text-secondary)] font-medium max-w-lg mx-auto leading-relaxed">
          {data.description}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-x-10 gap-y-8 relative z-10 bg-white/30 dark:bg-black/10 p-8 rounded-[2rem] backdrop-blur-sm border border-white/10 shadow-inner">
        {data.axes.map((axis, i) => (
          <AxisBar key={axis.axis} axis={axis} index={i} />
        ))}
      </div>
    </section>
  );
}
