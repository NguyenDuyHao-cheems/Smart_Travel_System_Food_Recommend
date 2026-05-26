'use client';

/* ─────────────────────────────────────────────────────────────────
   SKELETON PRIMITIVES — dùng chung cho nhiều trang/component
   Sử dụng design-system tokens để hỗ trợ Dark Mode
───────────────────────────────────────────────────────────────── */

/* ── PostCardSkeleton — giả lập layout của một bài đăng mạng xã hội ── */
export function PostCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm overflow-hidden relative">
      {/* Shimmer overlay */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent z-10 pointer-events-none" />

      <div className="flex items-start space-x-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-accent shrink-0" />

        <div className="flex-1 min-w-0 space-y-2">
          {/* Name + username */}
          <div className="flex items-center gap-2">
            <div className="h-3.5 w-28 rounded-full bg-accent" />
            <div className="h-3 w-16 rounded-full bg-accent" />
          </div>

          {/* Content lines */}
          <div className="space-y-1.5 pt-1">
            <div className="h-3 w-full rounded-full bg-accent" />
            <div className="h-3 w-4/5 rounded-full bg-accent" />
            <div className="h-3 w-3/5 rounded-full bg-accent" />
          </div>

          {/* Action row */}
          <div className="flex items-center gap-4 pt-2">
            <div className="h-4 w-12 rounded-full bg-accent" />
            <div className="h-4 w-12 rounded-full bg-accent" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── ProfilePageSkeleton — giả lập layout trang cá nhân công khai ── */
export function ProfilePageSkeleton() {
  return (
    <div className="max-w-[768px] mx-auto px-4 pt-8 pb-12">
      {/* Back button placeholder */}
      <div className="h-5 w-20 rounded-full bg-accent mb-4" />

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm mb-6 relative">
        {/* Shimmer overlay */}
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent z-10 pointer-events-none" />

        {/* Cover photo */}
        <div className="h-48 md:h-64 bg-accent w-full" />

        <div className="px-6 pb-6 relative">
          <div className="flex justify-between items-end -mt-16 mb-4">
            {/* Avatar overlapping cover */}
            <div className="w-32 h-32 rounded-full border-4 border-card bg-accent" />
            {/* Follow button */}
            <div className="h-10 w-28 rounded-full bg-accent mb-2" />
          </div>

          {/* Name + username */}
          <div className="space-y-2 mb-6">
            <div className="h-6 w-48 rounded-full bg-accent" />
            <div className="h-4 w-28 rounded-full bg-accent" />
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6">
            <div className="space-y-1">
              <div className="h-5 w-8 rounded bg-accent" />
              <div className="h-3 w-16 rounded-full bg-accent" />
            </div>
            <div className="space-y-1">
              <div className="h-5 w-8 rounded bg-accent" />
              <div className="h-3 w-16 rounded-full bg-accent" />
            </div>
          </div>
        </div>
      </div>

      {/* Posts title */}
      <div className="h-5 w-40 rounded-full bg-accent mb-4" />

      {/* Post skeletons */}
      <div className="flex flex-col gap-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <PostCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/* ── StoryItemSkeleton — giả lập một story bubble tròn ── */
export function StoryItemSkeleton() {
  return (
    <div className="flex flex-col items-center gap-1.5 shrink-0 w-[72px]">
      {/* Story ring + avatar */}
      <div className="w-16 h-16 rounded-full bg-accent" />
      {/* Name */}
      <div className="h-2.5 w-12 rounded-full bg-accent" />
    </div>
  );
}

/* ── CommentSkeleton — giả lập một comment nhỏ trong thread ── */
export function CommentSkeleton() {
  return (
    <div className="flex items-start gap-2.5">
      {/* Avatar nhỏ */}
      <div className="w-7 h-7 rounded-full bg-accent shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="bg-muted/50 rounded-xl px-3 py-2 space-y-1.5">
          <div className="h-2.5 w-20 rounded-full bg-accent" />
          <div className="h-3 w-full rounded-full bg-accent" />
          <div className="h-3 w-4/5 rounded-full bg-accent" />
        </div>
      </div>
    </div>
  );
}

/* ── ProfileOwnSkeleton — giả lập trang profile của chính user ── */
export function ProfileOwnSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
      {/* Profile Header Card */}
      <div className="bg-card rounded-[40px] shadow-sm border border-border overflow-hidden mb-8 relative">
        {/* Shimmer */}
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent z-10 pointer-events-none" />
        {/* Cover */}
        <div className="h-48 bg-accent" />
        <div className="px-8 pb-8 relative">
          <div className="pt-4 flex flex-col md:flex-row md:items-end justify-between gap-6">
            {/* Avatar absolute */}
            <div className="absolute -top-16 left-8 w-32 h-32 rounded-[32px] bg-accent border-8 border-card" />
            <div className="pt-20">
              {/* Name */}
              <div className="h-7 w-40 rounded-full bg-accent mb-2" />
              {/* Badge + join date */}
              <div className="h-4 w-64 rounded-full bg-accent mb-2" />
              {/* Following / Followers */}
              <div className="h-4 w-44 rounded-full bg-accent" />
            </div>
            {/* Buttons */}
            <div className="flex gap-3 mb-2">
              <div className="h-10 w-32 rounded-2xl bg-accent" />
              <div className="h-10 w-10 rounded-2xl bg-accent" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row — 4 ô */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card p-6 rounded-[32px] border border-border shadow-sm flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-accent" />
            <div className="h-6 w-8 rounded bg-accent" />
            <div className="h-3 w-16 rounded-full bg-accent" />
          </div>
        ))}
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Badges */}
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-card rounded-[32px] p-8 shadow-sm border border-border">
            <div className="h-5 w-32 rounded-full bg-accent mb-6" />
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <div className="w-16 h-16 rounded-2xl bg-accent" />
                  <div className="h-2 w-12 rounded-full bg-accent" />
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Right: Recent Activity */}
        <div className="lg:col-span-2">
          <div className="bg-card rounded-[32px] p-8 shadow-sm border border-border">
            <div className="h-5 w-36 rounded-full bg-accent mb-6" />
            <div className="space-y-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-4 items-center">
                  <div className="w-10 h-10 rounded-xl bg-accent shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-3/4 rounded-full bg-accent" />
                    <div className="h-3 w-1/3 rounded-full bg-accent" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useLanguage } from '../LanguageProvider';

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
  const { t } = useLanguage();
  const aiStatusMessages = [
    t('loadingState.statusInit'),
    t('loadingState.statusScan'),
    t('loadingState.statusAnalyze'),
    t('loadingState.statusOptimize'),
    t('loadingState.statusReady'),
  ];
  const [msgIdx, setMsgIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const cycle = () => {
      setVisible(false);
      const timer = setTimeout(() => {
        setMsgIdx(prev => (prev + 1) % aiStatusMessages.length);
        setVisible(true);
      }, 300);
      return () => clearTimeout(timer);
    };
    const interval = setInterval(cycle, 1800);
    return () => clearInterval(interval);
  }, [aiStatusMessages.length]);

  return (
    <motion.p
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.25 }}
      className="text-sm font-medium text-brand dark:text-[#E8735A] dark:text-[#E6DFD5]"
    >
      {aiStatusMessages[msgIdx]}
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
  const { t } = useLanguage();
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
            <Sparkles className="w-7 h-7 text-brand dark:text-[#E8735A]" />
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-[#E6DFD5] mb-2 tracking-tight">
          {t('loadingState.title')}
        </h1>

        <p className="text-sm text-gray-500 dark:text-[#9A8A7A] mb-4 max-w-md border border-gray-200 dark:border-[#4D3D32] rounded-xl px-4 py-2 bg-gray-50 dark:bg-[#3D312A]">
          &ldquo;{searchQuery}&rdquo;
        </p>

        <StatusText />

        {locError && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl text-red-600 dark:text-red-400 text-sm max-w-sm flex flex-col items-center gap-3">
            <p>⚠️ {locError}</p>
            <button onClick={getLocation} className="px-4 py-2 bg-red-100 dark:bg-red-500/20 hover:bg-red-200 dark:hover:bg-red-500/30 rounded-full font-semibold transition">
              {t('loadingState.retry')}
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
