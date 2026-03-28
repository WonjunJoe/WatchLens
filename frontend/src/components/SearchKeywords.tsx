interface KeywordCount {
  keyword: string;
  count: number;
}

export function SearchKeywords({ data }: { data: KeywordCount[] | null }) {
  if (!data || data.length === 0) return null;

  const max = data[0].count;

  return (
    <section className="card p-5">
      <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-4">검색 키워드</h2>
      <div className="flex flex-wrap gap-2">
        {data.map((kw) => {
          const ratio = kw.count / max;
          const size = ratio > 0.7 ? "text-[14px] font-medium" : ratio > 0.4 ? "text-[13px]" : "text-[12px]";
          const bg = ratio > 0.7
            ? "bg-[var(--accent-light)] text-[var(--accent)]"
            : ratio > 0.4
            ? "bg-[var(--green-light)] text-[var(--green)]"
            : "bg-gray-100 text-[var(--text-secondary)]";
          return (
            <span key={kw.keyword} className={`inline-block px-3 py-1 rounded-full ${size} ${bg}`} title={`${kw.count}회`}>
              {kw.keyword}
            </span>
          );
        })}
      </div>
    </section>
  );
}
