"use client";
import React from "react";
import { motion } from "motion/react";
import { Sparkles, TrendingUp, Star, MapPin, Dice5, Eye, ChefHat, ArrowUpRight } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const BentoCard = ({ className, children, delay }: { className?: string, children: React.ReactNode, delay: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 50, scale: 0.95 }}
    whileInView={{ opacity: 1, y: 0, scale: 1 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.7, delay, ease: [0.25, 1, 0.5, 1] }}
    className={cn(
      "relative rounded-3xl border border-slate-900/10 dark:border-white/5 bg-white/70 dark:bg-[#121A2A]/40 backdrop-blur-2xl p-6 md:p-8 flex flex-col overflow-hidden shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-slate-200/50 dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)] dark:hover:shadow-[0_12px_40px_rgba(0,0,0,0.6)] transition-all duration-300 group",
      className
    )}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-white/60 dark:from-white/[0.02] to-transparent pointer-events-none z-0" />
    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-slate-900/5 dark:bg-white/5 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-overlay -translate-y-1/2 translate-x-1/2 pointer-events-none z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
    <div className="relative z-10 w-full h-full flex flex-col">
      {children}
    </div>
  </motion.div>
);

export function BentoGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-[minmax(250px,auto)]">
      
      {/* 1. Surprise Me Widget (Large/Span 2 cols on tablet, 1 on desktop) */}
      <BentoCard delay={0.1} className="lg:col-span-1 md:col-span-2 row-span-1 flex items-center justify-center p-8 bg-gradient-to-br from-amber-50 to-white dark:from-[#121A2A]/80 dark:to-[#1F130B]/90 border-amber-900/10 dark:border-amber-900/30">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-amber-400/50 dark:via-amber-500/50 to-transparent" />
        <div className="text-center flex flex-col items-center justify-center gap-6 w-full h-full">
          <div className="p-4 rounded-2xl bg-amber-100/50 dark:bg-amber-500/10 border border-amber-900/10 dark:border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.15)] dark:shadow-[0_0_40px_rgba(245,158,11,0.15)] mb-2 relative">
            <div className="absolute inset-0 bg-amber-400/20 rounded-2xl blur-xl" />
            <Dice5 className="w-10 h-10 text-amber-500 relative z-10 dark:text-amber-400 drop-shadow-md dark:drop-shadow-[0_0_15px_rgba(245,158,11,0.8)]" />
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Surprise Me</h3>
            <p className="text-slate-600 dark:text-white/60 text-sm max-w-[250px] mx-auto leading-relaxed">Let our quantum palate engine decide your fate tonight.</p>
          </div>
          <button className="relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 dark:from-amber-600 dark:via-orange-500 dark:to-red-600 text-white font-bold py-4 shadow-[0_8px_20px_rgba(245,158,11,0.25)] hover:shadow-[0_8px_25px_rgba(245,158,11,0.4)] dark:shadow-[0_0_30px_rgba(245,158,11,0.4)] dark:hover:shadow-[0_0_50px_rgba(245,158,11,0.6)] hover:-translate-y-1 transition-all duration-300 group mt-auto">
            <span className="relative z-10 flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5" />
              Let AI Pick Your Dinner Tonight
            </span>
            <div className="absolute inset-0 w-full h-full bg-black/10 dark:bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
          </button>
        </div>
      </BentoCard>

      {/* 2. Trending Vibes (Medium) */}
      <BentoCard delay={0.2} className="lg:col-span-1 md:col-span-1 row-span-1 border-purple-900/10 dark:border-purple-900/20 bg-gradient-to-bl from-purple-50/50 to-white dark:bg-gradient-to-bl dark:from-purple-900/10 dark:to-[#121A2A]/40">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Trending Vibes</h3>
          </div>
          <span className="text-xs font-medium px-2 py-1 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">Live</span>
        </div>
        
        <div className="flex flex-col gap-3 flex-1 justify-center">
          {[
            { name: "Cyberpunk Noodle Bar", icon: Eye, color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
            { name: "Quiet Fine Dining", icon: ChefHat, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
            { name: "Local Hidden Gem", icon: MapPin, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" }
          ].map((vibe, i) => (
            <motion.button 
              key={vibe.name}
              whileHover={{ scale: 1.02, x: 5 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "flex items-center justify-between w-full p-4 rounded-xl border border-white/50 dark:border-white/5 bg-white/70 shadow-sm dark:bg-[#0B0F19]/60 hover:bg-white hover:shadow-md dark:hover:shadow-none dark:hover:bg-[#121A2A] transition-all group",
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg border border-transparent backdrop-blur-xl", vibe.bg)}>
                  <vibe.icon className={cn("w-4 h-4", vibe.color)} />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-white/90 group-hover:text-amber-600 dark:group-hover:text-white transition-colors">{vibe.name}</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 dark:text-white/30 group-hover:text-amber-500 font-bold dark:group-hover:text-white/80 transition-colors" />
            </motion.button>
          ))}
        </div>
      </BentoCard>

      {/* 3. Your 99% Match (Medium/Span 2 on mobile/tablet) */}
      <BentoCard delay={0.3} className="lg:col-span-1 md:col-span-1 row-span-1 border-cyan-900/10 dark:border-cyan-900/30 p-0 shadow-[0_8px_30px_rgba(6,182,212,0.1)]">
        <div className="relative w-full h-[200px] overflow-hidden">
          <img 
            src="https://images.unsplash.com/photo-1621494268492-d01b98eba7e4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYW5jeSUyMGRhcmslMjBwbGF0aW5nJTIwZm9vZHxlbnwxfHx8fDE3NzQ0NDQ0NTR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" 
            alt="Exquisite Dish" 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-slate-50/20 dark:from-[#121A2A] dark:via-[#121A2A]/40 to-transparent mix-blend-normal" />
          
          <div className="absolute top-4 left-4 z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 dark:bg-[#0B0F19]/80 backdrop-blur-md border border-cyan-900/10 shadow-[0_0_20px_rgba(6,182,212,0.2)] dark:shadow-[0_0_20px_rgba(6,182,212,0.4)]">
              <div className="w-2 h-2 rounded-full bg-cyan-500 dark:bg-cyan-400 animate-pulse drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
              <span className="text-xs font-bold text-cyan-700 dark:text-cyan-300 tracking-wide uppercase">AI Top Pick</span>
            </div>
          </div>
          
          <div className="absolute top-4 right-4 z-10 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-amber-400 text-xs font-bold">
            <Star className="w-3.5 h-3.5 fill-amber-400" />
            4.9
          </div>
        </div>

        <div className="p-6 pt-4 flex-1 flex flex-col justify-between relative bg-slate-50 dark:bg-[#121A2A]">
          <div className="absolute top-0 right-1/4 w-[150px] h-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">L'Atelier Noir</h3>
              <span className="text-sm font-bold text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-white/5 px-2 py-0.5 rounded border border-cyan-900/10 dark:border-cyan-800/30">99% Match</span>
            </div>
            <p className="text-slate-600 dark:text-white/60 text-sm line-clamp-2 mt-2 leading-relaxed">
              Based on your love for umami-rich flavors and modernist techniques, this 2-star hidden gem perfectly aligns with your current mood.
            </p>
          </div>
          
          {/* Dead Button - Commented out for now
          <button className="w-full mt-6 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium flex items-center justify-center gap-2 transition-colors">
            View Details
            <ArrowUpRight className="w-4 h-4 text-white/50" />
          </button>
          */}
        </div>
      </BentoCard>

    </div>
  );
}
