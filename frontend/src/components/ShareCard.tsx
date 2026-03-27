import { motion, AnimatePresence } from "framer-motion";
import { X, Share2, Download, Eye, Sparkles, Play } from "lucide-react";

interface ShareCardProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    viewerType: any;
    watchTime: any;
    topChannel: any;
    dopamine: number;
  };
}

export function ShareCard({ isOpen, onClose, data }: ShareCardProps) {
  if (!data.viewerType) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 sm:p-10"
        >
          {/* Close Button */}
          <button 
            onClick={onClose}
            className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors"
          >
            <X size={32} />
          </button>

          <div className="flex flex-col md:flex-row gap-10 items-center max-w-6xl w-full">
            {/* 9:16 Artwork Container */}
            <motion.div 
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: "spring", damping: 20, stiffness: 100 }}
              className="relative w-full max-w-[400px] aspect-[9/16] bg-[#0B0B0F] rounded-[3rem] overflow-hidden shadow-[0_0_80px_rgba(139,92,246,0.3)] border border-white/10 group"
            >
              {/* Kinetic Background */}
              <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-gradient-to-br from-[#1A1A24] via-[#0B0B0F] to-[#241A24]" />
                <motion.div 
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 90, 0],
                    opacity: [0.1, 0.2, 0.1]
                  }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="absolute top-[20%] left-[10%] w-full h-full bg-[var(--accent-lavender)] blur-[120px] rounded-full"
                />
                <motion.div 
                  animate={{ 
                    scale: [1, 1.3, 1],
                    rotate: [0, -120, 0],
                    opacity: [0.05, 0.15, 0.05]
                  }}
                  transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                  className="absolute bottom-[10%] right-[10%] w-full h-full bg-[var(--accent-sky)] blur-[100px] rounded-full"
                />
              </div>

              {/* Content Overlay */}
              <div className="relative z-10 h-full p-10 flex flex-col justify-between text-white">
                <div>
                  <div className="flex items-center gap-2 mb-8">
                    <div className="w-8 h-8 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20">
                      <Eye size={16} />
                    </div>
                    <span className="text-[14px] font-black tracking-widest uppercase text-white/40">WatchLens 2026</span>
                  </div>

                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <p className="text-[18px] font-bold text-[var(--accent-lavender)] mb-2">My Persona is</p>
                    <h2 className="text-[54px] font-black leading-[0.9] tracking-tighter mb-6 text-balance">
                      {data.viewerType.type_name.split(" ").map((word: string, i: number) => (
                        <span key={i} className="block">{word}</span>
                      ))}
                    </h2>
                  </motion.div>
                </div>

                <div className="space-y-10">
                  <div className="grid grid-cols-2 gap-6">
                    <motion.div 
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      <p className="text-[11px] font-black uppercase tracking-widest text-white/30 mb-2">Total Time</p>
                      <p className="text-[32px] font-black tracking-tighter leading-none">
                        {data.watchTime?.total_max_hours}<span className="text-[14px] ml-1 opacity-50">HRS</span>
                      </p>
                    </motion.div>
                    <motion.div 
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.6 }}
                    >
                      <p className="text-[11px] font-black uppercase tracking-widest text-white/30 mb-2">Dopamine</p>
                      <p className="text-[32px] font-black tracking-tighter leading-none text-[var(--accent-rose)]">
                        {data.dopamine}<span className="text-[14px] ml-1 opacity-50">PTS</span>
                      </p>
                    </motion.div>
                  </div>

                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="p-6 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-md"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 bg-[var(--accent-mint)] rounded-xl flex items-center justify-center">
                        <Play size={16} className="text-black" />
                      </div>
                      <span className="text-[12px] font-black uppercase tracking-widest text-white/40">Top Pick</span>
                    </div>
                    <p className="text-[20px] font-black truncate">{data.topChannel?.channel_name || "Unknown"}</p>
                  </motion.div>

                  <div className="flex items-center justify-between pt-6 border-t border-white/10">
                    <div className="flex items-center gap-2">
                      <Sparkles size={14} className="text-[var(--accent-peach)]" />
                      <span className="text-[12px] font-bold text-white/60 tracking-tight">Lens.framer.app</span>
                    </div>
                    <div className="flex gap-1">
                      {data.viewerType.code.split("").map((c: string, i: number) => (
                        <div key={i} className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center text-[10px] font-black">{c}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Sidebar Controls */}
            <div className="flex-1 space-y-8 text-center md:text-left">
              <div>
                <h3 className="text-[32px] font-black text-white mb-4 tracking-tight">박제하고 싶은 데이터.<br/>지금 바로 공유하세요.</h3>
                <p className="text-[16px] text-white/50 leading-relaxed max-w-md">
                  2026 에디션 WatchLens가 분석한 당신의 시청 정체성입니다.<br/>
                  인스타그램 스토리 규격(9:16)으로 디자인되었습니다.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button className="flex-1 flex items-center justify-center gap-3 px-8 py-5 bg-[var(--accent-lavender)] text-black rounded-3xl font-black text-[16px] hover:scale-[1.05] active:scale-[0.95] transition-all">
                  <Download size={20} />
                  이미지 저장하기
                </button>
                <button className="flex-1 flex items-center justify-center gap-3 px-8 py-5 bg-white/10 text-white rounded-3xl font-black text-[16px] border border-white/20 hover:bg-white/20 transition-all">
                  <Share2 size={20} />
                  링크 복사
                </button>
              </div>
              
              <p className="text-[12px] text-white/30 font-medium">
                * 이미지 저장 기능은 View Only 모드로 준비 중입니다.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
