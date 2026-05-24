'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import { useLanguage } from '../LanguageProvider';

interface SearchLoadingOverlayProps {
  message: string;
  onCancel?: () => void;
}

export function SearchLoadingOverlay({ message, onCancel }: SearchLoadingOverlayProps) {
  const { t } = useLanguage();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-5 bg-white dark:bg-[#3D312A] rounded-3xl px-10 py-10 shadow-2xl border border-gray-100 dark:border-[#4D3D32] max-w-sm w-full mx-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-brand-muted dark:border-brand/20" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-brand dark:text-[#E8735A]" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-base font-semibold text-gray-800 dark:text-[#E6DFD5]">{message}</p>
          <p className="text-sm text-gray-400 dark:text-[#7A6A5A] mt-1">{t('searchOverlay.keepOpen')}</p>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 bg-gray-50 dark:bg-[#2A2420]/50 hover:bg-red-50 dark:hover:bg-red-950/20 border border-gray-200 dark:border-[#4D3D32] hover:border-red-200 dark:hover:border-red-950 rounded-xl transition-all duration-200 cursor-pointer"
          >
            {t('searchOverlay.cancel')}
          </button>
        )}
      </div>
    </div>
  );
}
