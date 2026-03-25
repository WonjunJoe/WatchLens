interface WatchResult {
  type: "watch";
  total: number;
  skipped: number;
  shorts: number;
  period: string;
  original_file_stored: boolean;
}

interface SearchResult {
  type: "search";
  total: number;
  skipped: number;
  period: string;
  original_file_stored: boolean;
}

type UploadResult = WatchResult | SearchResult;

export function UploadResultCard({ result }: { result: UploadResult }) {
  return (
    <div className="border rounded-lg p-6 bg-white shadow-sm">
      <h3 className="text-lg font-semibold mb-4">
        {result.type === "watch" ? "시청 기록" : "검색 기록"} 업로드 완료
      </h3>
      <div className="space-y-2 text-sm">
        <p>저장된 레코드: <span className="font-bold">{result.total.toLocaleString()}건</span></p>
        <p>스킵된 레코드: <span className="font-bold">{result.skipped}건</span></p>
        {result.type === "watch" && (
          <p>Shorts 영상: <span className="font-bold">{result.shorts}건</span></p>
        )}
        <p>기간: <span className="font-bold">{result.period}</span></p>
        <p>원본 백업: {result.original_file_stored ? "O" : "X"}</p>
      </div>
    </div>
  );
}

export type { UploadResult, WatchResult, SearchResult };
