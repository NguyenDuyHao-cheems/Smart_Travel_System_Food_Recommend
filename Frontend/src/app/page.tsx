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

const mockApiResponse = {
  status: "success",
  query_intent: "mì cay 7 cấp độ ở Làng Đại học",
  results: [
    {
      id: 1,
      name: "Mì Cay Sasin - Làng Đại học",
      image_url: "https://images.unsplash.com/photo-1552611052-33e04de081de",
      distance: "1.1 km",
      price_range: "40k - 65k",
      rating: 4.6,
      match_score: 98,
      ai_analysis: "Tọa lạc trên con phố ẩm thực nhộn nhịp, nước dùng chuẩn vị Hàn Quốc rất khớp với gu ăn cay cấp độ cao của bạn."
    },
    {
      id: 2,
      name: "Yagami - Ẩm Thực Lẩu Thái-Nhật-Hàn",
      image_url: "https://images.unsplash.com/photo-1563379926898-05f4575a45d8",
      distance: "4.5 km",
      price_range: "45k - 79k",
      rating: 4.8,
      match_score: 85,
      ai_analysis: "Không gian check-in cực đẹp mang hơi hướng sang trọng, khuyên thử món mì cay bạch tuộc tươi giòn."
    }
  ]
};

export default function Home() {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<"initial" | "loading" | "result">("initial");
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [results, setResults] = useState<typeof mockApiResponse.results>([]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    let timeout: NodeJS.Timeout;

    if (state === "loading") {
      interval = setInterval(() => {
        setLoadingMsgIdx((prev) => (prev + 1) % 3);
      }, 1000);
      
      // Simulate 3-second API call
      timeout = setTimeout(() => {
        setResults(mockApiResponse.results);
        setState("result");
      }, 3000);
    }
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [state]);

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
        
        <main className={`flex flex-col gap-16 pb-24 ${state === "result" ? "pt-24" : "pt-0"}`}>
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

              {state === "result" && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="w-full flex-1 mt-8"
                >
                  <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-8">
                    <div>
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2, type: "spring" }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 text-sm mb-4 font-medium"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Vector Analysis Complete</span>
                      </motion.div>
                      <h2 className={`text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70 ${playfair.className}`}>
                        Top 5 Perfect Matches
                      </h2>
                      <p className="text-white/50 mt-3 text-lg">
                        Curated matching your intent: <br className="md:hidden" />
                        <span className="text-amber-500/90 italic ml-1">"{query || mockApiResponse.query_intent}"</span>
                      </p>
                    </div>
                    
                    <button 
                      onClick={() => {
                        setState("initial");
                        setQuery("");
                      }}
                      className="group px-6 py-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white/80 flex items-center gap-2 font-medium self-start md:self-auto"
                    >
                      <Search className="w-4 h-4 text-white/50 group-hover:text-white/80 transition-colors" />
                      New Search
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {results.map((item, idx) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.15 + 0.3, ease: "easeOut" }}
                        className="group bg-[#121A2A]/40 backdrop-blur-2xl border border-white/5 rounded-3xl overflow-hidden hover:scale-[1.02] hover:border-white/10 transition-all duration-500 shadow-2xl flex flex-col hover:shadow-cyan-900/20 cursor-pointer"
                      >
                        {/* Image Section */}
                        <div className="relative w-full h-64 overflow-hidden bg-white/5">
                          <div className="absolute inset-0 bg-gradient-to-t from-[#121A2A] via-transparent to-transparent z-10" />
                          <img 
                            src={item.image_url} 
                            alt={item.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]"
                          />
                          {/* Match Badge */}
                          <div className="absolute top-5 right-5 z-20 bg-[#0B0F19]/80 backdrop-blur-xl border border-cyan-400/30 px-4 py-2 rounded-full flex items-center gap-2 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                            <Sparkles className="w-4 h-4 text-cyan-400" />
                            <span className="text-cyan-400 font-bold text-sm tracking-wide">{item.match_score}% Match</span>
                          </div>
                        </div>

                        {/* Content Section */}
                        <div className="p-8 flex-1 flex flex-col relative z-20 -mt-8 bg-gradient-to-b from-transparent to-[#121A2A]/40">
                          <div className="flex justify-between items-start mb-3 gap-4">
                            <h3 className={`text-2xl md:text-3xl font-bold text-white group-hover:text-amber-500 transition-colors duration-300 leading-tight ${playfair.className}`}>
                              {item.name}
                            </h3>
                            <div className="flex items-center gap-1.5 bg-[#0B0F19] border border-amber-500/20 px-3 py-1.5 rounded-xl shadow-inner shrink-0">
                              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                              <span className="text-amber-500 font-bold">{item.rating}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-5 text-white/60 text-sm font-medium mb-8">
                            <div className="flex items-center gap-2">
                              <Navigation className="w-4 h-4 text-cyan-400/70" />
                              <span>{item.distance}</span>
                            </div>
                            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                            <div className="flex items-center gap-2">
                              <Wallet className="w-4 h-4 text-green-400/70" />
                              <span>{item.price_range}</span>
                            </div>
                          </div>

                          {/* AI Analysis Block */}
                          <div className="mt-auto p-5 rounded-2xl bg-[#0B0F19]/80 border border-cyan-400/20 relative group-hover:border-cyan-400/40 transition-colors duration-300">
                            <div className="absolute -top-3 left-6 bg-[#0B0F19] px-3 py-0.5 text-xs text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1.5 rounded-full border border-cyan-400/20">
                              <Sparkles className="w-3 h-3" />
                              AI Vector Analysis
                            </div>
                            <p className="text-white/70 text-sm leading-relaxed pt-2 italic">
                              "{item.ai_analysis}"
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
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
