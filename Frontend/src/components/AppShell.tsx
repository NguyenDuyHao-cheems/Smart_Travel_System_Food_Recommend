"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  Compass,
  Heart,
  Clock,
  FolderOpen,
  Settings,
  Sparkles,
  AlertTriangle,
  MapPin,
  Route,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { UserDropdown } from "./UserDropdown";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import { LocationModal } from "./LocationModal";

const NAV_ITEMS = [
  { icon: Compass, label: "Khám phá", href: "/" },
  { icon: Heart, label: "Yêu thích", href: "/favorites" },
  { icon: Clock, label: "Lịch sử", href: "/history" },
  { icon: FolderOpen, label: "Bộ sưu tập", href: "/collections" },
  { icon: Route, label: "Lộ trình", href: "/itinerary" },
  { icon: Settings, label: "Cài đặt", href: "/settings" },
];

interface AppShellProps {
  children: React.ReactNode;
  /** Dot indicator: 'ok' | 'degraded' | 'error' | 'loading' */
  healthStatus?: "ok" | "degraded" | "error" | "loading";
}

export function AppShell({ children, healthStatus = "loading" }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showAuthExpiredModal, setShowAuthExpiredModal] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const address = useSelector((state: RootState) => state.location.address);
  const status = useSelector((state: RootState) => state.location.status);
  const itineraryCount = useSelector((state: RootState) => state.itinerary.items.length);

  useEffect(() => {
    setMounted(true);
    const handleAuthExpired = () => {
      // Clear localStorage immediately
      localStorage.removeItem("access_token");
      localStorage.removeItem("username");
      localStorage.removeItem("user_avatar");
      localStorage.removeItem("user_id");
      localStorage.removeItem("login_method");
      setShowAuthExpiredModal(true);
    };
    window.addEventListener("auth-session-expired", handleAuthExpired);
    return () => window.removeEventListener("auth-session-expired", handleAuthExpired);
  }, []);

  const handleOk = () => {
    setShowAuthExpiredModal(false);
    window.location.href = "/";
  };

  const handleLoginAgain = () => {
    setShowAuthExpiredModal(false);
    router.push("/auth");
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#2A2420]">
      {/* ── Food-pattern background (fixed, full page) ── */}
      <div
        className="fixed inset-0 pointer-events-none z-0 dark:hidden"
        style={{
          backgroundImage: "url('/images/food-pattern-light.png')",
          backgroundSize: "1300px",
          backgroundRepeat: "repeat",
          backgroundPosition: "center",
          opacity: 0.15,
        }}
      />
      <div
        className="fixed inset-0 pointer-events-none z-0 hidden dark:block"
        style={{
          backgroundImage: "url('/images/food-pattern.png')",
          backgroundSize: "1300px",
          backgroundRepeat: "repeat",
          backgroundPosition: "center",
          opacity: 0.06,
        }}
      />

      {/* ── Ambient glow blobs ── */}
      <div className="fixed top-[20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-brand/5 blur-[120px] pointer-events-none z-0" />
      <div className="fixed top-[40%] right-[-10%] w-[500px] h-[500px] rounded-full bg-brand/5 blur-[120px] pointer-events-none z-0" />

      {/* ── Sticky header ── */}
      <header className="relative z-30 sticky top-0 bg-[#FDFBF7]/95 dark:bg-[#2A2420]/95 backdrop-blur-md border-b-2 border-[#3D312A]/20 dark:border-[#E6DFD5]/10">
        <div className="flex items-center justify-between px-4 md:px-8 h-[64px]">
          {/* Left: Hamburger */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-2 hover:bg-[#3D312A]/10 dark:hover:bg-[#E6DFD5]/10 rounded transition-colors cursor-pointer"
            aria-label="Mở menu"
          >
            <Menu className="w-5 h-5 text-[#3D312A] dark:text-[#E6DFD5]" />
          </button>

          {/* Center: Logo */}
          <Link href="/" className="absolute left-1/2 -translate-x-1/2">
            <span
              className="text-3xl md:text-4xl font-black text-brand dark:text-[#E8735A] tracking-wide select-none"
              style={{ fontFamily: '"DFVN Paper Kuto", "Segoe UI", Roboto, sans-serif' }}
            >
              Wanderbite
            </span>
          </Link>

          {/* Right: Health dot + Location + Theme + User */}
          <div className="flex items-center gap-3">
            {/* Location Indicator Widget */}
            <button
              onClick={() => setIsLocationModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border-2 border-[#3D312A]/20 dark:border-[#E6DFD5]/10 hover:bg-[#3D312A]/5 dark:hover:bg-[#E6DFD5]/5 hover:border-[#3D312A]/40 dark:hover:border-[#E6DFD5]/20 transition-all text-xs font-semibold cursor-pointer max-w-[120px] sm:max-w-[180px] md:max-w-[280px]"
              title="Nhấp để thay đổi vị trí của bạn"
            >
              <MapPin
                className={`w-3.5 h-3.5 flex-shrink-0 ${
                  status === 'success'
                    ? 'text-brand dark:text-[#E8735A]'
                    : status === 'loading'
                    ? 'text-brand dark:text-[#E8735A] animate-pulse'
                    : 'text-red-500'
                }`}
              />
              <span className="text-[#3D312A]/70 dark:text-[#E6DFD5]/80 truncate">
                {address || (status === 'loading' ? 'Đang tìm...' : 'Chưa định vị')}
              </span>
            </button>

            {/* Itinerary badge */}
            {mounted && itineraryCount > 0 && (
              <Link
                href="/itinerary"
                className="relative flex items-center justify-center w-9 h-9 rounded-full bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-700/40 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors"
                title="Xem lộ trình"
              >
                <Route className="w-4 h-4 text-orange-500" />
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                  {itineraryCount}
                </span>
              </Link>
            )}

            {healthStatus !== "loading" && (
              <div
                className={`w-2 h-2 rounded-full ${
                  healthStatus === "ok"
                    ? "bg-emerald-500 animate-pulse"
                    : healthStatus === "degraded"
                    ? "bg-brand"
                    : "bg-red-500"
                }`}
                title={
                  healthStatus === "ok" ? "Hệ thống bình thường" : "Hệ thống có vấn đề"
                }
              />
            )}
            <ThemeToggle />
            <UserDropdown />
          </div>
        </div>
      </header>

      {/* ── Navigation Drawer ── */}
      <div
        className={`fixed inset-0 z-50 flex transition-opacity duration-300 ${
          drawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50"
          onClick={() => setDrawerOpen(false)}
        />

        {/* Drawer panel */}
        <AnimatePresence>
          {drawerOpen && (
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.25, ease: "easeInOut" }}
              className="relative z-10 w-[300px] h-full flex flex-col overflow-hidden rounded-r-3xl border-r-2 border-[#3D312A]/20 shadow-2xl bg-white dark:bg-[#2A2420]"
            >
              {/* Food pattern overlay inside drawer */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: "url('/images/food-pattern-light.png')",
                  backgroundSize: "280px",
                  backgroundRepeat: "repeat",
                  opacity: 0.18,
                }}
              />

              {/* Drawer header */}
              <div className="relative z-10 flex items-center justify-between px-6 py-5 border-b-2 border-[#3D312A]/20 dark:border-[#E6DFD5]/10">
                <span
                  className="text-3xl font-black text-brand dark:text-[#E8735A] tracking-wide"
                  style={{ fontFamily: '"DFVN Paper Kuto", "Segoe UI", Roboto, sans-serif' }}
                >
                  Wanderbite
                </span>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-2 rounded hover:bg-[#3D312A]/10 dark:hover:bg-[#E6DFD5]/10 cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5 text-[#3D312A] dark:text-[#E6DFD5]" />
                </button>
              </div>

              {/* Nav links */}
              <nav className="relative z-10 flex-1 py-0 overflow-y-auto">
                <div className="border-t border-[#3D312A]/10 dark:border-[#E6DFD5]/10" />
                {NAV_ITEMS.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/" && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setDrawerOpen(false)}
                      className={`flex items-center gap-4 px-8 py-4 text-[14px] font-semibold border-b border-[#3D312A]/10 dark:border-[#E6DFD5]/10 transition-all uppercase tracking-[2px] ${
                        isActive
                          ? 'text-brand dark:text-[#E8735A]'
                          : 'text-[#3D312A] dark:text-[#E6DFD5]'
                      }`}
                      style={{ backgroundColor: isActive ? '#F4EAD5' : 'transparent' }}
                      onMouseEnter={(e) => {
                        const isDark = document.documentElement.classList.contains('dark');
                        if (!isActive) e.currentTarget.style.backgroundColor = isDark ? 'rgba(169, 27, 13, 0.1)' : '#F4EAD5';
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-brand dark:text-[#E8735A]' : ''}`} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              {/* Drawer footer */}
              <div className="relative z-10 px-6 pb-8">
                <p className="text-xs text-[#3D312A]/50 dark:text-[#E6DFD5]/40 text-center italic">
                  Gợi ý bởi AI · Vị ngon Sài Gòn
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Page content ── */}
      <main className="relative z-10">{children}</main>

      {/* ── Authentication Expired Modal ── */}
      <AnimatePresence>
        {showAuthExpiredModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="w-full max-w-md bg-[#FDFBF7] dark:bg-[#2A2420] border-2 border-[#3D312A] dark:border-[#E6DFD5]/10 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center relative overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            >
              {/* Pattern backdrop overlay */}
              <div
                className="absolute inset-0 pointer-events-none opacity-[0.04] dark:opacity-[0.02]"
                style={{
                  backgroundImage: "url('/images/food-pattern.png')",
                  backgroundSize: "200px",
                }}
              />
              
              <div className="relative z-10 flex flex-col items-center">
                {/* Pulsing warning circle */}
                <div className="w-20 h-20 bg-amber-500/10 dark:bg-amber-500/5 rounded-full flex items-center justify-center mb-4 border border-amber-500/20 animate-pulse">
                  <AlertTriangle className="w-10 h-10 text-amber-500 dark:text-amber-400" />
                </div>

                <h3 className="text-2xl font-black text-[#3D312A] dark:text-[#E6DFD5] mb-2 uppercase tracking-wide">
                  Phiên Hết Hạn
                </h3>
                
                <p className="text-[#3D312A]/80 dark:text-[#C8BFB0]/80 text-sm leading-relaxed mb-6 max-w-sm">
                  Phiên đăng nhập của bạn đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại để sử dụng đầy đủ các tính năng cá nhân hóa!
                </p>

                <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
                  <button
                    onClick={handleOk}
                    className="order-2 sm:order-1 px-6 py-3 border-2 border-[#3D312A] dark:border-[#E6DFD5]/25 rounded-2xl text-sm font-bold text-[#3D312A] dark:text-[#E6DFD5] hover:bg-[#3D312A]/10 dark:hover:bg-[#E6DFD5]/10 active:scale-95 transition-all uppercase tracking-wider cursor-pointer"
                  >
                    Quay lại trang chủ
                  </button>
                  <button
                    onClick={handleLoginAgain}
                    className="order-1 sm:order-2 px-6 py-3 bg-[#E8735A] hover:bg-[#D65F47] text-white rounded-2xl text-sm font-black active:scale-95 transition-all shadow-[0_4px_14px_rgba(232,115,90,0.4)] uppercase tracking-wider cursor-pointer"
                  >
                    Đăng nhập lại
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <LocationModal isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)} />
    </div>
  );
}
