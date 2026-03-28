import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

const API_BASE = "http://localhost:8000";

interface InstagramData {
  summary: any;
  top_accounts: any;
  hourly: any;
  day_of_week: any;
  daily: any;
  dm_analysis: any;
  topics: any;
  follow_network: any;
  insights: any;
}

interface InstagramContextValue {
  data: Partial<InstagramData>;
  setSection: (name: string, value: any) => void;
  setAll: (data: InstagramData) => void;
  clear: () => void;
  fetchFromDb: () => Promise<boolean>;
}

const InstagramDataContext = createContext<InstagramContextValue | null>(null);

export function InstagramDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Partial<InstagramData>>({});

  const setSection = useCallback((name: string, value: any) => {
    setData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const setAll = useCallback((newData: InstagramData) => {
    setData(newData);
  }, []);

  const clear = useCallback(() => {
    setData({});
  }, []);

  const fetchFromDb = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/api/instagram/dashboard`);
      if (!res.ok) return false;
      const results = await res.json();
      setData(results);
      return true;
    } catch {
      return false;
    }
  }, []);

  return (
    <InstagramDataContext.Provider value={{ data, setSection, setAll, clear, fetchFromDb }}>
      {children}
    </InstagramDataContext.Provider>
  );
}

export function useInstagramData() {
  const ctx = useContext(InstagramDataContext);
  if (!ctx) throw new Error("useInstagramData must be used within InstagramDataProvider");
  return ctx;
}
