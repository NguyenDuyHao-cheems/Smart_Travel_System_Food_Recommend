"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  // [HIDDEN] Bell,
  // [HIDDEN] Headphones,
  // [HIDDEN] Globe,
  Search,
  // [HIDDEN] Star,
  // [HIDDEN] MapPin,
  // [HIDDEN] Heart,
  // [HIDDEN] Flame,
  // [HIDDEN] Snowflake,
  // [HIDDEN] HeartPulse,
  // [HIDDEN] Coins,
  // [HIDDEN] SlidersHorizontal,
  // [HIDDEN] Brain,
  // [HIDDEN] ShieldCheck,
  Sparkles,
  User,
  // [HIDDEN] ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import { Roboto } from "next/font/google";
// [HIDDEN] import { Sidebar } from "../components/Sidebar";
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
  const [username, setUsername] = useState<string | null>(null);
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

  // [FIX 1] mounted guard — tránh Hydration Mismatch / flash UI
  // Server không có localStorage → username = null → nếu render ngay sẽ flash.
  // Giải pháp: defer render auth UI cho đến khi client mount xong.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('username');
    if (token) setUsername(storedUser || 'User');
    checkHealth();
  }, [checkHealth]);

  // [FIX 3] Auto-polling: tự kiểm tra lại mỗi 10s khi hệ thống chưa 'ok'.
  // Banner sẽ tự biến mất khi backend phục hồi — không cần user bấm Thử lại.
  useEffect(() => {
    if (healthStatus === 'ok' || healthStatus === 'loading') return;
    const interval = setInterval(checkHealth, 10_000);
    return () => clearInterval(interval);
  }, [healthStatus, checkHealth]);

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
          [HIDDEN] Sidebar — Uncomment khi các trang con hoạt động
          ══════════════════════════════════════════════════════════ */}
        {/* <Sidebar /> */}

        {/* ── Main Content ── */}
        {/* NOTE: Đã bỏ ml-[260px] vì sidebar đã ẩn */}
        <div className="flex-1 flex flex-col">
          {/* ─── Top Bar (Minimal — chỉ giữ ThemeToggle) ─── */}
          <header className="sticky top-0 z-40 flex items-center justify-between px-8 py-4 bg-[#F7F8FA]/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100/60 dark:border-gray-700/60 transition-colors duration-300">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shadow-md shadow-orange-200 dark:shadow-orange-500/20">
                <span className="text-white text-lg">🍜</span>
              </div>
              <span className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">
                Wanderbite
              </span>
            </div>

            {/* Right side — chỉ giữ ThemeToggle */}
            <div className="flex items-center gap-4">
              {/* ══════════════════════════════════════════════════════
                [HIDDEN] Top Bar Buttons — Uncomment khi kết nối chức năng
                ══════════════════════════════════════════════════════ */}
              {/* <button className="relative w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer">
              <Bell className="w-[18px] h-[18px] text-gray-500" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
            </button> */}

              {/* <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer">
              <Headphones className="w-[18px] h-[18px]" />
              <span className="font-medium">Hỗ trợ</span>
            </button> */}

              {/* <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer">
              <Globe className="w-[18px] h-[18px]" />
              <span className="font-medium">Tiếng Việt</span>
            </button> */}

              <ThemeToggle />

              {/* [FIX 1] Chỉ render auth UI sau khi mounted — tránh flash "Đăng nhập → Đăng xuất" */}
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
                // Skeleton giữ layout ổn định trong lúc hydrate
                <div className="ml-2 w-20 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
              )}
            </div>
          </header>

          {/* ─── System Health Banner ─── */}
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
                onClick={checkHealth} // [FIX 2] Chỉ retry — không reset dismissed state
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

          {/* ─── Page Content ─── */}
          <main className="flex-1 px-8 py-6 overflow-y-auto flex items-center justify-center">
            {/* ── Hero: Search Section (✅ FUNCTIONAL) ── */}
            <section className="text-center max-w-3xl mx-auto w-full">
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



              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Nhập mô tả món ăn bạn thích, AI sẽ gợi ý cho bạn
              </p>

              {/* ── System Status Indicator (dưới search bar) ── */}
              <div className="mt-5 flex items-center justify-center gap-2 text-[12px]">
                {healthStatus === 'loading' && (
                  <span className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Đang kiểm tra hệ thống...
                  </span>
                )}
                {healthStatus === 'ok' && (
                  <span className="flex items-center gap-1.5 text-emerald-500 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Tất cả hệ thống hoạt động bình thường
                  </span>
                )}
                {(healthStatus === 'degraded' || healthStatus === 'error') && (
                  <span className="flex items-center gap-1.5 text-amber-500 dark:text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {healthStatus === 'error'
                      ? 'Không thể kết nối tới máy chủ'
                      : !healthData?.ai_engine
                        ? 'AI Engine chưa sẵn sàng — tính năng tìm kiếm có thể bị ảnh hưởng'
                        : 'Database chưa kết nối'}
                    <button
                      onClick={checkHealth}
                      className="ml-1 underline underline-offset-2 hover:text-orange-500 transition-colors cursor-pointer"
                    >
                      Thử lại
                    </button>
                  </span>
                )}
              </div>
            </section>


          </main>

          {/* ══════════════════════════════════════════════════════════
            [HIDDEN] Footer — Uncomment khi hoàn thiện
            ══════════════════════════════════════════════════════════ */}
          {/* <footer className="px-8 py-4 text-center text-[12px] text-gray-400 border-t border-gray-100">
          © 2026 FoodAI. All rights reserved.
        </footer> */}
        </div>
      </div>

      {/* Pop-up khảo sát — hiện lần đầu tiên user vào trang */}
      <SurveyModal />
    </>
  );
}

