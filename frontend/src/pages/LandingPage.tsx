import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Eye, ArrowRight, BarChart3, Clock, Users, TrendingUp, MessageCircle, Search } from "lucide-react";

export function LandingPage() {
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-fadeInUp");
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll("[data-reveal]").forEach((el) => {
      el.classList.add("opacity-0");
      observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <div className="min-h-[100dvh] bg-[#050505] text-white overflow-x-hidden" style={{ wordBreak: "keep-all" }}>
      {/* Noise overlay */}
      <div className="noise-overlay" />

      {/* Background gradient orbs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full animate-gradient-rotate"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full animate-gradient-rotate"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)", animationDelay: "-10s" }}
        />
      </div>

      {/* Floating Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 flex justify-center pt-5 px-4">
        <div className="glass rounded-full px-6 py-3 flex items-center gap-8 max-w-2xl w-full justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
              <Eye size={16} className="text-white" />
            </div>
            <span className="text-[15px] font-bold tracking-tight">WatchLens</span>
          </Link>
          <div className="hidden sm:flex items-center gap-6 text-[13px] text-zinc-400">
            <a href="#features" className="hover:text-white" style={{ transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)" }}>기능</a>
            <a href="#how-it-works" className="hover:text-white" style={{ transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)" }}>사용법</a>
          </div>
          <Link
            to="/upload"
            className="bg-indigo-500 hover:bg-indigo-400 text-white text-[13px] font-medium px-5 py-2 rounded-full flex items-center gap-2 active:scale-[0.98] hover:scale-[1.02]"
            style={{ transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)" }}
          >
            시작하기
          </Link>
        </div>
      </nav>

      {/* Hero Section — Split Layout */}
      <section className="relative z-10 min-h-[100dvh] flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left — Text */}
            <div className="pt-24 lg:pt-0">
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.15em] font-medium bg-indigo-500/10 text-indigo-400 mb-6 animate-fadeInUp">
                YouTube · Instagram 분석
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-snug tracking-tight mb-6 animate-fadeInUp stagger-1">
                나의 디지털 습관을<br />
                데이터로 마주하다
              </h1>
              <p className="text-lg md:text-xl text-zinc-400 leading-relaxed max-w-[50ch] mb-10 animate-fadeInUp stagger-2">
                Google Takeout과 Instagram 데이터를 업로드하면,
                시청 패턴·DM 분석·관심사 추적까지 한눈에 보여드립니다.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 animate-fadeInUp stagger-3">
                <Link
                  to="/upload"
                  className="group bg-indigo-500 hover:bg-indigo-400 text-white font-medium px-8 py-4 rounded-full text-lg flex items-center justify-center gap-3 active:scale-[0.98] hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(99,102,241,0.3)]"
                  style={{ transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)" }}
                >
                  무료로 분석 시작하기
                  <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:translate-x-1" style={{ transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)" }}>
                    <ArrowRight size={16} />
                  </span>
                </Link>
              </div>
            </div>

            {/* Right — Visual (Dashboard Preview Mock) */}
            <div className="hidden lg:block relative">
              <div className="animate-float">
                <div className="relative p-1.5 rounded-[2rem] bg-white/5 ring-1 ring-white/10">
                  <div className="bg-zinc-900/80 rounded-[calc(2rem-0.375rem)] p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
                    {/* Mock dashboard cards */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                        <div className="text-[11px] text-zinc-500 mb-1">총 시청</div>
                        <div className="text-2xl font-bold text-white">2,847</div>
                        <div className="text-[11px] text-emerald-400 mt-1">+12.3%</div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                        <div className="text-[11px] text-zinc-500 mb-1">시청 시간</div>
                        <div className="text-2xl font-bold text-white">186h</div>
                        <div className="text-[11px] text-amber-400 mt-1">일 1.2h</div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                        <div className="text-[11px] text-zinc-500 mb-1">Shorts 비율</div>
                        <div className="text-2xl font-bold text-white">34%</div>
                        <div className="text-[11px] text-rose-400 mt-1">주의</div>
                      </div>
                    </div>
                    {/* Mock chart area */}
                    <div className="bg-white/5 rounded-xl p-4 border border-white/5 h-32 flex items-end gap-1">
                      {[40, 65, 45, 80, 55, 90, 70, 60, 85, 50, 75, 95].map((h, i) => (
                        <div key={i} className="flex-1 bg-indigo-500/40 rounded-t" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section — Bento Grid */}
      <section id="features" className="relative z-10 py-24 md:py-32 lg:py-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16" data-reveal>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.15em] font-medium bg-indigo-500/10 text-indigo-400 mb-4">
              주요 기능
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-snug tracking-tight">
              당신의 데이터가 말해주는<br />숨겨진 패턴
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {/* Card 1 — Wide (col-span-4) */}
            <div data-reveal className="md:col-span-4 p-1.5 rounded-[2rem] bg-white/5 ring-1 ring-white/10">
              <div className="bg-zinc-900/80 rounded-[calc(2rem-0.375rem)] p-8 h-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-5">
                  <BarChart3 size={24} className="text-indigo-400" />
                </div>
                <h3 className="text-xl font-bold mb-2 leading-snug">시청 패턴 분석</h3>
                <p className="text-zinc-400 text-[15px] leading-relaxed max-w-[50ch]">
                  시간대별·요일별·일별 시청 트렌드를 시각화합니다.
                  가장 많이 보는 시간대, 몰아보기 패턴, 주말과 평일의 차이까지 한눈에 파악하세요.
                </p>
              </div>
            </div>

            {/* Card 2 — Narrow (col-span-2) */}
            <div data-reveal className="md:col-span-2 p-1.5 rounded-[2rem] bg-white/5 ring-1 ring-white/10">
              <div className="bg-zinc-900/80 rounded-[calc(2rem-0.375rem)] p-8 h-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-5">
                  <Clock size={24} className="text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold mb-2 leading-snug">시청 시간 추적</h3>
                <p className="text-zinc-400 text-[15px] leading-relaxed">
                  주간·월간 누적 시청 시간과 Shorts 비율을 추적합니다.
                </p>
              </div>
            </div>

            {/* Card 3 — Narrow (col-span-2) */}
            <div data-reveal className="md:col-span-2 p-1.5 rounded-[2rem] bg-white/5 ring-1 ring-white/10">
              <div className="bg-zinc-900/80 rounded-[calc(2rem-0.375rem)] p-8 h-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-5">
                  <TrendingUp size={24} className="text-amber-400" />
                </div>
                <h3 className="text-xl font-bold mb-2 leading-snug">도파민 지수</h3>
                <p className="text-zinc-400 text-[15px] leading-relaxed">
                  짧은 영상 소비 비율과 심야 시청 패턴으로 도파민 의존도를 측정합니다.
                </p>
              </div>
            </div>

            {/* Card 4 — Wide (col-span-4) */}
            <div data-reveal className="md:col-span-4 p-1.5 rounded-[2rem] bg-white/5 ring-1 ring-white/10">
              <div className="bg-zinc-900/80 rounded-[calc(2rem-0.375rem)] p-8 h-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-5">
                  <MessageCircle size={24} className="text-rose-400" />
                </div>
                <h3 className="text-xl font-bold mb-2 leading-snug">Instagram DM 분석</h3>
                <p className="text-zinc-400 text-[15px] leading-relaxed max-w-[50ch]">
                  가장 많이 대화한 상대, 답장 속도, 활발한 시간대를 분석합니다.
                  좋아요·스토리 반응·관심 주제까지 종합적으로 보여드립니다.
                </p>
              </div>
            </div>

            {/* Card 5 (col-span-3) */}
            <div data-reveal className="md:col-span-3 p-1.5 rounded-[2rem] bg-white/5 ring-1 ring-white/10">
              <div className="bg-zinc-900/80 rounded-[calc(2rem-0.375rem)] p-8 h-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center mb-5">
                  <Users size={24} className="text-cyan-400" />
                </div>
                <h3 className="text-xl font-bold mb-2 leading-snug">채널 · 계정 랭킹</h3>
                <p className="text-zinc-400 text-[15px] leading-relaxed">
                  가장 많이 시청한 YouTube 채널과 Instagram에서 가장 많이 소통한 계정을 순위로 보여드립니다.
                </p>
              </div>
            </div>

            {/* Card 6 (col-span-3) */}
            <div data-reveal className="md:col-span-3 p-1.5 rounded-[2rem] bg-white/5 ring-1 ring-white/10">
              <div className="bg-zinc-900/80 rounded-[calc(2rem-0.375rem)] p-8 h-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
                <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-5">
                  <Search size={24} className="text-violet-400" />
                </div>
                <h3 className="text-xl font-bold mb-2 leading-snug">검색 키워드 분석</h3>
                <p className="text-zinc-400 text-[15px] leading-relaxed">
                  YouTube 검색 기록에서 자주 찾는 키워드와 관심사 변화를 추적합니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Remaining sections (how-it-works, CTA, footer) will be added in Task 6 */}
    </div>
  );
}
