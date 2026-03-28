import { Play, Search } from "lucide-react";

interface WatchResult { type: "watch"; total: number; skipped: number; period: string; }
interface SearchResult { type: "search"; total: number; skipped: number; period: string; }
type UploadResult = WatchResult | SearchResult;

export function UploadResultCard({ result }: { result: UploadResult }) {
  const isWatch = result.type === "watch";

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
          isWatch ? "bg-[var(--accent-light)]" : "bg-[var(--green-light)]"
        }`}>
          {isWatch
            ? <Play size={12} className="text-[var(--accent)]" />
            : <Search size={12} className="text-[var(--green)]" />
          }
        </div>
        <p className="text-[14px] font-medium text-[var(--text-primary)]">
          {isWatch ? "시청 기록" : "검색 기록"} 업로드 완료
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center p-3 bg-[var(--bg)] rounded-lg">
          <p className="text-[18px] font-semibold text-[var(--text-primary)]">{result.total.toLocaleString()}</p>
          <p className="text-[11px] text-[var(--text-tertiary)]">저장된 레코드</p>
        </div>
        <div className="text-center p-3 bg-[var(--bg)] rounded-lg">
          <p className="text-[13px] font-medium text-[var(--text-primary)]">{result.period}</p>
          <p className="text-[11px] text-[var(--text-tertiary)]">기간</p>
        </div>
      </div>
    </div>
  );
}

export type { UploadResult, WatchResult, SearchResult };
