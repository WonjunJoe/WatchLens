import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  data: any;
}

export function IgHourlyChart({ data }: Props) {
  if (!data || !Array.isArray(data)) return null;

  return (
    <div className="card p-5">
      <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-4">시간대별 활동</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <XAxis dataKey="hour" tick={{ fontSize: 11 }} tickFormatter={(h) => `${h}시`} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip labelFormatter={(h) => `${h}시`} />
          <Bar dataKey="count" name="활동" fill="var(--accent)" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
