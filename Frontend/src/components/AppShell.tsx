"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { UserDropdown } from "./UserDropdown";

const NAV_ITEMS = [
  { icon: Compass, label: "Khám phá", href: "/" },
  { icon: Heart, label: "Yêu thích", href: "/favorites" },
  { icon: Clock, label: "Lịch sử", href: "/history" },
  { icon: FolderOpen, label: "Bộ sưu tập", href: "/collections" },
  { icon: Settings, label: "Cài đặt", href: "/settings" },
];

interface AppShellProps {
  children: React.ReactNode;
  /** Dot indicator: 'ok' | 'degraded' | 'error' | 'loading' */
  healthStatus?: "ok" | "degraded" | "error" | "loading";
}

export function AppShell({ children, healthStatus = "loading" }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

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
              className="text-3xl md:text-4xl font-black text-brand dark:text-brand-on-dark tracking-tight select-none"
              style={{ fontFamily: '"DFVN Paper Kuto", "Segoe UI", Roboto, sans-serif' }}
            >
              Wanderbite
            </span>
          </Link>

          {/* Right: Health dot + Theme + User */}
          <div className="flex items-center gap-3">
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
                  className="text-2xl font-black text-brand dark:text-brand-on-dark"
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
                          ? 'text-brand dark:text-brand-on-dark'
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
                      <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-brand dark:text-brand-on-dark' : ''}`} />
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
    </div>
  );
}
