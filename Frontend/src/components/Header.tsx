"use client";
import React from "react";
import { Search, Menu, User, ChefHat, MapPin } from "lucide-react";
import { motion } from "motion/react";
import { Playfair_Display } from "next/font/google";
import { ThemeToggle } from "./ThemeToggle";
import { useSelector } from "react-redux";
import { RootState } from "../store";
import { LocationModal } from "./LocationModal";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["400", "600", "700"] });

export function Header({ onLogoClick }: { onLogoClick?: () => void }) {
  const [isLocationModalOpen, setIsLocationModalOpen] = React.useState(false);
  const address = useSelector((state: RootState) => state.location.address);
  const status = useSelector((state: RootState) => state.location.status);

  return (
    <>
      <motion.header
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 lg:px-12 backdrop-blur-xl border-b border-[#4D3D32]/10 shadow-sm dark:shadow-none dark:border-white/5 bg-white/80 dark:bg-[#2A2420]/60"
      >
        <div className="flex items-center gap-2 cursor-pointer" onClick={onLogoClick}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand via-brand to-red-600 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.3)]">
            <ChefHat className="text-white w-6 h-6" />
          </div>
          <div className={`text-2xl font-bold tracking-tight ${playfair.className} ml-2`}>
            <span className="bg-gradient-to-r from-brand to-brand-hover bg-clip-text text-transparent">Vibe</span>
            <span className="text-[#9A8A7A] dark:text-[#E6DFD5]">Food</span>
          </div>
        </div>

        {/* Navigation links - Commented out for later use
        <nav className="hidden md:flex items-center gap-8">
          {[
            "Explore",
            "AI Picks",
            "Michelin Guide",
            "Experiences",
          ].map((item) => (
            <a
              key={item}
              href="#"
              className="text-sm font-medium text-[#9A8A7A] dark:text-[#E6DFD5]/70 hover:text-[#9A8A7A] dark:hover:text-white transition-colors relative group"
            >
              {item}
              <span className="absolute -bottom-2 left-0 w-0 h-0.5 bg-brand transition-all group-hover:w-full rounded-full" />
            </a>
          ))}
        </nav>
        */}

        <div className="flex items-center gap-4">
          {/* Location Indicator Widget */}
          <button
            onClick={() => setIsLocationModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#E6DFD5] dark:border-[#3D312A] hover:bg-brand-muted/30 dark:hover:bg-brand/10 hover:border-brand/30 dark:hover:border-brand/30 transition-all text-xs font-semibold cursor-pointer max-w-[140px] sm:max-w-[240px] md:max-w-[320px]"
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
            <span className="text-[#7A6A5A] dark:text-[#E6DFD5]/80 truncate">
              {address || (status === 'loading' ? 'Đang tìm...' : 'Chưa định vị')}
            </span>
          </button>

          {/*
          <button className="hidden md:flex items-center justify-center px-5 py-2.5 text-sm font-semibold rounded-full border border-cyan-500/30 bg-cyan-950/20 text-cyan-300 hover:bg-cyan-900/30 hover:border-cyan-400/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all">
            Login
          </button>
          <button className="flex items-center justify-center w-10 h-10 rounded-full bg-[#3D312A] dark:bg-white/5 border border-[#4D3D32] dark:border-white/10 hover:bg-[#3D312A] dark:hover:bg-white/10 transition-colors overflow-hidden">
            <User className="w-5 h-5 text-[#9A8A7A] dark:text-[#E6DFD5]/70" />
          </button>
          <button className="md:hidden flex items-center justify-center w-10 h-10 text-[#9A8A7A] dark:text-[#E6DFD5]/70">
            <Menu className="w-6 h-6" />
          </button>
          */}
          <ThemeToggle />
        </div>
      </motion.header>

      <LocationModal isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)} />
    </>
  );
}
