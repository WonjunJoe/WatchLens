import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { API_BASE } from "../config";
import { supabase } from "../lib/supabase";
import type { YouTubeData } from "../types/youtube";

export type { YouTubeData };

interface PeriodInfo {
  date_from: string;
  date_to: string;
  total_days: number;
}

interface YouTubeContextValue {
  data: YouTubeData;
  period: PeriodInfo | null;
  hasData: boolean;
  setSection: (name: string, value: YouTubeData[keyof YouTubeData]) => void;
  setAll: (data: YouTubeData) => void;
  setPeriod: (p: PeriodInfo | null) => void;
  clear: () => void;
  fetchPeriod: (force?: boolean) => Promise<void>;
}

const YouTubeDataContext = createContext<YouTubeContextValue | null>(null);

export function YouTubeDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<YouTubeData>({});
  const [period, setPeriod] = useState<PeriodInfo | null>(null);
  const [cleared, setCleared] = useState(false);

  const setSection = useCallback((name: string, value: YouTubeData[keyof YouTubeData]) => {
    setCleared(false);
    setData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const setAll = useCallback((d: YouTubeData) => { setCleared(false); setData(d); }, []);
  const clear = useCallback(() => { setData({}); setCleared(true); }, []);

  const fetchPeriod = useCallback(async (force?: boolean) => {
    if (cleared && !force) return;
    if (force) setCleared(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {};
      const res = await fetch(`${API_BASE}/api/stats/period`, { headers });
      const d = await res.json();
      if (d.date_from) setPeriod(d);
    } catch {
      // ignore
    }
  }, [cleared]);

  const hasData = period !== null;

  return (
    <YouTubeDataContext.Provider value={{ data, period, hasData, setSection, setAll, setPeriod, clear, fetchPeriod }}>
      {children}
    </YouTubeDataContext.Provider>
  );
}

export function useYouTubeData() {
  const ctx = useContext(YouTubeDataContext);
  if (!ctx) throw new Error("useYouTubeData must be inside YouTubeDataProvider");
  return ctx;
}
