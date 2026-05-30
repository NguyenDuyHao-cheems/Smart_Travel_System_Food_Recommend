"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { LogIn, Home, AlertCircle } from "lucide-react";
import { useLanguage } from "./LanguageProvider";

interface LoginRequiredModalProps {
  isOpen: boolean;
  message?: string;
}

export function LoginRequiredModal({ isOpen, message }: LoginRequiredModalProps) {
  const router = useRouter();
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#2C2420] rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-[#3D312A]">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-[#E6DFD5] mb-2">
            Yêu cầu đăng nhập
          </h2>
          <p className="text-gray-500 dark:text-[#9A8A7A] mb-6">
            {message || "Vui lòng đăng nhập để sử dụng tính năng này."}
          </p>
          
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push("/auth")}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand hover:bg-brand-hover text-white rounded-xl font-medium transition-colors"
            >
              <LogIn className="w-5 h-5" />
              Đăng nhập lại
            </button>
            <button
              onClick={() => router.push("/")}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-[#3D312A] dark:hover:bg-[#4D3D32] text-gray-700 dark:text-[#E6DFD5] rounded-xl font-medium transition-colors"
            >
              <Home className="w-5 h-5" />
              Quay lại trang chính
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
