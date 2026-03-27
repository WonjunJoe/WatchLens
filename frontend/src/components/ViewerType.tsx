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

function AxisBar({ axis }: { axis: Axis }) {
  const pct = Math.round(axis.value * 100);
  const isRight = axis.pick === axis.pick.toUpperCase() && ["N", "S", "B", "F"].includes(axis.pick);

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[11px]">
        <span className={!isRight ? "font-medium text-[var(--lavender-text)]" : "text-[var(--text-tertiary)]"}>{axis.left}</span>
        <span className={isRight ? "font-medium text-[var(--lavender-text)]" : "text-[var(--text-tertiary)]"}>{axis.right}</span>
      </div>
      <div className="relative h-2 bg-[var(--bg-base)] rounded-full overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full bg-[var(--lavender)] rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-[var(--text-tertiary)] text-center">{pct}%</p>
    </div>
  );
}

export function ViewerType({ data }: { data: ViewerTypeData | null }) {
  if (!data || data.code === "----") return null;

  return (
    <section className="bg-[var(--bg-white)] border border-[var(--border-default)] rounded-[16px] p-5 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:-translate-y-[2px] transition-all duration-200">
      <h2 className="text-[15px] font-medium text-[var(--text-primary)] mb-4">나의 시청 유형</h2>

      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1 px-4 py-2 bg-[var(--lavender-light)] rounded-full mb-3">
          {data.code.split("").map((c, i) => (
            <span key={i} className="w-8 h-8 bg-[var(--lavender)] text-[var(--lavender-text)] rounded-[10px] flex items-center justify-center text-sm font-medium">
              {c}
            </span>
          ))}
        </div>
        <p className="text-xl font-medium text-[var(--text-primary)]">{data.type_name}</p>
        <p className="text-sm text-[var(--text-tertiary)] mt-1.5 max-w-md mx-auto">{data.description}</p>
      </div>

      <div className="space-y-4 max-w-sm mx-auto">
        {data.axes.map((axis) => (
          <AxisBar key={axis.axis} axis={axis} />
        ))}
      </div>
    </section>
  );
}
