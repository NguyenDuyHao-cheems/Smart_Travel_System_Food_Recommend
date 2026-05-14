"use client";

import React, { useEffect, useState } from "react";
import { PageLayout } from "../../components/PageLayout";
import { FoodCard } from "../../components/FoodCard";
import { favoriteService } from "../../services/favoriteService";
import { RecommendResult } from "../result/page";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<RecommendResult[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

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

  const handleRemove = (item: RecommendResult) => {
    if (!userId) return;
    favoriteService.removeFavorite(userId, item.name);
    setFavorites(prev => prev.filter(f => f.name !== item.name));
    toast.success("Đã xóa khỏi yêu thích");
  };

  return (
    <PageLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Heart className="w-8 h-8 text-red-500 fill-red-500/20" />
          Món ăn yêu thích
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Danh sách các món ăn và địa điểm bạn đã lưu lại
        </p>
      </div>

      {favorites.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700">
          <Heart className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-700 dark:text-gray-200 mb-2">Bạn chưa có món nào trong yêu thích</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Hãy khám phá và lưu lại những món ăn ngon nhé!</p>
          <button 
            onClick={() => router.push('/')}
            className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-full font-semibold transition-colors"
          >
            Khám phá ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {favorites.map((item, idx) => (
            <FoodCard 
              key={item.id || idx} 
              item={item} 
              userId={userId!} 
              showRemove={true}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}
    </PageLayout>
  );
}
