import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  data: any;
}

export function IgFollowNetwork({ data }: Props) {
  if (!data) return null;

  const growth = data.monthly_growth ?? [];
  const unfollowed = data.recent_unfollowed ?? [];

  return (
    <div className="card p-5">
      <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-4">팔로잉 네트워크 성장</h3>

      {growth.length > 0 && (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={growth}>
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="cumulative" name="누적 팔로잉" stroke="var(--green)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}

      {unfollowed.length > 0 && (
        <div className="mt-4">
          <h4 className="text-[13px] font-medium text-[var(--text-secondary)] mb-2">최근 언팔로우</h4>
          <div className="flex flex-wrap gap-2">
            {unfollowed.map((u: any) => (
              <span key={u.username} className="px-2 py-1 bg-gray-100 text-[12px] text-[var(--text-secondary)] rounded">
                @{u.username}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
