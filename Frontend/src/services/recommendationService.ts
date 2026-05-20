import { RecommendResult } from "../app/result/page";
import { favoriteService } from "./favoriteService";
import { historyService } from "./historyService";

export const recommendationService = {
  getRecommendations: (userId: string): RecommendResult[] => {
    const favorites = favoriteService.getFavorites(userId);
    const history = historyService.getHistory(userId);
    
    // In a real app, this would call the AI backend with user history/favorites.
    // For now, we return some dummy data based on favorites or general defaults.
    
    const recommendations: RecommendResult[] = [];
    
    if (favorites.length > 0) {
      recommendations.push({
        id: "rec-1",
        name: "Quán tương tự " + favorites[0].name,
        match: "95",
        dist: "1.2 km",
        price: "Trung bình",
        rating: "4.5",
        reason: "Dựa trên món " + favorites[0].name + " bạn đã thích gần đây.",
        img: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=600&auto=format&fit=crop",
        tags: ["Dựa trên sở thích"]
      });
    }

    if (history.length > 0) {
      recommendations.push({
        id: "rec-2",
        name: "Gợi ý cho từ khóa: " + history[0].query,
        match: "90",
        dist: "2.5 km",
        price: "Giá rẻ",
        rating: "4.8",
        reason: "Phù hợp với tìm kiếm gần đây của bạn.",
        img: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=600&auto=format&fit=crop",
        tags: ["Gần đây tìm kiếm"]
      });
    }

    // Default fallbacks
    recommendations.push({
      id: "rec-3",
      name: "Bún chả gia truyền",
      match: "85",
      dist: "0.5 km",
      price: "Bình dân",
      rating: "4.2",
      reason: "Đang thịnh hành trong khu vực của bạn.",
      img: "https://images.unsplash.com/photo-1585032226651-759b368d7246?q=80&w=600&auto=format&fit=crop",
      tags: ["Thịnh hành"]
    });

    recommendations.push({
      id: "rec-4",
      name: "Phở bò Wagyu",
      match: "80",
      dist: "3.0 km",
      price: "Cao cấp",
      rating: "4.9",
      reason: "Món ngon cuối tuần, thích hợp trải nghiệm mới.",
      img: "https://images.unsplash.com/photo-1626804475297-41609ea004eb?q=80&w=600&auto=format&fit=crop",
      tags: ["Trải nghiệm"]
    });

    return recommendations;
  }
};
