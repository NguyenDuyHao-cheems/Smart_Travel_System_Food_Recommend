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
import { SearchBar } from "../components/SearchBar";
import { useSearchState } from "../hooks/useSearchState";
import { historyService } from "../services/historyService";

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
  const { query, setQuery, searchMode, setSearchMode } = useSearchState("");
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


  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
          search_mode: searchMode,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (userId) {
          historyService.addHistory(
            userId,
            query,
            budget,
            Array.isArray(data.results) ? data.results.length : undefined,
            data.session_id,
            searchMode
          );
        }
        setSearchLoadingMsg("Đã có kết quả! Đang chuyển hướng...");
        router.push(`/result?session_id=${data.session_id}&mode=${searchMode}`);
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
            <div className="flex items-center gap-2.5">
              {healthStatus !== 'loading' && (
                <div
                  className={`w-2 h-2 rounded-full ${healthStatus === 'ok' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse' :
                    healthStatus === 'degraded' ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' :
                      'bg-red-500'
                    }`}
                  title={healthStatus === 'ok' ? "System Normal" : "System Degraded/Error"}
                />
              )}
            </div>

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

              <div className="mb-6">
                <SearchBar
                  query={query}
                  setQuery={setQuery}
                  searchMode={searchMode}
                  setSearchMode={setSearchMode}
                  onSearch={handleSearch}
                  compact={false}
                />
              </div>

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
