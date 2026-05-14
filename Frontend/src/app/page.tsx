"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  Headset,
  Search,
  Sparkles,
  AlertTriangle,
  Loader2,
  RefreshCw,
  X,
  CheckCircle2,
} from "lucide-react";
import { Roboto } from "next/font/google";
import { Sidebar } from "../components/Sidebar";
import { UserDropdown } from "../components/UserDropdown";
import { BudgetSelector, type BudgetOption } from "../components/BudgetSelector";
import { SurveyModal } from "../components/SurveyModal";
import { SearchLoadingOverlay } from "../components/ui/SearchLoadingOverlay";

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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const router = useRouter();

  // ── System Health State ──
  const [healthStatus, setHealthStatus] = useState<HealthStatus>('loading');
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [healthBannerDismissed, setHealthBannerDismissed] = useState(false);

  // ── Search & Loading State ──
  const [isSearching, setIsSearching] = useState(false);
  const [searchLoadingMsg, setSearchLoadingMsg] = useState("Đang phân tích sở thích của bạn...");
  const [apiError, setApiError] = useState<string | null>(null);

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

  useEffect(() => {
    setMounted(true);
    checkHealth();
    // Clear last search when visiting home fresh
    localStorage.removeItem('last_search_url');
  }, [checkHealth]);

  useEffect(() => {
    if (healthStatus === 'ok' || healthStatus === 'loading') return;
    const interval = setInterval(checkHealth, 10_000);
    return () => clearInterval(interval);
  }, [healthStatus, checkHealth]);


  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setIsSearching(true);
    setApiError(null);

    try {
      setSearchLoadingMsg("Đang xác định vị trí của bạn...");
      const gps: { lat: number, lng: number } = await new Promise((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error("Trình duyệt không hỗ trợ GPS."));
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          (err) => reject(err),
          { timeout: 10000 }
        );
      });

      setSearchLoadingMsg("AI đang phân tích khẩu vị của bạn...");
      const token = localStorage.getItem('access_token');
      const userId = localStorage.getItem('user_id');

      const res = await fetch(`${BACKEND_URL}/api/v1/search/recommend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          query: query,
          lat: gps.lat,
          lng: gps.lng,
          user_id: userId || undefined,
          budget: budget === 'auto' ? undefined : parseInt(budget, 10),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSearchLoadingMsg("Đã có kết quả! Đang chuyển hướng...");
        router.push(`/result?session_id=${data.session_id}`);
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Không thể kết nối với hệ thống AI.");
      }
    } catch (err: any) {
      console.error("Search error:", err);
      let msg = "Lỗi kết nối AI. Vui lòng thử lại.";
      if (err.code === 1) msg = "Vui lòng cho phép GPS để tìm nhà hàng.";
      else if (err.message) msg = err.message;
      setApiError(msg);
      setIsSearching(false);
    }
  };

  if (!mounted) return null;

  return (
    <>
      <div className={`flex min-h-screen bg-[#F7F8FA] dark:bg-gray-900 transition-colors duration-300 ${roboto.className}`}>
        <Sidebar isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />

        <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'ml-[80px]' : 'ml-[260px]'}`}>
          <header className="sticky top-0 z-40 flex items-center justify-between px-8 h-[72px] bg-[#F7F8FA]/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100/60 dark:border-gray-700/60 transition-colors duration-300">
            <div className="flex items-center gap-2.5"></div>

            <div className="flex items-center gap-4">
              <button className="relative w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                <Bell className="w-[18px] h-[18px] text-gray-500 dark:text-gray-400" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
              </button>

              <button className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer">
                <Headset className="w-[18px] h-[18px]" />
                <span className="font-medium">Hỗ trợ</span>
              </button>

              <UserDropdown />
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

          {isSearching && <SearchLoadingOverlay message={searchLoadingMsg} />}

          {apiError && (
            <div className="mx-8 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/40 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3 text-red-800 dark:text-red-300">
                <AlertTriangle className="w-5 h-5" />
                <span className="text-sm font-medium">{apiError}</span>
              </div>
              <button 
                onClick={() => setApiError(null)}
                className="text-red-400 hover:text-red-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <main className="flex-1 px-8 py-6 overflow-y-auto flex items-center justify-center">
            <section className="text-center max-w-3xl mx-auto w-full">
              <h1 className="text-[42px] font-black text-gray-900 dark:text-white mb-8 leading-tight tracking-tight uppercase transition-colors duration-300">
                Hôm nay bạn muốn{" "}
                <span className="text-orange-500">
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

              <div className="mb-4">
                <BudgetSelector value={budget} onChange={setBudget} />
              </div>

              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Nhập mô tả món ăn bạn thích, AI sẽ gợi ý cho bạn
              </p>

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
        </div>
      </div>

      <SurveyModal />
    </>
  );
}