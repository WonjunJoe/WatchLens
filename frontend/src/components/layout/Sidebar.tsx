import { useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, BarChart3, CalendarDays, PanelLeftClose, PanelLeftOpen, 
  Eye, User, Sun, Moon
} from "lucide-react";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isDark: boolean;
  onThemeToggle: () => void;
}

const MENU = [
  { label: "홈", icon: Home, path: "/" },
  { label: "대시보드", icon: BarChart3, path: "/dashboard" },
  { label: "캘린더", icon: CalendarDays, path: "/calendar" },
];

export function Sidebar({ collapsed, onToggle, isDark, onThemeToggle }: SidebarProps) {
  const { pathname } = useLocation();

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  const linkClass = (path: string) =>
    `flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all duration-300 relative group ${
      isActive(path)
        ? "text-[var(--text-primary)] font-semibold"
        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10"
    }`;

  return (
    <aside
      className="fixed top-0 left-0 h-screen z-50 flex flex-col transition-all duration-500 glass-card !rounded-none !border-y-0 !border-l-0"
      style={{ width: collapsed ? "var(--sidebar-collapsed)" : "var(--sidebar-width)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-8">
        <div className="w-10 h-10 bg-[var(--accent-lavender)] rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-[var(--accent-lavender)]/20">
          <Eye size={20} className="text-white" />
        </div>
        {!collapsed && (
          <motion.span 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-[18px] font-bold tracking-tight text-[var(--text-primary)]"
          >
            WatchLens
          </motion.span>
        )}
      </div>

      {/* Main menu */}
      <nav className="flex-1 px-3 py-4 space-y-2">
        {MENU.map((item) => (
          <Link key={item.path} to={item.path} className={linkClass(item.path)}>
            {isActive(item.path) && (
              <motion.div 
                layoutId="active-nav"
                className="absolute inset-0 bg-[var(--accent-lavender)]/15 rounded-2xl -z-10"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <item.icon size={20} className={`flex-shrink-0 ${isActive(item.path) ? "text-[var(--accent-lavender)]" : ""}`} />
            {!collapsed && (
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[15px]"
              >
                {item.label}
              </motion.span>
            )}
          </Link>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="px-3 pb-6 space-y-3">
        {/* Theme Toggle */}
        <button
          onClick={onThemeToggle}
          className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10 transition-all duration-300 group"
        >
          <div className="relative w-5 h-5">
            <AnimatePresence mode="wait">
              {isDark ? (
                <motion.div
                  key="moon"
                  initial={{ scale: 0.5, opacity: 0, rotate: -45 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 0.5, opacity: 0, rotate: 45 }}
                >
                  <Moon size={20} />
                </motion.div>
              ) : (
                <motion.div
                  key="sun"
                  initial={{ scale: 0.5, opacity: 0, rotate: 45 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 0.5, opacity: 0, rotate: -45 }}
                >
                  <Sun size={20} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {!collapsed && (
            <span className="text-[15px]">{isDark ? "다크 모드" : "라이트 모드"}</span>
          )}
        </button>

        {/* Sidebar Toggle */}
        <button
          onClick={onToggle}
          className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-white/10 transition-all duration-300"
        >
          {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          {!collapsed && <span className="text-[15px]">사이드바 접기</span>}
        </button>

        {/* User Profile */}
        <div className="mt-4 p-3 rounded-2xl bg-[var(--text-primary)]/5 border border-white/5 flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-tr from-[var(--accent-lavender)] to-[var(--accent-sky)] rounded-xl flex items-center justify-center flex-shrink-0">
            <User size={16} className="text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[var(--text-primary)] truncate">Explorer</p>
              <p className="text-[11px] text-[var(--text-tertiary)]">2026 Edition</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
