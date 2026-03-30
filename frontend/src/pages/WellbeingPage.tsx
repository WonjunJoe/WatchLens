import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Loader2, AlertCircle } from "lucide-react";
import { API_BASE } from "../config";

interface WellbeingDetail {
  score: number;
  label: string;
  desc: string;
  grade?: string;
}

interface WellbeingResult {
  score: number;
  grade: string;
  available: boolean;
  yt_available?: boolean;
  ig_available?: boolean;
  details: Record<string, WellbeingDetail>;
}

function gradeColor(grade: string) {
  if (grade === "매우 건강") return "var(--green)";
  if (grade === "양호") return "#22C55E";
  if (grade === "주의") return "var(--amber)";
  if (grade === "경고") return "#F97316";
  return "var(--rose)";
}

function scoreRing(score: number, color: string) {
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;
  return (
    <svg width="140" height="140" viewBox="0 0 120 120">
      <circle cx="60" cy="60" r="54" fill="none" stroke="#F3F4F6" strokeWidth="8" />
      <circle
        cx="60" cy="60" r="54" fill="none" stroke={color} strokeWidth="8"
        strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
        transform="rotate(-90 60 60)"
        style={{ transition: "stroke-dashoffset 1s ease" }}
      />
      <text x="60" y="55" textAnchor="middle" className="text-[28px] font-bold" fill="var(--text-primary)">{score}</text>
      <text x="60" y="72" textAnchor="middle" className="text-[12px]" fill="var(--text-tertiary)">/ 100</text>
    </svg>
  );
}

function getGradeLabel(score: number, thresholds: [number, string][]): string {
  for (const [min, label] of thresholds) {
    if (score >= min) return label;
  }
  return thresholds[thresholds.length - 1][1];
}

function DetailCard({ detail, color }: { detail: WellbeingDetail; color: string }) {
  const barWidth = Math.min(100, detail.score);
  const grade = getGradeLabel(detail.score, [[60, "경고"], [30, "주의"], [0, "양호"]]);
  return (
    <div className="p-4 bg-gray-50 rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] font-medium text-[var(--text-primary)]">{detail.label}</span>
        <span className="text-[13px] font-bold" style={{ color }}>{detail.score} <span className="text-[11px] font-medium">{grade}</span></span>
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-1.5">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${barWidth}%`, backgroundColor: color }} />
      </div>
      <p className="text-[11px] text-[var(--text-tertiary)]">{detail.desc}</p>
    </div>
  );
}

export function WellbeingPage() {
  const [result, setResult] = useState<WellbeingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function compute() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/api/wellbeing/compute`);
        const data = await res.json();
        setResult(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    compute();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="text-[var(--accent)] animate-spin mb-4" />
        <p className="text-[14px] text-[var(--text-secondary)]">웰빙 점수 계산 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="card p-8 text-center max-w-sm">
          <AlertCircle size={32} className="mx-auto mb-4 text-[var(--rose)]" />
          <p className="text-[14px] text-[var(--text-secondary)]">{error}</p>
        </div>
      </div>
    );
  }

  if (!result || !result.available) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="card p-8 text-center max-w-md">
          <Heart size={32} className="mx-auto mb-4 text-[var(--text-tertiary)]" />
          <p className="text-[16px] font-semibold text-[var(--text-primary)] mb-2">데이터가 필요합니다</p>
          <p className="text-[14px] text-[var(--text-secondary)] mb-6">
            YouTube 또는 Instagram 대시보드를 먼저 생성해주세요.
          </p>
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-[14px] font-medium hover:opacity-90 transition-opacity"
          >
            업로드하러 가기
          </Link>
        </div>
      </div>
    );
  }

  const color = gradeColor(result.grade);
  const details = result.details;

  return (
    <div className="pb-12">
      <header className="mb-8">
        <h1 className="text-[24px] font-bold text-[var(--text-primary)] mb-1">디지털 웰빙</h1>
        <p className="text-[14px] text-[var(--text-secondary)]">YouTube + Instagram 통합 분석</p>
      </header>

      {/* Main Score */}
      <div className="card p-8 mb-6 text-center">
        <div className="inline-block mb-4">
          {scoreRing(result.score, color)}
        </div>
        <p className="text-[20px] font-bold mb-1" style={{ color }}>{result.grade}</p>
        <p className="text-[13px] text-[var(--text-tertiary)]">
          {result.score >= 80 && "건강한 디지털 습관을 유지하고 있습니다."}
          {result.score >= 60 && result.score < 80 && "전반적으로 양호하지만 개선할 부분이 있습니다."}
          {result.score >= 40 && result.score < 60 && "몇 가지 습관에 주의가 필요합니다."}
          {result.score < 40 && "디지털 사용 패턴을 돌아볼 필요가 있습니다."}
        </p>

        {/* Platform availability badges */}
        <div className="flex items-center justify-center gap-3 mt-4">
          <span className={`text-[12px] px-2 py-1 rounded-full ${result.yt_available ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-400"}`}>
            YouTube {result.yt_available ? "O" : "X"}
          </span>
          <span className={`text-[12px] px-2 py-1 rounded-full ${result.ig_available ? "bg-pink-50 text-pink-600" : "bg-gray-100 text-gray-400"}`}>
            Instagram {result.ig_available ? "O" : "X"}
          </span>
        </div>
      </div>

      {/* Detail Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {details.dopamine && (
          <DetailCard detail={details.dopamine} color={details.dopamine.score >= 60 ? "var(--rose)" : details.dopamine.score >= 30 ? "var(--amber)" : "var(--green)"} />
        )}
        {details.binge && (
          <DetailCard detail={details.binge} color={details.binge.score >= 50 ? "var(--rose)" : details.binge.score >= 25 ? "var(--amber)" : "var(--green)"} />
        )}
        {details.watch_intensity && (
          <DetailCard detail={details.watch_intensity} color={details.watch_intensity.score >= 60 ? "var(--rose)" : details.watch_intensity.score >= 30 ? "var(--amber)" : "var(--green)"} />
        )}
        {details.lurker && (
          <DetailCard detail={details.lurker} color={details.lurker.score >= 70 ? "var(--rose)" : details.lurker.score >= 40 ? "var(--amber)" : "var(--green)"} />
        )}
        {details.late_night && (
          <DetailCard detail={details.late_night} color={details.late_night.score >= 50 ? "var(--rose)" : details.late_night.score >= 25 ? "var(--amber)" : "var(--green)"} />
        )}
      </div>
    </div>
  );
}
