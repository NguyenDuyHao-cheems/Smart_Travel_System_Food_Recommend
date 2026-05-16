"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Trophy, 
  MapPin, 
  Heart, 
  MessageSquare, 
  Clock, 
  Flame, 
  Star,
  ChevronRight,
  TrendingUp,
  UtensilsCrossed,
  Award,
  Calendar
} from "lucide-react";
import { AppShell } from "../../components/AppShell";

export default function ProfilePage() {
  const [username, setUsername] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setUsername(localStorage.getItem("username"));
    setAvatar(localStorage.getItem("user_avatar"));
  }, []);

  if (!mounted) return null;

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
        {/* Profile content unchanged below */}
            
            {/* Profile Header Card */}
            <div className="bg-white dark:bg-[#3D312A] rounded-[40px] shadow-sm border border-gray-100 dark:border-[#3D312A] overflow-hidden mb-8">
              {/* Cover Image Placeholder */}
              <div className="h-48 bg-gradient-to-r from-brand via-pink-500 to-red-500 relative">
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
              </div>
              
              <div className="px-8 pb-8 relative">
                {/* Avatar */}
                <div className="absolute -top-16 left-8">
                  <div className="w-32 h-32 rounded-[32px] border-8 border-white dark:border-[#3D312A] bg-white dark:bg-[#3D312A] shadow-xl overflow-hidden">
                    {avatar ? (
                      <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-brand-muted text-brand">
                        <span className="text-4xl font-bold">{username?.[0]}</span>
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 text-white rounded-2xl flex items-center justify-center border-4 border-white dark:border-[#3D312A] shadow-lg">
                    <Award className="w-5 h-5" />
                  </div>
                </div>

                <div className="pt-20 flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-[#E6DFD5] tracking-tight mb-1">{username || "Linh Nguyen"}</h1>
                    <p className="text-gray-500 dark:text-[#9A8A7A] font-medium flex items-center gap-2 text-sm">
                      <span className="px-2.5 py-0.5 rounded-full bg-brand-muted dark:bg-brand/20 text-brand-hover dark:text-[#E6DFD5] font-bold text-[10px] uppercase tracking-wider">Bậc thầy Phở</span>
                      • Tham gia từ tháng 5, 2024
                    </p>
                  </div>
                  
                  <div className="flex gap-3">
                    <button className="px-6 py-2.5 bg-brand text-white text-sm font-bold rounded-2xl hover:bg-brand-hover transition-all shadow-md shadow-brand/20 dark:shadow-none active:scale-95 cursor-pointer">
                      Chỉnh sửa hồ sơ
                    </button>
                    <button className="p-2.5 bg-gray-50 dark:bg-[#3D312A] text-gray-500 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all cursor-pointer border border-gray-100 dark:border-[#3D312A]">
                      <Calendar className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Khám phá", value: "24", icon: MapPin, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10" },
                { label: "Yêu thích", value: "128", icon: Heart, color: "text-red-500", bg: "bg-red-50 dark:bg-red-500/10" },
                { label: "Đánh giá", value: "12", icon: MessageSquare, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
                { label: "Streak", value: "5", icon: Flame, color: "text-brand", bg: "bg-brand-muted dark:bg-brand/10" },
              ].map((stat, idx) => (
                <div key={idx} className="bg-white dark:bg-[#3D312A] p-6 rounded-[32px] border border-gray-100 dark:border-[#3D312A] shadow-sm flex flex-col items-center text-center">
                  <div className={`w-12 h-12 ${stat.bg} rounded-2xl flex items-center justify-center ${stat.color} mb-3`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                  <span className="text-2xl font-black text-gray-900 dark:text-[#E6DFD5]">{stat.value}</span>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">{stat.label}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Badges & Info */}
              <div className="lg:col-span-1 space-y-8">
                <div className="bg-white dark:bg-[#3D312A] rounded-[32px] p-8 shadow-sm border border-gray-100 dark:border-[#3D312A]">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-[#E6DFD5] mb-6 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-brand" />
                    Huy hiệu của bạn
                  </h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    {[
                      { icon: "🍜", label: "Phở Master" },
                      { icon: "🌶️", label: "Cay Vô Đối" },
                      { icon: "🥬", label: "Thánh Rau" },
                      { icon: "🍦", label: "Kem Lạnh" },
                      { icon: "🥓", label: "Team Thịt" },
                      { icon: "☕", label: "Cú Đêm" },
                    ].map((badge, idx) => (
                      <div key={idx} className="group cursor-help">
                        <div className="w-16 h-16 bg-gray-50 dark:bg-[#3D312A] rounded-2xl flex items-center justify-center text-2xl mb-1.5 transition-transform group-hover:scale-110 grayscale hover:grayscale-0">
                          {badge.icon}
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">{badge.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-[#3D312A] rounded-[32px] p-8 shadow-sm border border-gray-100 dark:border-[#3D312A]">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-[#E6DFD5] mb-6 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-brand" />
                    Gu ẩm thực
                  </h3>
                  <div className="space-y-4">
                    {[
                      { label: "Món Việt", percent: 85, color: "bg-brand" },
                      { label: "Món Cay", percent: 60, color: "bg-red-500" },
                      { label: "Ăn vặt", percent: 45, color: "bg-yellow-500" },
                    ].map((item, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between text-xs font-bold mb-1.5 text-gray-600 dark:text-[#9A8A7A]">
                          <span>{item.label}</span>
                          <span>{item.percent}%</span>
                        </div>
                        <div className="h-2 bg-gray-50 dark:bg-[#3D312A] rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${item.percent}%` }}
                            className={`h-full ${item.color}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Activity */}
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-white dark:bg-[#3D312A] rounded-[32px] p-8 shadow-sm border border-gray-100 dark:border-[#3D312A]">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-[#E6DFD5] mb-6 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-brand" />
                    Hoạt động gần đây
                  </h3>
                  <div className="space-y-6">
                    {[
                      { title: "Đã thích nhà hàng 'Phở Thìn Lò Đúc'", time: "2 giờ trước", icon: Heart, color: "text-red-500", bg: "bg-red-50 dark:bg-red-500/10" },
                      { title: "Ghé thăm 'Bún chả Hương Liên'", time: "Hôm qua", icon: MapPin, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10" },
                      { title: "Đánh giá 5 sao cho 'Cà phê Giảng'", time: "2 ngày trước", icon: Star, color: "text-yellow-500", bg: "bg-yellow-50 dark:bg-yellow-500/10" },
                      { title: "Lưu món 'Bánh mì dân tổ' vào bộ sưu tập", time: "3 ngày trước", icon: UtensilsCrossed, color: "text-brand", bg: "bg-brand-muted dark:bg-brand/10" },
                    ].map((activity, idx) => (
                      <div key={idx} className="flex gap-4 group cursor-pointer">
                        <div className={`w-10 h-10 ${activity.bg} ${activity.color} rounded-xl flex-shrink-0 flex items-center justify-center transition-transform group-hover:scale-110`}>
                          <activity.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 border-b border-gray-50 dark:border-[#3D312A] pb-4 group-last:border-0">
                          <h4 className="text-sm font-bold text-gray-800 dark:text-[#E6DFD5] mb-0.5">{activity.title}</h4>
                          <span className="text-[11px] text-gray-400">{activity.time}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-brand transition-colors self-center" />
                      </div>
                    ))}
                  </div>
                  <button className="w-full mt-6 py-3 text-xs font-bold text-gray-400 hover:text-brand transition-colors tracking-widest uppercase">
                    Xem tất cả hoạt động
                  </button>
                </div>
              </div>
            </div>
          </div>
    </AppShell>
  );
}
