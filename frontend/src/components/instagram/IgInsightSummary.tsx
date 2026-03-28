interface Props {
  data: any;
}

export function IgInsightSummary({ data }: Props) {
  if (!data || !Array.isArray(data) || data.length === 0) return null;

  return (
    <div className="card p-5">
      <div className="space-y-2">
        {data.map((item: any, i: number) => (
          <p key={i} className="text-[14px] text-[var(--text-primary)] leading-relaxed">
            <span className="mr-2">{item.icon}</span>
            {item.text.split(/\*\*(.+?)\*\*/g).map((part: string, j: number) =>
              j % 2 === 1 ? <strong key={j}>{part}</strong> : part
            )}
          </p>
        ))}
      </div>
    </div>
  );
}
