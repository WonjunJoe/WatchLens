import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

const STORAGE_KEY = "watchlens-sidebar-collapsed";

export function Layout() {
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) === "true";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  return (
    <div className="flex min-h-screen bg-[var(--bg-base)]">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <main
        className="flex-1 transition-all duration-200"
        style={{ marginLeft: collapsed ? "var(--sidebar-collapsed)" : "var(--sidebar-width)" }}
      >
        <div className="page-enter">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
