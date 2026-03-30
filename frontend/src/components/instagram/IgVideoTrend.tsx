import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import { TOOLTIP_STYLE, AXIS_TICK } from "../../utils/chartConfig";

interface Props {
  data: {
    trend: { month: string; posts: number; videos: number; video_pct: number }[];
    total_posts: number;
    total_videos: number;
    first_video_pct: number;
    last_video_pct: number;
    change_pct: number;
  } | null;
}

export function IgVideoTrend({ data }: Props) {
  if (!data || data.trend.length < 2) return null;

  const increasing = data.change_pct > 0;
  const color = increasing ? "var(--rose)" : "var(--green)";
  const Icon = increasing ? TrendingUp : TrendingDown;

  return (
    <section className="card p-5 animate-fadeIn">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">릴스/동영상 소비 트렌드</h2>
        <div className="flex items-center gap-1.5" style={{ color }}>
          <Icon size={14} />
          <span className="text-[13px] font-medium">{data.change_pct > 0 ? "+" : ""}{data.change_pct}%p</span>
        </div>
      </div>

      <div className="flex gap-4 mb-5">
        <div className="flex-1 p-3 bg-gray-50 rounded-lg">
          <p className="text-[11px] text-[var(--text-tertiary)] mb-1">게시물 조회</p>
          <p className="text-[20px] font-bold text-[var(--text-primary)]">
            {data.total_posts.toLocaleString()}<span className="text-[11px] text-[var(--text-tertiary)] ml-0.5">건</span>
          </p>
        </div>
        <div className="flex-1 p-3 bg-gray-50 rounded-lg">
          <p className="text-[11px] text-[var(--text-tertiary)] mb-1">동영상/릴스</p>
          <p className="text-[20px] font-bold" style={{ color }}>
            {data.total_videos.toLocaleString()}<span className="text-[11px] text-[var(--text-tertiary)] ml-0.5">건</span>
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data.trend}>
          <XAxis dataKey="month" tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <YAxis yAxisId="left" tick={AXIS_TICK} tickLine={false} axisLine={false} width={35} />
          <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK} tickLine={false} axisLine={false} width={35} domain={[0, 100]} />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any, name: string) => {
            if (name === "video_pct") return [`${v}%`, "동영상 비율"];
            if (name === "videos") return [`${v}건`, "동영상"];
            return [`${v}건`, "게시물"];
          }} />
          <Legend formatter={(value) => {
            if (value === "video_pct") return "동영상 비율 (%)";
            if (value === "videos") return "동영상";
            return "게시물";
          }} wrapperStyle={{ fontSize: "12px" }} />
          <Line yAxisId="left" type="monotone" dataKey="posts" stroke="var(--accent)" strokeWidth={2} dot={false} />
          <Line yAxisId="left" type="monotone" dataKey="videos" stroke="var(--rose)" strokeWidth={2} dot={false} />
          <Line yAxisId="right" type="monotone" dataKey="video_pct" stroke="var(--amber)" strokeWidth={2} dot={false} strokeDasharray="4 4" />
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}
