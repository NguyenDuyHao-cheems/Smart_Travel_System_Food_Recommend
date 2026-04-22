import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain } from 'lucide-react';

const AI_STATUS_MESSAGES = [
  'Khởi động Neural Engine...',
  'Đang quét không gian vector ẩm thực...',
  'Đang phân tích độ khớp sinh trắc học...',
  'Tổng hợp kết quả tối ưu...',
];

function SkeletonCard({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-[#121A2A] border border-white/5 rounded-[2rem] overflow-hidden flex flex-col md:flex-row shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
    >
      <div className="md:w-[320px] h-64 md:h-auto shrink-0 p-4">
        <div className="w-full h-full rounded-2xl bg-white/[0.04] animate-pulse" />
      </div>
      <div className="p-6 md:p-8 flex flex-col justify-between flex-1 gap-4">
        <div className="space-y-3">
          <div className="h-7 w-2/3 rounded-full bg-white/[0.06] animate-pulse" />
          <div className="flex gap-4">
            <div className="h-4 w-16 rounded-full bg-white/[0.04] animate-pulse" />
            <div className="h-4 w-20 rounded-full bg-white/[0.04] animate-pulse" />
            <div className="h-4 w-14 rounded-full bg-white/[0.04] animate-pulse" />
          </div>
          <div className="h-4 w-full rounded-full bg-white/[0.04] animate-pulse" />
          <div className="h-4 w-5/6 rounded-full bg-white/[0.04] animate-pulse" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-28 rounded-full bg-white/[0.06] animate-pulse" />
          <div className="h-10 w-36 rounded-full bg-white/[0.04] animate-pulse" />
        </div>
      </div>
    </motion.div>
  );
}

function HackerStatusText() {
  const [msgIdx, setMsgIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const cycle = () => {
      setVisible(false);
      const timer1 = setTimeout(() => {
        setMsgIdx(prev => (prev + 1) % AI_STATUS_MESSAGES.length);
        setVisible(true);
      }, 300);
      return () => clearTimeout(timer1);
    };
    const interval = setInterval(cycle, 1400);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.p
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.25 }}
      className="text-sm md:text-base font-mono font-semibold tracking-widest uppercase text-[#22d3ee] drop-shadow-[0_0_12px_rgba(34,211,238,0.75)]"
    >
      {AI_STATUS_MESSAGES[msgIdx]}
    </motion.p>
  );
}

interface LoadingStateProps {
  searchQuery: string;
  locError: string | null;
  getLocation: () => void;
}

export function LoadingState({ searchQuery, locError, getLocation }: LoadingStateProps) {
  return (
    <motion.div
      key="loading"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex flex-col items-center text-center mb-14">
        <div className="relative mb-8">
          <motion.div
            animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-full border border-cyan-400/40 -m-4"
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
            className="absolute inset-0 rounded-full border border-cyan-500/30 -m-2"
          />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-400/30 flex items-center justify-center backdrop-blur-xl shadow-[0_0_40px_rgba(34,211,238,0.3),_0_0_80px_rgba(168,85,247,0.15)]"
          >
            <Brain className="w-9 h-9 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
          </motion.div>
        </div>

        <div className="inline-flex items-center gap-2 border border-cyan-500/30 text-cyan-400 text-xs font-semibold px-4 py-1.5 rounded-full mb-5 bg-[#0891b21a] shadow-[0_0_20px_rgba(34,211,238,0.12)]">
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0"
          />
          AI PROCESSING — NEURAL ENGINE ACTIVE
        </div>

        <h1 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-cyan-400 via-purple-400 to-amber-500">
          Đang Xử Lý Yêu Cầu
        </h1>

        <p className="text-white/40 text-sm mb-6 max-w-md border border-white/5 rounded-xl px-4 py-2 bg-white/[0.02] font-mono">
          &ldquo;{searchQuery}&rdquo;
        </p>

        <HackerStatusText />

        {locError && (
          <div className="mt-8 p-4 bg-red-900/30 border border-red-500/50 rounded-xl text-red-300 text-sm max-w-sm flex flex-col items-center gap-3">
            <p>⚠️ {locError}</p>
            <button onClick={getLocation} className="px-4 py-2 bg-red-500/20 hover:bg-red-500/40 rounded-full font-semibold transition">
              Khử chặn vị trí và Thử Lại
            </button>
          </div>
        )}

        <div className="mt-6 w-64 h-0.5 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            className="h-full w-1/2 rounded-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
          />
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {[0, 1, 2, 3].map(i => (
          <SkeletonCard key={i} delay={i * 0.08} />
        ))}
      </div>
    </motion.div>
  );
}
