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

export function ViewerType({ data }: { data: ViewerTypeData | null }) {
  if (!data || data.code === "----") return null;

  return (
    <section className="card p-5">
      <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-5">시청자 유형</h2>

      <div className="text-center mb-6">
        <div className="inline-flex gap-1.5 mb-3">
          {data.code.split("").map((c, i) => (
            <span
              key={i}
              className="w-9 h-9 bg-[var(--accent-light)] text-[var(--accent)] rounded-lg flex items-center justify-center text-[15px] font-bold"
            >
              {c}
            </span>
          ))}
        </div>
        <h3 className="text-[22px] font-bold text-[var(--text-primary)] mb-1">{data.type_name}</h3>
        <p className="text-[14px] text-[var(--text-secondary)] max-w-sm mx-auto">{data.description}</p>
      </div>

      <div className="space-y-4">
        {data.axes.map((axis) => {
          const pct = Math.round(axis.value * 100);
          return (
            <div key={axis.axis}>
              <div className="flex justify-between text-[12px] text-[var(--text-secondary)] mb-1.5">
                <span>{axis.left}</span>
                <span>{axis.right}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] rounded-full transition-all"
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
