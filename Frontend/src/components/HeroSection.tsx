"use client";
import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Search, ArrowRight } from "lucide-react";
import { Playfair_Display } from "next/font/google";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["400", "600", "700"] });

const loadingMessages = [
  "Analyzing palate...",
  "Scanning vector space...",
  "Curating matches..."
];

interface HeroProps {
  state: "initial" | "loading" | "result";
  query: string;
  setQuery: (q: string) => void;
  onSearch: (e: React.FormEvent) => void;
  loadingMsgIdx: number;
}

export function HeroSection({ state, query, setQuery, onSearch, loadingMsgIdx }: HeroProps) {
  if (state === "result") return null;

  return (
    <section className={`relative w-full min-h-[85vh] flex items-center justify-center pt-20 pb-12 px-6 lg:px-12 overflow-hidden ${state !== "initial" ? "min-h-[60vh]" : ""}`}>
      {/* Background Image & Gradient Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1695512937087-859dc39418bb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaW5lbWF0aWMlMjBjb29raW5nJTIwZmxhbWUlMjBkYXJrJTIwcmVzdGF1cmFudHxlbnwxfHx8fDE3NzQ0NDQ0NDd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
          alt="Cinematic cooking flame"
          className="w-full h-full object-cover object-center scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-100/90 via-white/30 dark:from-[#0B0F19] dark:via-[#0B0F19]/80 to-transparent dark:mix-blend-multiply" />
        <div className="absolute inset-0 bg-white/30 dark:bg-[#0B0F19]/60" />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto py-4">
        <AnimatePresence mode="wait">
          {state === "initial" && (
            <motion.div
              key="initial"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40, filter: "blur(10px)" }}
              transition={{ duration: 0.8 }}
              className="flex flex-col items-center text-center gap-4"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-purple-900/10 dark:border-purple-500/30 bg-white/80 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-sm font-semibold tracking-wide backdrop-blur-md mb-2 shadow-[0_0_15px_rgba(168,85,247,0.15)] dark:shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>AI-Powered Culinary Recommendations</span>
              </div>
              
              <h1 className={`text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[1.1] text-transparent bg-clip-text bg-gradient-to-br from-slate-900 via-slate-900/90 to-amber-900 drop-shadow-[0_0_25px_rgba(251,191,36,0.2)] dark:from-white dark:via-white/90 dark:to-amber-200 dark:drop-shadow-[0_0_25px_rgba(251,191,36,0.3)] ${playfair.className}`}>
                What's your <br className="hidden md:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-red-600 drop-shadow-[0_0_40px_rgba(239,68,68,0.4)] dark:drop-shadow-[0_0_40px_rgba(239,68,68,0.5)] italic pr-2">
                  Culinary Vibe
                </span> today?
              </h1>
              
              <p className="mt-4 text-lg md:text-xl text-black/80 drop-shadow-[0_1px_2px_rgba(255,255,255,0.4)] dark:text-white/70 max-w-2xl mx-auto font-semibold leading-relaxed">
                Tell us what you're craving, how you feel, or who you're with. 
                Our hyper-intelligent system will curate the perfect dining experience.
              </p>

              {/* AI Command Center Input */}
              <motion.div
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="w-full max-w-3xl mt-8"
              >
                <form onSubmit={onSearch} className="w-full relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 to-red-600/20 rounded-full blur-xl opacity-100 dark:opacity-0 dark:group-hover:opacity-100 transition-opacity duration-700" />
                  <div className="relative flex items-center bg-white/90 dark:bg-[#121A2A]/80 backdrop-blur-2xl border border-slate-900/10 dark:border-white/10 rounded-full p-2 pl-4 sm:pl-8 shadow-[0_8px_30px_rgba(245,158,11,0.15)] hover:shadow-[0_8px_30px_rgba(245,158,11,0.25)] dark:shadow-2xl transition-all dark:hover:border-white/20 focus-within:ring-2 focus-within:ring-amber-500/50 focus-within:shadow-[0_8px_30px_rgba(245,158,11,0.3)] flex-col sm:flex-row gap-2 sm:gap-0">
                    <Search className="w-6 h-6 text-slate-500 dark:text-white/40 hidden sm:block" />
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="e.g. Mì cay 7 cấp độ ở Làng Đại học..."
                      className="flex-1 w-full bg-transparent border-none outline-none sm:px-4 py-3 sm:py-0 text-lg md:text-xl font-medium text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 h-14"
                    />
                    <button
                      type="submit"
                      disabled={!query.trim()}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 text-white px-8 h-12 md:h-14 rounded-full font-bold text-sm md:text-lg shadow-[0_0_30px_rgba(245,158,11,0.4)] disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_50px_rgba(245,158,11,0.6)] transform hover:scale-[1.02] transition-all duration-300"
                    >
                      Generate Journey
                      <ArrowRight className="w-5 h-5 ml-1" />
                    </button>
                  </div>
                </form>

                <div className="flex flex-wrap items-center justify-center gap-3 mt-6 text-sm text-black/70 font-bold drop-shadow-[0_1px_2px_rgba(255,255,255,0.3)] dark:text-white/50 dark:drop-shadow-none dark:font-medium">
                  <span>Try:</span>
                  {["Romantic rooftop dinner", "High-protein vegan spots", "Spicy noodles at midnight"].map((prompt) => (
                    <button 
                      key={prompt} 
                      type="button"
                      onClick={() => setQuery(prompt)}
                      className="px-3 py-1.5 rounded-full border border-slate-900/10 dark:border-white/10 bg-white/60 dark:bg-white/5 hover:bg-white hover:shadow-md hover:text-amber-600 dark:hover:bg-white/10 dark:text-white transition-all backdrop-blur-sm"
                    >
                      "{prompt}"
                    </button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}

          {state === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, filter: "blur(10px)" }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto py-12"
            >
              <div className="relative w-40 h-40 mb-12 flex items-center justify-center">
                <div className="absolute inset-0 border-[3px] border-t-amber-500 border-r-amber-500/30 border-b-transparent border-l-transparent rounded-full animate-spin" />
                <div className="absolute inset-4 border-[3px] border-t-cyan-400 border-l-cyan-400/30 border-b-transparent border-r-transparent rounded-full animate-[spin_2s_linear_infinite_reverse]" />
                <div className="absolute inset-8 border-[3px] border-t-red-500 border-b-red-500/30 border-l-transparent border-r-transparent rounded-full animate-[spin_3s_linear_infinite]" />
                <Sparkles className="w-10 h-10 text-amber-500 animate-pulse drop-shadow-[0_0_15px_rgba(245,158,11,0.8)]" />
              </div>

              <div className="h-12 overflow-hidden relative w-full flex justify-center">
                <AnimatePresence mode="popLayout">
                  <motion.h2
                    key={loadingMessages[loadingMsgIdx]}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                    className={`text-3xl md:text-4xl text-slate-800 dark:text-white/90 text-center absolute ${playfair.className}`}
                  >
                    {loadingMessages[loadingMsgIdx]}
                  </motion.h2>
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}