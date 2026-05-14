"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Heart, Clock, Sparkles, FolderOpen, ChevronLeft } from "lucide-react";

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
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className={`fixed left-0 top-0 bottom-0 ${isCollapsed ? 'w-[80px]' : 'w-[260px]'} bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col z-50 shadow-sm transition-all duration-300`}>
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
                className={`flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3 rounded-xl text-[14px] font-medium transition-all cursor-pointer w-full ${
                  isActive
                    ? "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-500 shadow-sm shadow-orange-100 dark:shadow-none"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <item.icon
                  className={`w-[18px] h-[18px] flex-shrink-0 ${
                    isActive ? "text-orange-500" : "text-gray-400"
                  }`}
                />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </div>

      </nav>


    </aside>
  );
}
