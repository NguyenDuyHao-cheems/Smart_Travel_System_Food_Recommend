"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { User, LogOut, Settings, ChevronDown, UserCircle } from "lucide-react";

export function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem("username");
    const token = localStorage.getItem("access_token");
    const storedAvatar = localStorage.getItem("user_avatar");
    if (token) {
      setUsername(storedUser || "User");
      setAvatar(storedAvatar);
    }

    // Click outside to close
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_id");
    localStorage.removeItem("username");
    localStorage.removeItem("user_avatar");
    localStorage.removeItem("food_recsys_userid");
    setUsername(null);
    setAvatar(null);
    router.push("/auth");
    router.refresh();
  };

  if (!username) {
    return (
      <button
        onClick={() => router.push("/auth")}
        className="ml-2 px-4 py-2 rounded-xl bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-500 text-sm font-bold hover:bg-orange-100 dark:hover:bg-orange-500/20 transition-colors cursor-pointer"
      >
        Đăng nhập
      </button>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 pr-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-400 to-orange-600 flex items-center justify-center text-white shadow-sm overflow-hidden">
          {avatar ? (
            <img src={avatar} alt={username || "User"} className="w-full h-full object-cover" />
          ) : (
            <User className="w-5 h-5" />
          )}
        </div>
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 hidden sm:block">
          {username}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#1A1F2B] rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 py-2 z-50"
          >
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 mb-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Tài khoản</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{username}</p>
            </div>

            <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left">
              <UserCircle className="w-4 h-4" />
              Hồ sơ cá nhân
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left">
              <Settings className="w-4 h-4" />
              Cài đặt
            </button>

            <div className="h-px bg-gray-100 dark:border-gray-800 my-1 mx-2" />

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-left font-semibold"
            >
              <LogOut className="w-4 h-4" />
              Đăng xuất
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
