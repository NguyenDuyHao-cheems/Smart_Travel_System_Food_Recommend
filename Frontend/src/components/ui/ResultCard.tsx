import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { MapPin, Star, Brain, ExternalLink, Navigation, Sparkles } from 'lucide-react';

interface ResultCardProps {
  item: any;
  index: number;
}

export function ResultCard({ item, index }: ResultCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-[#121A2A]/40 backdrop-blur-2xl border border-white/5 rounded-[2rem] overflow-hidden flex flex-col md:flex-row hover:border-white/10 hover:shadow-[0_0_40px_rgba(245,158,11,0.06)] transition-all duration-500 shadow-[0_8px_32px_rgba(0,0,0,0.5)] group relative"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none rounded-[2rem]" />

      <div className="md:w-[320px] h-64 md:h-auto relative shrink-0 p-4">
        <div className="w-full h-full relative rounded-2xl overflow-hidden">
          <Image
            src={item.img}
            alt={item.name}
            fill
            sizes="(max-width: 768px) 100vw, 320px"
            className="object-cover group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
          <div className="absolute top-3 left-3 z-10 bg-black/50 backdrop-blur-md rounded-full w-9 h-9 flex items-center justify-center border border-white/10 text-sm font-semibold text-white/90 shadow-lg">
            #{index + 1}
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8 flex flex-col justify-between flex-1">
        <div>
          <div className="flex justify-between items-start mb-3">
            <h2 className="text-2xl font-semibold text-white tracking-wide font-playfair">{item.name}</h2>
            <div className="bg-amber-950/40 text-amber-400 text-xs font-semibold px-3 py-1.5 rounded-full border border-amber-700/40 flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.15)] whitespace-nowrap ml-3">
              <Sparkles className="w-3 h-3" />
              {item.match} Match
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-white/60 text-sm mb-5 font-medium">
            <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-purple-400" /> {item.dist}</span>
            <span className="flex items-center gap-1.5"><span className="text-green-400 font-bold">$</span> {item.price}</span>
            <span className="flex items-center gap-1.5"><Star className="w-4 h-4 text-amber-400 fill-amber-400" /> {item.rating}</span>
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-purple-400 text-xs font-semibold uppercase tracking-widest">AI Analysis</span>
            </div>
            <p className="text-white/50 italic leading-relaxed text-[15px] border-l-2 border-white/10 pl-4 py-1 font-sans">
              &ldquo;{item.reason}&rdquo;
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-auto">
          <button aria-label={`Đặt món tại ${item.name}`} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 text-white text-sm font-semibold shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] hover:scale-[1.02] transition-all duration-300 group/btn">
            <ExternalLink className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" />
            Đặt ngay
          </button>
          <button aria-label={`Xem ${item.name} trên bản đồ`} className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/10 bg-white/5 text-white/70 text-sm font-semibold hover:bg-white/10 hover:border-white/20 hover:text-white hover:scale-[1.02] transition-all duration-300 group/btn">
            <Navigation className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" />
            Xem trên bản đồ
          </button>
        </div>
      </div>
    </motion.div>
  );
}
