interface ChannelCount { channel_name: string; count: number; }
interface TopChannelsSplit { longform: ChannelCount[]; shorts: ChannelCount[]; }

function ChannelList({ data, color }: { data: ChannelCount[]; color: string }) {
  if (data.length === 0) return <p className="text-[12px] text-[var(--text-tertiary)] leading-[1.4]">데이터 없음</p>;
  const max = data[0].count;

  return (
    <div className="space-y-2.5">
      {data.map((ch, i) => (
        <div key={ch.channel_name} className="flex items-center gap-2.5">
          <span className="w-5 text-right text-[11px] text-[var(--text-tertiary)]">{i + 1}</span>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between text-[12px] mb-1">
              <span className="font-medium text-[var(--text-secondary)] truncate">{ch.channel_name}</span>
              <span className="text-[var(--text-tertiary)] flex-shrink-0 ml-2">{ch.count}</span>
            </div>
            <div className="h-1 bg-[var(--bg-base)] rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${color}`} style={{ width: `${(ch.count / max) * 100}%` }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TopChannels({ data }: { data: TopChannelsSplit | null }) {
  if (!data) return null;

  return (
    <section className="bg-[var(--bg-white)] border border-[var(--border-default)] rounded-[16px] p-5 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:-translate-y-[2px] transition-all duration-200">
      <h2 className="text-[15px] font-medium text-[var(--text-primary)] mb-4">Top 채널</h2>
      <div className="space-y-6">
        <div>
          <p className="text-[12px] font-medium text-[var(--text-tertiary)] leading-[1.4] mb-3">일반 영상</p>
          <ChannelList data={data.longform} color="bg-[var(--lavender)]" />
        </div>
        <div className="h-px bg-[var(--border-default)]" />
        <div>
          <p className="text-[12px] font-medium text-[var(--text-tertiary)] leading-[1.4] mb-3">Shorts</p>
          <ChannelList data={data.shorts} color="bg-[var(--mint)]" />
        </div>
      </div>
    </section>
  );
}
