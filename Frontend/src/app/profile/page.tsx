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
  Trash2,
  Sparkles
} from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { useRouter } from "next/navigation";
import { AttendanceCalendarModal } from "../../components/AttendanceCalendarModal";
import { toast } from "sonner";
import { useLanguage } from "../../components/LanguageProvider";
import { ProfileOwnSkeleton } from "../../components/ui/LoadingState";

interface RecentActivity {
  title: string;
  time_ago: string;
  icon_type: string;
  created_at: string;
  res_id?: string;
  res_name?: string;
  collection_name?: string;
  review_id?: string;
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
  const { language, t } = useLanguage();
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [cover, setCover] = useState<string | null>(null);
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

  // Dynamic User Profile Statistics
  const [favoritesCount, setFavoritesCount] = useState<number>(0);
  const [reviewsCount, setReviewsCount] = useState<number>(0);
  const [discoveriesCount, setDiscoveriesCount] = useState<number>(0);
  const [streakCount, setStreakCount] = useState<number>(0);
  const [followersCount, setFollowersCount] = useState<number>(0);
  const [followingCount, setFollowingCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const [personalization, setPersonalization] = useState<{
    favorite_dishes: string[];
    spicy_level: string;
    dietary_restrictions: string[];
    allergies: string[];
    budget: string;
    location: string;
    age: number | '';
  } | null>(null);

  const translateRelativeTime = React.useCallback((timeAgo: string) => {
    if (language !== "en") return timeAgo;
    const lower = timeAgo.toLowerCase();
    if (lower.includes("vừa xong") || lower.includes("mới đây")) return "Just now";
    if (lower.includes("giây trước")) return lower.replace("giây trước", " seconds ago");
    if (lower.includes("phút trước")) return lower.replace("phút trước", " minutes ago");
    if (lower.includes("giờ trước")) return lower.replace("giờ trước", " hours ago");
    if (lower.includes("ngày trước")) return lower.replace("ngày trước", " days ago");
    if (lower.includes("tuần trước")) return lower.replace("tuần trước", " weeks ago");
    if (lower.includes("tháng trước")) return lower.replace("tháng trước", " months ago");
    if (lower.includes("năm trước")) return lower.replace("năm trước", " years ago");
    return timeAgo;
  }, [language]);

  const translateActivityTitle = React.useCallback((title: string, activity: RecentActivity) => {
    if (language !== "en") return title;
    
    // Pattern checks
    // 1. Visit
    if (title.includes("Ghé thăm nhà hàng") || title.includes("Đã ghé thăm quán")) {
      const resName = activity.res_name || title.match(/"([^"]+)"/)?.[1] || "";
      return resName ? `Visited restaurant "${resName}"` : "Visited restaurant";
    }
    // 2. Favorite
    if (title.includes("Đã yêu thích nhà hàng:") || title.includes("Thích quán") || title.includes("Đã yêu thích nhà hàng")) {
      const resName = activity.res_name || title.match(/"([^"]+)"/)?.[1] || "";
      return resName ? `Favorited restaurant "${resName}"` : "Favorited restaurant";
    }
    // 3. Remove
    if (title.includes("Xóa nhà hàng") && title.includes("ra khỏi Favorites")) {
      const resName = activity.res_name || title.match(/"([^"]+)"/)?.[1] || "";
      return resName ? `Removed restaurant "${resName}" from Favorites` : "Removed restaurant from Favorites";
    }
    if (title.includes("Xóa quán") && activity.res_name) {
      return `Removed ${activity.res_name} from favorites`;
    }
    // 4. Save
    if (title.includes("Lưu quán") || title.includes("Lưu nhà hàng")) {
      const resName = activity.res_name || title.match(/"([^"]+)"/)?.[1] || "";
      const colName = activity.collection_name || "";
      if (resName && colName) {
        return `Saved restaurant "${resName}" to collection "${colName}"`;
      }
      return `Saved restaurant`;
    }
    // 5. Rate
    if (title.includes("Đánh giá")) {
      const match = title.match(/Đánh giá (\d+)\s*sao/i) || title.match(/Rated (\d+)\s*stars/i);
      const stars = match ? match[1] : "5";
      const resName = activity.res_name || "";
      return resName ? `Rated ${stars} stars for restaurant "${resName}"` : `Rated ${stars} stars`;
    }
    // 6. Delete comment
    if (title.includes("Xóa bình luận")) {
      const resName = activity.res_name || "";
      return resName ? `Deleted comment at restaurant "${resName}"` : "Deleted comment";
    }
    
    // Fallback translations of generic terms:
    let trans = title;
    trans = trans.replace("Yêu thích", "Favorites");
    trans = trans.replace("Xóa bình luận", "Deleted comment");
    return trans;
  }, [language]);


  const handleActivityClick = (activity: RecentActivity) => {
    if (activity.icon_type === "heart" && activity.res_name) {
      router.push(`/favorites?highlight=${encodeURIComponent(activity.res_name)}`);
    } else if (activity.icon_type === "bookmark" && activity.res_name && activity.collection_name) {
      router.push(`/collections?highlight=${encodeURIComponent(activity.res_name)}&collection=${encodeURIComponent(activity.collection_name)}`);
    } else if ((activity.icon_type === "visit" || activity.icon_type === "star") && activity.res_id) {
      // Decode if base64 encoded, or pass directly
      let idToUse = activity.res_id;
      // Mask session ID or expose normal restaurant ID
      if (activity.icon_type === "star") {
        if (activity.review_id) {
          router.push(`/restaurant/${idToUse}?reviewId=${activity.review_id}#reviews-section`);
        } else {
          router.push(`/restaurant/${idToUse}#reviews-section`);
        }
      } else {
        router.push(`/restaurant/${idToUse}`);
      }
    } else if (activity.icon_type === "trash") {
      if (activity.title.includes("Yêu thích")) {
        router.push("/favorites");
      } else if (activity.title.includes("Xóa bình luận") && activity.res_id) {
        router.push(`/restaurant/${activity.res_id}`);
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
    const userId = localStorage.getItem("user_id") || "";
    setCover(localStorage.getItem(`user_cover_${userId}`));
    
    // Load active badge from localStorage on mount
    const savedBadge = localStorage.getItem("active_badge");
    if (savedBadge) {
      setActiveBadge(savedBadge);
    }

    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) {
          toast.error(t("profile.loginRequired"));
          router.push("/auth");
          return;
        }

        const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
        const userId = localStorage.getItem("user_id") || "";

        // Chạy song song 3 API calls thay vì tuần tự
        const [meResult, socialResult, onboardingResult] = await Promise.allSettled([
          fetch(`${API_BASE}/api/v1/users/me`, {
            headers: { "Authorization": `Bearer ${token}` }
          }),
          userId ? fetch(`${API_BASE}/api/v1/social/users/${userId}/profile`, {
            headers: { "Authorization": `Bearer ${token}` }
          }) : Promise.resolve(null),
          userId ? fetch(`${API_BASE}/api/v1/users/${userId}/onboarding`, {
            headers: { "Authorization": `Bearer ${token}` }
          }) : Promise.resolve(null),
        ]);

        // Xử lý kết quả /users/me
        if (meResult.status === "fulfilled" && meResult.value) {
          const res = meResult.value;
          if (res.status === 401) {
            window.dispatchEvent(new Event("auth-session-expired"));
            return;
          }
          if (res.ok) {
            const data = await res.json();
            if (data.created_at) {
              const date = new Date(data.created_at);
              const day = date.getDate();
              const month = date.getMonth() + 1;
              const year = date.getFullYear();
              if (language === "en") {
                const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                setJoinDate(`${monthNames[date.getMonth()]} ${day}, ${year}`);
              } else {
                setJoinDate(`ngày ${day} tháng ${month}, ${year}`);
              }
            }
            if (data.cover_url) {
              setCover(data.cover_url);
              localStorage.setItem(`user_cover_${userId}`, data.cover_url);
            }
            if (data.badges) {
              setBadges(data.badges);
              const currentSavedBadge = localStorage.getItem("active_badge");
              if (!currentSavedBadge) {
                const firstUnlocked = Object.entries(data.badges).find(([_, info]: any) => info.unlocked);
                if (firstUnlocked) {
                  localStorage.setItem("active_badge", firstUnlocked[0]);
                  setActiveBadge(firstUnlocked[0]);
                }
              }
            }
            if (data.culinary_vibes) setCulinaryVibes(data.culinary_vibes);
            if (data.recent_activities) setRecentActivities(data.recent_activities);
            if (data.active_dates) setActiveDates(data.active_dates);
            if (data.favorites_count !== undefined) setFavoritesCount(data.favorites_count);
            if (data.reviews_count !== undefined) setReviewsCount(data.reviews_count);
            if (data.discoveries_count !== undefined) setDiscoveriesCount(data.discoveries_count);
            if (data.streak_count !== undefined) setStreakCount(data.streak_count);
          }
        }

        // Xử lý kết quả social (followers/following)
        if (socialResult.status === "fulfilled" && socialResult.value) {
          const socialRes = socialResult.value as Response;
          if (socialRes.ok) {
            const socialData = await socialRes.json();
            setFollowersCount(socialData.followers_count ?? 0);
            setFollowingCount(socialData.following_count ?? 0);
          }
        }

        // Xử lý kết quả onboarding
        if (onboardingResult.status === "fulfilled" && onboardingResult.value) {
          const onboardingRes = onboardingResult.value as Response;
          if (onboardingRes.ok) {
            const obData = await onboardingRes.json();
            setPersonalization(obData);
          }
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (!mounted) return null;

  if (isLoading) {
    return (
      <AppShell>
        <ProfileOwnSkeleton />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 animate-fade-in-up">
        {/* Profile content unchanged below */}
            
            {/* Profile Header Card */}
            <div className="bg-white dark:bg-[#3D312A] rounded-[40px] shadow-sm border border-gray-100 dark:border-[#3D312A] overflow-hidden mb-8">
              {/* Cover Image Placeholder */}
              <div className="h-48 relative overflow-hidden bg-[#3D312A]">
                {cover ? (
                  <img src={cover} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-r from-brand via-pink-500 to-red-500 opacity-90">
                    <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                  </div>
                )}
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
                          title={t("profile.badgeTitleSelect") || "Chọn huy hiệu hiển thị"}
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
                            title={t("profile.badgeChangeTitle") || "Click để đổi danh hiệu"}
                          >
                            <span>{activeConfig.emoji}</span>
                            <span>{t(`profile.badges.${currentActiveBadge}.label`)}</span>
                          </span>
                        ) : (
                          <span 
                            onClick={() => setIsBadgeModalOpen(true)}
                            className="px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-wider cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200 shadow-sm flex items-center gap-1 select-none"
                            title={t("profile.badgeSelectTitle") || "Click để chọn danh hiệu"}
                          >
                            {t("profile.noTitle")}
                          </span>
                        );
                      })()}
                      • {t("profile.joinedFrom")} {joinDate || (language === 'en' ? "May, 2024" : "tháng 5, 2024")}
                    </p>
                    <p className="text-gray-500 dark:text-[#9A8A7A] font-medium flex items-center gap-2 text-sm mt-2">
                      <span className="flex items-center gap-1 cursor-pointer hover:text-brand transition-colors"><strong className="text-gray-900 dark:text-[#E6DFD5]">{followingCount}</strong> {t("profile.following")}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 cursor-pointer hover:text-brand transition-colors"><strong className="text-gray-900 dark:text-[#E6DFD5]">{followersCount}</strong> {t("profile.followers")}</span>
                    </p>
                  </div>
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={() => router.push("/settings")}
                      className="px-6 py-2.5 bg-brand text-white text-sm font-bold rounded-2xl hover:bg-brand-hover transition-all shadow-md shadow-brand/20 dark:shadow-none active:scale-95 cursor-pointer"
                    >
                      {t("profile.editProfile")}
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
                { label: t("profile.stats.discoveries"), value: discoveriesCount, icon: MapPin, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10" },
                { label: t("profile.stats.favorites"), value: favoritesCount, icon: Heart, color: "text-red-500", bg: "bg-red-50 dark:bg-red-500/10" },
                { label: t("profile.stats.reviews"), value: reviewsCount, icon: MessageSquare, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
                { label: "Streak", value: streakCount, icon: Flame, color: "text-brand dark:text-[#E8735A]", bg: "bg-brand-muted dark:bg-brand/10" },
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
                    {t("profile.badgesTitle")}
                  </h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    {Object.entries(BADGE_CONFIGS).map(([badgeIcon, badge], idx) => {
                      const info = badges[badgeIcon] || { unlocked: false, progress: 0, target: badgeIcon === "🧘" ? 1 : 20 };
                      const isZen = badgeIcon === "🧘";
                      return (
                        <div 
                          key={idx} 
                          className="group cursor-help relative flex flex-col items-center animate-fade-in-up"
                          style={{ animationDelay: `${idx * 0.04}s` }}
                        >
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
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t(`profile.badges.${badgeIcon}.label`)}</span>
                          
                          {/* Premium Tooltip */}
                          <div className="absolute bottom-full mb-2 bg-black/85 dark:bg-[#3D312A]/95 text-white text-[11px] font-medium px-2.5 py-1.5 rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 whitespace-nowrap shadow-xl border border-white/10 pointer-events-none">
                            {info.unlocked ? (
                              <span className="text-yellow-400 font-bold flex items-center gap-1">🌟 {t("profile.badgeUnlocked")}</span>
                            ) : (
                              isZen 
                                ? <span className="text-gray-300 font-bold">🧘 {t("profile.badgeZenUnlock")}</span>
                                : <span className="text-gray-300">{t("profile.progress")}: <strong className="text-brand dark:text-[#E8735A] font-extrabold">{info.progress}</strong>/{info.target}</span>
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
                    {t("profile.foodTaste")}
                  </h3>
                  <div className="space-y-4">
                    {(() => {
                      const getVibeColor = (label: string) => {
                        if (label.includes("Nướng")) return "bg-rose-600 dark:bg-rose-500";
                        if (label.includes("Chiên") || label.includes("Xào")) return "bg-orange-500 dark:bg-orange-400";
                        if (label.includes("Nước")) return "bg-amber-600 dark:bg-amber-500";
                        if (label.includes("Hấp") || label.includes("Trộn") || label.includes("Chay")) return "bg-emerald-500 dark:bg-emerald-400";
                        if (label.includes("Ngọt") || label.includes("Thức Uống")) return "bg-pink-500 dark:bg-pink-400";
                        return "bg-brand";
                      };

                      const getCulinaryVibeLabel = (l: string) => {
                        if (language !== "en") return l;
                        if (l.includes("Nướng")) return "BBQ & Grilled";
                        if (l.includes("Chiên")) return "Fried";
                        if (l.includes("Xào")) return "Stir-fried";
                        if (l.includes("Nước")) return "Soups & Stews";
                        if (l.includes("Hấp")) return "Steamed & Boiled";
                        if (l.includes("Trộn")) return "Salad & Mixed";
                        if (l.includes("Chay")) return "Vegetarian";
                        if (l.includes("Ngọt")) return "Sweets & Desserts";
                        if (l.includes("Thức Uống")) return "Drinks & Beverages";
                        return l;
                      };

                      const getMappedVibes = () => {
                        const map = {
                          "Món Nướng": 0,
                          "Món Chiên": 0,
                          "Món Xào": 0,
                          "Món Nước / Hầm": 0,
                          "Món Hấp / Luộc": 0,
                          "Món Trộn / Gỏi": 0,
                          "Món Chay": 0,
                          "Tráng Miệng / Ngọt": 0,
                          "Thức Uống / Pha Chế": 0
                        };

                        if (culinaryVibes.length > 0) {
                          culinaryVibes.forEach(item => {
                            const l = item.label;
                            if (l.includes("Nướng") || l.includes("🥩")) map["Món Nướng"] += item.percent;
                            else if (l.includes("Chiên") || l.includes("🍤")) {
                              map["Món Chiên"] += Math.ceil(item.percent / 2);
                              map["Món Xào"] += Math.floor(item.percent / 2);
                            }
                            else if (l.includes("Nước") || l.includes("Lẩu") || l.includes("🍜") || l.includes("🍲")) map["Món Nước / Hầm"] += item.percent;
                            else if (l.includes("Hấp") || l.includes("🥗")) {
                              map["Món Hấp / Luộc"] += Math.ceil(item.percent / 2);
                              map["Món Trộn / Gỏi"] += Math.floor(item.percent / 2);
                            }
                            else if (l.includes("Ngọt") || l.includes("🍰")) map["Tráng Miệng / Ngọt"] += item.percent;
                          });
                        }

                        const total = Object.values(map).reduce((a, b) => a + b, 0);
                        const mapped = Object.entries(map)
                          .map(([k, v]) => ({ label: k, percent: total > 0 ? Math.round((v / total) * 100) : 0 }))
                          .sort((a, b) => b.percent - a.percent);
                          
                        return mapped;
                      };

                      const displayVibes = getMappedVibes();

                      return displayVibes.map((item, idx) => (
                        <div key={idx}>
                          <div className="flex justify-between text-xs font-bold mb-1.5 text-gray-600 dark:text-[#9A8A7A]">
                            <span>{getCulinaryVibeLabel(item.label)}</span>
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

                {/* Onboarding Preferences Card */}
                {personalization && (
                  <div className="bg-white dark:bg-[#3D312A] rounded-[32px] p-8 shadow-sm border border-gray-100 dark:border-[#3D312A] space-y-5">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-[#E6DFD5] flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-brand dark:text-[#E8735A]" />
                      {t("profile.personalization.title")}
                    </h3>

                    
                    {/* Favorite Dishes */}
                    {personalization.favorite_dishes && personalization.favorite_dishes.length > 0 && (
                      <div>
                        <span className="text-[11px] font-black text-gray-400 dark:text-[#9A8A7A] uppercase tracking-wider block mb-2">{t("profile.personalization.favoriteDishes")}</span>
                        <div className="flex flex-wrap gap-1.5">
                          {personalization.favorite_dishes.map((dish, i) => (
                            <span key={i} className="px-2.5 py-1 bg-brand/5 border border-brand/20 dark:border-brand/10 text-brand dark:text-[#E8735A] text-xs font-bold rounded-xl">
                              {dish}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dietary Restrictions */}
                    {personalization.dietary_restrictions && personalization.dietary_restrictions.length > 0 && (
                       <div>
                         <span className="text-[11px] font-black text-gray-400 dark:text-[#9A8A7A] uppercase tracking-wider block mb-2">{t("profile.personalization.dietaryRestrictions")}</span>
                         <div className="flex flex-wrap gap-1.5">
                           {personalization.dietary_restrictions.map((diet, i) => (
                             <span key={i} className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-xs font-bold rounded-xl shadow-sm dark:shadow-[0_0_8px_rgba(52,211,153,0.15)]">
                               {diet}
                             </span>
                           ))}
                         </div>
                       </div>
                     )}
 
                     {/* Allergies */}
                     {personalization.allergies && personalization.allergies.length > 0 && (
                       <div>
                         <span className="text-[11px] font-black text-gray-400 dark:text-[#9A8A7A] uppercase tracking-wider block mb-2">{t("profile.personalization.allergies")}</span>
                         <div className="flex flex-wrap gap-1.5">
                           {personalization.allergies.map((allergy, i) => (
                             <span key={i} className="px-2.5 py-1 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-300 text-xs font-bold rounded-xl shadow-sm dark:shadow-[0_0_8px_rgba(239,68,68,0.15)]">
                               ⚠️ {allergy}
                             </span>
                           ))}
                         </div>
                       </div>
                     )}

                    {/* Budget & Spicy & Age */}
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-50 dark:border-gray-800">
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 dark:text-[#9A8A7A] uppercase tracking-wider block">{t("profile.personalization.spicyLevel")}</span>
                        <span className="text-xs font-bold text-gray-800 dark:text-[#E6DFD5] block mt-0.5">
                          {personalization.spicy_level === 'none' && `🌶️ ${t("profile.personalization.spicyLevelNone")}`}
                          {personalization.spicy_level === 'mild' && `🌶️ ${t("profile.personalization.spicyLevelMild")}`}
                          {personalization.spicy_level === 'medium' && `🌶️ ${t("profile.personalization.spicyLevelMedium")}`}
                          {personalization.spicy_level === 'hot' && `🌶️ ${t("profile.personalization.spicyLevelHot")}`}
                          {personalization.spicy_level === 'extra_hot' && `🌶️ ${t("profile.personalization.spicyLevelExtra")}`}
                          {!personalization.spicy_level && t("profile.personalization.notUpdated")}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 dark:text-[#9A8A7A] uppercase tracking-wider block">{t("profile.personalization.budget")}</span>
                        <span className="text-xs font-bold text-gray-800 dark:text-[#E6DFD5] block mt-0.5">
                          {personalization.budget === 'low' && `💵 ${t("profile.personalization.budgetLow")}`}
                          {personalization.budget === 'medium' && `💵 ${t("profile.personalization.budgetMedium")}`}
                          {personalization.budget === 'high' && `💵 ${t("profile.personalization.budgetHigh")}`}
                          {!personalization.budget && t("profile.personalization.notUpdated")}
                        </span>
                      </div>
                      <div className="mt-2">
                        <span className="text-[10px] font-bold text-gray-400 dark:text-[#9A8A7A] uppercase tracking-wider block">{t("profile.personalization.region")}</span>
                        <span className="text-xs font-bold text-gray-800 dark:text-[#E6DFD5] truncate block mt-0.5">
                          📍 {personalization.location || t("profile.personalization.notUpdated")}
                        </span>
                      </div>
                      <div className="mt-2">
                        <span className="text-[10px] font-bold text-gray-400 dark:text-[#9A8A7A] uppercase tracking-wider block">{t("profile.personalization.age")}</span>
                        <span className="text-xs font-bold text-gray-800 dark:text-[#E6DFD5] block mt-0.5">
                          {personalization.age ? `🎂 ${personalization.age} ${t("profile.personalization.yearsOld")}` : t("profile.personalization.notUpdated")}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Recent Activity */}
              <div className="lg:col-span-2">
                <div className="bg-white dark:bg-[#3D312A] rounded-[32px] p-8 shadow-sm border border-gray-100 dark:border-[#3D312A]">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-[#E6DFD5] mb-6 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-brand dark:text-[#E8735A]" />
                    {t("profile.recentActivity")}
                  </h3>
                  
                  {recentActivities.length === 0 ? (
                    <div className="text-center py-10 bg-gray-50 dark:bg-[#2A2420]/30 rounded-3xl border border-dashed border-gray-200 dark:border-[#4D3D32] px-6">
                      <Clock className="w-10 h-10 text-gray-400 mx-auto mb-3 opacity-60" />
                      <p className="text-sm font-semibold text-gray-700 dark:text-[#C8BFB0] mb-1">{t("profile.noActivity")}</p>
                      <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
                        {t("profile.noActivityDesc")}
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
                                className="flex gap-4 group cursor-pointer animate-fade-in-up"
                                style={{ animationDelay: `${idx * 0.05}s` }}
                              >
                                <div className={`w-10 h-10 ${bg} ${color} rounded-xl flex-shrink-0 flex items-center justify-center transition-transform group-hover:scale-110`}>
                                  <Icon className="w-5 h-5" />
                                </div>
                                <div className="flex-1 border-b border-gray-50 dark:border-[#3D312A] pb-4 group-last:border-0">
                                  <h4 className="text-sm font-bold text-gray-800 dark:text-[#E6DFD5] mb-0.5">{translateActivityTitle(activity.title, activity)}</h4>
                                  <span className="text-[11px] text-gray-400">{translateRelativeTime(activity.time_ago)}</span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-brand transition-colors self-center" />
                              </div>
                            );
                          });
                        })()}
                      </div>

                      <div className="flex gap-2 mt-6">
                        {recentActivities.length > visibleActivitiesCount && (
                          <button 
                            onClick={() => setVisibleActivitiesCount(prev => prev + 5)}
                            className="flex-1 py-3 text-xs font-bold text-gray-400 hover:text-brand hover:bg-gray-50 dark:hover:bg-[#2A2420]/30 rounded-2xl transition-all tracking-widest uppercase cursor-pointer text-center"
                          >
                            {t("profile.seeMoreActivity")}
                          </button>
                        )}
                        {visibleActivitiesCount > 5 && (
                          <button 
                            onClick={() => setVisibleActivitiesCount(5)}
                            className="flex-1 py-3 text-xs font-bold text-gray-400 hover:text-brand hover:bg-gray-50 dark:hover:bg-[#2A2420]/30 rounded-2xl transition-all tracking-widest uppercase cursor-pointer text-center"
                          >
                            {language === 'en' ? "SHOW LESS" : "ẨN BỚT"}
                          </button>
                        )}
                      </div>
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
                    {t("profile.modal.title")}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-[#9A8A7A] mt-0.5">
                    {t("profile.modal.subtitle")}
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
                          <span>🌟</span> {t("profile.modal.owned")} ({unlockedBadges.length})
                        </h4>
                        {unlockedBadges.length === 0 ? (
                          <div className="text-center py-6 bg-gray-50 dark:bg-[#2A2420]/30 rounded-2xl border border-dashed border-gray-200 dark:border-[#4D3D32]">
                            <p className="text-sm text-gray-400 font-semibold">{t("profile.modal.noBadges")}</p>
                            <p className="text-xs text-gray-400 mt-1 px-4">{t("profile.modal.noBadgesDesc")}</p>
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
                                      {t(`profile.badges.${badgeKey}.label`)}
                                      {isSelected && (
                                        <span className="px-2 py-0.5 rounded-full bg-brand/10 text-brand text-[9px] font-bold">{t("profile.modal.active")}</span>
                                      )}
                                    </h5>
                                    <p className="text-xs text-gray-500 dark:text-[#9A8A7A] truncate mt-0.5">{t(`profile.badges.${badgeKey}.description`)}</p>
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
                          <span>🔒</span> {t("profile.modal.locked")} ({Object.keys(BADGE_CONFIGS).length - unlockedBadges.length})
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
                                    {t(`profile.badges.${badgeKey}.label`)}
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
