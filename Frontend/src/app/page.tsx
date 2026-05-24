"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { X, AlertTriangle, RefreshCw, Sparkles, MessageSquare } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { UserDropdown } from "../components/UserDropdown";
import { BudgetSelector, type BudgetOption } from "../components/BudgetSelector";
import { SurveyModal } from "../components/SurveyModal";
import { SearchLoadingOverlay } from "../components/ui/SearchLoadingOverlay";
import { SearchBar } from "../components/SearchBar";
import { useSearchState } from "../hooks/useSearchState";
import { historyService } from "../services/historyService";
import { FoodCard } from "../components/FoodCard";
import { RecommendResult } from "./result/page";
import { useOptimizedLocation } from "../hooks/useOptimizedLocation";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import NewspaperMenu from "../components/NewspaperMenu";

/* ── Types ── */
type HealthStatus = "loading" | "ok" | "degraded" | "error";

interface HealthData {
  status: string;
  backend: boolean;
  database: boolean;
  ai_engine: boolean;
  message: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/* ── Trending chips ── */
const TRENDING = [
  { id: 1, title: "Top Quán Nướng", emoji: "🥩", query: "quán nướng ngon", tag: "nướng" },
  { id: 2, title: "Ăn Đêm", emoji: "🌃", query: "đồ ăn đêm muộn", tag: null },
  { id: 3, title: "Đồ ăn Healthy", emoji: "🥑", query: "đồ ăn healthy ít calo", tag: "healthy" },
  { id: 4, title: "Trà Sữa & Cà Phê", emoji: "🧋", query: "trà sữa cà phê ngon", tag: "cà phê" },
  { id: 5, title: "Bánh mì & Bún", emoji: "🍜", query: "bánh mì bún ngon", tag: "bún" },
  { id: 6, title: "Dimsum & Lẩu", emoji: "🥢", query: "dimsum lẩu ngon", tag: "lẩu" },
];

/* ─────────────────────────────────────────────── */

function HomeContent() {
  const { query, setQuery, searchMode, setSearchMode } = useSearchState("");
  const [budget, setBudget] = useState<BudgetOption>("auto");
  const router = useRouter();
  const { getOptimizedLocation } = useOptimizedLocation();

  const [healthStatus, setHealthStatus] = useState<HealthStatus>("loading");
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [healthBannerDismissed, setHealthBannerDismissed] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchLoadingMsg, setSearchLoadingMsg] = useState("Đang phân tích sở thích của bạn...");
  const [apiError, setApiError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const coords = useSelector((state: RootState) => state.location.coords);
  const [recommendations, setRecommendations] = useState<RecommendResult[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const userId = localStorage.getItem("user_id") || "guest";
        const cacheKey = `home_recommendations_${userId}`;

        // Detect page reload and clear cache immediately
        const navEntries = performance.getEntriesByType("navigation");
        const isReload = navEntries.length > 0 && (navEntries[0] as PerformanceNavigationTiming).type === "reload";
        if (isReload) {
          sessionStorage.removeItem(cacheKey);
          return [];
        }

        const cached = sessionStorage.getItem(cacheKey);
        if (cached) return JSON.parse(cached);
      } catch (err) {}
    }
    return [];
  });
  const [isLoadingRecs, setIsLoadingRecs] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const userId = localStorage.getItem("user_id") || "guest";
        const cacheKey = `home_recommendations_${userId}`;

        const navEntries = performance.getEntriesByType("navigation");
        const isReload = navEntries.length > 0 && (navEntries[0] as PerformanceNavigationTiming).type === "reload";
        if (isReload) return true;

        if (sessionStorage.getItem(cacheKey)) return false;
      } catch (err) {}
    }
    return true;
  });

  /* ── Fetch Real Recommendations ── */
  useEffect(() => {
    async function fetchRecommendations() {
      if (!coords) return;

      const userId = localStorage.getItem("user_id") || "guest";
      const cacheKey = `home_recommendations_${userId}`;

      // Check user-specific cache first
      try {
        const cachedRecs = sessionStorage.getItem(cacheKey);
        if (cachedRecs) {
          setRecommendations(JSON.parse(cachedRecs));
          setIsLoadingRecs(false);
        }
      } catch (err) {
        console.error("Lỗi khi đọc cache:", err);
      }

      try {
        if (!sessionStorage.getItem(cacheKey)) {
          setIsLoadingRecs(true);
        }
        const token = localStorage.getItem("access_token");

        const url = new URL(`${BACKEND_URL}/api/v1/restaurants/recommendations`);
        url.searchParams.append("lat", coords.lat.toString());
        url.searchParams.append("lng", coords.lng.toString());
        url.searchParams.append("limit", "6");

        const res = await fetch(url.toString(), {
          method: "GET",
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        });

        if (res.ok) {
          const data = await res.json();
          // Endpoint /api/v1/restaurants/recommendations returns an array directly
          const resultsArray = Array.isArray(data) ? data : (data.results || []);
          
          if (resultsArray && resultsArray.length > 0) {
            // Filter out exact duplicates by name
            const seen = new Set();
            const uniqueResults = resultsArray.filter((item: RecommendResult) => {
              if (!item.name) return true;
              const duplicate = seen.has(item.name);
              seen.add(item.name);
              return !duplicate;
            });
            const finalRecs = uniqueResults.slice(0, 6);
            setRecommendations(finalRecs);

            // Save to user-specific cache
            try {
              sessionStorage.setItem(cacheKey, JSON.stringify(finalRecs));
            } catch (err) {
              console.error("Lỗi khi lưu cache:", err);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch recommendations:", err);
      } finally {
        setIsLoadingRecs(false);
      }
    }

    if (mounted) {
      fetchRecommendations();
    }
  }, [coords, mounted]);

  /* ── Health check ── */
  const checkHealth = useCallback(async () => {
    setHealthStatus("loading");
    try {
      const res = await fetch(`${BACKEND_URL}/api/health`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error("Non-OK response");
      const data: HealthData = await res.json();
      setHealthData(data);
      setHealthStatus(data.ai_engine && data.database ? "ok" : "degraded");
    } catch {
      setHealthData(null);
      setHealthStatus("error");
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    checkHealth();
    localStorage.removeItem("last_search_url");
  }, [checkHealth]);

  useEffect(() => {
    if (healthStatus === "ok" || healthStatus === "loading") return;
    const interval = setInterval(checkHealth, 10_000);
    return () => clearInterval(interval);
  }, [healthStatus, checkHealth]);

  /* ── Search handler — GPS fallback, no reject ── */
  const handleSearch = async (overrideQuery?: string, explicitTag?: string) => {
    const finalQuery = (overrideQuery ?? query).trim();
    if (!finalQuery) return;

    setIsSearching(true);
    setApiError(null);

    try {
      setSearchLoadingMsg("Đang xác định vị trí của bạn...");

      const gps = await getOptimizedLocation();
      if (!gps) {
        setApiError("Không thể xác định vị trí thực tế của bạn. Vui lòng kiểm tra quyền truy cập GPS để tiếp tục.");
        setIsSearching(false);
        return;
      }

      setSearchLoadingMsg("AI đang phân tích khẩu vị của bạn...");
      const token = localStorage.getItem("access_token");
      const userId = localStorage.getItem("user_id");

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${BACKEND_URL}/api/v1/search/recommend`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          query: finalQuery,
          lat: gps.lat,
          lng: gps.lng,
          user_id: userId || undefined,
          budget: budget === "auto" ? undefined : parseInt(budget, 10),
          search_mode: searchMode,
          top_k: 24, // Xin dư ra 24 món để sau khi frontend lọc trùng tên (deduplicate) vẫn đảm bảo đủ 16 món hiển thị
          tag_name: explicitTag || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (userId) {
          historyService.addHistory(
            userId,
            finalQuery,
            budget,
            Array.isArray(data.results) ? data.results.length : undefined,
            data.session_id,
            searchMode
          );
        }
        setSearchLoadingMsg("Đã có kết quả! Đang chuyển hướng...");
        // [FIX-CONFLICT]: Ẩn session_id và mode vào sessionStorage, đẩy query q lên URL
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('current_search_session_id', data.session_id);
          sessionStorage.setItem('current_search_mode', searchMode);
        }
        router.push(`/result?q=${encodeURIComponent(finalQuery)}`);
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Không thể kết nối với hệ thống AI.");
      }
    } catch (err: any) {
      // GeolocationPositionError doesn't serialize — use err.message safely
      const msg = err?.message || "Lỗi kết nối AI. Vui lòng thử lại.";
      setApiError(msg);
      setIsSearching(false);
    }
  };

  if (!mounted) return null;

  return (
    <>
      <AppShell healthStatus={healthStatus}>
        {/* ── Health Banner ── */}
        {!healthBannerDismissed && healthStatus !== "loading" && healthStatus !== "ok" && (
          <div
            role="alert"
            className={`relative z-20 flex items-center gap-3 px-5 py-3 text-sm font-medium border-b-2 ${healthStatus === "degraded"
              ? "bg-amber-50 dark:bg-amber-900/20 border-amber-300 text-amber-900 dark:text-amber-300"
              : "bg-red-50 dark:bg-red-900/20 border-red-300 text-red-900 dark:text-red-300"
              }`}
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">
              {healthStatus === "error"
                ? "Không thể kết nối tới máy chủ. Vui lòng đảm bảo backend đang chạy."
                : `Hệ thống đang hoạt động một phần — ${!healthData?.ai_engine ? "AI Engine chưa sẵn sàng" : "Database chưa kết nối"
                }.`}
            </span>
            <button
              onClick={checkHealth}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold bg-white/60 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 border border-current/20 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" /> Thử lại
            </button>
            <button
              onClick={() => setHealthBannerDismissed(true)}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Loading overlay ── */}
        {isSearching && <SearchLoadingOverlay message={searchLoadingMsg} />}

        {/* ── Hero Section ── */}
        <section
          className="relative w-full overflow-hidden"
          style={{ minHeight: "calc(100vh - 64px)" }}
        >

          {/* ── Floating Food Decorations ── */}

          {/* Bánh canh — top-left */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute hidden md:block"
            style={{
              top: "8%",
              left: "2%",
              width: 160,
              animation: "float-a 6s ease-in-out infinite",
              zIndex: 1,
            }}
          >
            <img
              src="/images/banh-canh.png"
              alt=""
              className="w-full h-auto drop-shadow-xl"
              style={{ filter: "drop-shadow(0 12px 20px rgba(0,0,0,0.22))" }}
            />
          </div>

          {/* Bánh tráng nướng — top-right */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute hidden md:block"
            style={{
              top: "6%",
              right: "3%",
              width: 145,
              animation: "float-b 7s ease-in-out 1s infinite",
              zIndex: 1,
            }}
          >
            <img
              src="/images/banh-trang-nuong.png"
              alt=""
              className="w-full h-auto"
              style={{ filter: "drop-shadow(0 12px 20px rgba(0,0,0,0.20))" }}
            />
          </div>

          {/* Cơm tấm — bottom-left */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute hidden md:block"
            style={{
              bottom: "14%",
              left: "1%",
              width: 170,
              animation: "float-c 8s ease-in-out 2s infinite",
              zIndex: 1,
            }}
          >
            <img
              src="/images/com-tam.png"
              alt=""
              className="w-full h-auto"
              style={{ filter: "drop-shadow(0 14px 24px rgba(0,0,0,0.22))" }}
            />
          </div>

          {/* Hủ tiếu — bottom-right */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute hidden md:block"
            style={{
              bottom: "12%",
              right: "1%",
              width: 155,
              animation: "float-d 6.5s ease-in-out 0.5s infinite",
              zIndex: 1,
            }}
          >
            <img
              src="/images/hu-tieu.png"
              alt=""
              className="w-full h-auto"
              style={{ filter: "drop-shadow(0 12px 20px rgba(0,0,0,0.20))" }}
            />
          </div>

          {/* Bottom fade */}
          <div
            className="absolute bottom-0 left-0 right-0 h-16 z-10"
            style={{ background: "linear-gradient(to bottom, transparent, rgba(255,253,249,0.8))" }}
          />

          <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-8 py-12 md:py-20 flex flex-col items-center gap-12 min-h-[calc(100vh-104px)]">
            {/* API error */}
            {apiError && (
              <div className="w-full max-w-2xl flex items-center justify-between gap-3 px-4 py-3 rounded-sm border-2 border-brand bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-300 text-sm font-medium">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{apiError}</span>
                </div>
                <button onClick={() => setApiError(null)} className="cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Hero text + search */}
            <div className="flex flex-col items-center text-center gap-8 w-full">
              <div>
                <h1 className="text-[26px] sm:text-[38px] md:text-[54px] lg:text-[62px] font-black leading-none tracking-tight text-[#3D312A] dark:text-[#E6DFD5] drop-shadow-sm sm:whitespace-nowrap">
                  HÔM NAY BẠN MUỐN{" "}
                  <span className="text-brand dark:text-[#E8735A]">ĂN GÌ ?</span>
                </h1>
                <p className="text-[#3D312A]/60 dark:text-[#E6DFD5]/60 text-sm mt-3 font-semibold uppercase tracking-wider">
                  Mô tả cảm giác bạn muốn · AI sẽ gợi ý ngay
                </p>
              </div>

              {/* Search bar */}
              <div className="w-full max-w-3xl">
                <SearchBar
                  query={query}
                  setQuery={setQuery}
                  searchMode={searchMode}
                  setSearchMode={setSearchMode}
                  onSearch={() => handleSearch()}
                  compact={false}
                />
                <div className="mt-4 flex flex-col items-center gap-4">
                  <BudgetSelector value={budget} onChange={setBudget} />
                  
                  <Link
                    href="/lucky-wheel"
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white dark:bg-[#3D312A] border border-[#E6DFD5] dark:border-[#4D3D32] text-[#3D312A] dark:text-[#E6DFD5] hover:border-brand/40 hover:text-brand dark:hover:text-brand hover:shadow-[0_0_15px_rgba(232,115,90,0.15)] transition-all cursor-pointer shadow-sm group"
                  >
                    <span className="text-base group-hover:rotate-45 transition-transform duration-300">🎡</span>
                    <span>Hôm nay ăn gì? Thử Vòng Quay May Mắn!</span>
                  </Link>
                </div>
              </div>

              {/* Trending chips */}
              <div className="flex flex-wrap justify-center gap-2.5 max-w-2xl">
                {TRENDING.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setQuery(t.query);
                      handleSearch(t.query, t.tag ?? undefined);
                    }}
                    className="px-4 py-2 text-xs font-bold uppercase tracking-[1.5px] border-2 border-[#3D312A]/20 bg-white/80 dark:bg-[#2A2420]/80 hover:bg-brand hover:text-white hover:border-brand transition-all rounded-full shadow-sm cursor-pointer text-[#3D312A] dark:text-[#E6DFD5]"
                  >
                    {t.emoji} {t.title}
                  </button>
                ))}
              </div>
              
              {/* Feed Banner Button */}
              <div className="mt-4 w-full max-w-lg">
                <Link
                  href="/feed"
                  className="flex items-center justify-center gap-4 px-6 py-4 bg-gradient-to-r from-brand/90 to-rose-500/90 hover:from-brand hover:to-rose-500 text-white rounded-[24px] shadow-lg shadow-rose-500/20 hover:shadow-xl hover:shadow-rose-500/30 hover:-translate-y-1 transition-all cursor-pointer group border border-white/10"
                >
                  <div className="bg-white/20 p-2.5 rounded-xl group-hover:rotate-12 transition-transform">
                    <MessageSquare className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="font-black text-lg tracking-tight leading-tight">Khám phá Bảng tin 🌟</div>
                    <div className="text-[13px] text-white/90 font-medium mt-0.5">Tham gia cộng đồng chia sẻ trải nghiệm ẩm thực!</div>
                  </div>
                </Link>
              </div>
            </div>

            {/* ── Newspaper Daily Menu ── */}
            <NewspaperMenu />

            {/* ── Recommendations Grid ── */}
            <div className="w-full mt-4 relative z-20 border-t border-[#3D312A]/10 pt-10">
              <div className="flex items-center justify-between mb-8 px-2">
                <h2 className="text-2xl font-black text-[#3D312A] dark:text-[#E6DFD5] tracking-tight flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-brand dark:text-[#E8735A]" /> GỢI Ý CHO BẠN
                </h2>
                <Link
                  href="/recommendations"
                  className="text-xs font-black text-brand dark:text-[#E8735A] hover:opacity-80 tracking-widest uppercase border-b-2 border-brand pb-0.5 transition-all"
                >
                  Xem thêm
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {isLoadingRecs && recommendations.length === 0 ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="animate-pulse bg-gray-200 dark:bg-[#4D3D32] h-[320px] rounded-2xl w-full"></div>
                  ))
                ) : recommendations.length > 0 ? (
                  recommendations.map((item) => (
                    <FoodCard
                      key={item.id}
                      item={item}
                      userId={
                        typeof window !== "undefined"
                          ? localStorage.getItem("user_id") || "guest"
                          : "guest"
                      }
                    />
                  ))
                ) : (
                  <div className="col-span-full text-center text-gray-500 py-10">
                    Chưa có gợi ý nào, hãy thử tìm kiếm!
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </AppShell>

      <SurveyModal />
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
