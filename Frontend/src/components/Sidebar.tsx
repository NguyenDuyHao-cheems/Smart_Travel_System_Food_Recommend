"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import {
  Compass,
  Heart,
  Clock,
  Sparkles,
  FolderOpen,
  ChevronLeft,
  Settings,
  MoreVertical,
  User,
  MessageSquare,
} from "lucide-react";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  username?: string | null;
  avatar?: string | null;
}

export function Sidebar({
  isCollapsed,
  onToggle,
  username: propUsername,
  avatar: propAvatar,
}: SidebarProps) {
  const pathname = usePathname();
  const [username, setUsername] = React.useState<string | null>(null);
  const [avatar, setAvatar] = React.useState<string | null>(null);
  const [lastSearchUrl, setLastSearchUrl] = React.useState("/");

  React.useEffect(() => {
    if (propUsername !== undefined) setUsername(propUsername);
    else setUsername(localStorage.getItem("username"));

    if (propAvatar !== undefined) setAvatar(propAvatar);
    else setAvatar(localStorage.getItem("user_avatar"));

    const savedUrl = localStorage.getItem("last_search_url");
    if (savedUrl) setLastSearchUrl(savedUrl);
  }, [propUsername, propAvatar]);

  const navItems = [
    {
      icon: MessageSquare,
      label: "Bảng tin",
      active: pathname === "/feed",
      href: "/feed",
    },
    {
      icon: Compass,
      label: "Khám phá",
      active: pathname === "/" || pathname === "/result",
      href: lastSearchUrl,
    },
    { icon: Heart, label: "Yêu thích", active: pathname === "/favorites", href: "/favorites" },
    { icon: Clock, label: "Lịch sử", active: pathname === "/history", href: "/history" },
    {
      icon: Sparkles,
      label: "Gợi ý cho bạn",
      active: pathname === "/recommendations",
      href: "/recommendations",
    },
    {
      icon: FolderOpen,
      label: "Bộ sưu tập",
      active: pathname === "/collections",
      href: "/collections",
    },
  ];

  const bottomNavItems = [
    { icon: Settings, label: "Cài đặt", active: pathname === "/settings", href: "/settings" },
  ];

  const avatarUrl =
    avatar ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${username || "guest"}`;

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 ${
        isCollapsed ? "w-[80px]" : "w-[260px]"
      } bg-[#FDFBF7]/90 dark:bg-[#2A2420]/90 backdrop-blur-sm border-r border-[#E6DFD5] dark:border-[#3D312A] shadow-[4px_0_24px_rgba(0,0,0,0.02)] flex flex-col z-50 transition-all duration-300`}
    >
      {/* Logo */}
      <div
        className={`flex items-center ${
          isCollapsed ? "justify-center" : "justify-start"
        } px-5 h-[72px] border-b border-[#E6DFD5]/60 dark:border-[#3D312A]/60 transition-all duration-300 relative`}
      >
        <a
          href="/"
          className={`flex items-center gap-2.5 ${
            isCollapsed ? "hidden" : "flex"
          } group hover:opacity-80 transition-opacity`}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand to-brand-hover flex items-center justify-center shadow-md shadow-brand/20 group-hover:scale-105 transition-transform">
            <span className="text-white text-lg">🍜</span>
          </div>
          <span
            className="text-xl font-bold text-[#3D312A] dark:text-[#E6DFD5] tracking-tight"
            style={{ fontFamily: '"Segoe UI", Roboto, sans-serif' }}
          >
            Wanderbite
          </span>
        </a>

        {isCollapsed && (
          <a
            href="/"
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand to-brand-hover flex items-center justify-center shadow-md shadow-brand/20 hover:scale-105 transition-transform cursor-pointer"
          >
            <span className="text-white text-lg">🍜</span>
          </a>
        )}

        <button
          onClick={onToggle}
          className={`absolute ${
            isCollapsed ? "right-[-14px]" : "right-4"
          } top-[22px] w-7 h-7 rounded-full flex items-center justify-center bg-[#FDFBF7] dark:bg-[#3D312A] border border-[#E6DFD5] dark:border-[#4D3D32] text-gray-500 hover:text-brand dark:hover:text-brand transition-all cursor-pointer z-50 shadow-sm`}
        >
          <ChevronLeft
            className={`w-4 h-4 transition-transform duration-300 ${
              isCollapsed ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pt-4 overflow-y-auto">
        <div className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive =
              item.active !== undefined
                ? item.active
                : pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center ${
                  isCollapsed ? "justify-center px-0" : "gap-3 px-4"
                } py-3 rounded-xl text-[14px] font-medium transition-all cursor-pointer w-full ${
                  isActive
                    ? "bg-brand-muted dark:bg-brand/10 text-brand-hover dark:text-[#E6DFD5] shadow-sm shadow-brand/10"
                    : "text-gray-500 dark:text-[#9A8A7A] hover:bg-gray-50 dark:hover:bg-[#3D312A]/60 hover:text-gray-700 dark:hover:text-[#E6DFD5]"
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <item.icon
                  className={`w-[18px] h-[18px] flex-shrink-0 ${
                    isActive ? "text-brand dark:text-[#E8735A]" : "text-gray-400 dark:text-[#7A6A5A]"
                  }`}
                />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* AI Card — chỉ hiện khi expanded */}
        {!isCollapsed && (
          <div className="mt-6 mb-4 mx-2 p-4 rounded-2xl bg-brand-muted/50 dark:bg-brand/5 border border-brand-muted dark:border-brand/10 relative overflow-hidden group">
            <div className="relative z-10">
              <h4 className="text-[13px] font-bold text-[#3D312A] dark:text-[#E6DFD5] flex items-center gap-1.5 mb-1.5">
                AI Wanderbite <Sparkles className="w-3 h-3 text-brand dark:text-[#E8735A]" />
              </h4>
              <p className="text-[11px] text-[#7A6A5A] dark:text-[#9A8A7A] leading-relaxed mb-3">
                Để AI hiểu bạn hơn, hãy cập nhật sở thích thường xuyên nhé!
              </p>
              <button 
                onClick={() => window.dispatchEvent(new Event('open-survey'))}
                className="w-full py-2 bg-white dark:bg-[#3D312A] border border-brand-muted dark:border-brand/20 text-brand dark:text-[#E8735A] dark:text-[#E6DFD5] text-[11px] font-bold rounded-xl hover:bg-brand-muted/50 dark:hover:bg-brand/10 transition-colors shadow-sm cursor-pointer"
              >
                Cập nhật ngay
              </button>
            </div>
            {/* Sparkles watermark */}
            <div className="absolute bottom-[-10px] right-[-5px] opacity-10 group-hover:opacity-20 transition-opacity">
              <Sparkles className="w-16 h-16 text-brand dark:text-[#E8735A]" />
            </div>
          </div>
        )}

        {/* Bottom nav items */}
        <div className="flex flex-col gap-1 mt-2">
          {bottomNavItems.map((item) => {
            const isActive = item.active;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center ${
                  isCollapsed ? "justify-center px-0" : "gap-3 px-4"
                } py-3 rounded-xl text-[14px] font-medium transition-all cursor-pointer w-full ${
                  isActive
                    ? "bg-brand-muted dark:bg-brand/10 text-brand-hover dark:text-[#E6DFD5] shadow-sm shadow-brand/10"
                    : "text-gray-500 dark:text-[#9A8A7A] hover:bg-gray-50 dark:hover:bg-[#3D312A]/60 hover:text-gray-700 dark:hover:text-[#E6DFD5]"
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <item.icon
                  className={`w-[18px] h-[18px] flex-shrink-0 ${
                    isActive ? "text-brand dark:text-[#E8735A]" : "text-gray-400 dark:text-[#7A6A5A]"
                  }`}
                />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Footer */}
      <div
        className={`border-t border-[#E6DFD5] dark:border-[#3D312A] p-3 flex items-center ${
          isCollapsed ? "justify-center" : "gap-3"
        } transition-all duration-300`}
      >
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-brand-muted dark:ring-brand/20">
          <img
            src={avatarUrl}
            alt={username || "Guest"}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Info + menu */}
        {!isCollapsed && (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[#3D312A] dark:text-[#E6DFD5] truncate">
                {username || "Khách"}
              </p>
              <p className="text-[11px] text-[#9A8A7A] dark:text-[#7A6A5A]">
                {username ? "Thành viên" : "Khách"}
              </p>
            </div>
            <button 
              onClick={() => toast.info("Tính năng này sẽ sớm ra mắt")}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-brand-muted dark:hover:bg-brand/10 text-[#9A8A7A] hover:text-brand transition-colors cursor-pointer flex-shrink-0"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
