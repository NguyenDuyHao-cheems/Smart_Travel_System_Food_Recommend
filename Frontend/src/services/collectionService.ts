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

  fetchAndSyncCollections: async (userId: string): Promise<Collection[]> => {
    if (typeof window === "undefined") return [];

    // Helper: redirect to /auth on 401
    const handle401 = (res: Response): boolean => {
      if (res.status === 401) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user_id");
        window.location.href = "/auth?expired=1";
        return true;
      }
      return false;
    };

    try {
      const token = localStorage.getItem("access_token");
      if (!token) return collectionService.getCollections(userId);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      // 1. Get current local collections to check for unsynced data
      const localData = localStorage.getItem(COLLECTIONS_KEY);
      const allLocalColls: Record<string, Collection[]> = localData ? JSON.parse(localData) : {};
      const userLocalColls = allLocalColls[userId] || [];

      // 2. Fetch from DB
      const res = await fetch(`${apiUrl}/api/v1/users/collections`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (handle401(res)) return [];
      if (res.ok) {
        const dbColls = await res.json();
        // Convert to UI Collection structure
        const formattedColls: Collection[] = dbColls.map((c: any) => ({
          id: c.id,
          name: c.name,
          description: c.description || "",
          createdAt: new Date(c.created_at).getTime(),
          items: c.items || []
        }));

        // 3. Auto-sync unsynced local collections & items to DB!
        let syncedColls = [...formattedColls];
        let hasChanges = false;

        for (const localColl of userLocalColls) {
          // A. If it's a temp collection, create it in DB
          if (localColl.id.startsWith("temp-")) {
            try {
              const createRes = await fetch(`${apiUrl}/api/v1/users/collections`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ name: localColl.name, description: localColl.description })
              });
              if (handle401(createRes)) return collectionService.getCollections(userId);
              if (createRes.ok) {
                const savedColl = await createRes.json();
                hasChanges = true;
                
                const newSyncedColl: Collection = {
                  id: savedColl.id,
                  name: savedColl.name,
                  description: savedColl.description || "",
                  createdAt: new Date(savedColl.created_at).getTime(),
                  items: []
                };
                
                // Add its items to DB as well
                for (const item of localColl.items) {
                  try {
                    const addItemRes = await fetch(`${apiUrl}/api/v1/users/collections/${savedColl.id}/items`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                      },
                      body: JSON.stringify({ res_id: item.id })
                    });
                    if (!handle401(addItemRes)) {
                      newSyncedColl.items.push(item);
                    }
                  } catch (e) {
                    console.error("Failed to sync item to new collection:", e);
                  }
                }
                syncedColls.push(newSyncedColl);
              } else {
                console.warn("Failed to sync temp collection to DB:", createRes.status, localColl.name);
              }
            } catch (e) {
              console.error("Failed to sync temp collection:", e);
            }
          } else {
            // B. If it's a DB collection, check for local items not yet in DB
            const dbColl = syncedColls.find(c => c.id === localColl.id);
            if (dbColl) {
              for (const localItem of localColl.items) {
                const alreadyInDb = dbColl.items.some(i => i.name === localItem.name);
                if (!alreadyInDb) {
                  try {
                    const addRes = await fetch(`${apiUrl}/api/v1/users/collections/${dbColl.id}/items`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                      },
                      body: JSON.stringify({ res_id: localItem.id })
                    });
                    if (addRes.ok) {
                      dbColl.items.push(localItem);
                      hasChanges = true;
                    }
                  } catch (e) {
                    console.error("Failed to sync local item to existing collection:", e);
                  }
                }
              }
            }
          }
        }

        allLocalColls[userId] = syncedColls;
        localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(allLocalColls));
        return syncedColls;
      }
    } catch (err) {
      console.error("Failed to sync collections from DB:", err);
    }
    return collectionService.getCollections(userId);
  },

  createCollection: async (userId: string, name: string, description: string = ""): Promise<Collection | null> => {
    if (typeof window === "undefined" || !name.trim()) return null;

    // 1. Instantly create in localStorage
    const newCollId = "temp-" + Date.now().toString();
    const newColl: Collection = {
      id: newCollId,
      name,
      description,
      createdAt: Date.now(),
      items: []
    };

    const data = localStorage.getItem(COLLECTIONS_KEY);
    const allColls: Record<string, Collection[]> = data ? JSON.parse(data) : {};
    if (!allColls[userId]) allColls[userId] = [];
    allColls[userId].push(newColl);
    localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(allColls));

    // 2. Persist to Database
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return newColl;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/api/v1/users/collections`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ name, description })
      });
      if (res.status === 401) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user_id");
        window.location.href = "/auth?expired=1";
        return newColl;
      }
      if (!res.ok) {
        console.error("Failed to create collection in DB, status:", res.status, await res.text());
      }
      if (res.ok) {
        const savedColl = await res.json();
        const updatedColl: Collection = {
          id: savedColl.id,
          name: savedColl.name,
          description: savedColl.description || "",
          createdAt: new Date(savedColl.created_at).getTime(),
          items: []
        };
        const currentData = localStorage.getItem(COLLECTIONS_KEY);
        if (currentData) {
          const parsed = JSON.parse(currentData) as Record<string, Collection[]>;
          if (parsed[userId]) {
            parsed[userId] = parsed[userId].map(c => c.id === newCollId ? updatedColl : c);
            localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(parsed));
          }
        }
        return updatedColl;
      }
    } catch (err) {
      console.error("Failed to create collection in DB:", err);
    }
    return newColl;
  },

  deleteCollection: async (userId: string, id: string): Promise<void> => {
    if (typeof window === "undefined") return;

    // 1. Instantly delete from localStorage
    const data = localStorage.getItem(COLLECTIONS_KEY);
    if (data) {
      const allColls: Record<string, Collection[]> = JSON.parse(data);
      if (allColls[userId]) {
        allColls[userId] = allColls[userId].filter(c => c.id !== id);
        localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(allColls));
      }
    }

    // 2. Persist to Database
    if (id.startsWith("temp-")) return;
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      await fetch(`${apiUrl}/api/v1/users/collections/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
    } catch (err) {
      console.error("Failed to delete collection from DB:", err);
    }
  },

  updateCollection: async (userId: string, id: string, name: string, description: string): Promise<void> => {
    if (typeof window === "undefined") return;

    // 1. Instantly update localStorage
    const data = localStorage.getItem(COLLECTIONS_KEY);
    if (data) {
      const allColls: Record<string, Collection[]> = JSON.parse(data);
      if (allColls[userId]) {
        const coll = allColls[userId].find(c => c.id === id);
        if (coll) {
          coll.name = name;
          coll.description = description;
          localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(allColls));
        }
      }
    }

    // 2. Persist to Database
    if (id.startsWith("temp-")) return;
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      await fetch(`${apiUrl}/api/v1/users/collections/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ name, description })
      });
    } catch (err) {
      console.error("Failed to update collection in DB:", err);
    }
  },

  addItemToCollection: async (userId: string, collectionId: string, item: RecommendResult): Promise<void> => {
    if (typeof window === "undefined") return;

    // 1. Instantly update localStorage
    const data = localStorage.getItem(COLLECTIONS_KEY);
    if (data) {
      const allColls: Record<string, Collection[]> = JSON.parse(data);
      if (allColls[userId]) {
        const coll = allColls[userId].find(c => c.id === collectionId);
        if (coll && !coll.items.some(i => i.name === item.name)) {
          coll.items.push(item);
          localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(allColls));
        }
      }
    }

    // 2. Persist to Database
    if (collectionId.startsWith("temp-")) return;
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      await fetch(`${apiUrl}/api/v1/users/collections/${collectionId}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ res_id: item.id })
      });
    } catch (err) {
      console.error("Failed to add item to collection in DB:", err);
    }
  },

  removeItemFromCollection: async (userId: string, collectionId: string, itemName: string): Promise<void> => {
    if (typeof window === "undefined") return;

    const colls = collectionService.getCollections(userId);
    const coll = colls.find(c => c.id === collectionId);
    if (!coll) return;
    const item = coll.items.find(i => i.name === itemName);
    if (!item) return;

    // 1. Instantly update localStorage
    const data = localStorage.getItem(COLLECTIONS_KEY);
    if (data) {
      const allColls: Record<string, Collection[]> = JSON.parse(data);
      if (allColls[userId]) {
        const targetColl = allColls[userId].find(c => c.id === collectionId);
        if (targetColl) {
          targetColl.items = targetColl.items.filter(i => i.name !== itemName);
          localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(allColls));
        }
      }
    }

    // 2. Persist to Database
    if (collectionId.startsWith("temp-")) return;
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      await fetch(`${apiUrl}/api/v1/users/collections/${collectionId}/items/${item.id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
    } catch (err) {
      console.error("Failed to remove item from collection in DB:", err);
    }
  },

  isInAnyCollection: (userId: string, itemName: string): boolean => {
    if (typeof window === "undefined") return false;
    const colls = collectionService.getCollections(userId);
    return colls.some(coll => coll.items.some(item => item.name === itemName));
  }
};
