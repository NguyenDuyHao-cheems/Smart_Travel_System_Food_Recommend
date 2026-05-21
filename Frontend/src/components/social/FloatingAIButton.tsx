import React from 'react';
import { Sparkles, MessageSquareHeart } from 'lucide-react';

export function FloatingAIButton() {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button className="group relative flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-brand via-orange-500 to-amber-400 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-brand blur-md opacity-40 rounded-full group-hover:opacity-60 group-hover:blur-lg transition-all duration-300"></div>
        
        {/* Icon */}
        <Sparkles className="w-6 h-6 text-white relative z-10 animate-pulse" />
        
        {/* Tooltip badge */}
        <div className="absolute -top-10 -right-2 bg-black text-white text-[10px] font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap shadow-xl pointer-events-none">
          ✨ Hỏi Wanderbite AI
          {/* Arrow */}
          <div className="absolute -bottom-1 right-5 w-2 h-2 bg-black rotate-45"></div>
        </div>
      </button>
    </div>
  );
}
