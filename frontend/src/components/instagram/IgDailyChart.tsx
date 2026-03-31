import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  data: any;
}

export function IgDailyChart({ data }: Props) {
  if (!data || !Array.isArray(data) || data.length === 0) return null;

  return (
    <div className="card p-5">
      <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-4">일별 활동 트렌드</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.length >= 10 ? d.slice(5) : d} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Line type="monotone" dataKey="count" name="활동" stroke="var(--accent)" strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
