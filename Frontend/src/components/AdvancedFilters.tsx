'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, Star, Leaf, DollarSign, RotateCcw } from 'lucide-react';

export interface AdvancedFilterState {
  minPrice: number | null;
  maxPrice: number | null;
  minRating: number | null;
  vegetarianOnly: boolean;
}

interface AdvancedFiltersProps {
  filters: AdvancedFilterState;
  onChange: (filters: AdvancedFilterState) => void;
  totalCount: number;
  filteredCount: number;
}

export function AdvancedFilters({ filters, onChange, totalCount, filteredCount }: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localMinPrice, setLocalMinPrice] = useState(filters.minPrice?.toString() || '');
  const [localMaxPrice, setLocalMaxPrice] = useState(filters.maxPrice?.toString() || '');

  // Keep local inputs in sync with parent state if reset externally
  useEffect(() => {
    setLocalMinPrice(filters.minPrice?.toString() || '');
    setLocalMaxPrice(filters.maxPrice?.toString() || '');
  }, [filters.minPrice, filters.maxPrice]);

  const handlePriceApply = () => {
    const minVal = localMinPrice ? parseInt(localMinPrice, 10) : null;
    const maxVal = localMaxPrice ? parseInt(localMaxPrice, 10) : null;
    
    onChange({
      ...filters,
      minPrice: isNaN(minVal as number) ? null : minVal,
      maxPrice: isNaN(maxVal as number) ? null : maxVal,
    });
  };

  const handlePricePreset = (min: number | null, max: number | null) => {
    setLocalMinPrice(min?.toString() || '');
    setLocalMaxPrice(max?.toString() || '');
    onChange({
      ...filters,
      minPrice: min,
      maxPrice: max,
    });
  };

  const handleRatingSelect = (rating: number | null) => {
    onChange({
      ...filters,
      minRating: rating,
    });
  };

  const handleVegetarianToggle = () => {
    onChange({
      ...filters,
      vegetarianOnly: !filters.vegetarianOnly,
    });
  };

  const handleReset = () => {
    setLocalMinPrice('');
    setLocalMaxPrice('');
    onChange({
      minPrice: null,
      maxPrice: null,
      minRating: null,
      vegetarianOnly: false,
    });
  };

  const hasActiveFilters =
    filters.minPrice !== null ||
    filters.maxPrice !== null ||
    filters.minRating !== null ||
    filters.vegetarianOnly;

  return (
    <div className="w-full flex flex-col gap-2">
      {/* Toggle Button */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 cursor-pointer ${
            isOpen || hasActiveFilters
              ? 'bg-brand-muted dark:bg-brand/10 border-brand/40 dark:border-brand/30 text-brand-hover dark:text-[#E6DFD5] shadow-sm shadow-brand/5 dark:shadow-none'
              : 'bg-white dark:bg-[#3D312A] border-gray-200 dark:border-[#4D3D32] text-gray-600 dark:text-[#9A8A7A] hover:border-brand/70 hover:text-brand-hover'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Bộ lọc nâng cao
          {hasActiveFilters && (
            <span className="bg-brand/10 dark:bg-brand/20 rounded-full px-2 py-0.5 text-[10px] font-bold text-brand-hover dark:text-[#E6DFD5] ml-1">
              Đang lọc
            </span>
          )}
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 px-2.5 py-1 rounded-lg transition-all"
          >
            <RotateCcw className="w-3 h-3" />
            Đặt lại bộ lọc
          </button>
        )}
      </div>

      {/* Collapsible Filters Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="p-5 rounded-2xl bg-white dark:bg-[#3D312A] border border-gray-100 dark:border-[#4D3D32] shadow-md grid grid-cols-1 md:grid-cols-3 gap-6 mt-1">
              
              {/* 1. Rating Filter */}
              <div className="flex flex-col gap-2.5">
                <span className="text-xs font-bold text-gray-700 dark:text-[#E6DFD5] flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  Đánh giá tối thiểu
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Tất cả', value: null },
                    { label: '4.0 ⭐+', value: 4.0 },
                    { label: '4.5 ⭐+', value: 4.5 },
                    { label: '4.8 ⭐+', value: 4.8 },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => handleRatingSelect(opt.value)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        filters.minRating === opt.value
                          ? 'bg-brand border-brand text-white shadow-sm shadow-brand/10'
                          : 'bg-gray-50 dark:bg-[#4D3D32] border-gray-100 dark:border-[#5A4A3A] text-gray-600 dark:text-[#9A8A7A] hover:border-brand/70'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Price Range Filter */}
              <div className="flex flex-col gap-2.5">
                <span className="text-xs font-bold text-gray-700 dark:text-[#E6DFD5] flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  Khoảng giá (VND)
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    placeholder="Từ"
                    value={localMinPrice}
                    onChange={(e) => setLocalMinPrice(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-[#5A4A3A] bg-gray-50 dark:bg-[#4D3D32] dark:text-[#E6DFD5] focus:outline-none focus:ring-1 focus:ring-brand/50"
                  />
                  <span className="text-gray-400 text-xs">—</span>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    placeholder="Đến"
                    value={localMaxPrice}
                    onChange={(e) => setLocalMaxPrice(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-[#5A4A3A] bg-gray-50 dark:bg-[#4D3D32] dark:text-[#E6DFD5] focus:outline-none focus:ring-1 focus:ring-brand/50"
                  />
                  <button
                    type="button"
                    onClick={handlePriceApply}
                    className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-brand text-white hover:bg-brand-hover transition-colors shadow-sm cursor-pointer"
                  >
                    Lọc
                  </button>
                </div>
                {/* Presets */}
                <div className="flex flex-wrap gap-1.5 mt-0.5">
                  {[
                    { label: 'Dưới 50k', min: 0, max: 50000 },
                    { label: '50k - 100k', min: 50000, max: 100000 },
                    { label: 'Trên 100k', min: 100000, max: 1000000 },
                  ].map((preset) => {
                    const isSelected = filters.minPrice === preset.min && filters.maxPrice === preset.max;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => handlePricePreset(preset.min, preset.max)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                          isSelected
                            ? 'bg-brand/10 border-brand/50 text-brand-hover dark:text-[#E6DFD5]'
                            : 'bg-gray-50 dark:bg-[#4D3D32] border-gray-100 dark:border-[#5A4A3A] text-gray-500 dark:text-[#9A8A7A] hover:border-brand/40'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Vegetarian Filter */}
              <div className="flex flex-col gap-2.5">
                <span className="text-xs font-bold text-gray-700 dark:text-[#E6DFD5] flex items-center gap-1.5">
                  <Leaf className="w-4 h-4 text-emerald-500" />
                  Chế độ ăn uống
                </span>
                <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-[#4D3D32] bg-gray-50/50 dark:bg-[#4D3D32]/40 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10 cursor-pointer transition-all">
                  <input
                    type="checkbox"
                    checked={filters.vegetarianOnly}
                    onChange={handleVegetarianToggle}
                    className="w-4.5 h-4.5 rounded border-gray-300 text-brand focus:ring-brand accent-brand cursor-pointer"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-800 dark:text-[#E6DFD5]">
                      🌿 Chỉ hiển thị quán chay
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-[#9A8A7A] mt-0.5">
                      Lọc ra các quán chuyên chay hoặc có menu chay chuyên biệt
                    </span>
                  </div>
                </label>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
