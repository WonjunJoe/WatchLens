import { useLocation, Link } from "react-router-dom";
import { Upload, BarChart3, PanelLeftClose, PanelLeftOpen, Eye } from "lucide-react";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const MENU = [
  { label: "업로드", icon: Upload, path: "/" },
  { label: "대시보드", icon: BarChart3, path: "/dashboard" },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { pathname } = useLocation();

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  return (
    <aside
      className="fixed top-0 left-0 h-screen flex flex-col bg-white border-r border-[var(--border)] z-50 transition-all duration-200"
      style={{ width: collapsed ? 72 : 240 }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-[var(--border)]">
        <div className="w-8 h-8 bg-[var(--accent)] rounded-lg flex items-center justify-center flex-shrink-0">
          <Eye size={16} className="text-white" />
        </div>
        {!collapsed && (
          <span className="text-[16px] font-bold text-[var(--text-primary)]">
            WatchLens
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {MENU.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] transition-colors ${
              isActive(item.path)
                ? "bg-[var(--accent-light)] text-[var(--accent)] font-semibold"
                : "text-[var(--text-secondary)] hover:bg-gray-50 hover:text-[var(--text-primary)]"
            }`}
          >
            <item.icon size={18} className="flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>

      {/* Toggle */}
      <div className="px-3 pb-4">
        <button
          onClick={onToggle}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[var(--text-tertiary)] hover:bg-gray-50 hover:text-[var(--text-secondary)] transition-colors text-[14px]"
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          {!collapsed && <span>사이드바 접기</span>}
        </button>
      </div>
    </aside>
  );
}
