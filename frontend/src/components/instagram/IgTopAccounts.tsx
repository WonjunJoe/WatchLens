import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface Props {
  data: any;
}

export function IgTopAccounts({ data }: Props) {
  if (!data || !Array.isArray(data) || data.length === 0) return null;

  return (
    <div className="card p-5">
      <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-4">Top 소통 계정</h3>
      <ResponsiveContainer width="100%" height={Math.max(300, data.length * 40)}>
        <BarChart data={data} layout="vertical" margin={{ left: 80, right: 20 }}>
          <XAxis type="number" tick={{ fontSize: 12 }} />
          <YAxis dataKey="username" type="category" tick={{ fontSize: 12 }} width={80} />
          <Tooltip />
          <Legend />
          <Bar dataKey="likes" name="좋아요" stackId="a" fill="var(--rose)" />
          <Bar dataKey="story_likes" name="스토리" stackId="a" fill="var(--amber)" />
          <Bar dataKey="messages" name="DM" stackId="a" fill="var(--accent)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
