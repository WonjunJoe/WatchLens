import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { AnimatePresence, motion } from "framer-motion";

const SIDEBAR_STORAGE_KEY = "watchlens-sidebar-collapsed";
const THEME_STORAGE_KEY = "watchlens-theme";

export function Layout() {
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
  });

  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme) return savedTheme === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      root.style.colorScheme = "dark";
    } else {
      root.classList.remove("dark");
      root.style.colorScheme = "light";
    }
    localStorage.setItem(THEME_STORAGE_KEY, isDark ? "dark" : "light");
  }, [isDark]);

  return (
    <div className="flex min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] transition-colors duration-700 selection:bg-[var(--accent-lavender)]/30">
      {/* Ambient Mesh Background - Ensure it is below everything */}
      <div className="ambient-mesh pointer-events-none" style={{ zIndex: 0 }} />
      
      <Sidebar 
        collapsed={collapsed} 
        onToggle={() => setCollapsed(!collapsed)} 
        isDark={isDark}
        onThemeToggle={() => setIsDark(!isDark)}
      />
      
      <main
        className="flex-1 transition-all duration-500 ease-in-out relative z-10"
        style={{ 
          marginLeft: collapsed ? "var(--sidebar-collapsed)" : "var(--sidebar-width)",
          width: "auto"
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={window.location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="p-6 md:p-10 lg:p-16 max-w-[1600px] mx-auto min-h-screen"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
