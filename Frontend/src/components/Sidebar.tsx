"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Compass, 
  Heart, 
  Clock, 
  Sparkles, 
  FolderOpen, 
  ChevronLeft, 
  Bell, 
  HelpCircle, 
  Settings,
  MoreVertical
} from "lucide-react";

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

  React.useEffect(() => {
    if (propUsername !== undefined) setUsername(propUsername);
    else setUsername(localStorage.getItem("username"));

    if (propAvatar !== undefined) setAvatar(propAvatar);
    else setAvatar(localStorage.getItem("user_avatar"));
  }, [propUsername, propAvatar]);

  const navItems = [
    { icon: Compass, label: "Khám phá", active: pathname === "/" || pathname === "", href: "/" },
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
      <nav className="flex-1 px-3 pt-4 overflow-y-auto custom-scrollbar">
        <div className="space-y-1.5 px-3 mb-4">
          {navItems.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group cursor-pointer ${
                item.active 
                  ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-500 font-bold' 
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              } ${isCollapsed ? 'justify-center px-0' : ''}`}
            >
              <div className="w-6 flex justify-center flex-shrink-0">
                <item.icon className={`w-5 h-5 ${item.active ? 'text-orange-500' : 'group-hover:text-orange-400'} transition-colors`} />
              </div>
              {!isCollapsed && <span className="text-[14px] leading-none">{item.label}</span>}
            </Link>
          ))}
        </div>

        <div className="space-y-1.5 px-3 mb-6">
          {bottomNavItems.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group cursor-pointer ${
                item.active 
                  ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-500 font-bold' 
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              } ${isCollapsed ? 'justify-center px-0' : ''}`}
            >
              <div className="w-6 flex justify-center flex-shrink-0">
                <item.icon className={`w-5 h-5 ${item.active ? 'text-orange-500' : 'group-hover:text-orange-400'} transition-colors`} />
              </div>
              {!isCollapsed && <span className="text-[14px] leading-none">{item.label}</span>}
            </Link>
          ))}
        </div>

        {/* AI Card */}
        {!isCollapsed && (
          <div className="mx-2 p-4 rounded-2xl bg-orange-50/50 dark:bg-orange-500/5 border border-orange-100/50 dark:border-orange-500/10 relative overflow-hidden group">
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
