"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  Headphones,
  Globe,
  Search,
  Sparkles,
  User,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import { Roboto } from "next/font/google";
import { Sidebar } from "../components/Sidebar";
import { ThemeToggle } from "../components/ThemeToggle";
import { SurveyModal } from "../components/SurveyModal";
import { BudgetSelector, type BudgetOption } from "../components/BudgetSelector";

const roboto = Roboto({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "700", "900"],
});

/* ───────── Component ───────── */

type HealthStatus = 'loading' | 'ok' | 'degraded' | 'error';

interface HealthData {
  status: string;
  backend: boolean;
  database: boolean;
  ai_engine: boolean;
  message: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export default function Home() {
  const [query, setQuery] = useState("");
  const [budget, setBudget] = useState<BudgetOption>('auto');
  const [activeFilter, setActiveFilter] = useState("");
  const [username, setUsername] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const router = useRouter();

  // ── System Health State ──
  const [healthStatus, setHealthStatus] = useState<HealthStatus>('loading');
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [healthBannerDismissed, setHealthBannerDismissed] = useState(false);

  const checkHealth = useCallback(async () => {
    setHealthStatus('loading');
    try {
      const res = await fetch(`${BACKEND_URL}/api/health`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error('Non-OK response');
      const data: HealthData = await res.json();
      setHealthData(data);
      setHealthStatus(data.ai_engine && data.database ? 'ok' : 'degraded');
    } catch {
      setHealthData(null);
      setHealthStatus('error');
    }
  }, []);

  const [mounted, setMounted] = useState(false);

  // ── Typewriter State ──
  const [placeholderText, setPlaceholderText] = useState("");
  const [phIndex, setPhIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const placeholders = ["Một tô phở bò nóng hổi...", "Đồ ăn vặt dưới 50k...", "Món Thái cay xé lưỡi...", "Trà sữa trân châu đường đen..."];
    const currentPhrase = placeholders[phIndex];
    const typingSpeed = isDeleting ? 40 : 80;

    const timer = setTimeout(() => {
      if (!isDeleting && charIndex === currentPhrase.length) {
        setTimeout(() => setIsDeleting(true), 1500);
      } else if (isDeleting && charIndex === 0) {
        setIsDeleting(false);
        setPhIndex((prev) => (prev + 1) % placeholders.length);
      } else {
        setCharIndex((prev) => prev + (isDeleting ? -1 : 1));
        setPlaceholderText(currentPhrase.substring(0, charIndex + (isDeleting ? -1 : 1)));
      }
    }, typingSpeed);

    return () => clearTimeout(timer);
  }, [charIndex, isDeleting, phIndex]);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('username');
    if (token) setUsername(storedUser || 'User');
    checkHealth();
  }, [checkHealth]);

  useEffect(() => {
    if (healthStatus === 'ok' || healthStatus === 'loading') return;
    const interval = setInterval(checkHealth, 10_000);
    return () => clearInterval(interval);
  }, [healthStatus, checkHealth]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('username');
    localStorage.removeItem('food_recsys_userid');
    setUsername(null);
    router.push('/auth');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    const budgetParam = budget !== 'auto' ? `&budget=${budget}` : '';
    router.push(`/result?q=${encodeURIComponent(query)}${budgetParam}`);
  };

  return (
    <>
      <div className={`flex min-h-screen bg-[#F7F8FA] dark:bg-gray-900 transition-colors duration-300 ${roboto.className}`}>
        <Sidebar isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />

        <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'ml-[80px]' : 'ml-[260px]'}`}>
          <header className="sticky top-0 z-40 flex items-center justify-between px-8 h-[72px] bg-[#F7F8FA]/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100/60 dark:border-gray-700/60 transition-colors duration-300">
            <div className="flex items-center gap-2.5">
              {healthStatus !== 'loading' && (
                <div 
                  className={`w-2 h-2 rounded-full ${
                    healthStatus === 'ok' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse' : 
                    healthStatus === 'degraded' ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 
                    'bg-red-500'
                  }`}
                  title={healthStatus === 'ok' ? "System Normal" : "System Degraded/Error"}
                />
              )}
            </div>

            <div className="flex items-center gap-4">
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

              {mounted ? (
                username ? (
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
                )
              ) : (
                <div className="ml-2 w-20 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
              )}
            </div>
          </header>

          {!healthBannerDismissed && healthStatus !== 'loading' && healthStatus !== 'ok' && (
            <div
              role="alert"
              className={`flex items-center gap-3 px-5 py-3 text-sm font-medium border-b transition-colors duration-300 ${healthStatus === 'degraded'
                ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700/40 text-amber-800 dark:text-amber-300'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/40 text-red-800 dark:text-red-300'
                }`}
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">
                {healthStatus === 'error'
                  ? 'Không thể kết nối tới máy chủ. Vui lòng đảm bảo backend đang chạy.'
                  : `Hệ thống đang hoạt động một phần — ${!healthData?.ai_engine && !healthData?.database
                    ? 'AI Engine và Database đều không phản hồi'
                    : !healthData?.ai_engine
                      ? 'AI Engine chưa sẵn sàng, tính năng tìm kiếm có thể bị ảnh hưởng'
                      : 'Database chưa kết nối được'
                  }.`
                }
              </span>
              <button
                onClick={checkHealth}
                title="Thử lại"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/60 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 border border-current/20 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                Thử lại
              </button>
              <button
                onClick={() => setHealthBannerDismissed(true)}
                title="Đóng"
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <main className="flex-1 px-8 py-6 overflow-y-auto flex items-center justify-center relative">
            {/* Background Ambient Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] md:w-[800px] md:h-[400px] bg-orange-300/40 dark:bg-orange-500/20 blur-[100px] md:blur-[120px] rounded-full -z-10 pointer-events-none" />
            <div className="absolute top-1/3 left-1/4 w-[300px] h-[200px] md:w-[400px] md:h-[300px] bg-rose-200/40 dark:bg-yellow-400/10 blur-[80px] md:blur-[100px] rounded-full -z-10 pointer-events-none" />

            {/* Floating Elements */}
            <div className="absolute hidden lg:block left-[10%] top-[25%] animate-float">
              <div className="text-6xl drop-shadow-2xl">🍜</div>
              <div className="w-10 h-2 bg-black/10 dark:bg-black/40 blur-sm rounded-full mx-auto mt-4"></div>
            </div>
            <div className="absolute hidden lg:block right-[10%] top-[35%] animate-float-delayed">
              <div className="text-6xl drop-shadow-2xl">🍣</div>
              <div className="w-10 h-2 bg-black/10 dark:bg-black/40 blur-sm rounded-full mx-auto mt-4"></div>
            </div>

            <section className="text-center max-w-3xl mx-auto w-full z-10 relative">
              <h1 className="text-[48px] md:text-[56px] font-black mb-8 leading-tight tracking-tight uppercase transition-colors duration-300 drop-shadow-sm text-gray-900 dark:text-white">
                Hôm nay bạn muốn <br className="hidden md:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-rose-500 dark:from-yellow-400 dark:to-orange-500 drop-shadow-md">
                  ăn gì ?
                </span>
                ✨
              </h1>

              <form onSubmit={handleSearch} className="relative mb-6">
                <div className="flex items-center bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md dark:hover:shadow-none hover:border-gray-300 dark:hover:border-gray-600 transition-all focus-within:shadow-md focus-within:border-orange-300 dark:focus-within:border-orange-500/50 focus-within:ring-4 focus-within:ring-orange-50 dark:focus-within:ring-orange-500/10 dark:focus-within:shadow-[0_0_20px_rgba(255,143,0,0.15)]">
                  <div className="pl-5 pr-2">
                    <Sparkles className="w-5 h-5 text-orange-400" />
                  </div>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={placeholderText || "Mô tả món ăn bạn muốn..."}
                    className="flex-1 bg-transparent border-none outline-none py-4 px-2 text-[15px] text-gray-700 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 font-normal"
                  />
                  <button
                    type="submit"
                    className="flex items-center gap-2 bg-gradient-to-r from-orange-400 to-orange-500 text-white px-6 py-3 rounded-full font-semibold text-[14px] mr-1.5 hover:from-orange-500 hover:to-orange-600 transition-all shadow-md shadow-orange-200 dark:shadow-[0_0_20px_rgba(255,143,0,0.4)] hover:shadow-[0_0_20px_rgba(255,143,0,0.3)] hover:scale-105 active:scale-[0.97] cursor-pointer whitespace-nowrap"
                  >
                    <Search className="w-4 h-4" />
                    Tìm kiếm
                  </button>
                </div>
              </form>

              <div className="mb-4">
                <BudgetSelector value={budget} onChange={setBudget} />
              </div>

              <div className="mt-8">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 text-left mb-4 px-2 uppercase tracking-wider">Danh mục thịnh hành</h3>
                <div className="flex gap-4 overflow-x-auto snap-x hide-scrollbar pb-4 px-2">
                  {[
                    { id: 1, title: "Top Quán Nướng", emoji: "🥩", gradient: "bg-gradient-to-br from-red-500 to-orange-600" },
                    { id: 2, title: "Ăn Đêm", emoji: "🌃", gradient: "bg-gradient-to-br from-blue-600 to-indigo-900" },
                    { id: 3, title: "Đồ ăn Healthy", emoji: "🥑", gradient: "bg-gradient-to-br from-emerald-400 to-green-600" },
                    { id: 4, title: "Trà Sữa & Cà Phê", emoji: "🧋", gradient: "bg-gradient-to-br from-amber-300 to-yellow-600" }
                  ].map(cat => (
                    <div key={cat.id} className="min-w-[160px] h-[100px] rounded-2xl overflow-hidden relative group cursor-pointer shrink-0 snap-start shadow-sm border border-gray-100 dark:border-gray-800">
                      <div className={`absolute inset-0 w-full h-full ${cat.gradient} group-hover:scale-110 transition-transform duration-500 flex items-center justify-center`}>
                        <span className="text-[50px] opacity-40 drop-shadow-md">{cat.emoji}</span>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <span className="absolute bottom-3 left-3 text-white text-sm font-bold z-10">{cat.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>

      <SurveyModal />
    </>
  );
}