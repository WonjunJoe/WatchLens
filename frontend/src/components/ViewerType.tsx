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

export function ViewerType({ data }: { data: ViewerTypeData | null | undefined }) {
  if (!data || data.code === "----") return null;

  return (
    <section className="card p-6 animate-fadeIn" role="region" aria-label="시청자 유형">
      <h2 className="text-[13px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-5">시청자 유형</h2>

      <div className="text-center mb-6">
        <div className="inline-flex gap-2 mb-3">
          {data.code.split("").map((c, i) => (
            <span
              key={i}
              className="w-10 h-10 bg-[var(--accent-light)] text-[var(--accent)] rounded-xl flex items-center justify-center text-[16px] font-extrabold border border-[var(--accent)]/10"
            >
              {c}
            </span>
          ))}
        </div>
        <h3 className="text-[22px] font-extrabold text-[var(--text-primary)] tracking-tight mb-1.5">{data.type_name}</h3>
        <p className="text-[13px] text-[var(--text-secondary)] max-w-sm mx-auto leading-relaxed">{data.description}</p>
      </div>

      <div className="space-y-4">
        {data.axes.map((axis) => {
          const pct = Math.round(axis.value * 100);
          return (
            <div key={axis.axis}>
              <div className="flex justify-between text-[11px] font-medium text-[var(--text-secondary)] mb-2">
                <span>{axis.left}</span>
                <span>{axis.right}</span>
              </div>
              <div className="h-2.5 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
