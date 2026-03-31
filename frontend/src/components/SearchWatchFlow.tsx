import { Search, ArrowRight, XCircle } from "lucide-react";

interface ConvertItem {
  query: string;
  searches: number;
  converted: number;
  rate: number;
}

interface AbandonItem {
  query: string;
  searches: number;
  converted: number;
  abandon_rate: number;
}

interface Props {
  data: {
    total_searches: number;
    total_watches: number;
    conversion_rate: number;
    top_converting: ConvertItem[];
    top_abandoned: AbandonItem[];
  } | null | undefined;
}

export function SearchWatchFlow({ data }: Props) {
  if (!data || data.total_searches === 0) return null;

  return (
    <section className="card p-5 animate-fadeIn" role="region" aria-label="검색-시청 전환">
      <div className="flex items-center gap-2 mb-4">
        <Search size={16} className="text-[var(--accent)]" />
        <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">검색 → 시청 전환</h2>
      </div>

      {/* Summary */}
      <div className="flex gap-4 mb-5">
        <div className="flex-1 p-3 bg-gray-50 rounded-lg text-center">
          <p className="text-[11px] text-[var(--text-tertiary)] mb-1">총 검색</p>
          <p className="text-[20px] font-bold text-[var(--text-primary)]">{data.total_searches.toLocaleString()}</p>
        </div>
        <div className="flex-1 p-3 bg-gray-50 rounded-lg text-center">
          <p className="text-[11px] text-[var(--text-tertiary)] mb-1">전환율</p>
          <p className="text-[20px] font-bold text-[var(--accent)]">{data.conversion_rate}%</p>
        </div>
      </div>

      {/* Top converting */}
      {data.top_converting.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <ArrowRight size={12} className="text-[var(--green)]" />
            <p className="text-[12px] font-medium text-[var(--text-secondary)]">시청으로 이어진 검색</p>
          </div>
          <div className="space-y-2">
            {data.top_converting.map((item) => (
              <div key={item.query} className="flex items-center justify-between">
                <span className="text-[13px] text-[var(--text-secondary)] truncate max-w-[55%]">"{item.query}"</span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[var(--text-tertiary)]">{item.searches}회</span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded font-medium bg-[var(--green)]/10 text-[var(--green)]">
                    {item.rate}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top abandoned */}
      {data.top_abandoned.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <XCircle size={12} className="text-[var(--rose)]" />
            <p className="text-[12px] font-medium text-[var(--text-secondary)]">검색만 하고 안 본 키워드</p>
          </div>
          <div className="space-y-2">
            {data.top_abandoned.map((item) => (
              <div key={item.query} className="flex items-center justify-between">
                <span className="text-[13px] text-[var(--text-secondary)] truncate max-w-[55%]">"{item.query}"</span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[var(--text-tertiary)]">{item.searches}회</span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded font-medium bg-[var(--rose)]/10 text-[var(--rose)]">
                    이탈 {item.abandon_rate}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
