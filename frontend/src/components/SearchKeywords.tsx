interface KeywordCount {
  keyword: string;
  count: number;
}

export function SearchKeywords({ data }: { data: KeywordCount[] | null }) {
  if (!data || data.length === 0) return null;

  const max = data[0].count;

  return (
    <section className="bg-[var(--bg-white)] border border-[var(--border-default)] rounded-[16px] p-5 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:-translate-y-[2px] transition-all duration-200">
      <h2 className="text-[15px] font-medium text-[var(--text-primary)] mb-4">검색 키워드</h2>
      <div className="flex flex-wrap gap-2">
        {data.map((kw) => {
          const ratio = kw.count / max;
          const size =
            ratio > 0.7 ? "text-base font-medium" :
            ratio > 0.4 ? "text-sm font-medium" :
            "text-xs font-medium";
          const bg =
            ratio > 0.7 ? "bg-[var(--lavender-light)] text-[var(--lavender-text)]" :
            ratio > 0.4 ? "bg-[var(--mint-light)] text-[var(--mint-text)]" :
            "bg-[var(--sky-light)] text-[var(--sky-text)]";
          return (
            <span
              key={kw.keyword}
              className={`inline-block px-3 py-1.5 rounded-full ${size} ${bg}`}
              title={`${kw.count}회`}
            >
              {kw.keyword}
            </span>
          );
        })}
      </div>
    </section>
  );
}
