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
    // KHÔNG XÓA saved_username vì nó dùng để Remember Me
  }
};
