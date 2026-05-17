"use client";

import React, { useEffect, useState } from "react";
import { PageLayout } from "../../components/PageLayout";
import { FoodCard } from "../../components/FoodCard";
import { RecommendResult } from "../result/page";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useOptimizedLocation } from "../../hooks/useOptimizedLocation";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<RecommendResult[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { getOptimizedLocation } = useOptimizedLocation();

  useEffect(() => {
    async function fetchRecs() {
      const id = localStorage.getItem("user_id");
      if (!id) {
        toast.error("Vui lòng đăng nhập để xem gợi ý");
        router.push("/auth");
        return;
      }
      setUserId(id);

      // Check cache first
      try {
        const cachedRecs = sessionStorage.getItem("full_recommendations");
        if (cachedRecs) {
          setRecommendations(JSON.parse(cachedRecs));
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.error("Lỗi khi đọc cache:", err);
      }

      try {
        setIsLoading(true);
        const gps = await getOptimizedLocation();
        if (!gps) {
          toast.error("Không thể xác định vị trí. Vui lòng bật GPS.");
          setIsLoading(false);
          return;
        }

        const url = new URL(`${BACKEND_URL}/api/v1/recommendations/home`);
        url.searchParams.append("lat", gps.lat.toString());
        url.searchParams.append("lng", gps.lng.toString());
        url.searchParams.append("limit", "16");

        const token = localStorage.getItem("access_token");
        const res = await fetch(url.toString(), {
          method: "GET",
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.results && Array.isArray(data.results)) {
            const seen = new Set();
            const uniqueResults = data.results.filter((item: RecommendResult) => {
              if (!item.name) return true;
              const duplicate = seen.has(item.name);
              seen.add(item.name);
              return !duplicate;
            });
            const finalRecs = uniqueResults.slice(0, 16);
            setRecommendations(finalRecs);
            
            try {
              sessionStorage.setItem("full_recommendations", JSON.stringify(finalRecs));
            } catch (err) {}
          }
        } else {
          toast.error("Không thể lấy dữ liệu gợi ý.");
        }
      } catch (err) {
        console.error("Error fetching recommendations:", err);
        toast.error("Lỗi kết nối hệ thống.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchRecs();
  }, [router, getOptimizedLocation]);

  return (
    <PageLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-[#E6DFD5] flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-brand dark:text-[#E8735A] fill-brand/20" />
          Gợi ý dành riêng cho bạn
        </h1>
        <p className="text-gray-500 dark:text-[#9A8A7A] mt-2">
          Các địa điểm được tự động chọn lọc dựa trên khoảng cách và sở thích của bạn
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
          <h2 className="text-xl font-bold text-gray-700 dark:text-[#E6DFD5] mb-2">Chưa có đủ dữ liệu để gợi ý</h2>
          <p className="text-gray-500 dark:text-[#9A8A7A] mb-6">Hãy tìm kiếm và yêu thích thêm các món ăn để AI hiểu bạn hơn nhé!</p>
          <button 
            onClick={() => router.push('/')}
            className="px-6 py-2.5 bg-brand hover:bg-brand-hover text-white rounded-full font-semibold transition-colors"
          >
            Khám phá ngay
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
    </PageLayout>
  );
}
