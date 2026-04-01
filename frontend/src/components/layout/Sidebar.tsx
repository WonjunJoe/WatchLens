import { useLocation, Link } from "react-router-dom";
import { Home, BarChart3, PanelLeftClose, PanelLeftOpen, Eye, Upload, Heart } from "lucide-react";
import { useYouTubeData } from "../../contexts/YouTubeDataContext";
import { useInstagramData } from "../../contexts/InstagramDataContext";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const MENU = [
  { label: "홈", icon: Home, path: "/" },
  { label: "업로드", icon: Upload, path: "/upload" },
  { label: "YouTube 대시보드", icon: BarChart3, path: "/youtube/dashboard", statusKey: "youtube" as const },
  { label: "Instagram 대시보드", icon: Eye, path: "/instagram/dashboard", statusKey: "instagram" as const },
  { label: "디지털 웰빙", icon: Heart, path: "/wellbeing" },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { pathname } = useLocation();
  const { hasData: ytReady } = useYouTubeData();
  const { hasData: igReady } = useInstagramData();

  const statusMap: Record<string, boolean> = {
    youtube: ytReady,
    instagram: igReady,
  };

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  return (
    <aside
      className="fixed top-0 left-0 h-screen flex flex-col bg-white border-r border-[var(--border-strong)] z-50 transition-all duration-300 ease-out shadow-[4px_0_24px_rgba(0,0,0,0.04)]"
      style={{ width: collapsed ? 72 : 240 }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-[var(--border)]">
        <div className="w-8 h-8 bg-gradient-to-br from-[var(--accent)] to-[#7C3AED] rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
          <Eye size={16} className="text-white" />
        </div>
        {!collapsed && (
          <span className="text-[16px] font-extrabold text-[var(--text-primary)] tracking-tight">
            WatchLens
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {MENU.map((item) => {
          const active = isActive(item.path);
          const statusKey = "statusKey" in item ? item.statusKey : undefined;
          const ready = statusKey ? statusMap[statusKey] : undefined;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                active
                  ? "bg-gradient-to-r from-[var(--accent-light)] to-[var(--accent-glow)] text-[var(--accent)] font-bold shadow-sm border border-[var(--accent)]/10"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg)] hover:text-[var(--text-primary)] hover:shadow-sm border border-transparent"
              }`}
            >
              <item.icon size={18} className="flex-shrink-0" />
              {!collapsed && (
                <span className="flex items-center gap-2">
                  {item.label}
                  {ready !== undefined && (
                    <span
                      className={`inline-block w-2 h-2 rounded-full flex-shrink-0 transition-colors ${
                        ready
                          ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]"
                          : "bg-gray-300"
                      }`}
                    />
                  )}
                </span>
              )}
              {collapsed && ready !== undefined && (
                <span
                  className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                    ready
                      ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]"
                      : "bg-gray-300"
                  }`}
                />
              )}
            </Link>
          );
        })}
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
