import { RecommendResult } from "../app/result/page";

const FAVORITES_KEY = "wanderbite_favorites";

export const favoriteService = {
  getFavorites: (userId: string): RecommendResult[] => {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(FAVORITES_KEY);
    if (!data) return [];
    const allFavs = JSON.parse(data) as Record<string, RecommendResult[]>;
    return allFavs[userId] || [];
  },

  addFavorite: (userId: string, item: RecommendResult) => {
    if (typeof window === "undefined") return;
    const data = localStorage.getItem(FAVORITES_KEY);
    const allFavs: Record<string, RecommendResult[]> = data ? JSON.parse(data) : {};
    if (!allFavs[userId]) allFavs[userId] = [];
    
    // Check if already exists
    if (!allFavs[userId].some(fav => fav.name === item.name)) {
      allFavs[userId].push(item);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(allFavs));
    }
  },

  removeFavorite: (userId: string, itemName: string) => {
    if (typeof window === "undefined") return;
    const data = localStorage.getItem(FAVORITES_KEY);
    if (!data) return;
    const allFavs: Record<string, RecommendResult[]> = JSON.parse(data);
    if (allFavs[userId]) {
      allFavs[userId] = allFavs[userId].filter(fav => fav.name !== itemName);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(allFavs));
    }
  },

  isFavorite: (userId: string, itemName: string): boolean => {
    const favs = favoriteService.getFavorites(userId);
    return favs.some(fav => fav.name === itemName);
  }
};
