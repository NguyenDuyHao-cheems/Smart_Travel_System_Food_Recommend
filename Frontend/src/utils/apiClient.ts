import { getAccessToken, clearAuthData, saveAuthData } from "./authStorage";

interface CustomRequestInit extends RequestInit {
  // Thêm các thuộc tính tùy chỉnh nếu cần
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token: string | null) => {
  refreshSubscribers.forEach((cb) => cb(token || ""));
  refreshSubscribers = [];
};

export const makeAuthenticatedRequest = async (
  endpoint: string,
  options: CustomRequestInit = {}
): Promise<Response> => {
  let token = getAccessToken();

  const getHeaders = (accessToken: string | null) => {
    const headers = new Headers(options.headers || {});
    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }
    return headers;
  };

  const fetchOptions: RequestInit = {
    ...options,
    headers: getHeaders(token),
    credentials: "include", 
  };

  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;
  let response = await fetch(url, fetchOptions);

  // Nếu token hết hạn (401)
  if (response.status === 401) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshResponse = await fetch(`${API_BASE_URL}/api/v1/users/refresh`, {
          method: "POST",
          credentials: "include", // Cần thiết để gửi HttpOnly Cookie
        });

        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          // Cập nhật token mới vào localStorage
          saveAuthData(data.access_token, data.user_id, data.username, !!localStorage.getItem("saved_username"));
          
          isRefreshing = false;
          onRefreshed(data.access_token);

          // Thử lại request ban đầu với token mới
          const retryOptions: RequestInit = {
            ...options,
            headers: getHeaders(data.access_token),
            credentials: "include",
          };
          
          response = await fetch(url, retryOptions);
        } else {
          isRefreshing = false;
          onRefreshed(null); // Báo cho các request đang chờ rằng refresh thất bại
          
          clearAuthData();
          if (typeof window !== "undefined") {
              window.dispatchEvent(new Event("auth-session-expired"));
          }
        }
      } catch (error) {
        isRefreshing = false;
        onRefreshed(null);
        console.error("Lỗi khi gọi /refresh:", error);
        clearAuthData();
      }
    } else {
      // Đang có request refresh khác chạy, đợi nó xong
      return new Promise((resolve) => {
        subscribeTokenRefresh((newToken: string) => {
          if (newToken) {
            const retryOptions: RequestInit = {
              ...options,
              headers: getHeaders(newToken),
              credentials: "include",
            };
            resolve(fetch(url, retryOptions));
          } else {
            // Trả về response 401 cũ nếu refresh thất bại
            resolve(response);
          }
        });
      });
    }
  }

  return response;
};
