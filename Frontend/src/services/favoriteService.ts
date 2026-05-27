import { RecommendResult } from "../app/result/page";
import { getAccessToken } from "../utils/authStorage";
import { makeAuthenticatedRequest } from "../utils/apiClient";

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
      const token = getAccessToken();
      if (!token) return favoriteService.getFavorites(userId);

      const res = await makeAuthenticatedRequest(`/api/v1/users/favorites`);

      if (res.status === 401) {
        return [];
      }

      if (res.ok) {
        const dbFavs = await res.json() as RecommendResult[];
        
        // 2-Way Sync: Find unsynced local favorites and upload them to the database
        const localData = localStorage.getItem(FAVORITES_KEY);
        const allFavs: Record<string, RecommendResult[]> = localData ? JSON.parse(localData) : {};
        const localFavs = allFavs[userId] || [];
        
        let syncedFavs = [...dbFavs];
        let hasChanges = false;
        
        for (const localFav of localFavs) {
          const alreadyInDb = dbFavs.some(dbFav => dbFav.name === localFav.name);
          if (!alreadyInDb) {
            // Guard: Do not sync mock items to the DB
            if (localFav.id && !localFav.id.startsWith("mock-")) {
              try {
                const addRes = await makeAuthenticatedRequest(`/api/v1/users/favorites`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({ res_id: localFav.id })
                });
                
                if (addRes.status === 401) {
                  return [];
                }
                
                if (addRes.ok) {
                  syncedFavs.push(localFav);
                  hasChanges = true;
                }
              } catch (e) {
                console.error("Failed to sync local favorite to DB in background:", e);
              }
            }
          }
        }
        
        allFavs[userId] = syncedFavs;
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(allFavs));
        return syncedFavs;
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
      const token = getAccessToken();
      if (!token) return;

      await makeAuthenticatedRequest(`/api/v1/users/favorites`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
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
      const token = getAccessToken();
      if (!token) return;

      await makeAuthenticatedRequest(`/api/v1/users/favorites/${item.id}`, {
        method: "DELETE"
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
