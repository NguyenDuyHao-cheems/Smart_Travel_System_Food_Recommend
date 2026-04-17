"use client";

import React, { useState, useEffect } from "react";
import { Header } from "../components/Header";
import { HeroSection } from "../components/HeroSection";
import { BentoGrid } from "../components/BentoGrid";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Star, Navigation, Wallet, Search } from "lucide-react";
import { Playfair_Display, Inter } from "next/font/google";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["400", "600", "700"] });
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600"] });

import { useRouter } from "next/navigation";

export default function Home() {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<"initial" | "loading">("initial");
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const router = useRouter();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    let timeout: NodeJS.Timeout;

    if (state === "loading") {
      interval = setInterval(() => {
        setLoadingMsgIdx((prev) => (prev + 1) % 3);
      }, 1000);
      
      // Navigate to /result after brief animation
      timeout = setTimeout(() => {
        router.push(`/result?q=${encodeURIComponent(query)}`);
      }, 1500);
    }
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [state, router, query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setState("loading");
    setLoadingMsgIdx(0);
  };

  return (
    <div className={`min-h-screen bg-[#0B0F19] text-white selection:bg-amber-500/30 overflow-x-hidden ${inter.className}`}>
      {/* Background glow effects */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-900/20 blur-[120px] rounded-full" />
        <div className="absolute top-1/2 right-1/4 w-[600px] h-[600px] bg-amber-900/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-cyan-900/10 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <Header onLogoClick={() => { setState("initial"); setQuery(""); }} />
        
        <main className={`flex flex-col gap-16 pb-24 pt-0`}>
          <HeroSection 
            state={state} 
            query={query} 
            setQuery={setQuery} 
            onSearch={handleSearch} 
            loadingMsgIdx={loadingMsgIdx}
          />
          
          <div className="container mx-auto px-6 lg:px-12 max-w-7xl">
            <AnimatePresence mode="wait">
              {state === "initial" && (
                <motion.div
                  key="initial"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                >
                  <BentoGrid />
                </motion.div>
              )}

              {state === "loading" && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-50"
                >
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-[#121A2A]/40 backdrop-blur-2xl border border-white/5 rounded-3xl p-6 h-[420px] relative overflow-hidden flex flex-col shadow-2xl">
                      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent z-10" />
                      <div className="w-full h-56 bg-white/5 rounded-2xl mb-6 relative overflow-hidden" />
                      <div className="w-3/4 h-8 bg-white/5 rounded-xl mb-4" />
                      <div className="flex gap-4 mb-6">
                        <div className="w-20 h-5 bg-white/5 rounded-lg" />
                        <div className="w-24 h-5 bg-white/5 rounded-lg" />
                      </div>
                      <div className="mt-auto w-full h-24 bg-white/5 rounded-2xl" />
                    </div>
                  ))}
                </motion.div>
              )}

             {/* Removed embedded mock results view to use router redirection instead. */}
            </AnimatePresence>
          </div>
        </main>

        <footer className="w-full border-t border-white/5 py-8 mt-auto text-center text-white/40 text-sm">
          <p>© 2026 VIBE FOOD AI. All rights reserved.</p>
        </footer>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}} />
    </div>
  );
}
