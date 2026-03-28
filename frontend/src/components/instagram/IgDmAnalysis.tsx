import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  data: any;
}

export function IgDmAnalysis({ data }: Props) {
  if (!data) return null;

  const total = (data.sent ?? 0) + (data.received ?? 0);
  const sentPct = total > 0 ? Math.round((data.sent / total) * 100) : 0;

  return (
    <div className="card p-5">
      <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-4">DM 활동 분석</h3>

      {/* Sent/Received ratio bar */}
      <div className="mb-6">
        <div className="flex justify-between text-[12px] text-[var(--text-secondary)] mb-1">
          <span>보낸 메시지 ({sentPct}%)</span>
          <span>받은 메시지 ({100 - sentPct}%)</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
          <div className="h-full bg-[var(--accent)]" style={{ width: `${sentPct}%` }} />
          <div className="h-full bg-[var(--amber)]" style={{ width: `${100 - sentPct}%` }} />
        </div>
      </div>

      {/* Top conversations */}
      {data.top_conversations && data.top_conversations.length > 0 && (
        <>
          <h4 className="text-[13px] font-medium text-[var(--text-secondary)] mb-3">Top 대화 상대</h4>
          <ResponsiveContainer width="100%" height={Math.max(200, data.top_conversations.length * 35)}>
            <BarChart data={data.top_conversations} layout="vertical" margin={{ left: 100, right: 20 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="conversation" type="category" tick={{ fontSize: 11 }} width={100} />
              <Tooltip />
              <Bar dataKey="count" name="메시지" fill="var(--accent)" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
}
