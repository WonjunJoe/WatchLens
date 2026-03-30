import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

const API_BASE = "http://localhost:8000";

interface YouTubeData {
  summary?: any;
  hourly?: any;
  daily?: any;
  top_channels?: any;
  shorts?: any;
  categories?: any;
  watch_time?: any;
  weekly_watch_time?: any;
  weekly?: any;
  dopamine?: any;
  day_of_week?: any;
  viewer_type?: any;
  search_keywords?: any;
  content_diversity?: any;
  attention_trend?: any;
  time_cost?: any;
  binge_sessions?: any;
  insights?: any;
}

interface PeriodInfo {
  date_from: string;
  date_to: string;
  total_days: number;
}

interface YouTubeContextValue {
  data: YouTubeData;
  period: PeriodInfo | null;
  setSection: (name: string, value: any) => void;
  setAll: (data: YouTubeData) => void;
  setPeriod: (p: PeriodInfo | null) => void;
  clear: () => void;
  fetchPeriod: () => Promise<void>;
}

const YouTubeDataContext = createContext<YouTubeContextValue | null>(null);

export function YouTubeDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<YouTubeData>({});
  const [period, setPeriod] = useState<PeriodInfo | null>(null);

  const setSection = useCallback((name: string, value: any) => {
    setData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const setAll = useCallback((d: YouTubeData) => setData(d), []);
  const clear = useCallback(() => setData({}), []);

  const fetchPeriod = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/stats/period`);
      const d = await res.json();
      if (d.date_from) setPeriod(d);
    } catch {
      // ignore
    }
  }, []);

  return (
    <YouTubeDataContext.Provider value={{ data, period, setSection, setAll, setPeriod, clear, fetchPeriod }}>
      {children}
    </YouTubeDataContext.Provider>
  );
}

export function useYouTubeData() {
  const ctx = useContext(YouTubeDataContext);
  if (!ctx) throw new Error("useYouTubeData must be inside YouTubeDataProvider");
  return ctx;
}
