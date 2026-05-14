export interface SearchHistoryItem {
  id: string;
  query: string;
  budget: string | number;
  createdAt: number;
  resultCount?: number;
}

const HISTORY_KEY = "wanderbite_history";

export const historyService = {
  getHistory: (userId: string): SearchHistoryItem[] => {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(HISTORY_KEY);
    if (!data) return [];
    const allHistory = JSON.parse(data) as Record<string, SearchHistoryItem[]>;
    return allHistory[userId] || [];
  },

  addHistory: (userId: string, query: string, budget: string | number, resultCount?: number) => {
    if (typeof window === "undefined" || !query.trim()) return;
    const data = localStorage.getItem(HISTORY_KEY);
    const allHistory: Record<string, SearchHistoryItem[]> = data ? JSON.parse(data) : {};
    if (!allHistory[userId]) allHistory[userId] = [];
    
    // Avoid exact duplicate at the top
    if (allHistory[userId].length > 0 && allHistory[userId][0].query === query && allHistory[userId][0].budget === budget) {
      return;
    }

    const newItem: SearchHistoryItem = {
      id: Date.now().toString(),
      query,
      budget,
      createdAt: Date.now(),
      resultCount
    };

    allHistory[userId] = [newItem, ...allHistory[userId]];
    
    // Keep max 50 items
    if (allHistory[userId].length > 50) {
      allHistory[userId] = allHistory[userId].slice(0, 50);
    }

    localStorage.setItem(HISTORY_KEY, JSON.stringify(allHistory));
  },

  removeHistoryItem: (userId: string, id: string) => {
    if (typeof window === "undefined") return;
    const data = localStorage.getItem(HISTORY_KEY);
    if (!data) return;
    const allHistory: Record<string, SearchHistoryItem[]> = JSON.parse(data);
    if (allHistory[userId]) {
      allHistory[userId] = allHistory[userId].filter(item => item.id !== id);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(allHistory));
    }
  },

  clearHistory: (userId: string) => {
    if (typeof window === "undefined") return;
    const data = localStorage.getItem(HISTORY_KEY);
    if (!data) return;
    const allHistory: Record<string, SearchHistoryItem[]> = JSON.parse(data);
    allHistory[userId] = [];
    localStorage.setItem(HISTORY_KEY, JSON.stringify(allHistory));
  }
};
