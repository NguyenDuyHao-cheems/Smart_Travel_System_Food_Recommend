'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const AI_STATUS_MESSAGES = [
  "Đang khởi tạo hệ thống phân tích toàn diện...",
  "Đang quét dữ liệu ẩm thực trên toàn khu vực...",
  "Đang phân tích thói quen và sở thích của bạn...",
  "Đang tối ưu hóa danh sách gợi ý tốt nhất...",
  "Sẵn sàng hiển thị kết quả cho bạn!",
];

/* ── Skeleton Card ── */
function SkeletonCard({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white dark:bg-[#3D312A] border border-gray-100 dark:border-[#4D3D32] rounded-2xl overflow-hidden shadow-sm relative"
    >
      {/* Shimmer overlay */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-gray-200/50 dark:via-gray-600/20 to-transparent z-10 pointer-events-none" />
      <div className="h-[180px] bg-gray-200 dark:bg-[#4D3D32]" />
      <div className="p-4 space-y-3">
        <div className="h-5 w-3/4 rounded-full bg-gray-200 dark:bg-[#4D3D32]" />
        <div className="h-3 w-1/2 rounded-full bg-gray-200 dark:bg-[#4D3D32]" />
        <div className="h-3 w-full rounded-full bg-gray-200 dark:bg-[#4D3D32]" />
        <div className="flex gap-2">
          <div className="h-6 w-14 rounded-full bg-gray-200 dark:bg-[#4D3D32]" />
          <div className="h-6 w-14 rounded-full bg-gray-200 dark:bg-[#4D3D32]" />
        </div>
      </div>
    </motion.div>
  );
}

/* ── Hero Skeleton ── */
function HeroSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-[#3D312A] border border-gray-100 dark:border-[#4D3D32] rounded-3xl overflow-hidden shadow-sm relative mb-8"
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-gray-200/50 dark:via-gray-600/20 to-transparent z-10 pointer-events-none" />
      <div className="flex flex-col md:flex-row">
        <div className="flex-1 p-8 space-y-4">
          <div className="h-8 w-48 rounded-full bg-gray-200 dark:bg-[#4D3D32]" />
          <div className="h-6 w-1/3 rounded-full bg-gray-200 dark:bg-[#4D3D32]" />
          <div className="h-8 w-2/3 rounded-full bg-gray-200 dark:bg-[#4D3D32]" />
          <div className="h-4 w-1/4 rounded-full bg-gray-200 dark:bg-[#4D3D32]" />
          <div className="space-y-2">
            <div className="h-4 w-full rounded-full bg-gray-200 dark:bg-[#4D3D32]" />
            <div className="h-4 w-4/5 rounded-full bg-gray-200 dark:bg-[#4D3D32]" />
          </div>
          <div className="flex gap-2">
            <div className="h-7 w-16 rounded-full bg-gray-200 dark:bg-[#4D3D32]" />
            <div className="h-7 w-16 rounded-full bg-gray-200 dark:bg-[#4D3D32]" />
            <div className="h-7 w-24 rounded-full bg-gray-200 dark:bg-[#4D3D32]" />
          </div>
        </div>
        <div className="md:w-[380px] h-[280px] md:h-auto p-4">
          <div className="w-full h-full rounded-2xl bg-gray-200 dark:bg-[#4D3D32]" />
        </div>
      </div>
    </motion.div>
  );
}

/* ── Status Text Animation ── */
function StatusText() {
  const [msgIdx, setMsgIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const cycle = () => {
      setVisible(false);
      const timer = setTimeout(() => {
        setMsgIdx(prev => (prev + 1) % AI_STATUS_MESSAGES.length);
        setVisible(true);
      }, 300);
      return () => clearTimeout(timer);
    };
    const interval = setInterval(cycle, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.p
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.25 }}
      className="text-sm font-medium text-brand dark:text-[#E6DFD5]"
    >
      {AI_STATUS_MESSAGES[msgIdx]}
    </motion.p>
  );
}

/* ── Main Loading State ── */
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
      transition={{ duration: 0.3 }}
    >
      {/* Title section */}
      <div className="flex flex-col items-center text-center mb-10">
        {/* Animated Icon */}
        <div className="relative mb-6">
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-full border-2 border-brand/50 dark:border-brand/40 -m-3"
          />
          <div className="w-14 h-14 rounded-full bg-brand-muted dark:bg-brand/20 flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-brand" />
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-[#E6DFD5] mb-2 tracking-tight">
          Đang tìm kiếm cho bạn...
        </h1>

        <p className="text-sm text-gray-500 dark:text-[#9A8A7A] mb-4 max-w-md border border-gray-200 dark:border-[#4D3D32] rounded-xl px-4 py-2 bg-gray-50 dark:bg-[#3D312A]">
          &ldquo;{searchQuery}&rdquo;
        </p>

        <StatusText />

        {locError && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl text-red-600 dark:text-red-400 text-sm max-w-sm flex flex-col items-center gap-3">
            <p>⚠️ {locError}</p>
            <button onClick={getLocation} className="px-4 py-2 bg-red-100 dark:bg-red-500/20 hover:bg-red-200 dark:hover:bg-red-500/30 rounded-full font-semibold transition">
              Thử lại
            </button>
          </div>
        )}

        {/* Progress bar */}
        <div className="mt-6 w-64 h-1.5 bg-gray-200 dark:bg-[#4D3D32] rounded-full overflow-hidden">
          <motion.div
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
            className="h-full w-1/2 rounded-full bg-gradient-to-r from-transparent via-brand to-transparent"
          />
        </div>
      </div>

      {/* Skeleton Cards */}
      <HeroSkeleton />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[0, 1, 2, 3].map(i => (
          <SkeletonCard key={i} delay={i * 0.04} />
        ))}
      </div>
    </motion.div>
  );
}
