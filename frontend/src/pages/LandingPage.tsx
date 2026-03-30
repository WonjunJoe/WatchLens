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
    <div className="min-h-[100dvh] bg-[var(--bg)] text-[var(--text-primary)] overflow-x-hidden" style={{ wordBreak: "keep-all" }}>

      {/* Background gradient orbs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full animate-gradient-rotate"
          style={{ background: "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full animate-gradient-rotate"
          style={{ background: "radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)", animationDelay: "-10s" }}
        />
      </div>

      {/* Floating Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 flex justify-center pt-5 px-4">
        <div className="glass-light rounded-full px-6 py-3 flex items-center gap-8 max-w-2xl w-full justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[var(--accent)] rounded-lg flex items-center justify-center">
              <Eye size={16} className="text-white" />
            </div>
            <span className="text-[15px] font-bold tracking-tight text-[var(--text-primary)]">WatchLens</span>
          </Link>
          <div className="hidden sm:flex items-center gap-6 text-[13px] text-[var(--text-secondary)]">
            <a href="#features" className="hover:text-[var(--text-primary)]" style={{ transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)" }}>기능</a>
            <a href="#how-it-works" className="hover:text-[var(--text-primary)]" style={{ transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)" }}>사용법</a>
          </div>
          <Link
            to="/upload"
            className="bg-[var(--accent)] hover:opacity-90 text-white text-[13px] font-medium px-5 py-2 rounded-full flex items-center gap-2 active:scale-[0.98] hover:scale-[1.02]"
            style={{ transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)" }}
          >
            시작하기
          </Link>
        </div>
      </nav>

      {/* Hero Section — Split Layout */}
      <section className="relative z-10 min-h-[100dvh] flex items-center">
        <div className="max-w-5xl mx-auto px-6 sm:px-10 lg:px-16 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left — Text */}
            <div className="pt-24 lg:pt-0">
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.15em] font-medium bg-[var(--accent-light)] text-[var(--accent)] mb-6 animate-fadeInUp">
                YouTube · Instagram 분석
              </div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold leading-snug tracking-tight mb-5 animate-fadeInUp stagger-1 text-[var(--text-primary)]">
                나의 디지털 습관을<br />
                데이터로 마주하다
              </h1>
              <p className="text-sm md:text-base text-[var(--text-secondary)] leading-relaxed max-w-[50ch] mb-8 animate-fadeInUp stagger-2">
                Google Takeout과 Instagram 데이터를 업로드하면,
                시청 패턴·DM 분석·관심사 추적까지 한눈에 보여드립니다.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 animate-fadeInUp stagger-3">
                <Link
                  to="/upload"
                  className="group bg-[var(--accent)] hover:opacity-90 text-white font-medium px-6 py-3 rounded-full text-sm flex items-center justify-center gap-2.5 active:scale-[0.98] hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(59,130,246,0.2)]"
                  style={{ transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)" }}
                >
                  무료로 분석 시작하기
                  <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-1" style={{ transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)" }}>
                    <ArrowRight size={16} />
                  </span>
                </Link>
              </div>
            </div>

            {/* Right — Visual (Dashboard Preview Mock) */}
            <div className="hidden lg:block relative">
              <div className="animate-float">
                <div className="card p-5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)]">
                  {/* Mock dashboard cards */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-[var(--bg)] rounded-xl p-3 border border-[var(--border)]">
                      <div className="text-[11px] text-[var(--text-tertiary)] mb-1">총 시청</div>
                      <div className="text-lg font-bold text-[var(--text-primary)]">2,847</div>
                      <div className="text-[11px] text-[var(--green)] mt-1">+12.3%</div>
                    </div>
                    <div className="bg-[var(--bg)] rounded-xl p-3 border border-[var(--border)]">
                      <div className="text-[10px] text-[var(--text-tertiary)] mb-1">시청 시간</div>
                      <div className="text-lg font-bold text-[var(--text-primary)]">186h</div>
                      <div className="text-[11px] text-[var(--amber)] mt-1">일 1.2h</div>
                    </div>
                    <div className="bg-[var(--bg)] rounded-xl p-3 border border-[var(--border)]">
                      <div className="text-[10px] text-[var(--text-tertiary)] mb-1">Shorts 비율</div>
                      <div className="text-lg font-bold text-[var(--text-primary)]">34%</div>
                      <div className="text-[11px] text-[var(--rose)] mt-1">주의</div>
                    </div>
                  </div>
                  {/* Mock chart area */}
                  <div className="bg-[var(--bg)] rounded-xl p-4 border border-[var(--border)] h-24 flex items-end gap-1">
                    {[40, 65, 45, 80, 55, 90, 70, 60, 85, 50, 75, 95].map((h, i) => (
                      <div key={i} className="flex-1 bg-[var(--accent)] opacity-40 rounded-t" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section — Bento Grid */}
      <section id="features" className="relative z-10 py-16 md:py-24 lg:py-28 bg-[var(--surface)] border-t border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-6 sm:px-10 lg:px-16">
          <div className="text-center mb-16" data-reveal>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.15em] font-medium bg-[var(--accent-light)] text-[var(--accent)] mb-4">
              주요 기능
            </div>
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold leading-snug tracking-tight">
              당신의 데이터가 말해주는<br />숨겨진 패턴
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {/* Card 1 — Wide (col-span-4) */}
            <div data-reveal className="md:col-span-4 card p-5">
              <div className="w-9 h-9 rounded-xl bg-[var(--accent-light)] flex items-center justify-center mb-5">
                <BarChart3 size={18}className="text-[var(--accent)]" />
              </div>
              <h3 className="text-base font-bold mb-1.5 leading-snug">시청 패턴 분석</h3>
              <p className="text-[var(--text-secondary)] text-[13px] leading-relaxed max-w-[50ch]">
                시간대별·요일별·일별 시청 트렌드를 시각화합니다.
                가장 많이 보는 시간대, 몰아보기 패턴, 주말과 평일의 차이까지 한눈에 파악하세요.
              </p>
            </div>

            {/* Card 2 — Narrow (col-span-2) */}
            <div data-reveal className="md:col-span-2 card p-5">
              <div className="w-9 h-9 rounded-xl bg-[var(--green-light)] flex items-center justify-center mb-5">
                <Clock size={18}className="text-[var(--green)]" />
              </div>
              <h3 className="text-base font-bold mb-1.5 leading-snug">시청 시간 추적</h3>
              <p className="text-[var(--text-secondary)] text-[13px] leading-relaxed">
                주간·월간 누적 시청 시간과 Shorts 비율을 추적합니다.
              </p>
            </div>

            {/* Card 3 — Narrow (col-span-2) */}
            <div data-reveal className="md:col-span-2 card p-5">
              <div className="w-9 h-9 rounded-xl bg-[var(--amber-light)] flex items-center justify-center mb-5">
                <TrendingUp size={18}className="text-[var(--amber)]" />
              </div>
              <h3 className="text-base font-bold mb-1.5 leading-snug">도파민 지수</h3>
              <p className="text-[var(--text-secondary)] text-[13px] leading-relaxed">
                짧은 영상 소비 비율과 심야 시청 패턴으로 도파민 의존도를 측정합니다.
              </p>
            </div>

            {/* Card 4 — Wide (col-span-4) */}
            <div data-reveal className="md:col-span-4 card p-5">
              <div className="w-9 h-9 rounded-xl bg-[var(--rose-light)] flex items-center justify-center mb-5">
                <MessageCircle size={18}className="text-[var(--rose)]" />
              </div>
              <h3 className="text-base font-bold mb-1.5 leading-snug">Instagram DM 분석</h3>
              <p className="text-[var(--text-secondary)] text-[13px] leading-relaxed max-w-[50ch]">
                가장 많이 대화한 상대, 답장 속도, 활발한 시간대를 분석합니다.
                좋아요·스토리 반응·관심 주제까지 종합적으로 보여드립니다.
              </p>
            </div>

            {/* Card 5 (col-span-3) */}
            <div data-reveal className="md:col-span-3 card p-5">
              <div className="w-9 h-9 rounded-xl bg-cyan-50 flex items-center justify-center mb-5">
                <Users size={18}className="text-cyan-500" />
              </div>
              <h3 className="text-base font-bold mb-1.5 leading-snug">채널 · 계정 랭킹</h3>
              <p className="text-[var(--text-secondary)] text-[13px] leading-relaxed">
                가장 많이 시청한 YouTube 채널과 Instagram에서 가장 많이 소통한 계정을 순위로 보여드립니다.
              </p>
            </div>

            {/* Card 6 (col-span-3) */}
            <div data-reveal className="md:col-span-3 card p-5">
              <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center mb-5">
                <Search size={18}className="text-violet-500" />
              </div>
              <h3 className="text-base font-bold mb-1.5 leading-snug">검색 키워드 분석</h3>
              <p className="text-[var(--text-secondary)] text-[13px] leading-relaxed">
                YouTube 검색 기록에서 자주 찾는 키워드와 관심사 변화를 추적합니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative z-10 py-16 md:py-24 lg:py-28 border-t border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-6 sm:px-10 lg:px-16">
          <div className="text-center mb-16" data-reveal>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.15em] font-medium bg-[var(--accent-light)] text-[var(--accent)] mb-4">
              사용법
            </div>
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold leading-snug tracking-tight">
              3단계로 시작하세요
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6" data-reveal>
            {[
              {
                step: "01",
                title: "데이터 내보내기",
                desc: "Google Takeout에서 YouTube 기록을, Instagram에서 내 데이터를 다운로드하세요.",
              },
              {
                step: "02",
                title: "파일 업로드",
                desc: "다운로드한 JSON 또는 ZIP 파일을 WatchLens에 업로드하세요. 모든 처리는 실시간으로 진행됩니다.",
              },
              {
                step: "03",
                title: "인사이트 확인",
                desc: "시청 패턴, DM 분석, 도파민 지수 등 다양한 인사이트를 대시보드에서 확인하세요.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center md:text-left">
                <div className="text-3xl font-bold text-[var(--accent)] opacity-15 mb-3">{item.step}</div>
                <h3 className="text-[15px] font-bold mb-1.5 leading-snug">{item.title}</h3>
                <p className="text-[var(--text-secondary)] text-[13px] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-16 md:py-24 lg:py-28 bg-[var(--surface)] border-t border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-6 sm:px-10 lg:px-16">
          <div className="card px-8 py-12 md:py-20 text-center relative overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)]" data-reveal>
            {/* Background glow */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(circle at 50% 50%, rgba(59,130,246,0.06) 0%, transparent 60%)" }}
            />
            <div className="relative z-10">
              <h2 className="text-xl md:text-2xl lg:text-3xl font-bold leading-snug tracking-tight mb-3">
                지금 바로 시작해보세요
              </h2>
              <p className="text-[var(--text-secondary)] text-base leading-relaxed max-w-[45ch] mx-auto mb-8">
                당신의 데이터는 서버에 저장되지 않습니다.
                업로드하고, 분석하고, 나만의 인사이트를 발견하세요.
              </p>
              <Link
                to="/upload"
                className="group inline-flex items-center gap-2.5 bg-[var(--accent)] hover:opacity-90 text-white font-medium px-6 py-3 rounded-full text-sm active:scale-[0.98] hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(59,130,246,0.2)]"
                style={{ transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)" }}
              >
                분석 시작하기
                <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-1" style={{ transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)" }}>
                  <ArrowRight size={16} />
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 border-t border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-6 sm:px-10 lg:px-16">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-[var(--accent)] rounded-lg flex items-center justify-center">
                <Eye size={14} className="text-white" />
              </div>
              <span className="text-[14px] font-bold text-[var(--text-secondary)]">WatchLens</span>
            </div>
            <p className="text-[13px] text-[var(--text-tertiary)]">
              개인 프로젝트 · 데이터는 브라우저에서만 처리됩니다
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
