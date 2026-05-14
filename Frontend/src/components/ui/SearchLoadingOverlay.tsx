'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

interface SearchLoadingOverlayProps {
  message: string;
}

export function SearchLoadingOverlay({ message }: SearchLoadingOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-5 bg-white dark:bg-gray-800 rounded-3xl px-10 py-10 shadow-2xl border border-gray-100 dark:border-gray-700 max-w-sm w-full mx-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-orange-100 dark:border-orange-500/20" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-orange-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-orange-500" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-base font-semibold text-gray-800 dark:text-white">{message}</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Vui lòng không đóng trang này</p>
        </div>
      </div>
    </div>
  );
}
