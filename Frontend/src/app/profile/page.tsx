"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Calendar,
  Trash2
} from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { useRouter } from "next/navigation";
import { AttendanceCalendarModal } from "../../components/AttendanceCalendarModal";

interface RecentActivity {
  title: string;
  time_ago: string;
  icon_type: string;
  created_at: string;
  res_id?: string;
  res_name?: string;
  collection_name?: string;
}

const BADGE_CONFIGS: Record<string, {
  label: string;
  colorClass: string;
  bgClass: string;
  emoji: string;
  description: string;
}> = {
  "🍜": {
    label: "Phở Master",
    colorClass: "bg-orange-50 dark:bg-orange-950/20 border-orange-200/50 dark:border-orange-900/30 text-orange-600",
    bgClass: "bg-gradient-to-tr from-orange-500 to-amber-500 text-white shadow-orange-500/20",
    emoji: "🍜",
    description: "Ăn phở như một vị thần"
  },
  "🌶️": {
    label: "Cay Vô Đối",
    colorClass: "bg-red-50 dark:bg-red-950/20 border-red-200/50 dark:border-red-900/30 text-red-600",
    bgClass: "bg-gradient-to-tr from-red-500 to-rose-500 text-white shadow-red-500/20",
    emoji: "🌶️",
    description: "Kẻ thách thức mọi cấp độ cay"
  },
  "🥬": {
    label: "Thánh Rau",
    colorClass: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-900/30 text-emerald-600",
    bgClass: "bg-gradient-to-tr from-emerald-500 to-teal-500 text-white shadow-emerald-500/20",
    emoji: "🥬",
    description: "Tín đồ của sự thanh tịnh và chất xơ"
  },
  "🍦": {
    label: "Kem Lạnh",
    colorClass: "bg-sky-50 dark:bg-sky-950/20 border-sky-200/50 dark:border-sky-900/30 text-sky-600",
    bgClass: "bg-gradient-to-tr from-sky-500 to-blue-500 text-white shadow-sky-500/20",
    emoji: "🍦",
    description: "Tâm hồn ngọt ngào và mát lạnh"
  },
  "🥓": {
    label: "Team Thịt",
    colorClass: "bg-amber-50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-900/30 text-amber-600",
    bgClass: "bg-gradient-to-tr from-amber-500 to-yellow-600 text-white shadow-amber-500/20",
    emoji: "🥓",
    description: "Không thịt đời không nể"
  },
  "☕": {
    label: "Cú Đêm",
    colorClass: "bg-purple-50 dark:bg-purple-950/20 border-purple-200/50 dark:border-purple-900/30 text-purple-600",
    bgClass: "bg-gradient-to-tr from-purple-500 to-indigo-500 text-white shadow-purple-500/20",
    emoji: "☕",
    description: "Thợ săn đồ ăn đêm chuyên nghiệp"
  },
  "🧘": {
    label: "Thiền Sư",
    colorClass: "bg-gradient-to-tr from-amber-50 to-yellow-100 dark:from-amber-950/20 dark:to-yellow-950/40 border border-yellow-300/30 text-amber-600",
    bgClass: "bg-gradient-to-tr from-yellow-500 to-amber-500 text-white shadow-yellow-500/30",
    emoji: "🧘",
    description: "Ăn chay trường, tâm tịnh như nước"
  }
};

export default function ProfilePage() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [joinDate, setJoinDate] = useState<string>("");
  const [mounted, setMounted] = useState(false);
  const [badges, setBadges] = useState<Record<string, { unlocked: boolean; progress: number; target: number }>>({});
  const [culinaryVibes, setCulinaryVibes] = useState<{ label: string; percent: number; count: number }[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [visibleActivitiesCount, setVisibleActivitiesCount] = useState<number>(5);
  const [activeDates, setActiveDates] = useState<string[]>([]);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [activeBadge, setActiveBadge] = useState<string | null>(null);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);

  const handleActivityClick = (activity: RecentActivity) => {
    if (activity.icon_type === "heart" && activity.res_name) {
      router.push(`/favorites?highlight=${encodeURIComponent(activity.res_name)}`);
    } else if (activity.icon_type === "bookmark" && activity.res_name && activity.collection_name) {
      router.push(`/collections?highlight=${encodeURIComponent(activity.res_name)}&collection=${encodeURIComponent(activity.collection_name)}`);
    } else if ((activity.icon_type === "visit" || activity.icon_type === "star") && activity.res_id) {
      // Decode if base64 encoded, or pass directly
      let idToUse = activity.res_id;
      // Mask session ID or expose normal restaurant ID
      router.push(`/restaurant/${idToUse}`);
    } else if (activity.icon_type === "trash") {
      if (activity.title.includes("Yêu thích")) {
        router.push("/favorites");
      } else {
        const collName = activity.collection_name || "";
        router.push(`/collections?collection=${encodeURIComponent(collName)}`);
      }
    }
  };

  useEffect(() => {
    setMounted(true);
    setUsername(localStorage.getItem("username"));
    setAvatar(localStorage.getItem("user_avatar"));
    
    // Load active badge from localStorage on mount
    const savedBadge = localStorage.getItem("active_badge");
    if (savedBadge) {
      setActiveBadge(savedBadge);
    }

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
            
            // Auto select first unlocked badge if nothing is saved yet
            const currentSavedBadge = localStorage.getItem("active_badge");
            if (!currentSavedBadge) {
              const firstUnlocked = Object.entries(data.badges).find(([_, info]: any) => info.unlocked);
              if (firstUnlocked) {
                localStorage.setItem("active_badge", firstUnlocked[0]);
                setActiveBadge(firstUnlocked[0]);
              }
            }
          }
          if (data.culinary_vibes) {
            setCulinaryVibes(data.culinary_vibes);
          }
          if (data.recent_activities) {
            setRecentActivities(data.recent_activities);
          }
          if (data.active_dates) {
            setActiveDates(data.active_dates);
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
                {(() => {
                  const unlockedBadges = Object.keys(badges).filter(k => badges[k]?.unlocked);
                  const currentActiveBadge = activeBadge === "none" 
                    ? null 
                    : (activeBadge && badges[activeBadge]?.unlocked 
                        ? activeBadge 
                        : (activeBadge === null && unlockedBadges.length > 0 ? unlockedBadges[0] : null));
                  const activeConfig = currentActiveBadge ? BADGE_CONFIGS[currentActiveBadge] : null;

                  return (
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
                      {activeConfig && (
                        <div 
                          onClick={() => setIsBadgeModalOpen(true)}
                          className={`absolute -bottom-2 -right-2 w-10 h-10 ${activeConfig.bgClass} border-4 border-white dark:border-[#3D312A] rounded-2xl flex items-center justify-center shadow-lg cursor-pointer hover:scale-110 active:scale-95 transition-all duration-200 select-none`}
                          title="Chọn huy hiệu hiển thị"
                        >
                          <Award className="w-5 h-5 text-white" />
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="pt-20 flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-[#E6DFD5] tracking-tight mb-1">{username || "Linh Nguyen"}</h1>
                    <p className="text-gray-500 dark:text-[#9A8A7A] font-medium flex items-center gap-2 text-sm">
                      {(() => {
                        const unlockedBadges = Object.keys(badges).filter(k => badges[k]?.unlocked);
                        const currentActiveBadge = activeBadge === "none" 
                          ? null 
                          : (activeBadge && badges[activeBadge]?.unlocked 
                              ? activeBadge 
                              : (activeBadge === null && unlockedBadges.length > 0 ? unlockedBadges[0] : null));
                        const activeConfig = currentActiveBadge ? BADGE_CONFIGS[currentActiveBadge] : null;
                        
                        return activeConfig ? (
                          <span 
                            onClick={() => setIsBadgeModalOpen(true)}
                            className={`px-2.5 py-0.5 rounded-full ${activeConfig.colorClass} font-bold text-[10px] uppercase tracking-wider cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200 shadow-sm flex items-center gap-1 select-none`}
                            title="Click để đổi danh hiệu"
                          >
                            <span>{activeConfig.emoji}</span>
                            <span>{activeConfig.label}</span>
                          </span>
                        ) : (
                          <span 
                            onClick={() => setIsBadgeModalOpen(true)}
                            className="px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-wider cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200 shadow-sm flex items-center gap-1 select-none"
                            title="Click để chọn danh hiệu"
                          >
                            Chưa có danh hiệu
                          </span>
                        );
                      })()}
                      • Tham gia từ {joinDate || "tháng 5, 2024"}
                    </p>
                  </div>
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={() => router.push("/onboarding?edit=true")}
                      className="px-6 py-2.5 bg-brand text-white text-sm font-bold rounded-2xl hover:bg-brand-hover transition-all shadow-md shadow-brand/20 dark:shadow-none active:scale-95 cursor-pointer"
                    >
                      Chỉnh sửa hồ sơ
                    </button>
                    <button 
                      onClick={() => setIsCalendarOpen(true)}
                      className="p-2.5 bg-gray-50 dark:bg-[#3D312A] text-gray-500 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all cursor-pointer border border-gray-100 dark:border-[#3D312A]"
                    >
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
                    {Object.entries(BADGE_CONFIGS).map(([badgeIcon, badge], idx) => {
                      const info = badges[badgeIcon] || { unlocked: false, progress: 0, target: badgeIcon === "🧘" ? 1 : 20 };
                      const isZen = badgeIcon === "🧘";
                      return (
                        <div key={idx} className="group cursor-help relative flex flex-col items-center">
                          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl mb-1.5 transition-all duration-300 relative overflow-hidden ${
                            info.unlocked 
                              ? (isZen 
                                  ? "bg-gradient-to-tr from-amber-50 to-yellow-100 dark:from-amber-950/20 dark:to-yellow-950/40 border border-yellow-300/30 shadow-[0_0_15px_rgba(251,191,36,0.25)] scale-100 group-hover:scale-110" 
                                  : `${badge.colorClass} border scale-100 group-hover:scale-110`)
                              : "bg-gray-100/70 dark:bg-[#2A2420]/50 border border-dashed border-gray-200 dark:border-gray-800 opacity-40 grayscale group-hover:opacity-60"
                          }`}>
                            {isZen && info.unlocked && (
                              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.6)_0%,transparent_70%)] animate-pulse rounded-full w-12 h-12 m-auto" />
                            )}
                            <span className="relative z-10">{badgeIcon}</span>
                          </div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{badge.label}</span>
                          
                          {/* Premium Tooltip */}
                          <div className="absolute bottom-full mb-2 bg-black/85 dark:bg-[#3D312A]/95 text-white text-[11px] font-medium px-2.5 py-1.5 rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 whitespace-nowrap shadow-xl border border-white/10 pointer-events-none">
                            {info.unlocked ? (
                              <span className="text-yellow-400 font-bold flex items-center gap-1">🌟 Đã mở khóa!</span>
                            ) : (
                              isZen 
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

                      const defaultVibes = [
                        { label: "Món Nước (Ninh / Hầm) 🍜", percent: 0, count: 0 },
                        { label: "Món Nướng (BBQ) 🥩", percent: 0, count: 0 },
                        { label: "Món Lẩu 🍲", percent: 0, count: 0 },
                        { label: "Món Chiên / Xào 🍤", percent: 0, count: 0 },
                        { label: "Món Hấp / Trộn (Thanh đạm) 🥗", percent: 0, count: 0 },
                        { label: "Món Ngọt / Tráng miệng 🍰", percent: 0, count: 0 }
                      ];

                      const displayVibes = culinaryVibes.length > 0 ? culinaryVibes : defaultVibes;

                      return displayVibes.map((item, idx) => (
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
                  
                  {recentActivities.length === 0 ? (
                    <div className="text-center py-10 bg-gray-50 dark:bg-[#2A2420]/30 rounded-3xl border border-dashed border-gray-200 dark:border-[#4D3D32] px-6">
                      <Clock className="w-10 h-10 text-gray-400 mx-auto mb-3 opacity-60" />
                      <p className="text-sm font-semibold text-gray-700 dark:text-[#C8BFB0] mb-1">Không có hoạt động gần đây</p>
                      <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
                        Bạn chưa thực hiện hành động nào trong 3 ngày qua. Hãy bắt đầu trải nghiệm ứng dụng bằng cách xem thông tin, thích món ăn hay lưu trữ vào bộ sưu tập nhé!
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-6">
                        {(() => {
                          const getActivityIcon = (iconType: string) => {
                            switch (iconType) {
                              case "heart":
                                return { Icon: Heart, color: "text-red-500", bg: "bg-red-50 dark:bg-red-500/10" };
                              case "visit":
                                return { Icon: MapPin, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10" };
                              case "star":
                                return { Icon: Star, color: "text-yellow-500", bg: "bg-yellow-50 dark:bg-yellow-500/10" };
                              case "bookmark":
                                return { Icon: UtensilsCrossed, color: "text-brand dark:text-[#E8735A]", bg: "bg-brand-muted dark:bg-brand/10" };
                              case "trash":
                                return { Icon: Trash2, color: "text-red-500", bg: "bg-red-50 dark:bg-red-500/10" };
                              default:
                                return { Icon: Clock, color: "text-gray-500", bg: "bg-gray-50 dark:bg-gray-500/10" };
                            }
                          };

                          return recentActivities.slice(0, visibleActivitiesCount).map((activity, idx) => {
                            const { Icon, color, bg } = getActivityIcon(activity.icon_type);
                            return (
                              <div 
                                key={idx} 
                                onClick={() => handleActivityClick(activity)}
                                className="flex gap-4 group cursor-pointer"
                              >
                                <div className={`w-10 h-10 ${bg} ${color} rounded-xl flex-shrink-0 flex items-center justify-center transition-transform group-hover:scale-110`}>
                                  <Icon className="w-5 h-5" />
                                </div>
                                <div className="flex-1 border-b border-gray-50 dark:border-[#3D312A] pb-4 group-last:border-0">
                                  <h4 className="text-sm font-bold text-gray-800 dark:text-[#E6DFD5] mb-0.5">{activity.title}</h4>
                                  <span className="text-[11px] text-gray-400">{activity.time_ago}</span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-brand transition-colors self-center" />
                              </div>
                            );
                          });
                        })()}
                      </div>

                      {recentActivities.length > visibleActivitiesCount && (
                        <button 
                          onClick={() => setVisibleActivitiesCount(prev => Math.min(prev + 5, 15))}
                          className="w-full mt-6 py-3 text-xs font-bold text-gray-400 hover:text-brand hover:bg-gray-50 dark:hover:bg-[#2A2420]/30 rounded-2xl transition-all tracking-widest uppercase cursor-pointer text-center"
                        >
                          Xem thêm hoạt động
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
      <AttendanceCalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        activeDates={activeDates}
      />

      {/* Badge Selection Modal */}
      <AnimatePresence>
        {isBadgeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
              onClick={() => setIsBadgeModalOpen(false)}
            />
            
            {/* Modal Container */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative bg-white dark:bg-[#3D312A] w-full max-w-lg rounded-[32px] shadow-2xl border border-gray-100 dark:border-[#4D3D32] overflow-hidden z-10"
            >
              {/* Header */}
              <div className="px-6 pt-6 pb-4 border-b border-gray-50 dark:border-[#4D3D32] flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-[#E6DFD5] tracking-tight">
                    Chọn Danh Hiệu Hiển Thị
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-[#9A8A7A] mt-0.5">
                    Danh hiệu được chọn sẽ xuất hiện dưới tên và làm đẹp cho Avatar của bạn
                  </p>
                </div>
                <button 
                  onClick={() => setIsBadgeModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-50 dark:bg-[#2A2420] text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
              
              {/* Content */}
              <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
                {/* Section 1: Owned Badges */}
                <div>
                  {(() => {
                    const unlockedBadges = Object.keys(badges).filter(k => badges[k]?.unlocked);
                    const currentActiveBadge = activeBadge === "none" 
                      ? null 
                      : (activeBadge && badges[activeBadge]?.unlocked 
                          ? activeBadge 
                          : (activeBadge === null && unlockedBadges.length > 0 ? unlockedBadges[0] : null));
                    
                    return (
                      <>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <span>🌟</span> Danh hiệu đã sở hữu ({unlockedBadges.length})
                        </h4>
                        {unlockedBadges.length === 0 ? (
                          <div className="text-center py-6 bg-gray-50 dark:bg-[#2A2420]/30 rounded-2xl border border-dashed border-gray-200 dark:border-[#4D3D32]">
                            <p className="text-sm text-gray-400 font-semibold">Bạn chưa mở khóa danh hiệu nào</p>
                            <p className="text-xs text-gray-400 mt-1 px-4">Hãy tiếp tục tương tác và tìm kiếm để tích lũy huy hiệu nhé!</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-3">
                            {unlockedBadges.map((badgeKey) => {
                              const cfg = BADGE_CONFIGS[badgeKey];
                              const isSelected = currentActiveBadge === badgeKey;
                              if (!cfg) return null;
                              return (
                                <div 
                                  key={badgeKey}
                                  onClick={() => {
                                    if (isSelected) {
                                      localStorage.setItem("active_badge", "none");
                                      setActiveBadge("none");
                                    } else {
                                      localStorage.setItem("active_badge", badgeKey);
                                      setActiveBadge(badgeKey);
                                    }
                                    setIsBadgeModalOpen(false);
                                  }}
                                  className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all duration-200 group ${
                                    isSelected 
                                      ? "bg-brand/5 border-brand dark:bg-brand/10 dark:border-brand/40 shadow-sm" 
                                      : "bg-white dark:bg-[#2A2420]/50 border-gray-100 dark:border-transparent hover:border-gray-200 dark:hover:border-[#4D3D32] hover:bg-gray-50 dark:hover:bg-gray-800"
                                  }`}
                                >
                                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${cfg.bgClass} flex-shrink-0 transition-transform group-hover:scale-105`}>
                                    {cfg.emoji}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h5 className="text-sm font-black text-gray-900 dark:text-[#E6DFD5] flex items-center gap-1.5">
                                      {cfg.label}
                                      {isSelected && (
                                        <span className="px-2 py-0.5 rounded-full bg-brand/10 text-brand text-[9px] font-bold">Đang hiển thị</span>
                                      )}
                                    </h5>
                                    <p className="text-xs text-gray-500 dark:text-[#9A8A7A] truncate mt-0.5">{cfg.description}</p>
                                  </div>
                                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${
                                    isSelected 
                                      ? "bg-brand border-brand text-white" 
                                      : "border-gray-200 dark:border-gray-700 text-transparent"
                                  }`}>
                                    ✓
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
                
                {/* Section 2: Locked Badges */}
                <div>
                  {(() => {
                    const unlockedBadges = Object.keys(badges).filter(k => badges[k]?.unlocked);
                    
                    return (
                      <>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <span>🔒</span> Chưa sở hữu ({Object.keys(BADGE_CONFIGS).length - unlockedBadges.length})
                        </h4>
                        <div className="grid grid-cols-1 gap-3">
                          {Object.keys(BADGE_CONFIGS).map((badgeKey) => {
                            const cfg = BADGE_CONFIGS[badgeKey];
                            const info = badges[badgeKey] || { unlocked: false, progress: 0, target: badgeKey === "🧘" ? 1 : 20 };
                            if (info.unlocked) return null;
                            if (!cfg) return null;
                            return (
                              <div 
                                key={badgeKey}
                                className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50/50 dark:bg-[#2A2420]/20 border border-transparent opacity-60 grayscale select-none"
                              >
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-gray-200 dark:bg-gray-800 text-gray-400 flex-shrink-0">
                                  {cfg.emoji}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h5 className="text-sm font-bold text-gray-700 dark:text-[#9A8A7A] flex items-center gap-1.5">
                                    {cfg.label}
                                  </h5>
                                  {/* Progress bar */}
                                  <div className="mt-2 flex items-center gap-2">
                                    <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-gray-400 dark:bg-gray-600 rounded-full"
                                        style={{ width: `${(info.progress / info.target) * 100}%` }}
                                      />
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap">
                                      {info.progress}/{info.target}
                                    </span>
                                  </div>
                                </div>
                                <span className="text-gray-400 dark:text-gray-600">🔒</span>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
