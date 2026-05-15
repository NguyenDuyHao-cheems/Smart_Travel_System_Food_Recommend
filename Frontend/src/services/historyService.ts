export interface SearchHistoryItem {
  id: string;
  query: string;
  budget: string | number;
  createdAt: number;
  resultCount?: number;
  sessionId?: string;
  searchMode?: "basic" | "emotion";
}

const HISTORY_KEY = "wanderbite_history";

function parseHistory(data: string | null): Record<string, SearchHistoryItem[]> {
  if (!data) return {};
  try {
    return JSON.parse(data) as Record<string, SearchHistoryItem[]>;
  } catch {
    return {};
  }
}

export const historyService = {
  getHistory: (userId: string): SearchHistoryItem[] => {
    if (typeof window === "undefined") return [];
    const allHistory = parseHistory(localStorage.getItem(HISTORY_KEY));
    return allHistory[userId] || [];
  },

  addHistory: (
    userId: string,
    query: string,
    budget: string | number,
    resultCount?: number,
    sessionId?: string,
    searchMode?: "basic" | "emotion"
  ) => {
    if (typeof window === "undefined" || !query.trim()) return;
    const allHistory = parseHistory(localStorage.getItem(HISTORY_KEY));
    if (!allHistory[userId]) allHistory[userId] = [];
    
    // Keep the newest session metadata without duplicating the top item.
    if (allHistory[userId].length > 0 && allHistory[userId][0].query === query && allHistory[userId][0].budget === budget) {
      allHistory[userId][0] = {
        ...allHistory[userId][0],
        createdAt: Date.now(),
        resultCount,
        sessionId,
        searchMode,
      };
      localStorage.setItem(HISTORY_KEY, JSON.stringify(allHistory));
      return;
    }

    const newItem: SearchHistoryItem = {
      id: Date.now().toString(),
      query,
      budget,
      createdAt: Date.now(),
      resultCount,
      sessionId,
      searchMode
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
    const allHistory = parseHistory(localStorage.getItem(HISTORY_KEY));
    if (allHistory[userId]) {
      allHistory[userId] = allHistory[userId].filter(item => item.id !== id);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(allHistory));
    }
  },

  clearHistory: (userId: string) => {
    if (typeof window === "undefined") return;
    const allHistory = parseHistory(localStorage.getItem(HISTORY_KEY));
    allHistory[userId] = [];
    localStorage.setItem(HISTORY_KEY, JSON.stringify(allHistory));
  }
};
