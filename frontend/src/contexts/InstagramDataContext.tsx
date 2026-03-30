import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { API_BASE } from "../config";
import type { InstagramData } from "../types/instagram";

export type { InstagramData };

interface InstagramContextValue {
  data: Partial<InstagramData>;
  hasData: boolean;
  setSection: (name: string, value: InstagramData[keyof InstagramData]) => void;
  setAll: (data: InstagramData) => void;
  clear: () => void;
  fetchFromDb: () => Promise<boolean>;
}

const InstagramDataContext = createContext<InstagramContextValue | null>(null);

export function InstagramDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Partial<InstagramData>>({});

  const setSection = useCallback((name: string, value: InstagramData[keyof InstagramData]) => {
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

  const hasData = !!data.summary;

  return (
    <InstagramDataContext.Provider value={{ data, hasData, setSection, setAll, clear, fetchFromDb }}>
      {children}
    </InstagramDataContext.Provider>
  );
}

export function useInstagramData() {
  const ctx = useContext(InstagramDataContext);
  if (!ctx) throw new Error("useInstagramData must be used within InstagramDataProvider");
  return ctx;
}
