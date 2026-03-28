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
            <span dangerouslySetInnerHTML={{ __html: item.text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }} />
          </p>
        ))}
      </div>
    </div>
  );
}
