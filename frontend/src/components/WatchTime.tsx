import { useState } from "react";
import { useStats } from "../hooks/useStats";

interface WatchTimeStats {
  total_min_hours: number;
  total_max_hours: number;
  daily_min_hours: number;
  daily_max_hours: number;
  gap_based_count: number;
  estimated_count: number;
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
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg z-10 text-left leading-relaxed">
          {text}
        </span>
      )}
    </span>
  );
}

export function WatchTime() {
  const { data, loading, error } = useStats<WatchTimeStats>("/api/stats/watch-time");

  if (loading) return <p className="text-gray-400">시청 시간 로딩 중...</p>;
  if (error) return <p className="text-red-500">오류: {error}</p>;
  if (!data) return null;

  const total = data.gap_based_count + data.estimated_count;
  const gapPct = total > 0 ? Math.round((data.gap_based_count / total) * 100) : 0;

  return (
    <section>
      <h2 className="text-lg font-semibold mb-4">
        추정 시청 시간
        <InfoTooltip text={`영상 간 시간차로 실측한 비율: ${gapPct}%. 나머지는 평균 시청 비율로 추정 (Shorts 85%, 롱폼 50%). 1시간 초과 영상은 1시간으로 cap.`} />
      </h2>
      <div className="bg-white rounded-xl shadow p-5">
        <div className="grid grid-cols-2 gap-6 text-center">
          <div>
            <p className="text-sm text-gray-500 mb-2">총 시청 시간</p>
            <p className="text-2xl font-bold">
              {data.total_min_hours} ~ {data.total_max_hours}
              <span className="text-sm font-normal text-gray-400 ml-1">시간</span>
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-2">일 평균</p>
            <p className="text-2xl font-bold">
              {data.daily_min_hours} ~ {data.daily_max_hours}
              <span className="text-sm font-normal text-gray-400 ml-1">시간/일</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
