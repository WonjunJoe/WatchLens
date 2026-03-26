import { useStats } from "../hooks/useStats";

interface ChannelCount {
  channel_name: string;
  count: number;
}

interface TopChannelsSplit {
  longform: ChannelCount[];
  shorts: ChannelCount[];
}

function ChannelBar({ data, color }: { data: ChannelCount[]; color: string }) {
  if (data.length === 0) return <p className="text-sm text-gray-400">데이터 없음</p>;
  const max = data[0].count;

  return (
    <div className="space-y-3">
      {data.map((ch, i) => (
        <div key={ch.channel_name} className="flex items-center gap-3">
          <span className="w-6 text-right text-sm text-gray-400 font-mono">
            {i + 1}
          </span>
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium truncate">{ch.channel_name}</span>
              <span className="text-gray-500">{ch.count}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${color}`}
                style={{ width: `${(ch.count / max) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TopChannels() {
  const { data, loading, error } = useStats<TopChannelsSplit>("/api/stats/top-channels");

  if (loading) return <p className="text-gray-400">채널 로딩 중...</p>;
  if (error) return <p className="text-red-500">오류: {error}</p>;
  if (!data) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold mb-4">Top 채널</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow p-5">
          <p className="text-sm font-medium text-gray-600 mb-4">일반 영상 (롱폼)</p>
          <ChannelBar data={data.longform} color="bg-indigo-500" />
        </div>
        <div className="bg-white rounded-xl shadow p-5">
          <p className="text-sm font-medium text-gray-600 mb-4">Shorts</p>
          <ChannelBar data={data.shorts} color="bg-violet-500" />
        </div>
      </div>
    </section>
  );
}
