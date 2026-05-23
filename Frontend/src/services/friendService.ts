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
      throw new Error("Không thể tải danh sách bạn bè");
    }

    return res.json();
  },

  addFriend: async (username: string): Promise<void> => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("access_token");
    if (!token) throw new Error("Chưa đăng nhập");

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
      throw new Error(data.detail || "Không thể kết bạn");
    }
  },

  removeFriend: async (friendId: string): Promise<void> => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("access_token");
    if (!token) throw new Error("Chưa đăng nhập");

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
      throw new Error(data.detail || "Không thể xóa bạn bè");
    }
  }
};
