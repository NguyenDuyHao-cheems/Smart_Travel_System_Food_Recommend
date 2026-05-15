"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Heart, Clock, Sparkles, FolderOpen, ChevronLeft, Settings, MoreVertical } from "lucide-react";

const navItems = [
  { icon: Compass, label: "Khám phá", href: "/" },
  { icon: Heart, label: "Yêu thích", href: "/favorites" },
  { icon: Clock, label: "Lịch sử", href: "/history" },
  { icon: Sparkles, label: "Gợi ý cho bạn", href: "/recommendations" },
  { icon: FolderOpen, label: "Bộ sưu tập", href: "/collections" },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  username?: string | null;
  avatar?: string | null;
}

export function Sidebar({ isCollapsed, onToggle, username: propUsername, avatar: propAvatar }: SidebarProps) {
  const pathname = usePathname();
  const [username, setUsername] = React.useState<string | null>(null);
  const [avatar, setAvatar] = React.useState<string | null>(null);

  const [lastSearchUrl, setLastSearchUrl] = React.useState("/");

  React.useEffect(() => {
    if (propUsername !== undefined) setUsername(propUsername);
    else setUsername(localStorage.getItem("username"));

    if (propAvatar !== undefined) setAvatar(propAvatar);
    else setAvatar(localStorage.getItem("user_avatar"));

    // Check for last search URL to keep "Khám phá" persistent
    const savedUrl = localStorage.getItem("last_search_url");
    if (savedUrl) setLastSearchUrl(savedUrl);
  }, [propUsername, propAvatar]);

  const navItems = [
    { icon: Compass, label: "Khám phá", active: pathname === "/" || pathname === "/result", href: lastSearchUrl },
    { icon: Heart, label: "Yêu thích", active: pathname === "/favorites", href: "/favorites" },
    { icon: Clock, label: "Lịch sử", active: pathname === "/history", href: "/history" },
    { icon: Sparkles, label: "Gợi ý cho bạn", active: pathname === "/recommendations", href: "/recommendations" },
    { icon: FolderOpen, label: "Bộ sưu tập", active: pathname === "/collections", href: "/collections" },
  ];

  const bottomNavItems = [
    { icon: Settings, label: "Cài đặt", active: pathname === "/settings", href: "/settings" },
  ];

  return (
    <aside className={`fixed left-0 top-0 bottom-0 ${isCollapsed ? 'w-[80px]' : 'w-[260px]'} bg-white dark:bg-[#0B0F19] border-r border-gray-100 dark:border-gray-800 flex flex-col z-50 shadow-sm transition-all duration-300`}>
      {/* Logo */}
      <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} px-5 h-[72px] border-b border-gray-50 dark:border-gray-800 transition-all duration-300 relative`}>
        <a
          href="/"
          className={`flex items-center gap-2.5 ${isCollapsed ? 'hidden' : 'flex'} group hover:opacity-80 transition-opacity`}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shadow-md shadow-orange-200 dark:shadow-orange-500/20 group-hover:scale-105 transition-transform">
            <span className="text-white text-lg">🍜</span>
          </div>
          <span className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">
            Wanderbite
          </span>
        </a>

        {isCollapsed && (
          <a
            href="/"
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shadow-md shadow-orange-200 dark:shadow-orange-500/20 hover:scale-105 transition-transform cursor-pointer"
          >
            <span className="text-white text-lg">🍜</span>
          </a>
        )}

        <button
          onClick={onToggle}
          className={`absolute ${isCollapsed ? 'right-[-14px]' : 'right-4'} top-[22px] w-7 h-7 rounded-full flex items-center justify-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-all cursor-pointer z-50 shadow-sm`}
        >
          <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pt-4 overflow-y-auto">
        <div className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-xl text-[14px] font-medium transition-all cursor-pointer w-full ${isActive
                    ? "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-500 shadow-sm shadow-orange-100 dark:shadow-none"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200"
                  }`}
                title={isCollapsed ? item.label : undefined}
              >
                <item.icon
                  className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? "text-orange-500" : "text-gray-400"
                    }`}
                />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
          {/* [FIX-CONFLICT]: Đưa nút Cài đặt (bottomNavItems) lên phía trên thẻ AI Card để bố cục hợp lý hơn */}
          {bottomNavItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-xl text-[14px] font-medium transition-all cursor-pointer w-full ${isActive
                    ? "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-500 shadow-sm shadow-orange-100 dark:shadow-none"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200"
                  }`}
                title={isCollapsed ? item.label : undefined}
              >
                <item.icon
                  className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? "text-orange-500" : "text-gray-400"
                    }`}
                />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* AI Card */}
        {/* [FIX-CONFLICT]: Bổ sung mt-6 mb-6 để tạo khoảng hở giữa nút Cài đặt, thẻ AI Card và Footer */}
        {!isCollapsed && (
          <div className="mt-6 mb-6 mx-2 p-4 rounded-2xl bg-orange-50/50 dark:bg-orange-500/5 border border-orange-100/50 dark:border-orange-500/10 relative overflow-hidden group">
            <div className="relative z-10">
              <h4 className="text-[13px] font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5 mb-1.5">
                AI Wanderbite <Sparkles className="w-3 h-3 text-orange-500" />
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
                Để AI hiểu bạn hơn, hãy cập nhật sở thích thường xuyên nhé!
              </p>
              <button className="w-full py-2 bg-white dark:bg-gray-800 border border-orange-100 dark:border-orange-500/20 text-orange-600 dark:text-orange-400 text-[11px] font-bold rounded-xl hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors shadow-sm">
                Cập nhật ngay
              </button>
            </div>
            {/* Minimalist Bot Icon Placeholder */}
            <div className="absolute bottom-[-10px] right-[-5px] opacity-10 group-hover:opacity-20 transition-opacity">
              <Sparkles className="w-16 h-16 text-orange-500" />
            </div>
          </div>
        )}
      </nav>

      {/* User Profile Footer */}
      <div className={`p-4 border-t border-gray-50 dark:border-gray-800 ${isCollapsed ? 'flex justify-center' : ''}`}>
        <div className={`flex items-center ${isCollapsed ? '' : 'gap-3'} w-full`}>
          <div className="w-9 h-9 rounded-full bg-orange-100 dark:bg-orange-500/20 overflow-hidden flex-shrink-0">
            {avatar ? (
              <img src={avatar} alt={username || "User"} className="w-full h-full object-cover" />
            ) : (
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${username || 'User'}`} alt="User" className="w-full h-full object-cover" />
            )}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <h5 className="text-sm font-bold text-gray-800 dark:text-white truncate">{username || "Guest"}</h5>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">{username ? "Thành viên" : "Khách"}</span>
            </div>
          )}
          {!isCollapsed && (
            <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors text-gray-400">
              <MoreVertical className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
