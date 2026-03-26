import { useStats } from "../hooks/useStats";

interface KeywordCount {
  keyword: string;
  count: number;
}

export function SearchKeywords() {
  const { data, loading, error } = useStats<KeywordCount[]>("/api/stats/search-keywords");

  if (loading) return <p className="text-gray-400">검색어 로딩 중...</p>;
  if (error) return <p className="text-red-500">오류: {error}</p>;
  if (!data || data.length === 0) return null;

  const max = data[0].count;

  return (
    <section>
      <h2 className="text-lg font-semibold mb-4">검색 키워드</h2>
      <div className="bg-white rounded-xl shadow p-5">
        <div className="flex flex-wrap gap-2">
          {data.map((kw) => {
            const ratio = kw.count / max;
            const size =
              ratio > 0.7 ? "text-xl font-bold" :
              ratio > 0.4 ? "text-base font-semibold" :
              "text-sm";
            const opacity =
              ratio > 0.7 ? "opacity-100" :
              ratio > 0.4 ? "opacity-80" :
              "opacity-60";
            return (
              <span
                key={kw.keyword}
                className={`inline-block px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full ${size} ${opacity}`}
                title={`${kw.count}회`}
              >
                {kw.keyword}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}
