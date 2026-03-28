interface ChannelCount { channel_name: string; count: number; }
interface TopChannelsSplit { longform: ChannelCount[]; shorts: ChannelCount[]; }

function ChannelList({ title, data, color }: { title: string; data: ChannelCount[]; color: string }) {
  if (data.length === 0) return null;
  const max = data[0]?.count || 1;

  return (
    <div>
      <h3 className="text-[13px] font-medium text-[var(--text-secondary)] mb-3">{title}</h3>
      <div className="space-y-2.5">
        {data.slice(0, 5).map((ch, i) => (
          <div key={ch.channel_name} className="flex items-center gap-3">
            <span className={`w-6 h-6 rounded text-[12px] font-semibold flex items-center justify-center flex-shrink-0 ${
              i === 0 ? "bg-[var(--amber-light)] text-[var(--amber)]" : "bg-gray-100 text-[var(--text-secondary)]"
            }`}>
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[14px] text-[var(--text-primary)] truncate">{ch.channel_name}</span>
                <span className="text-[13px] text-[var(--text-secondary)] ml-2 flex-shrink-0">{ch.count}회</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${(ch.count / max) * 100}%`, backgroundColor: color }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TopChannels({ data }: { data: TopChannelsSplit | null }) {
  if (!data) return null;

  return (
    <section className="card p-5">
      <h2 className="text-[15px] font-semibold text-[var(--text-primary)] mb-5">인기 채널</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChannelList title="일반 영상" data={data.longform} color="#6366F1" />
        <ChannelList title="Shorts" data={data.shorts} color="#F43F5E" />
      </div>
    </section>
  );
}
