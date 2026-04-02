import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { API_BASE } from "../config";
import { supabase } from "../lib/supabase";
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
  const [cleared, setCleared] = useState(false);

  const setSection = useCallback((name: string, value: InstagramData[keyof InstagramData]) => {
    setCleared(false);
    setData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const setAll = useCallback((newData: InstagramData) => {
    setCleared(false);
    setData(newData);
  }, []);

  const clear = useCallback(() => {
    setData({});
    setCleared(true);
  }, []);

  const fetchFromDb = useCallback(async (): Promise<boolean> => {
    if (cleared) return false;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {};
      const res = await fetch(`${API_BASE}/api/instagram/dashboard`, { headers });
      if (!res.ok) return false;
      const results = await res.json();
      setData(results);
      return true;
    } catch {
      return false;
    }
  }, [cleared]);

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
