"use client";
import React from "react";
import { Compass, Heart, Clock, Sparkles, FolderOpen, ChevronLeft } from "lucide-react";

const navItems = [
  { icon: Compass, label: "Khám phá", active: true },
  { icon: Heart, label: "Yêu thích", active: false },
  { icon: Clock, label: "Lịch sử", active: false },
  { icon: Sparkles, label: "Gợi ý cho bạn", active: false },
  { icon: FolderOpen, label: "Bộ sưu tập", active: false },
];

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[260px] bg-white border-r border-gray-100 flex flex-col z-50 shadow-sm">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-gray-50">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shadow-md shadow-orange-200">
            <span className="text-white text-lg">🍜</span>
          </div>
          <span className="text-xl font-bold text-gray-800 tracking-tight">
            Food<span className="text-orange-500">AI</span>
          </span>
        </div>
        <button className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer">
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pt-4 overflow-y-auto">
        <div className="flex flex-col gap-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-medium transition-all cursor-pointer w-full text-left ${
                item.active
                  ? "bg-orange-50 text-orange-600 shadow-sm shadow-orange-100"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              }`}
            >
              <item.icon
                className={`w-[18px] h-[18px] ${
                  item.active ? "text-orange-500" : "text-gray-400"
                }`}
              />
              {item.label}
            </button>
          ))}
        </div>

        {/* AI Suggestion Card */}
        <div className="mt-6 mx-1 p-4 bg-gradient-to-br from-orange-50 to-amber-50/60 rounded-2xl border border-orange-100/60">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-orange-500 font-semibold text-[13px]">
              AI Gợi ý hôm nay ✨
            </span>
          </div>
          <p className="text-[12px] text-gray-500 leading-relaxed mb-3">
            Hôm nay trời nóng, thử món mát lạnh, thanh đạm nhé!
          </p>
          <div className="w-full h-[72px] rounded-xl overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1567337710282-00832b415979?w=400&h=200&fit=crop"
              alt="Gợi ý món ăn"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </nav>

      {/* User Profile */}
      <div className="px-5 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-orange-100">
            <img
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face"
              alt="User avatar"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Linh Nguyen</p>
            <p className="text-[11px] text-gray-400 font-medium">Student</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
