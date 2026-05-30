export const saveAuthData = (
  accessToken: string,
  userId: string,
  username: string,
  rememberMe: boolean
) => {
  if (typeof window !== "undefined") {
    // Luôn lưu token và thông tin session vào localStorage (Sliding Session)
    localStorage.setItem("access_token", accessToken);
    localStorage.setItem("user_id", userId);
    localStorage.setItem("username", username);

    // Nếu người dùng chọn Remember Me -> Lưu lại username để tự động điền lần sau
    if (rememberMe) {
      localStorage.setItem("saved_username", username);
    } else {
      localStorage.removeItem("saved_username");
    }
  }
};

export const getAccessToken = (): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("access_token");
  }
  return null;
};

export const getUserId = (): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("user_id");
  }
  return null;
};

export const getSavedUsername = (): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("saved_username");
  }
  return null;
};

export const clearAuthData = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_id");
    localStorage.removeItem("username");
    localStorage.removeItem("user_avatar");
    localStorage.removeItem("login_method");
    // KHÔNG XÓA saved_username vì nó dùng để Remember Me
  }
};

export const isTokenValid = (token: string | null): boolean => {
  if (!token) return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    if (payload && payload.exp) {
      return payload.exp > Date.now() / 1000;
    }
    return true; // Assume valid if no exp
  } catch (e) {
    return false;
  }
};

