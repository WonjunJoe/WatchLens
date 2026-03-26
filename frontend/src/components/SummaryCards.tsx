import { useState } from "react";
import { useStats } from "../hooks/useStats";

interface SummaryStats {
  total_watched: number;
  total_channels: number;
  period: string;
  daily_average: number;
  shorts_count: number;
}

function InfoTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);

  return (
    <span className="relative inline-block ml-1">
      <button
        type="button"
        className="w-4 h-4 rounded-full bg-gray-200 text-gray-500 text-[10px] leading-4 hover:bg-gray-300 cursor-help"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow((s) => !s)}
      >
        i
      </button>
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg z-10 text-left leading-relaxed">
          {text}
        </span>
      )}
    </span>
  );
}

export function SummaryCards() {
  const { data, loading, error } = useStats<SummaryStats>("/api/stats/summary");

  if (loading) return <p className="text-gray-400">요약 로딩 중...</p>;
  if (error) return <p className="text-red-500">오류: {error}</p>;
  if (!data) return null;

  const cards = [
    {
      label: "총 시청 수",
      value: data.total_watched.toLocaleString(),
      unit: "건",
      info: "해당 기간 동안의 전체 시청 횟수 (Shorts + 일반 영상 포함)",
    },
    {
      label: "채널 수",
      value: data.total_channels.toLocaleString(),
      unit: "개",
      info: "해당 기간에 시청한 고유(distinct) 채널 수",
    },
    {
      label: "일 평균",
      value: data.daily_average.toFixed(1),
      unit: "건/일",
      info: "총 시청 수 ÷ 기간 내 활동 일수",
    },
    {
      label: "Shorts",
      value: data.shorts_count.toLocaleString(),
      unit: "건",
      info: "60초 이하 영상(Shorts)의 시청 횟수",
    },
  ];

  return (
    <section>
      <h2 className="text-lg font-semibold mb-3">요약</h2>
      <p className="text-sm text-gray-500 mb-4">{data.period}</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="bg-white rounded-xl shadow p-5 text-center"
          >
            <p className="text-2xl font-bold">
              {c.value}<span className="text-sm font-normal text-gray-400 ml-1">{c.unit}</span>
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {c.label}
              <InfoTooltip text={c.info} />
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
