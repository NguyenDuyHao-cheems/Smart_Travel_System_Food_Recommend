"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Headphones,
  Globe,
  Search,
  Star,
  MapPin,
  Heart,
  Flame,
  Snowflake,
  HeartPulse,
  Coins,
  SlidersHorizontal,
  Brain,
  ShieldCheck,
  Sparkles,
  User,
  ChevronRight,
} from "lucide-react";
import { Playfair_Display, Roboto } from "next/font/google";
import { Sidebar } from "../components/Sidebar";
import { ThemeToggle } from "../components/ThemeToggle";
import { SurveyModal } from "../components/SurveyModal";
import { BudgetSelector, type BudgetOption } from "../components/BudgetSelector";

const playfair = Playfair_Display({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "600", "700"],
});

const roboto = Roboto({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "700", "900"],
});

/* ───────── [HIDDEN] Mock Data — Uncomment khi kết nối API ───────── */

const vibeFilters = [
  { label: "Cay nóng", icon: Flame, color: "orange" },
  { label: "Mát lạnh", icon: Snowflake, color: "sky" },
  { label: "Lãng mạn", icon: HeartPulse, color: "pink" },
  { label: "Giá sinh viên", icon: Coins, color: "amber" },
];

interface FoodItem {
  id: number;
  name: string;
  image: string;
  matchPercent: number;
  distance: string;
  rating: number;
  reviews: number;
  priceRange: string;
  tags: { label: string; color: string }[];
}

const foodItems: FoodItem[] = [
  {
    id: 1,
    name: "Bún bò Huế",
    image:
      "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=600&h=400&fit=crop",
    matchPercent: 98,
    distance: "2.5km",
    rating: 4.8,
    reviews: 256,
    priceRange: "30k - 50k",
    tags: [
      { label: "Cay nóng", color: "bg-red-50 text-red-500 border-red-100" },
      {
        label: "Truyền thống",
        color: "bg-teal-50 text-teal-600 border-teal-100",
      },
      {
        label: "Bữa trưa",
        color: "bg-green-50 text-green-600 border-green-100",
      },
    ],
  },
  {
    id: 2,
    name: "Pizza Hải sản",
    image:
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=400&fit=crop",
    matchPercent: 95,
    distance: "1.2km",
    rating: 4.6,
    reviews: 189,
    priceRange: "70k - 120k",
    tags: [
      {
        label: "Phô mai",
        color: "bg-yellow-50 text-yellow-600 border-yellow-100",
      },
      { label: "Hải sản", color: "bg-blue-50 text-blue-500 border-blue-100" },
      {
        label: "Âu - Ý",
        color: "bg-violet-50 text-violet-500 border-violet-100",
      },
    ],
  },
  {
    id: 3,
    name: "Trà sữa trân châu",
    image:
      "https://images.unsplash.com/photo-1525385133512-2f3bdd039054?w=600&h=400&fit=crop",
    matchPercent: 92,
    distance: "800m",
    rating: 4.7,
    reviews: 320,
    priceRange: "20k - 35k",
    tags: [
      { label: "Ngọt nhẹ", color: "bg-pink-50 text-pink-500 border-pink-100" },
      {
        label: "Giải nhiệt",
        color: "bg-cyan-50 text-cyan-600 border-cyan-100",
      },
      {
        label: "Đồ uống",
        color: "bg-indigo-50 text-indigo-500 border-indigo-100",
      },
    ],
  },
  {
    id: 4,
    name: "Cơm tấm sườn",
    image:
      "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&h=400&fit=crop",
    matchPercent: 96,
    distance: "3.1km",
    rating: 4.6,
    reviews: 212,
    priceRange: "25k - 40k",
    tags: [
      {
        label: "Truyền thống",
        color: "bg-teal-50 text-teal-600 border-teal-100",
      },
      {
        label: "Bữa trưa",
        color: "bg-green-50 text-green-600 border-green-100",
      },
      {
        label: "No nê",
        color: "bg-amber-50 text-amber-600 border-amber-100",
      },
    ],
  },
];

const features = [
  {
    icon: Brain,
    iconBg: "bg-orange-100 text-orange-500",
    title: "AI đề xuất thông minh",
    desc: "Cá nhân hóa theo sở thích",
  },
  {
    icon: MapPin,
    iconBg: "bg-orange-100 text-orange-500",
    title: "Tìm kiếm quanh bạn",
    desc: "Dựa trên vị trí GPS",
  },
  {
    icon: Heart,
    iconBg: "bg-pink-100 text-pink-500",
    title: "Đánh giá chân thực",
    desc: "Từ cộng đồng Wanderbite",
  },
  {
    icon: ShieldCheck,
    iconBg: "bg-emerald-100 text-emerald-500",
    title: "An toàn & Uy tín",
    desc: "Kiểm duyệt chất lượng",
  },
];

/* ───────── Component ───────── */

export default function Home() {
  const [query, setQuery] = useState("");
  const [budget, setBudget] = useState<BudgetOption>('auto');
  const [activeFilter, setActiveFilter] = useState("");
  const [username, setUsername] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const token = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('username');
    if (token) {
      setUsername(storedUser || 'User');
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('username');
    localStorage.removeItem('food_recsys_userid'); // Dọn dẹp cả ID ảo nếu có
    setUsername(null);
    router.push('/auth');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    // Truyền budget xuống URL để result page đọc và gửi API
    const budgetParam = budget !== 'auto' ? `&budget=${budget}` : '';
    router.push(`/result?q=${encodeURIComponent(query)}${budgetParam}`);
  };

  return (
    <>
    <div className={`flex min-h-screen bg-[#F7F8FA] dark:bg-gray-900 transition-colors duration-300 ${roboto.className}`}>
      {/* ══════════════════════════════════════════════════════════
          Sidebar
          ══════════════════════════════════════════════════════════ */}
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />

      {/* ── Main Content ── */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'ml-[80px]' : 'ml-[260px]'}`}>
        {/* ─── Top Bar (Minimal — chỉ giữ ThemeToggle) ─── */}
        <header className="sticky top-0 z-40 flex items-center justify-between px-8 h-[72px] bg-[#F7F8FA]/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100/60 dark:border-gray-700/60 transition-colors duration-300">
          {/* Logo (Removed) */}
          <div className="flex items-center gap-2.5"></div>

          {/* Right side — chỉ giữ ThemeToggle */}
          <div className="flex items-center gap-4">
            {/* ══════════════════════════════════════════════════════
                Top Bar Buttons
                ══════════════════════════════════════════════════════ */}
            <button className="relative w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer">
              <Bell className="w-[18px] h-[18px] text-gray-500" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
            </button>

            <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer">
              <Headphones className="w-[18px] h-[18px]" />
              <span className="font-medium">Hỗ trợ</span>
            </button>

            <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer">
              <Globe className="w-[18px] h-[18px]" />
              <span className="font-medium">Tiếng Việt</span>
            </button>

            <ThemeToggle />

            {username ? (
              <div className="flex items-center gap-3 ml-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden">
                    <User className="w-5 h-5 text-gray-400" />
                  </div>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 hidden sm:block">
                    {username}
                  </span>
                </div>
                <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>
                <button 
                  onClick={handleLogout}
                  className="text-[13px] font-semibold text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors cursor-pointer"
                >
                  Đăng xuất
                </button>
              </div>
            ) : (
              <button 
                onClick={() => router.push('/auth')}
                className="ml-2 px-4 py-2 rounded-xl bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-500 text-sm font-bold hover:bg-orange-100 dark:hover:bg-orange-500/20 transition-colors cursor-pointer"
              >
                Đăng nhập
              </button>
            )}
          </div>
        </header>

        {/* ─── Page Content ─── */}
        <main className="flex-1 px-8 py-6 overflow-y-auto flex flex-col">
          {/* ── Hero: Search Section (✅ FUNCTIONAL) ── */}
          <section className="text-center max-w-3xl mx-auto w-full mt-8">
            <h1 className="text-[42px] font-black text-gray-900 dark:text-white mb-8 leading-tight tracking-tight uppercase transition-colors duration-300">
              Hôm nay bạn muốn{" "}
              <span className="text-orange-500">
                ăn gì ?
              </span>
              ✨
            </h1>

            {/* Search Bar — ✅ HOẠT ĐỘNG: Nhập query → chuyển đến /result */}
            <form onSubmit={handleSearch} className="relative mb-6">
              <div className="flex items-center bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md dark:hover:shadow-none hover:border-gray-300 dark:hover:border-gray-600 transition-all focus-within:shadow-md focus-within:border-orange-300 dark:focus-within:border-orange-500/50 focus-within:ring-4 focus-within:ring-orange-50 dark:focus-within:ring-orange-500/10 dark:focus-within:shadow-[0_0_20px_rgba(255,143,0,0.15)]">
                <div className="pl-5 pr-2">
                  <Sparkles className="w-5 h-5 text-orange-400" />
                </div>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Mô tả món ăn bạn muốn, ví dụ: món cay, gần đây, giá rẻ..."
                  className="flex-1 bg-transparent border-none outline-none py-4 px-2 text-[15px] text-gray-700 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 font-normal"
                />
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-gradient-to-r from-orange-400 to-orange-500 text-white px-6 py-3 rounded-full font-semibold text-[14px] mr-1.5 hover:from-orange-500 hover:to-orange-600 transition-all shadow-md shadow-orange-200 dark:shadow-[0_0_20px_rgba(255,143,0,0.4)] hover:shadow-lg hover:shadow-orange-200 dark:hover:shadow-[0_0_25px_rgba(255,143,0,0.5)] active:scale-[0.97] cursor-pointer whitespace-nowrap"
                >
                  <Search className="w-4 h-4" />
                  Tìm kiếm
                </button>
              </div>
            </form>

            {/* Budget Selector */}
            <div className="mb-4">
              <BudgetSelector value={budget} onChange={setBudget} />
            </div>

            {/* ══════════════════════════════════════════════════════════
                Vibe Filters
                ══════════════════════════════════════════════════════════ */}
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <span className="text-[13px] font-semibold text-gray-400 mr-1">
                Vibe Filters
              </span>
              {vibeFilters.map((filter) => (
                <button
                  key={filter.label}
                  onClick={() => setActiveFilter(filter.label)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[13px] font-medium border transition-all cursor-pointer ${
                    activeFilter === filter.label
                      ? "bg-orange-50 text-orange-600 border-orange-200 shadow-sm shadow-orange-100"
                      : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                  }`}
                >
                  <filter.icon
                    className={`w-4 h-4 ${
                      activeFilter === filter.label
                        ? "text-orange-500"
                        : "text-gray-400"
                    }`}
                  />
                  {filter.label}
                </button>
              ))}
              <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[13px] font-medium bg-white text-gray-500 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer">
                <SlidersHorizontal className="w-4 h-4 text-gray-400" />
                Bộ lọc
              </button>
            </div>

            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              Nhập mô tả món ăn bạn thích, AI sẽ gợi ý cho bạn
            </p>
          </section>

          {/* ══════════════════════════════════════════════════════════
              Food Recommendations
              ══════════════════════════════════════════════════════════ */}
          <section className="mb-8">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                <h2 className="text-lg font-bold text-gray-800">
                  Gợi ý dành cho bạn
                </h2>
              </div>
              <button className="flex items-center gap-1 text-[13px] font-medium text-orange-500 hover:text-orange-600 transition-colors cursor-pointer">
                Xem tất cả
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {foodItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg hover:border-gray-200 transition-all duration-300 cursor-pointer group"
                >
                  <div className="relative h-[190px] overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

                    <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500 text-white text-[11px] font-bold shadow-md">
                      <Sparkles className="w-3 h-3" />
                      AI Match: {item.matchPercent}%
                    </div>

                    <div className="absolute top-3 right-12 flex items-center gap-0.5 px-2 py-1 rounded-full bg-white/90 backdrop-blur-sm text-[11px] font-semibold text-gray-600 shadow-sm">
                      <MapPin className="w-3 h-3 text-orange-400" />
                      {item.distance}
                    </div>

                    <button className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white hover:scale-110 transition-all cursor-pointer">
                      <Heart className="w-4 h-4 text-gray-400 hover:text-red-400 transition-colors" />
                    </button>
                  </div>

                  <div className="p-4">
                    <h3 className="text-[15px] font-bold text-gray-800 mb-2 group-hover:text-orange-600 transition-colors">
                      {item.name}
                    </h3>

                    <div className="flex items-center gap-1.5 text-[13px] text-gray-500 mb-3">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span className="font-semibold text-gray-700">
                        {item.rating}
                      </span>
                      <span className="text-gray-400">({item.reviews})</span>
                      <span className="text-gray-300 mx-0.5">•</span>
                      <span className="font-medium">{item.priceRange}</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {item.tags.map((tag) => (
                        <span
                          key={tag.label}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${tag.color}`}
                        >
                          {tag.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ══════════════════════════════════════════════════════════
              Feature Bar
              ══════════════════════════════════════════════════════════ */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feat) => (
                <div
                  key={feat.title}
                  className="flex items-center gap-3"
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${feat.iconBg}`}
                  >
                    <feat.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-gray-700">
                      {feat.title}
                    </p>
                    <p className="text-[11px] text-gray-400">{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>

        {/* ══════════════════════════════════════════════════════════
            Footer
            ══════════════════════════════════════════════════════════ */}
        <footer className="px-8 py-4 text-center text-[12px] text-gray-400 border-t border-gray-100">
          © 2026 Wanderbite. All rights reserved.
        </footer>
      </div>
    </div>

    {/* Pop-up khảo sát — hiện lần đầu tiên user vào trang */}
    <SurveyModal />
  </>
);
}

