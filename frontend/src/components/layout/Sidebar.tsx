import { useLocation, Link } from "react-router-dom";
import {
  Home, BarChart3, CalendarDays, Settings, HelpCircle,
  PanelLeftClose, PanelLeftOpen, Eye, User,
} from "lucide-react";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const MENU = [
  { label: "홈", icon: Home, path: "/" },
  { label: "대시보드", icon: BarChart3, path: "/dashboard" },
  { label: "캘린더", icon: CalendarDays, path: "/calendar" },
];

const BOTTOM_MENU = [
  { label: "설정", icon: Settings, path: "/settings" },
  { label: "도움말", icon: HelpCircle, path: "/help" },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { pathname } = useLocation();

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  const linkClass = (path: string) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-[12px] transition-all duration-200 ${
      isActive(path)
        ? "bg-[var(--lavender-light)] text-[var(--lavender-text)]"
        : "text-[var(--text-secondary)] hover:bg-[var(--lavender-light)]/40 hover:text-[var(--text-primary)]"
    }`;

  return (
    <aside
      className="fixed top-0 left-0 h-screen bg-[var(--bg-white)] border-r border-[var(--border-default)] z-40 flex flex-col transition-all duration-200"
      style={{ width: collapsed ? "var(--sidebar-collapsed)" : "var(--sidebar-width)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-[var(--border-default)]">
        <div className="w-8 h-8 bg-[var(--lavender-light)] rounded-[12px] flex items-center justify-center flex-shrink-0">
          <Eye size={16} className="text-[var(--lavender-text)]" />
        </div>
        {!collapsed && (
          <span className="text-[15px] font-medium text-[var(--text-primary)]">WatchLens</span>
        )}
      </div>

      {/* Main menu */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {MENU.map((item) => (
          <Link key={item.path} to={item.path} className={linkClass(item.path)}>
            <item.icon size={18} className="flex-shrink-0" />
            {!collapsed && <span className="text-[14px]">{item.label}</span>}
          </Link>
        ))}
      </nav>

      {/* Bottom menu */}
      <div className="px-3 pb-2 space-y-1">
        {BOTTOM_MENU.map((item) => (
          <Link key={item.path} to={item.path} className={linkClass(item.path)}>
            <item.icon size={18} className="flex-shrink-0" />
            {!collapsed && <span className="text-[14px]">{item.label}</span>}
          </Link>
        ))}
      </div>

      {/* Toggle */}
      <button
        onClick={onToggle}
        className="mx-3 mb-3 p-2.5 rounded-[12px] text-[var(--text-tertiary)] hover:bg-[var(--lavender-light)]/40 hover:text-[var(--text-primary)] transition-all duration-200 flex items-center justify-center"
      >
        {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
      </button>

      {/* User */}
      <div className="px-4 py-3 border-t border-[var(--border-default)] flex items-center gap-2.5">
        <div className="w-8 h-8 bg-[var(--sky-light)] rounded-full flex items-center justify-center flex-shrink-0">
          <User size={14} className="text-[var(--sky-text)]" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-[var(--text-primary)] truncate">사용자</p>
            <p className="text-[11px] text-[var(--text-tertiary)]">무료 플랜</p>
          </div>
        )}
      </div>
    </aside>
  );
}
