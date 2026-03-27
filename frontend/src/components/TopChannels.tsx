import { Trophy, Play, Zap } from "lucide-react";
import { motion } from "framer-motion";

interface ChannelCount { channel_name: string; count: number; }
interface TopChannelsSplit { longform: ChannelCount[]; shorts: ChannelCount[]; }

function ChannelList({ data, color }: { data: ChannelCount[]; color: string; icon: any }) {
  if (data.length === 0) return <p className="text-[14px] text-[var(--text-tertiary)] py-4 font-medium italic">분석된 데이터가 없습니다.</p>;
  const max = data[0]?.count || 1;

  return (
    <div className="space-y-4">
      {data.slice(0, 5).map((ch, i) => (
        <div key={ch.channel_name} className="group relative">
          <div className="flex items-center gap-4 mb-2">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-[14px] shadow-sm transition-transform group-hover:scale-110 duration-300 ${i === 0 ? 'bg-gradient-to-br from-amber-300 to-amber-500 text-white' : 'bg-[var(--text-primary)]/5 text-[var(--text-secondary)]'}`}>
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-end mb-1.5">
                <span className="text-[15px] font-bold text-[var(--text-primary)] truncate tracking-tight">{ch.channel_name}</span>
                <span className="text-[13px] font-black text-[var(--text-tertiary)] ml-2">{ch.count}<span className="text-[10px] ml-0.5 uppercase opacity-60">Views</span></span>
              </div>
              <div className="h-1.5 bg-[var(--text-primary)]/5 rounded-full overflow-hidden backdrop-blur-md">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(ch.count / max) * 100}%` }}
                  transition={{ duration: 1, delay: i * 0.1 }}
                  className={`h-full rounded-full ${color} shadow-[0_0_10px_rgba(0,0,0,0.1)]`} 
                />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TopChannels({ data }: { data: TopChannelsSplit | null }) {
  if (!data) return null;

  return (
    <section className="glass-card p-8 h-full flex flex-col group overflow-hidden">
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[var(--accent-mint)]/10 text-[var(--accent-mint)] rounded-2xl flex items-center justify-center shadow-inner">
            <Trophy size={24} />
          </div>
          <div>
            <h2 className="text-[20px] font-black text-[var(--text-primary)] tracking-tighter">Top Channels</h2>
            <p className="text-[12px] text-[var(--text-tertiary)] font-bold uppercase tracking-widest">Most Watched</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative">
        {/* Divider */}
        <div className="hidden md:block absolute left-1/2 top-4 bottom-4 w-px bg-gradient-to-b from-transparent via-[var(--border-glass)] to-transparent" />

        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-6">
            <Play size={18} className="text-[var(--accent-rose)]" />
            <h3 className="text-[14px] font-black text-[var(--text-secondary)] uppercase tracking-wider">Long-form</h3>
          </div>
          <ChannelList data={data.longform} color="bg-gradient-to-r from-[var(--accent-rose)] to-[var(--accent-peach)]" icon={Play} />
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-6">
            <Zap size={18} className="text-[var(--accent-sky)]" />
            <h3 className="text-[14px] font-black text-[var(--text-secondary)] uppercase tracking-wider">Shorts</h3>
          </div>
          <ChannelList data={data.shorts} color="bg-gradient-to-r from-[var(--accent-sky)] to-[var(--accent-mint)]" icon={Zap} />
        </div>
      </div>
    </section>
  );
}
