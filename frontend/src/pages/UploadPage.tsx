import { useState } from "react";
import { FileUploader } from "../components/FileUploader";
import { UploadResultCard, type UploadResult } from "../components/UploadResultCard";

export function UploadPage() {
  const [watchResult, setWatchResult] = useState<UploadResult | null>(null);
  const [searchResult, setSearchResult] = useState<UploadResult | null>(null);

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-2">WatchLens</h1>
      <p className="text-gray-600 mb-8">
        Google Takeout에서 다운로드한 YouTube 데이터를 업로드하세요.
      </p>

      <div className="space-y-6">
        <FileUploader
          label="시청 기록 (watch-history.json)"
          accept=".json"
          endpoint="/api/upload/watch-history"
          onResult={(data) => setWatchResult({ type: "watch", ...data })}
        />

        <FileUploader
          label="검색 기록 (search-history.json)"
          accept=".json"
          endpoint="/api/upload/search-history"
          onResult={(data) => setSearchResult({ type: "search", ...data })}
        />
      </div>

      {(watchResult || searchResult) && (
        <div className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold">업로드 결과</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {watchResult && <UploadResultCard result={watchResult} />}
            {searchResult && <UploadResultCard result={searchResult} />}
          </div>
        </div>
      )}
    </div>
  );
}
