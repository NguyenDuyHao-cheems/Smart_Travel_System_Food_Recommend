import { getAccessToken } from "../utils/authStorage";
import { makeAuthenticatedRequest } from "../utils/apiClient";

export interface Friend {
  friend_id: string;
  username: string;
  full_name?: string | null;
  avatar_url?: string | null;
  created_at: string;
}

export const friendService = {
  fetchFriends: async (): Promise<Friend[]> => {
    if (typeof window === "undefined") return [];

    const token = getAccessToken();
    if (!token) return [];

    const res = await makeAuthenticatedRequest(`/api/v1/users/friends`);

    if (res.status === 401) {
      return [];
    }

    if (!res.ok) {
      throw new Error("Failed to load friends list");
    }

    return res.json();
  },

  addFriend: async (username: string): Promise<void> => {
    if (typeof window === "undefined") return;

    const token = getAccessToken();
    if (!token) throw new Error("Not signed in");

    const res = await makeAuthenticatedRequest(`/api/v1/users/friends`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username })
    });

    if (res.status === 401) {
      return;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "Could not send friend request");
    }
  },

  removeFriend: async (friendId: string): Promise<void> => {
    if (typeof window === "undefined") return;

    const token = getAccessToken();
    if (!token) throw new Error("Not signed in");

    const res = await makeAuthenticatedRequest(`/api/v1/users/friends/${friendId}`, {
      method: "DELETE"
    });

    if (res.status === 401) {
      return;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "Could not remove friend");
    }
  },

  fetchFriendRequests: async (): Promise<FriendRequestsList> => {
    if (typeof window === "undefined") return { received: [], sent: [] };

    const token = getAccessToken();
    if (!token) return { received: [], sent: [] };

    const res = await makeAuthenticatedRequest(`/api/v1/users/friends/requests`);

    if (res.status === 401) {
      return { received: [], sent: [] };
    }

    if (!res.ok) {
      throw new Error("Failed to load friend requests");
    }

    return res.json();
  },

  acceptFriendRequest: async (requestId: string): Promise<void> => {
    if (typeof window === "undefined") return;

    const token = getAccessToken();
    if (!token) throw new Error("Not signed in");

    const res = await makeAuthenticatedRequest(`/api/v1/users/friends/requests/${requestId}/accept`, {
      method: "POST"
    });

    if (res.status === 401) {
      return;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "Could not accept friend request");
    }
  },

  declineFriendRequest: async (requestId: string): Promise<void> => {
    if (typeof window === "undefined") return;

    const token = getAccessToken();
    if (!token) throw new Error("Not signed in");

    const res = await makeAuthenticatedRequest(`/api/v1/users/friends/requests/${requestId}/decline`, {
      method: "POST"
    });

    if (res.status === 401) {
      return;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "Could not decline friend request");
    }
  },

  cancelFriendRequest: async (requestId: string): Promise<void> => {
    if (typeof window === "undefined") return;

    const token = getAccessToken();
    if (!token) throw new Error("Not signed in");

    const res = await makeAuthenticatedRequest(`/api/v1/users/friends/requests/${requestId}`, {
      method: "DELETE"
    });

    if (res.status === 401) {
      return;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "Could not cancel friend request");
    }
  }
};

export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string; // 'pending' | 'accepted' | 'declined'
  created_at: string;
  
  sender_username?: string | null;
  sender_fullname?: string | null;
  sender_avatar?: string | null;
  
  receiver_username?: string | null;
  receiver_fullname?: string | null;
  receiver_avatar?: string | null;
}

export interface FriendRequestsList {
  received: FriendRequest[];
  sent: FriendRequest[];
}

