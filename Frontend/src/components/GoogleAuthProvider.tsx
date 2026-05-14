"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";
import React from "react";

export function GoogleAuthProvider({ children }: { children: React.ReactNode }) {
  // Nếu chưa có biến môi trường, dùng tạm chuỗi rỗng để không bị crash giao diện
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "dummy-id";

  return (
    <GoogleOAuthProvider clientId={clientId}>
      {children}
    </GoogleOAuthProvider>
  );
}
