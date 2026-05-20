"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { User, LogOut, ChevronDown, UserCircle } from "lucide-react";

export function UserDropdown({
  username: propUsername,
  avatar: propAvatar,
}: {
  username?: string | null;
  avatar?: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (propUsername !== undefined && propUsername !== null) setUsername(propUsername);
    else setUsername(localStorage.getItem("username"));

    if (propAvatar !== undefined && propAvatar !== null) setAvatar(propAvatar);
    else setAvatar(localStorage.getItem("user_avatar"));

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleStorageChange = () => {
      if (propUsername === undefined || propUsername === null) {
        setUsername(localStorage.getItem("username"));
      }
      if (propAvatar === undefined || propAvatar === null) {
        setAvatar(localStorage.getItem("user_avatar"));
      }
    };

    window.addEventListener("storage", handleStorageChange);
    document.addEventListener("mousedown", handleClickOutside);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [propUsername, propAvatar]);

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

  const avatarUrl =
    avatar ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${username || "guest"}`;

  if (!username) {
    return (
      <button
        onClick={() => router.push("/auth")}
        className="ml-2 px-4 py-2 rounded-xl bg-brand-muted dark:bg-brand/10 text-brand-hover dark:text-[#E6DFD5] text-sm font-bold hover:bg-brand-muted/80 dark:hover:bg-brand/20 transition-colors cursor-pointer border border-brand-muted dark:border-brand/20"
      >
        Đăng nhập
      </button>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 pr-3 rounded-full hover:bg-brand-muted/50 dark:hover:bg-brand/10 transition-all cursor-pointer border border-transparent hover:border-brand-muted dark:hover:border-brand/20"
      >
        <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-tr from-brand to-brand-hover shadow-sm ring-2 ring-brand-muted dark:ring-brand/20">
          <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
        </div>
        <span className="text-sm font-semibold text-[#3D312A] dark:text-[#E6DFD5] hidden sm:block">
          {username}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-[#9A8A7A] transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-56 bg-[#FDFBF7] dark:bg-[#2A2420] rounded-2xl shadow-xl border border-[#E6DFD5] dark:border-[#3D312A] py-2 z-50"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-[#E6DFD5] dark:border-[#3D312A] mb-1">
              <p className="text-[10px] font-semibold text-[#9A8A7A] uppercase tracking-wider mb-1">
                Tài khoản
              </p>
              <p className="text-sm font-bold text-[#3D312A] dark:text-[#E6DFD5] truncate">
                {username}
              </p>
            </div>

            {/* Profile */}
            <button
              onClick={() => router.push("/profile")}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#5A4A3A] dark:text-[#C4B4A4] hover:bg-brand-muted/50 dark:hover:bg-brand/5 transition-colors text-left cursor-pointer"
            >
              <UserCircle className="w-4 h-4 text-[#9A8A7A]" />
              Hồ sơ cá nhân
            </button>

            <div className="h-px bg-[#E6DFD5] dark:bg-[#3D312A] my-1 mx-2" />

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-brand dark:text-[#E8735A] hover:bg-brand-muted/50 dark:hover:bg-brand/10 transition-colors text-left font-semibold cursor-pointer"
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
