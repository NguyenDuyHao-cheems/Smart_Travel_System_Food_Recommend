"use client";
import React from "react";
import { Search, Menu, User, ChefHat } from "lucide-react";
import { motion } from "motion/react";
import { Playfair_Display } from "next/font/google";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["400", "600", "700"] });

export function Header({ onLogoClick }: { onLogoClick?: () => void }) {
  return (
    <motion.header
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 lg:px-12 backdrop-blur-xl border-b border-white/5 bg-[#0B0F19]/60"
    >
      <div className="flex items-center gap-2 cursor-pointer" onClick={onLogoClick}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-600 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.3)]">
          <ChefHat className="text-white w-6 h-6" />
        </div>
        <div className={`text-2xl font-bold tracking-tight ${playfair.className} ml-2`}>
          <span className="bg-gradient-to-r from-amber-500 to-orange-400 bg-clip-text text-transparent">Vibe</span>
          <span className="text-white">Food</span>
        </div>
      </div>

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
            className="text-sm font-medium text-white/70 hover:text-white transition-colors relative group"
          >
            {item}
            <span className="absolute -bottom-2 left-0 w-0 h-0.5 bg-amber-500 transition-all group-hover:w-full rounded-full" />
          </a>
        ))}
      </nav>

      <div className="flex items-center gap-4">
        <button className="hidden md:flex items-center justify-center px-5 py-2.5 text-sm font-semibold rounded-full border border-cyan-500/30 bg-cyan-950/20 text-cyan-300 hover:bg-cyan-900/30 hover:border-cyan-400/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all">
          Login
        </button>
        <button className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors overflow-hidden">
          <User className="w-5 h-5 text-white/70" />
        </button>
        <button className="md:hidden flex items-center justify-center w-10 h-10 text-white/70">
          <Menu className="w-6 h-6" />
        </button>
      </div>
    </motion.header>
  );
}