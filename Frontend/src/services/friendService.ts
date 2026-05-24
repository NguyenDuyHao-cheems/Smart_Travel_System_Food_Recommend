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

    const token = localStorage.getItem("access_token");
    if (!token) return [];

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
    const res = await fetch(`${apiUrl}/api/v1/users/friends`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (res.status === 401) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user_id");
      localStorage.removeItem("username");
      window.location.href = "/auth?expired=1";
      return [];
    }

    if (!res.ok) {
      throw new Error("Failed to load friends list");
    }

    return res.json();
  },

  addFriend: async (username: string): Promise<void> => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("access_token");
    if (!token) throw new Error("Not signed in");

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
    const res = await fetch(`${apiUrl}/api/v1/users/friends`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ username })
    });

    if (res.status === 401) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user_id");
      localStorage.removeItem("username");
      window.location.href = "/auth?expired=1";
      return;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "Could not send friend request");
    }
  },

  removeFriend: async (friendId: string): Promise<void> => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("access_token");
    if (!token) throw new Error("Not signed in");

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
    const res = await fetch(`${apiUrl}/api/v1/users/friends/${friendId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (res.status === 401) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user_id");
      localStorage.removeItem("username");
      window.location.href = "/auth?expired=1";
      return;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "Could not remove friend");
    }
  },

  fetchFriendRequests: async (): Promise<FriendRequestsList> => {
    if (typeof window === "undefined") return { received: [], sent: [] };

    const token = localStorage.getItem("access_token");
    if (!token) return { received: [], sent: [] };

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
    const res = await fetch(`${apiUrl}/api/v1/users/friends/requests`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (res.status === 401) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user_id");
      localStorage.removeItem("username");
      window.location.href = "/auth?expired=1";
      return { received: [], sent: [] };
    }

    if (!res.ok) {
      throw new Error("Failed to load friend requests");
    }

    return res.json();
  },

  acceptFriendRequest: async (requestId: string): Promise<void> => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("access_token");
    if (!token) throw new Error("Not signed in");

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
    const res = await fetch(`${apiUrl}/api/v1/users/friends/requests/${requestId}/accept`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (res.status === 401) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user_id");
      localStorage.removeItem("username");
      window.location.href = "/auth?expired=1";
      return;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "Could not accept friend request");
    }
  },

  declineFriendRequest: async (requestId: string): Promise<void> => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("access_token");
    if (!token) throw new Error("Not signed in");

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
    const res = await fetch(`${apiUrl}/api/v1/users/friends/requests/${requestId}/decline`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (res.status === 401) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user_id");
      localStorage.removeItem("username");
      window.location.href = "/auth?expired=1";
      return;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "Could not decline friend request");
    }
  },

  cancelFriendRequest: async (requestId: string): Promise<void> => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("access_token");
    if (!token) throw new Error("Not signed in");

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
    const res = await fetch(`${apiUrl}/api/v1/users/friends/requests/${requestId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (res.status === 401) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user_id");
      localStorage.removeItem("username");
      window.location.href = "/auth?expired=1";
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

