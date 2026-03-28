import { useState, useMemo } from "react";

interface PeriodSelectorProps {
  dateFrom: string;
  dateTo: string;
  totalDays: number;
  onSelect: (from: string, to: string) => void;
}

type Mode = "recent30" | "full" | "custom";

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function PeriodSelector({ dateFrom, dateTo, totalDays, onSelect }: PeriodSelectorProps) {
  const [mode, setMode] = useState<Mode>("recent30");
  const [customFrom, setCustomFrom] = useState(dateFrom);
  const [customTo, setCustomTo] = useState(dateTo);

  const recent30From = useMemo(() => addDays(dateTo, -29), [dateTo]);
  const hasEnoughFor30 = totalDays > 30;

  const selectedRange = useMemo(() => {
    if (mode === "recent30") return { from: recent30From, to: dateTo };
    if (mode === "full") return { from: dateFrom, to: dateTo };
    return { from: customFrom, to: customTo };
  }, [mode, recent30From, dateTo, dateFrom, customFrom, customTo]);

  const options: { key: Mode; label: string; desc: string }[] = [
    {
      key: "recent30",
      label: "최근 30일",
      desc: hasEnoughFor30 ? `${recent30From} ~ ${dateTo}` : "데이터 30일 미만 — 전체와 동일",
    },
    {
      key: "full",
      label: "전체 기간",
      desc: `${dateFrom} ~ ${dateTo} (${totalDays}일)`,
    },
    {
      key: "custom",
      label: "직접 선택",
      desc: "원하는 기간을 지정합니다",
    },
  ];

  return (
    <div>
      <h2 className="text-[16px] font-semibold text-[var(--text-primary)] mb-1">분석 기간 선택</h2>
      <p className="text-[14px] text-[var(--text-secondary)] mb-5">
        {dateFrom} ~ {dateTo} 범위의 {totalDays}일간 데이터
      </p>

      <div className="space-y-2 mb-6">
        {options.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setMode(opt.key)}
            className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
              mode === opt.key
                ? "border-[var(--accent)] bg-[var(--accent-light)]"
                : "border-[var(--border)] hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                mode === opt.key ? "border-[var(--accent)]" : "border-gray-300"
              }`}>
                {mode === opt.key && <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />}
              </div>
              <div>
                <p className="text-[14px] font-medium text-[var(--text-primary)]">{opt.label}</p>
                <p className="text-[12px] text-[var(--text-tertiary)] mt-0.5">{opt.desc}</p>
              </div>
            </div>

            {opt.key === "custom" && mode === "custom" && (
              <div className="flex gap-3 mt-3 ml-7" onClick={(e) => e.stopPropagation()}>
                <input
                  type="date"
                  value={customFrom}
                  min={dateFrom}
                  max={dateTo}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[var(--accent)]"
                />
                <span className="text-[var(--text-tertiary)] self-center">~</span>
                <input
                  type="date"
                  value={customTo}
                  min={customFrom}
                  max={dateTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            )}
          </button>
        ))}
      </div>

      <button
        onClick={() => onSelect(selectedRange.from, selectedRange.to)}
        className="w-full py-3 bg-[var(--accent)] text-white rounded-lg font-medium text-[14px] hover:opacity-90 transition-opacity"
      >
        분석 시작하기
      </button>
    </div>
  );
}
