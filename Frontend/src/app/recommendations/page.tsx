"use client";

import React, { useEffect, useState } from "react";
import { PageLayout } from "../../components/PageLayout";
import { FoodCard } from "../../components/FoodCard";
import { recommendationService } from "../../services/recommendationService";
import { RecommendResult } from "../result/page";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<RecommendResult[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const id = localStorage.getItem("user_id");
    if (!id) {
      toast.error("Vui lòng đăng nhập để xem gợi ý");
      router.push("/auth");
      return;
    }
    setUserId(id);
    // In a real scenario, this might be an async call to the backend
    setRecommendations(recommendationService.getRecommendations(id));
  }, [router]);

  return (
    <PageLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-[#E6DFD5] flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-brand fill-brand/20" />
          Gợi ý dành riêng cho bạn
        </h1>
        <p className="text-gray-500 dark:text-[#9A8A7A] mt-2">
          Các địa điểm được AI tuyển chọn dựa trên sở thích và lịch sử tìm kiếm của bạn
        </p>
      </div>

      {recommendations.length === 0 ? (
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
