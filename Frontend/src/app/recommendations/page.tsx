"use client";

import React, { useEffect, useState } from "react";
import { PageLayout } from "../../components/PageLayout";
import { LoginRequiredModal } from "../../components/LoginRequiredModal";
import { FoodCard } from "../../components/FoodCard";
import { RecommendResult } from "../result/page";
import { makeAuthenticatedRequest } from '../../utils/apiClient';
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useOptimizedLocation } from "../../hooks/useOptimizedLocation";
import { useLanguage } from "../../components/LanguageProvider";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<RecommendResult[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const router = useRouter();
  const { getOptimizedLocation } = useOptimizedLocation();
  const { t, language } = useLanguage();

  useEffect(() => {
    async function fetchRecs() {
      const id = localStorage.getItem("user_id");
      if (!id) {
        setShowLoginModal(true);
        return;
      }
      setUserId(id);

      const cacheKey = `full_recommendations_${id}`;

      // Check user-specific cache first
      try {
        const cachedRecs = sessionStorage.getItem(cacheKey);
        if (cachedRecs) {
          setRecommendations(JSON.parse(cachedRecs));
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Lỗi khi đọc cache:", err);
      }

      try {
        if (!sessionStorage.getItem(cacheKey)) {
          setIsLoading(true);
        }
        const gps = await getOptimizedLocation();
        if (!gps) {
          toast.error(t("recommendationsPage.locationError"));
          setIsLoading(false);
          return;
        }

        const url = new URL(`${BACKEND_URL}/api/v1/restaurants/recommendations`);
        url.searchParams.append("lat", gps.lat.toString());
        url.searchParams.append("lng", gps.lng.toString());
        url.searchParams.append("limit", "16");

        const res = await makeAuthenticatedRequest(url.toString(), {
          method: "GET",
        });

        if (res.ok) {
          const data = await res.json();
          // Endpoint /api/v1/restaurants/recommendations returns an array directly
          const resultsArray = Array.isArray(data) ? data : (data.results || []);
          
          if (resultsArray && resultsArray.length > 0) {
            const seen = new Set();
            const uniqueResults = resultsArray.filter((item: RecommendResult) => {
              if (!item.name) return true;
              const duplicate = seen.has(item.name);
              seen.add(item.name);
              return !duplicate;
            });
            const finalRecs = uniqueResults.slice(0, 16);
            setRecommendations(finalRecs);

            // Save to user-specific cache
            try {
              sessionStorage.setItem(cacheKey, JSON.stringify(finalRecs));
            } catch (err) {
              console.error("Lỗi khi lưu cache:", err);
            }
          }
        } else {
          toast.error(t("recommendationsPage.fetchError"));
        }
      } catch (err) {
        console.error("Error fetching recommendations:", err);
        toast.error(t("recommendationsPage.connectionError"));
      } finally {
        setIsLoading(false);
      }
    }

    fetchRecs();
  }, [router, getOptimizedLocation, language]);

  return (
    <PageLayout>
      <LoginRequiredModal isOpen={showLoginModal} message={t("recommendationsPage.pleaseLogin")} />
      {!showLoginModal && (
        <>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-[#E6DFD5] flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-brand dark:text-[#E8735A] fill-brand/20" />
              {t("recommendationsPage.title")}
            </h1>
            <p className="text-gray-500 dark:text-[#9A8A7A] mt-2">
              {t("recommendationsPage.desc")}
            </p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse bg-gray-200 dark:bg-[#4D3D32] h-[320px] rounded-2xl w-full"></div>
              ))}
            </div>
          ) : recommendations.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-[#3D312A] rounded-3xl border border-gray-100 dark:border-[#4D3D32]">
              <Sparkles className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-700 dark:text-[#E6DFD5] mb-2">{t("recommendationsPage.emptyTitle")}</h2>
              <p className="text-gray-500 dark:text-[#9A8A7A] mb-6">{t("recommendationsPage.emptyDesc")}</p>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-2.5 bg-brand hover:bg-brand-hover text-white rounded-full font-semibold transition-colors"
              >
                {t("recommendationsPage.exploreNow")}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {recommendations.map((item, idx) => (
                <FoodCard
                  key={item.id || idx}
                  item={item}
                  userId={userId!}
                />
              ))}
            </div>
          )}
        </>
      )}
    </PageLayout>
  );
}
