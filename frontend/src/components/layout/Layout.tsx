import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { useYouTubeData } from "../../contexts/YouTubeDataContext";
import { useInstagramData } from "../../contexts/InstagramDataContext";

export function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const { fetchPeriod } = useYouTubeData();
  const { fetchFromDb } = useInstagramData();

  useEffect(() => {
    fetchPeriod();
    fetchFromDb();
  }, [fetchPeriod, fetchFromDb]);

  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <main
        className="flex-1 min-w-0"
        style={{ marginLeft: collapsed ? 72 : 240 }}
      >
        <div className="p-8 max-w-[1400px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
