import { RecommendResult } from "../app/result/page";

export interface Collection {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  items: RecommendResult[];
}

const COLLECTIONS_KEY = "wanderbite_collections";

export const collectionService = {
  getCollections: (userId: string): Collection[] => {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(COLLECTIONS_KEY);
    if (!data) return [];
    const allColls = JSON.parse(data) as Record<string, Collection[]>;
    return allColls[userId] || [];
  },

  createCollection: (userId: string, name: string, description: string = ""): Collection | null => {
    if (typeof window === "undefined" || !name.trim()) return null;
    const data = localStorage.getItem(COLLECTIONS_KEY);
    const allColls: Record<string, Collection[]> = data ? JSON.parse(data) : {};
    if (!allColls[userId]) allColls[userId] = [];
    
    const newColl: Collection = {
      id: Date.now().toString(),
      name,
      description,
      createdAt: Date.now(),
      items: []
    };

    allColls[userId].push(newColl);
    localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(allColls));
    return newColl;
  },

  deleteCollection: (userId: string, id: string) => {
    if (typeof window === "undefined") return;
    const data = localStorage.getItem(COLLECTIONS_KEY);
    if (!data) return;
    const allColls: Record<string, Collection[]> = JSON.parse(data);
    if (allColls[userId]) {
      allColls[userId] = allColls[userId].filter(c => c.id !== id);
      localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(allColls));
    }
  },

  updateCollection: (userId: string, id: string, name: string, description: string) => {
    if (typeof window === "undefined") return;
    const data = localStorage.getItem(COLLECTIONS_KEY);
    if (!data) return;
    const allColls: Record<string, Collection[]> = JSON.parse(data);
    if (allColls[userId]) {
      const coll = allColls[userId].find(c => c.id === id);
      if (coll) {
        coll.name = name;
        coll.description = description;
        localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(allColls));
      }
    }
  },

  addItemToCollection: (userId: string, collectionId: string, item: RecommendResult) => {
    if (typeof window === "undefined") return;
    const data = localStorage.getItem(COLLECTIONS_KEY);
    if (!data) return;
    const allColls: Record<string, Collection[]> = JSON.parse(data);
    if (allColls[userId]) {
      const coll = allColls[userId].find(c => c.id === collectionId);
      if (coll && !coll.items.some(i => i.name === item.name)) {
        coll.items.push(item);
        localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(allColls));
      }
    }
  },

  removeItemFromCollection: (userId: string, collectionId: string, itemName: string) => {
    if (typeof window === "undefined") return;
    const data = localStorage.getItem(COLLECTIONS_KEY);
    if (!data) return;
    const allColls: Record<string, Collection[]> = JSON.parse(data);
    if (allColls[userId]) {
      const coll = allColls[userId].find(c => c.id === collectionId);
      if (coll) {
        coll.items = coll.items.filter(i => i.name !== itemName);
        localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(allColls));
      }
    }
  }
};
