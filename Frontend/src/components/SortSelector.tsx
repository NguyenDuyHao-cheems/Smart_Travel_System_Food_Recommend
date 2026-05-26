'use client';

import React from 'react';
import { ArrowUpDown } from 'lucide-react';
import { useLanguage } from './LanguageProvider';

export type SortOption = 'recommend' | 'distance' | 'price_asc' | 'price_desc' | 'rating';

interface SortSelectorProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
  hasCoordinates: boolean;
}

const SORT_OPTIONS: { labelKey: string; value: SortOption; disabledTextKey?: string }[] = [
  { labelKey: 'sort.recommend', value: 'recommend' },
  { labelKey: 'sort.distance', value: 'distance', disabledTextKey: 'sort.needGps' },
  { labelKey: 'sort.priceAsc', value: 'price_asc' },
  { labelKey: 'sort.priceDesc', value: 'price_desc' },
  { labelKey: 'sort.rating', value: 'rating' },
];

export function SortSelector({ value, onChange, hasCoordinates }: SortSelectorProps) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center justify-start gap-1 flex-wrap">
      <span className="text-xs font-bold text-gray-500 dark:text-[#9A8A7A] mr-1 flex items-center gap-1 whitespace-nowrap">
        <ArrowUpDown className="w-3.5 h-3.5" />
        {t('sort.label')}
      </span>
      {SORT_OPTIONS.map((opt) => {
        const isDisabled = opt.value === 'distance' && !hasCoordinates;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={isDisabled}
            title={isDisabled && opt.disabledTextKey ? t(opt.disabledTextKey) : undefined}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 cursor-pointer ${
              isDisabled
                ? 'opacity-40 cursor-not-allowed bg-gray-100 dark:bg-[#3D312A]/40 text-gray-400 dark:text-[#9A8A7A]/40 border-gray-200 dark:border-[#4D3D32]/40'
                : value === opt.value
                ? 'bg-brand text-white border-brand shadow-sm shadow-brand/20 dark:shadow-brand/30'
                : 'bg-white dark:bg-[#3D312A] text-gray-500 dark:text-[#9A8A7A] border-gray-200 dark:border-[#4D3D32] hover:border-brand/50 dark:hover:border-brand/50 hover:text-brand dark:hover:text-brand'
            }`}
          >
            {t(opt.labelKey)}
          </button>
        );
      })}
    </div>
  );
}
