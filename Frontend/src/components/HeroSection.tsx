"use client";
import React from "react";
import { motion } from "motion/react";
import { Mic, Camera, Brain, Sparkles, ChevronRight } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative w-full min-h-[85vh] flex items-center justify-center pt-20 pb-12 px-6 lg:px-12 overflow-hidden">
      {/* Background Image & Gradient Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1695512937087-859dc39418bb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaW5lbWF0aWMlMjBjb29raW5nJTIwZmxhbWUlMjBkYXJrJTIwcmVzdGF1cmFudHxlbnwxfHx8fDE3NzQ0NDQ0NDd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
          alt="Cinematic cooking flame"
          className="w-full h-full object-cover object-center scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] via-[#0B0F19]/80 to-transparent mix-blend-multiply" />
        <div className="absolute inset-0 bg-[#0B0F19]/60 backdrop-blur-[2px]" />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center text-center gap-4 pt-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-purple-500/30 bg-purple-900/20 text-purple-300 text-sm font-semibold tracking-wide backdrop-blur-md mb-4 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
            <Sparkles className="w-4 h-4" />
            V2.0 Palate Analysis Engine Live
          </span>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-[1.1] text-transparent bg-clip-text bg-gradient-to-br from-white via-white/90 to-amber-200 drop-shadow-[0_0_25px_rgba(251,191,36,0.3)] font-[Playfair]">
            Discover Your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-red-600 drop-shadow-[0_0_40px_rgba(239,68,68,0.5)]">
              Perfect Taste.
            </span>
          </h1>

          <p className="mt-3 text-lg md:text-xl text-white/70 max-w-2xl mx-auto font-light leading-relaxed">
            Let our AI analyze your palate and curate the ultimate culinary journey.
          </p>
        </motion.div>

        {/* AI Command Center Input */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="w-full max-w-4xl mt-6"
        >
          <div className="relative flex items-center w-full p-2 bg-[#121A2A]/80 border-[1px] border-white/10 rounded-[2rem] shadow-2xl backdrop-blur-xl ring-1 ring-white/5 overflow-hidden transition-all focus-within:ring-2 focus-within:ring-cyan-500/50 focus-within:border-cyan-500/30 focus-within:shadow-[0_0_30px_rgba(6,182,212,0.2)]">
            <div className="flex items-center justify-center w-14 h-14 pl-2">
              <Brain className="w-7 h-7 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
            </div>

            <input
              type="text"
              placeholder="Describe your craving, mood, or dietary goals..."
              className="flex-1 w-full bg-transparent border-none outline-none text-sm md:text-lg text-white placeholder:text-white/40 px-2 md:px-4 h-16 font-medium"
            />

            <div className="flex items-center gap-1 md:gap-2 pr-2 md:pr-4">
              <button className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/10 text-white/50 hover:text-cyan-300 transition-colors">
                <Mic className="w-5 h-5" />
              </button>
              <button className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/10 text-white/50 hover:text-cyan-300 transition-colors">
                <Camera className="w-5 h-5" />
              </button>
              
              <button className="sm:ml-2 group relative flex items-center justify-center gap-2 px-4 md:px-8 h-12 md:h-14 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 text-white font-bold text-sm md:text-lg overflow-hidden shadow-[0_0_30px_rgba(249,115,22,0.6)] hover:shadow-[0_0_50px_rgba(249,115,22,0.8)] transition-all transform hover:scale-[1.02] whitespace-nowrap">
                <span className="relative z-10 hidden sm:inline">Generate Journey</span>
                <span className="relative z-10 sm:hidden">Generate</span>
                <ChevronRight className="w-4 h-4 md:w-5 md:h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out z-0" />
              </button>
            </div>
            
            {/* Glowing borders around input */}
            <div className="absolute top-0 left-0 w-1/3 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50" />
            <div className="absolute bottom-0 right-0 w-1/3 h-[1px] bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-50" />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-6 text-sm text-white/50">
            <span>Try:</span>
            {["Romantic rooftop dinner in Tokyo", "High-protein vegan spots nearby", "Michelin 3-star hidden gems"].map((prompt) => (
              <button key={prompt} className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:text-white transition-colors">
                "{prompt}"
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}