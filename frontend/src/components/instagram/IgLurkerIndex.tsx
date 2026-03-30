import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { EyeOff } from "lucide-react";
import { TOOLTIP_STYLE, AXIS_TICK } from "../../utils/chartConfig";

interface Props {
  data: {
    total_viewed: number;
    total_engagement: number;
    engagement_rate: number;
    lurker_score: number;
    trend: { month: string; viewed: number; engaged: number; rate: number }[];
  } | null;
}

function scoreColor(score: number) {
  if (score >= 70) return "var(--rose)";
  if (score >= 40) return "var(--amber)";
  return "var(--green)";
}

function scoreLabel(score: number) {
  if (score >= 70) return "관찰자";
  if (score >= 40) return "보통";
  return "적극적";
}

export function IgLurkerIndex({ data }: Props) {
  if (!data || data.total_viewed === 0) return null;

  const color = scoreColor(data.lurker_score);

  return (
    <section className="card p-5 animate-fadeIn">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">소비 vs 소통</h2>
        <span className="text-[12px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${color}15`, color }}>
          {scoreLabel(data.lurker_score)}
        </span>
      </div>

      <div className="flex items-center gap-4 mb-5">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}10` }}>
          <EyeOff size={24} style={{ color }} />
        </div>
        <div>
          <p className="text-[36px] font-bold leading-none" style={{ color }}>
            {data.engagement_rate}<span className="text-[14px] text-[var(--text-tertiary)] ml-1">%</span>
          </p>
          <p className="text-[12px] text-[var(--text-tertiary)] mt-1">
            본 콘텐츠 중 반응한 비율
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="p-3 bg-gray-50 rounded-lg text-center">
          <p className="text-[18px] font-bold text-[var(--text-primary)]">{data.total_viewed.toLocaleString()}</p>
          <p className="text-[11px] text-[var(--text-tertiary)]">노출된 콘텐츠</p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg text-center">
          <p className="text-[18px] font-bold text-[var(--text-primary)]">{data.total_engagement.toLocaleString()}</p>
          <p className="text-[11px] text-[var(--text-tertiary)]">반응 (좋아요·DM)</p>
        </div>
      </div>

      {data.trend.length > 1 && (
        <div>
          <p className="text-[12px] text-[var(--text-tertiary)] mb-2">월별 반응률 추이</p>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={data.trend}>
              <XAxis dataKey="month" tick={AXIS_TICK} tickLine={false} axisLine={false} />
              <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={30} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [`${v}%`, "반응률"]} />
              <Line type="monotone" dataKey="rate" stroke="var(--accent)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
