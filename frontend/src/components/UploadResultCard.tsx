import { Play, Search } from "lucide-react";

interface WatchResult { type: "watch"; total: number; skipped: number; period: string; }
interface SearchResult { type: "search"; total: number; skipped: number; period: string; }
type UploadResult = WatchResult | SearchResult;

export function UploadResultCard({ result }: { result: UploadResult }) {
  const isWatch = result.type === "watch";

  return (
    <div className="bg-[var(--bg-white)] border border-[var(--border-default)] rounded-[16px] p-5 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:-translate-y-[2px] transition-all duration-200">
      <div className="flex items-center gap-2.5 mb-4">
        <div className={`w-8 h-8 rounded-[12px] flex items-center justify-center ${isWatch ? "bg-[var(--lavender-light)]" : "bg-[var(--sky-light)]"}`}>
          {isWatch ? <Play size={14} className="text-[var(--lavender-text)]" /> : <Search size={14} className="text-[var(--sky-text)]" />}
        </div>
        <p className="text-[14px] font-medium text-[var(--text-primary)]">
          {isWatch ? "시청 기록" : "검색 기록"} 업로드 완료
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center p-3 bg-[var(--bg-base)] rounded-[12px]">
          <p className="text-[18px] font-medium text-[var(--text-primary)]">{result.total.toLocaleString()}</p>
          <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">저장된 레코드</p>
        </div>
        <div className="text-center px-4 py-3 bg-[var(--bg-base)] rounded-[12px]">
          <p className="text-[13px] font-medium text-[var(--text-primary)] whitespace-nowrap">{result.period}</p>
          <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">기간</p>
        </div>
      </div>
    </div>
  );
}

export type { UploadResult, WatchResult, SearchResult };
