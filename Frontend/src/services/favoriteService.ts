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

  fetchAndSyncFavorites: async (userId: string): Promise<RecommendResult[]> => {
    if (typeof window === "undefined") return [];
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return favoriteService.getFavorites(userId);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const res = await fetch(`${apiUrl}/api/v1/users/favorites`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        const dbFavs = await res.json() as RecommendResult[];
        const data = localStorage.getItem(FAVORITES_KEY);
        const allFavs: Record<string, RecommendResult[]> = data ? JSON.parse(data) : {};
        allFavs[userId] = dbFavs;
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(allFavs));
        return dbFavs;
      }
    } catch (err) {
      console.error("Failed to sync favorites from DB:", err);
    }
    return favoriteService.getFavorites(userId);
  },

  addFavorite: async (userId: string, item: RecommendResult): Promise<void> => {
    if (typeof window === "undefined") return;
    
    // 1. Update localStorage instantly for responsive UX
    const data = localStorage.getItem(FAVORITES_KEY);
    const allFavs: Record<string, RecommendResult[]> = data ? JSON.parse(data) : {};
    if (!allFavs[userId]) allFavs[userId] = [];
    if (!allFavs[userId].some(fav => fav.name === item.name)) {
      allFavs[userId].push(item);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(allFavs));
    }

    // 2. Persist to Database
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      await fetch(`${apiUrl}/api/v1/users/favorites`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ res_id: item.id })
      });
    } catch (err) {
      console.error("Failed to persist favorite to DB:", err);
    }
  },

  removeFavorite: async (userId: string, itemName: string): Promise<void> => {
    if (typeof window === "undefined") return;
    
    // Find the item ID from localStorage to delete on backend
    const favs = favoriteService.getFavorites(userId);
    const item = favs.find(f => f.name === itemName);
    if (!item) return;

    // 1. Update localStorage instantly for responsive UX
    const data = localStorage.getItem(FAVORITES_KEY);
    if (data) {
      const allFavs: Record<string, RecommendResult[]> = JSON.parse(data);
      if (allFavs[userId]) {
        allFavs[userId] = allFavs[userId].filter(fav => fav.name !== itemName);
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(allFavs));
      }
    }

    // 2. Persist delete to Database
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      await fetch(`${apiUrl}/api/v1/users/favorites/${item.id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
    } catch (err) {
      console.error("Failed to delete favorite from DB:", err);
    }
  },

  isFavorite: (userId: string, itemName: string): boolean => {
    const favs = favoriteService.getFavorites(userId);
    return favs.some(fav => fav.name === itemName);
  }
};
