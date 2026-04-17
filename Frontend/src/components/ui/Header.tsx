import React from 'react';

export function Header() {
  return (
    <header className="px-6 md:px-10 py-4 flex items-center justify-between border-b border-white/5 bg-[#0B0F19]/90 backdrop-blur-xl sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-[0_0_16px_rgba(245,158,11,0.4)] shrink-0">
          <span className="text-white font-black text-xs leading-none">T&T</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-lg tracking-tight text-white">TASTE&amp;TRAVEL</span>
          <span className="font-black text-sm text-amber-500 tracking-wider">AI</span>
        </div>
      </div>

      <nav className="hidden md:flex items-center gap-7">
        <a href="#" className="text-sm text-white/50 hover:text-white transition-colors duration-200">Explore</a>
        <a href="#" className="text-sm text-white/50 hover:text-white transition-colors duration-200">AI Picks</a>
        <a href="#" className="text-sm text-amber-400 font-medium hover:text-amber-300 transition-colors duration-200">Results</a>
        <a href="#" className="text-sm text-white/50 hover:text-white transition-colors duration-200">Experiences</a>
      </nav>

      <div className="flex items-center gap-3">
        <button className="hidden sm:flex items-center px-4 py-2 rounded-full border border-white/15 text-sm text-white/80 hover:border-white/30 hover:text-white transition-all duration-200 bg-white/[0.03]">
          Login
        </button>
        <div className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center bg-white/5 hover:bg-white/10 hover:border-amber-500/30 cursor-pointer transition-all duration-300">
          <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      </div>
    </header>
  );
}
