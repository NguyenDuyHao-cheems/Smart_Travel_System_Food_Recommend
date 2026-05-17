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
  const [joinDate, setJoinDate] = useState<string>("");
  const [mounted, setMounted] = useState(false);
  const [badges, setBadges] = useState<Record<string, { unlocked: boolean; progress: number; target: number }>>({});
  const [culinaryVibes, setCulinaryVibes] = useState<{ label: string; percent: number; count: number }[]>([]);

  useEffect(() => {
    setMounted(true);
    setUsername(localStorage.getItem("username"));
    setAvatar(localStorage.getItem("user_avatar"));

    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) return;

        const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
        const res = await fetch(`${API_BASE}/api/v1/users/me`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.created_at) {
            const date = new Date(data.created_at);
            const day = date.getDate();
            const month = date.getMonth() + 1;
            const year = date.getFullYear();
            setJoinDate(`ngày ${day} tháng ${month}, ${year}`);
          }
          if (data.badges) {
            setBadges(data.badges);
          }
          if (data.culinary_vibes) {
            setCulinaryVibes(data.culinary_vibes);
          }
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err);
      }
    };
    fetchProfile();
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
                      <div className="w-full h-full flex items-center justify-center bg-brand-muted text-brand dark:text-[#E8735A]">
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
                      • Tham gia từ {joinDate || "tháng 5, 2024"}
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
                { label: "Streak", value: "5", icon: Flame, color: "text-brand dark:text-[#E8735A]", bg: "bg-brand-muted dark:bg-brand/10" },
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
                    <Trophy className="w-5 h-5 text-brand dark:text-[#E8735A]" />
                    Huy hiệu của bạn
                  </h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    {[
                      { icon: "🍜", label: "Phở Master", colorClass: "bg-orange-50 dark:bg-orange-950/20 border-orange-200/50 dark:border-orange-900/30 text-orange-600" },
                      { icon: "🌶️", label: "Cay Vô Đối", colorClass: "bg-red-50 dark:bg-red-950/20 border-red-200/50 dark:border-red-900/30 text-red-600" },
                      { icon: "🥬", label: "Thánh Rau", colorClass: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-900/30 text-emerald-600" },
                      { icon: "🍦", label: "Kem Lạnh", colorClass: "bg-sky-50 dark:bg-sky-950/20 border-sky-200/50 dark:border-sky-900/30 text-sky-600" },
                      { icon: "🥓", label: "Team Thịt", colorClass: "bg-amber-50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-900/30 text-amber-600" },
                      { icon: "☕", label: "Cú Đêm", colorClass: "bg-purple-50 dark:bg-purple-950/20 border-purple-200/50 dark:border-purple-900/30 text-purple-600" },
                      { icon: "🧘", label: "Thiền Sư", isZen: true },
                    ].map((badge, idx) => {
                      const info = badges[badge.icon] || { unlocked: false, progress: 0, target: badge.isZen ? 1 : 20 };
                      return (
                        <div key={idx} className="group cursor-help relative flex flex-col items-center">
                          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl mb-1.5 transition-all duration-300 relative overflow-hidden ${
                            info.unlocked 
                              ? (badge.isZen 
                                  ? "bg-gradient-to-tr from-amber-50 to-yellow-100 dark:from-amber-950/20 dark:to-yellow-950/40 border border-yellow-300/30 shadow-[0_0_15px_rgba(251,191,36,0.25)] scale-100 group-hover:scale-110" 
                                  : `${badge.colorClass} border scale-100 group-hover:scale-110`)
                              : "bg-gray-100/70 dark:bg-[#2A2420]/50 border border-dashed border-gray-200 dark:border-gray-800 opacity-40 grayscale group-hover:opacity-60"
                          }`}>
                            {badge.isZen && info.unlocked && (
                              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.6)_0%,transparent_70%)] animate-pulse rounded-full w-12 h-12 m-auto" />
                            )}
                            <span className="relative z-10">{badge.icon}</span>
                          </div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{badge.label}</span>
                          
                          {/* Premium Tooltip */}
                          <div className="absolute bottom-full mb-2 bg-black/85 dark:bg-[#3D312A]/95 text-white text-[11px] font-medium px-2.5 py-1.5 rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 whitespace-nowrap shadow-xl border border-white/10 pointer-events-none">
                            {info.unlocked ? (
                              <span className="text-yellow-400 font-bold flex items-center gap-1">🌟 Đã mở khóa!</span>
                            ) : (
                              badge.isZen 
                                ? <span className="text-gray-300 font-bold">🧘 Ăn chay để mở khóa</span>
                                : <span className="text-gray-300">Tiến độ: <strong className="text-brand dark:text-[#E8735A] font-extrabold">{info.progress}</strong>/{info.target}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white dark:bg-[#3D312A] rounded-[32px] p-8 shadow-sm border border-gray-100 dark:border-[#3D312A]">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-[#E6DFD5] mb-6 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-brand dark:text-[#E8735A]" />
                    Gu ẩm thực
                  </h3>
                  <div className="space-y-4">
                    {(() => {
                      const getVibeColor = (label: string) => {
                        if (label.includes("🍜")) return "bg-amber-600 dark:bg-amber-500";
                        if (label.includes("🥩")) return "bg-rose-600 dark:bg-rose-500";
                        if (label.includes("🍲")) return "bg-orange-500 dark:bg-orange-400";
                        if (label.includes("🍤")) return "bg-yellow-500 dark:bg-yellow-400";
                        if (label.includes("🥗")) return "bg-emerald-500 dark:bg-emerald-400";
                        if (label.includes("🍰")) return "bg-pink-500 dark:bg-pink-400";
                        return "bg-brand";
                      };

                      const hasVibes = culinaryVibes.some(v => v.count > 0);

                      if (!hasVibes) {
                        return (
                          <div className="flex flex-col items-center justify-center py-6 text-center">
                            <div className="w-16 h-16 bg-brand/5 dark:bg-brand/10 rounded-full flex items-center justify-center text-3xl mb-4 animate-bounce">
                              🔍
                            </div>
                            <h4 className="text-sm font-bold text-gray-800 dark:text-[#E6DFD5] mb-2">
                              Chưa có dữ liệu gu ẩm thực
                            </h4>
                            <p className="text-[11px] text-gray-500 dark:text-[#9A8A7A] max-w-[240px] leading-relaxed mx-auto">
                              Hãy thực hiện tìm kiếm món ăn yêu thích để kích hoạt bản đồ ẩm thực của riêng bạn! 🌟
                            </p>
                          </div>
                        );
                      }

                      return culinaryVibes
                        .filter(item => item.count > 0)
                        .map((item, idx) => (
                          <div key={idx}>
                            <div className="flex justify-between text-xs font-bold mb-1.5 text-gray-600 dark:text-[#9A8A7A]">
                              <span>{item.label}</span>
                              <span className="text-brand dark:text-[#E8735A]">{item.percent}%</span>
                            </div>
                            <div className="h-2.5 bg-gray-100 dark:bg-gray-800/40 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${item.percent}%` }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                className={`h-full rounded-full ${getVibeColor(item.label)}`}
                              />
                            </div>
                          </div>
                        ));
                    })()}
                  </div>
                </div>
              </div>

              {/* Right Column: Activity */}
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-white dark:bg-[#3D312A] rounded-[32px] p-8 shadow-sm border border-gray-100 dark:border-[#3D312A]">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-[#E6DFD5] mb-6 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-brand dark:text-[#E8735A]" />
                    Hoạt động gần đây
                  </h3>
                  <div className="space-y-6">
                    {[
                      { title: "Đã thích nhà hàng 'Phở Thìn Lò Đúc'", time: "2 giờ trước", icon: Heart, color: "text-red-500", bg: "bg-red-50 dark:bg-red-500/10" },
                      { title: "Ghé thăm 'Bún chả Hương Liên'", time: "Hôm qua", icon: MapPin, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10" },
                      { title: "Đánh giá 5 sao cho 'Cà phê Giảng'", time: "2 ngày trước", icon: Star, color: "text-yellow-500", bg: "bg-yellow-50 dark:bg-yellow-500/10" },
                      { title: "Lưu món 'Bánh mì dân tổ' vào bộ sưu tập", time: "3 ngày trước", icon: UtensilsCrossed, color: "text-brand dark:text-[#E8735A]", bg: "bg-brand-muted dark:bg-brand/10" },
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
