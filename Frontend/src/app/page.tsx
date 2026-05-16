"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { X, AlertTriangle, RefreshCw, Sparkles } from "lucide-react";
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
  { id: 1, title: "Top Quán Nướng", emoji: "🥩", query: "quán nướng ngon" },
  { id: 2, title: "Ăn Đêm", emoji: "🌃", query: "đồ ăn đêm muộn" },
  { id: 3, title: "Đồ ăn Healthy", emoji: "🥑", query: "đồ ăn healthy ít calo" },
  { id: 4, title: "Trà Sữa & Cà Phê", emoji: "🧋", query: "trà sữa cà phê ngon" },
  { id: 5, title: "Bánh mì & Bún", emoji: "🍜", query: "bánh mì bún ngon" },
  { id: 6, title: "Dimsum & Lẩu", emoji: "🥢", query: "dimsum lẩu ngon" },
];

/* ── Mock recommendations (shown before first real search) ── */
const MOCK_RECOMMENDATIONS: RecommendResult[] = [
  {
    id: "mock-1",
    name: "Bánh Mì Huỳnh Hoa",
    restaurantName: "Huỳnh Hoa Bakery",
    reason: "Bánh mì đệ nhất Sài Gòn với pate siêu béo ngậy và các loại thịt nguội hảo hạng.",
    tags: ["Đặc sản", "Nổi tiếng", "Bánh mì"],
    img: "/images/food1.jpg",
    match: "98%",
    dist: "1.2 km",
    price: "30.000đ",
    rating: "4.9",
    google_maps_url: "https://maps.google.com",
  },
  {
    id: "mock-2",
    name: "Cơm Tấm Ba Ghiền",
    restaurantName: "Cơm Tấm Ba Ghiền",
    reason: "Sườn nướng khổng lồ thơm nức mũi chuẩn vị Sài Gòn truyền thống.",
    tags: ["Cơm tấm", "Sườn nướng", "Ăn trưa"],
    img: "/images/food2.jpg",
    match: "95%",
    dist: "3.4 km",
    price: "55.000đ",
    rating: "4.7",
    google_maps_url: "https://maps.google.com",
  },
  {
    id: "mock-3",
    name: "Phở Hòa Pasteur",
    restaurantName: "Phở Hòa",
    reason: "Nước dùng ngọt thanh từ xương bò ninh kỹ, sợi phở mềm dẻo tuyệt hảo.",
    tags: ["Ăn sáng", "Phở bò", "Gia truyền"],
    img: "/images/food3.jpg",
    match: "92%",
    dist: "2.5 km",
    price: "75.000đ",
    rating: "4.8",
    google_maps_url: "https://maps.google.com",
  },
];

/* ─────────────────────────────────────────────── */

export default function Home() {
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
  const handleSearch = async (overrideQuery?: string) => {
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

      const res = await fetch(`${BACKEND_URL}/api/v1/search/recommend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          query: finalQuery,
          lat: gps.lat,
          lng: gps.lng,
          user_id: userId || undefined,
          budget: budget === "auto" ? undefined : parseInt(budget, 10),
          search_mode: searchMode,
          top_k: 16,
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
        router.push(`/result?session_id=${data.session_id}&mode=${searchMode}`);
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
                <div className="mt-4 flex justify-center">
                  <BudgetSelector value={budget} onChange={setBudget} />
                </div>
              </div>

              {/* Trending chips */}
              <div className="flex flex-wrap justify-center gap-2.5 max-w-2xl">
                {TRENDING.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setQuery(t.query);
                      handleSearch(t.query);
                    }}
                    className="px-4 py-2 text-xs font-bold uppercase tracking-[1.5px] border-2 border-[#3D312A]/20 bg-white/80 dark:bg-[#2A2420]/80 hover:bg-brand hover:text-white hover:border-brand transition-all rounded-full shadow-sm cursor-pointer text-[#3D312A] dark:text-[#E6DFD5]"
                  >
                    {t.emoji} {t.title}
                  </button>
                ))}
              </div>
            </div>

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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {MOCK_RECOMMENDATIONS.map((item) => (
                  <FoodCard
                    key={item.id}
                    item={item}
                    userId={
                      typeof window !== "undefined"
                        ? localStorage.getItem("user_id") || "guest"
                        : "guest"
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      </AppShell>

      <SurveyModal />
    </>
  );
}
