"use client";

import React, { useEffect, useState } from "react";
import { PageLayout } from "../../components/PageLayout";
import { FoodCard } from "../../components/FoodCard";
import { favoriteService } from "../../services/favoriteService";
import { RecommendResult } from "../result/page";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { interactionService } from "../../services/interactionService";

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<RecommendResult[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [highlightedName, setHighlightedName] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const id = localStorage.getItem("user_id");
    if (!id) {
      toast.error("Vui lòng đăng nhập để xem yêu thích");
      router.push("/auth");
      return;
    }
    setUserId(id);
    setFavorites(favoriteService.getFavorites(id));
  }, [router]);

  useEffect(() => {
    const highlight = searchParams.get("highlight");
    if (highlight) {
      setHighlightedName(highlight);
      const timer = setTimeout(() => {
        setHighlightedName(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const handleRemove = (item: RecommendResult) => {
    if (!userId) return;
    favoriteService.removeFavorite(userId, item.name);
    setFavorites(prev => prev.filter(f => f.name !== item.name));
    toast.success("Đã xóa khỏi yêu thích");

    interactionService.logInteraction({
      res_id: item.id,
      action_type: "REMOVE_RESTAURANT",
      metadata: { restaurant_name: item.name, source_type: "favorite" }
    });
  };

  return (
    <PageLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-[#E6DFD5] flex items-center gap-3">
          <Heart className="w-8 h-8 text-red-500 fill-red-500/20" />
          Món ăn yêu thích
        </h1>
        <p className="text-gray-500 dark:text-[#9A8A7A] mt-2">
          Danh sách các món ăn và địa điểm bạn đã lưu lại
        </p>
      </div>

      {favorites.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-[#3D312A] rounded-3xl border border-gray-100 dark:border-[#4D3D32]">
          <Heart className="w-16 h-16 text-gray-300 dark:text-[#6A5A4A] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-700 dark:text-[#E6DFD5] mb-2">Bạn chưa có món nào trong yêu thích</h2>
          <p className="text-gray-500 dark:text-[#9A8A7A] mb-6">Hãy khám phá và lưu lại những món ăn ngon nhé!</p>
          <button 
            onClick={() => router.push('/')}
            className="px-6 py-2.5 bg-brand hover:bg-brand-hover text-white rounded-full font-semibold transition-colors"
          >
            Khám phá ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {favorites.map((item, idx) => (
            <div 
              key={item.id || idx} 
              className={`transition-all duration-500 rounded-2xl ${
                highlightedName === item.name 
                  ? "ring-4 ring-yellow-400 dark:ring-orange-500 scale-[1.02] shadow-lg animate-pulse" 
                  : ""
              }`}
            >
              <FoodCard 
                item={item} 
                userId={userId!} 
                showRemove={true}
                onRemove={handleRemove}
              />
            </div>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
