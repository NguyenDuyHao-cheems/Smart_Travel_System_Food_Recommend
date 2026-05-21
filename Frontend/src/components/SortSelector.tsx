'use client';

import React from 'react';
import { ArrowUpDown } from 'lucide-react';

export type SortOption = 'recommend' | 'distance' | 'price_asc' | 'price_desc' | 'rating';

interface SortSelectorProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
  hasCoordinates: boolean;
}

const SORT_OPTIONS: { label: string; value: SortOption; disabledText?: string }[] = [
  { label: 'Gợi ý AI', value: 'recommend' },
  { label: 'Gần nhất', value: 'distance', disabledText: 'Cần định vị GPS' },
  { label: 'Giá: Thấp → Cao', value: 'price_asc' },
  { label: 'Giá: Cao → Thấp', value: 'price_desc' },
  { label: 'Đánh giá cao', value: 'rating' },
];

export function SortSelector({ value, onChange, hasCoordinates }: SortSelectorProps) {
  return (
    <div className="flex items-center justify-start gap-1 flex-wrap">
      <span className="text-xs font-bold text-gray-500 dark:text-[#9A8A7A] mr-1 flex items-center gap-1 whitespace-nowrap">
        <ArrowUpDown className="w-3.5 h-3.5" />
        Sắp xếp
      </span>
      {SORT_OPTIONS.map((opt) => {
        const isDisabled = opt.value === 'distance' && !hasCoordinates;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={isDisabled}
            title={isDisabled ? opt.disabledText : undefined}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 cursor-pointer ${
              isDisabled
                ? 'opacity-40 cursor-not-allowed bg-gray-100 dark:bg-[#3D312A]/40 text-gray-400 dark:text-[#9A8A7A]/40 border-gray-200 dark:border-[#4D3D32]/40'
                : value === opt.value
                ? 'bg-brand text-white border-brand shadow-sm shadow-brand/20 dark:shadow-brand/30'
                : 'bg-white dark:bg-[#3D312A] text-gray-500 dark:text-[#9A8A7A] border-gray-200 dark:border-[#4D3D32] hover:border-brand/50 dark:hover:border-brand/50 hover:text-brand dark:hover:text-brand'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
