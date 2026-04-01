import { Clock } from "lucide-react";

interface Equivalent {
  label: string;
  value: number;
  unit: string;
  desc: string;
}

interface Props {
  data: {
    total_hours: number;
    equivalents: Equivalent[];
  } | null | undefined;
}

export function TimeCost({ data }: Props) {
  if (!data || data.total_hours === 0) return null;

  return (
    <section className="card p-6 animate-fadeIn" role="region" aria-label="시간 환산">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-[13px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">시간 비용 환산</h2>
      </div>

      <div className="flex items-center gap-3 mb-5 p-3 rounded-lg" style={{ backgroundColor: "var(--accent-light)" }}>
        <Clock size={20} style={{ color: "var(--accent)" }} />
        <div>
          <p className="text-[13px] text-[var(--text-secondary)]">총 시청 시간으로 이만큼 할 수 있었어요</p>
          <p className="text-[20px] font-bold text-[var(--accent)]">
            {data.total_hours}<span className="text-[13px] text-[var(--text-tertiary)] ml-1">시간</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {data.equivalents.map((eq) => (
          <div key={eq.label} className="p-3.5 bg-[var(--bg)] rounded-xl border border-[var(--border)] text-center">
            <p className="text-[24px] font-extrabold text-[var(--text-primary)] tracking-tight">
              {eq.value}<span className="text-[12px] font-semibold text-[var(--text-tertiary)] ml-0.5">{eq.unit}</span>
            </p>
            <p className="text-[12px] font-semibold text-[var(--text-secondary)] mt-1">{eq.label}</p>
            <p className="text-[10px] font-medium text-[var(--text-tertiary)]">{eq.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
