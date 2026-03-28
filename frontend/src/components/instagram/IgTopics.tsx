interface Props {
  data: any;
}

export function IgTopics({ data }: Props) {
  if (!data || !Array.isArray(data) || data.length === 0) return null;

  return (
    <div className="card p-5">
      <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-1">관심사 카테고리</h3>
      <p className="text-[12px] text-[var(--text-tertiary)] mb-4">Instagram이 추정한 관심사</p>
      <div className="flex flex-wrap gap-2">
        {data.map((topic: string, i: number) => (
          <span
            key={i}
            className="px-3 py-1.5 bg-[var(--accent-light)] text-[var(--accent)] text-[13px] rounded-full"
          >
            {topic}
          </span>
        ))}
      </div>
    </div>
  );
}
