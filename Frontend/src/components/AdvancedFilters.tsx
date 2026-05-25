'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, Star, Leaf, DollarSign, RotateCcw, Tag, X } from 'lucide-react';
import { useLanguage } from './LanguageProvider';

export interface AdvancedFilterState {
  minPrice: number | null;
  maxPrice: number | null;
  minRating: number | null;
  vegetarianOnly: boolean;
}

/* ── Tag grouping system ── */
interface TagGroupDef {
  label: string;
  emoji: string;
  members: string[];
}

const TAG_GROUPS: TagGroupDef[] = [
  { label: 'Món Nướng', emoji: '🔥', members: ['nướng', 'bbq', 'gà', 'bò', 'heo', 'hải sản'] },
  { label: 'Món Chiên', emoji: '🍤', members: ['chiên', 'fastfood', 'pizza', 'burger', 'ăn vặt'] },
  { label: 'Món Xào', emoji: '🍝', members: ['xào', 'mì xào'] },
  { label: 'Món Nước / Hầm', emoji: '🍜', members: ['phở', 'bún', 'mì', 'lẩu', 'cháo', 'nước', 'hầm'] },
  { label: 'Món Hấp / Luộc', emoji: '🥟', members: ['hấp', 'luộc', 'dimsum'] },
  { label: 'Món Trộn / Gỏi', emoji: '🥗', members: ['trộn', 'gỏi', 'salad', 'nộm', 'healthy', 'sushi'] },
  { label: 'Món Chay', emoji: '🌿', members: ['món chay', 'chay'] },
  { label: 'Tráng Miệng / Ngọt', emoji: '🍰', members: ['tráng miệng', 'dessert', 'kem', 'chè', 'bánh'] },
  { label: 'Thức Uống / Pha Chế', emoji: '🧋', members: ['trà sữa', 'cà phê', 'đồ uống', 'nước ép'] },
  { label: 'Đánh giá', emoji: '⭐', members: ['đánh giá cao', 'nhiều đánh giá'] },
  { label: 'Phân khúc', emoji: '💵', members: ['giá rẻ', 'tầm trung', 'cao cấp'] },
];

const TAG_EMOJI_MAP: Record<string, string> = {
  'gà': '🍗', 'bò': '🥩', 'heo': '🐷',
  'cơm': '🍚', 'phở': '🍜', 'bún': '🍜', 'mì': '🍝',
  'hải sản': '🦐', 'lẩu': '🫕', 'nướng': '🔥',
  'trà sữa': '🧋', 'cà phê': '☕', 'đồ uống': '🥤',
  'sushi': '🍣', 'pizza': '🍕', 'burger': '🍔',
  'tráng miệng': '🍰', 'dessert': '🍰',
  'cháo': '🥣', 'healthy': '🥗', 'món chay': '🌿',
  'ăn sáng': '🌅', 'ăn trưa': '☀️', 'ăn tối': '🌙',
  'ăn vặt': '🍿', 'ăn khuya': '🌃',
  'đánh giá cao': '⭐', 'nhiều đánh giá': '💬',
  'giá rẻ': '💰', 'tầm trung': '💵', 'cao cấp': '💎',
  'chiên': '🍤', 'fastfood': '🍔', 'xào': '🍝', 'mì xào': '🍝',
  'hấp': '🥟', 'luộc': '🥟', 'trộn': '🥗', 'gỏi': '🥗', 'salad': '🥗', 'chay': '🌿',
};

const TAG_GROUP_LABELS_EN: Record<string, string> = {
  'Món Nướng': 'BBQ & Grilled',
  'Món Chiên': 'Fried',
  'Món Xào': 'Stir-fried',
  'Món Nước / Hầm': 'Soups & Stews',
  'Món Hấp / Luộc': 'Steamed & Boiled',
  'Món Trộn / Gỏi': 'Salad & Mixed',
  'Món Chay': 'Vegetarian',
  'Tráng Miệng / Ngọt': 'Sweets & Desserts',
  'Thức Uống / Pha Chế': 'Drinks & Beverages',
  'Đánh giá': 'Rating',
  'Phân khúc': 'Price Segment',
  'Khác': 'Other',
};

const TAG_LABELS_EN: Record<string, string> = {
  'gà': 'chicken',
  'bò': 'beef',
  'heo': 'pork',
  'cơm': 'rice',
  'cháo': 'porridge',
  'phở': 'pho',
  'bún': 'vermicelli',
  'mì': 'noodles',
  'lẩu': 'hotpot',
  'hải sản': 'seafood',
  'nướng': 'grill',
  'trà sữa': 'milk tea',
  'cà phê': 'coffee',
  'đồ uống': 'drinks',
  'tráng miệng': 'dessert',
  'món chay': 'vegetarian',
  'ăn sáng': 'breakfast',
  'ăn trưa': 'lunch',
  'ăn tối': 'dinner',
  'ăn vặt': 'snacks',
  'ăn khuya': 'late-night',
  'đánh giá cao': 'highly rated',
  'nhiều đánh giá': 'many reviews',
  'giá rẻ': 'budget',
  'tầm trung': 'mid-range',
  'cao cấp': 'premium',
  'chiên': 'fried',
  'fastfood': 'fast food',
  'xào': 'stir-fried',
  'mì xào': 'fried noodles',
  'hấp': 'steamed',
  'luộc': 'boiled',
  'trộn': 'mixed',
  'gỏi': 'salad',
  'salad': 'salad',
  'chay': 'vegetarian',
};

function getTagEmoji(tagName: string): string {
  return TAG_EMOJI_MAP[tagName.toLowerCase()] || '✨';
}

interface AdvancedFiltersProps {
  filters: AdvancedFilterState;
  onChange: (filters: AdvancedFilterState) => void;
  totalCount: number;
  filteredCount: number;
  availableTags?: string[];
  selectedTags?: string[];
  onTagsChange?: (tags: string[]) => void;
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
}

export function AdvancedFilters({
  filters,
  onChange,
  totalCount,
  filteredCount,
  availableTags = [],
  selectedTags = [],
  onTagsChange,
  isOpen: externalIsOpen,
  onToggle
}: AdvancedFiltersProps) {
  const { language, t } = useLanguage();
  const [localIsOpen, setLocalIsOpen] = useState(false);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : localIsOpen;
  const labelForGroup = (label: string) => language === 'en' ? TAG_GROUP_LABELS_EN[label] || label : label;
  const labelForTag = (tag: string) => language === 'en' ? TAG_LABELS_EN[tag.toLowerCase()] || tag : tag;

  const toggleOpen = () => {
    if (onToggle) {
      onToggle(!isOpen);
    } else {
      setLocalIsOpen(!isOpen);
    }
  };

  // Group available tags
  const groupedTags = useMemo(() => {
    if (availableTags.length === 0) return [];
    const claimed = new Set<string>();
    const groups: { label: string; emoji: string; tags: string[] }[] = [];
    for (const group of TAG_GROUPS) {
      const matched = availableTags.filter(t => {
        const lower = t.toLowerCase();
        return !claimed.has(lower) && group.members.includes(lower);
      });
      if (matched.length > 0) {
        matched.forEach(t => claimed.add(t.toLowerCase()));
        groups.push({ label: group.label, emoji: group.emoji, tags: matched });
      }
    }
    const unclaimed = availableTags.filter(t => !claimed.has(t.toLowerCase()));
    if (unclaimed.length > 0) {
      groups.push({ label: 'Khác', emoji: '🏷️', tags: unclaimed });
    }
    return groups;
  }, [availableTags]);

  const [localMinPrice, setLocalMinPrice] = useState(filters.minPrice?.toString() || '');
  const [localMaxPrice, setLocalMaxPrice] = useState(filters.maxPrice?.toString() || '');

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
    onChange({ ...filters, minPrice: min, maxPrice: max });
  };

  const handleRatingSelect = (rating: number | null) => {
    onChange({ ...filters, minRating: rating });
  };

  const handleVegetarianToggle = () => {
    onChange({ ...filters, vegetarianOnly: !filters.vegetarianOnly });
  };

  const handleReset = () => {
    setLocalMinPrice('');
    setLocalMaxPrice('');
    onChange({ minPrice: null, maxPrice: null, minRating: null, vegetarianOnly: false });
    onTagsChange?.([]);
  };

  const hasActiveFilters =
    filters.minPrice !== null ||
    filters.maxPrice !== null ||
    filters.minRating !== null ||
    filters.vegetarianOnly ||
    selectedTags.length > 0;

  const activeCount = [
    filters.minPrice !== null || filters.maxPrice !== null,
    filters.minRating !== null,
    filters.vegetarianOnly,
  ].filter(Boolean).length + selectedTags.length;

  return (
    <div className="w-full flex flex-col gap-2 relative">
      <div className="p-5 rounded-2xl bg-white dark:bg-[#3D312A] border border-gray-100 dark:border-[#4D3D32] shadow-sm flex flex-col gap-6">
              
              {/* 1. Rating Filter */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-gray-700 dark:text-[#E6DFD5] flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  {t('filters.minRating')}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: t('filters.all'), value: null },
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

              {/* 2. Vegetarian Filter */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-gray-700 dark:text-[#E6DFD5] flex items-center gap-1.5">
                  <Leaf className="w-4 h-4 text-emerald-500" />
                  {t('filters.dietary')}
                </span>
                <label className="flex items-center gap-2 p-2 rounded-xl border border-gray-100 dark:border-[#4D3D32] bg-gray-50/50 dark:bg-[#4D3D32]/40 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10 cursor-pointer transition-all">
                  <input
                    type="checkbox"
                    checked={filters.vegetarianOnly}
                    onChange={handleVegetarianToggle}
                    className="w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand accent-brand cursor-pointer"
                  />
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-gray-800 dark:text-[#E6DFD5]">
                      🌿 {t('filters.vegetarianOnly')}
                    </span>
                  </div>
                </label>
              </div>

              {/* 3. Price Range Filter */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-gray-700 dark:text-[#E6DFD5] flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  {t('filters.priceRange')}
                </span>
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    placeholder={t('filters.from')}
                    value={localMinPrice}
                    onChange={(e) => setLocalMinPrice(e.target.value)}
                    className="w-full sm:flex-1 px-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-[#5A4A3A] bg-gray-50 dark:bg-[#4D3D32] dark:text-[#E6DFD5] focus:outline-none focus:ring-1 focus:ring-brand/50"
                  />
                  <span className="text-gray-400 text-xs hidden sm:block">—</span>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    placeholder={t('filters.to')}
                    value={localMaxPrice}
                    onChange={(e) => setLocalMaxPrice(e.target.value)}
                    className="w-full sm:flex-1 px-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-[#5A4A3A] bg-gray-50 dark:bg-[#4D3D32] dark:text-[#E6DFD5] focus:outline-none focus:ring-1 focus:ring-brand/50"
                  />
                  <button
                    type="button"
                    onClick={handlePriceApply}
                    className="w-full sm:w-auto px-4 py-1.5 text-xs font-bold rounded-xl bg-brand text-white hover:bg-brand-hover transition-colors shadow-sm cursor-pointer"
                  >
                    {t('filters.apply')}
                  </button>
                  {/* Presets inline */}
                  <div className="flex items-center gap-1.5 ml-auto">
                    {[
                      { label: '< 50k', min: 0, max: 50000 },
                      { label: '50-100k', min: 50000, max: 100000 },
                      { label: '> 100k', min: 100000, max: 1000000 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => handlePricePreset(preset.min, preset.max)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                          filters.minPrice === preset.min && filters.maxPrice === preset.max
                            ? 'bg-brand/10 border-brand/50 text-brand-hover dark:text-[#E6DFD5]'
                            : 'bg-gray-50 dark:bg-[#4D3D32] border-gray-100 dark:border-[#5A4A3A] text-gray-500 dark:text-[#9A8A7A] hover:border-brand/40'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4. Tag Filter — Grouped */}
              {groupedTags.length > 0 && (
                <div className="flex flex-col gap-3 pt-4 border-t border-gray-100 dark:border-[#4D3D32]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700 dark:text-[#E6DFD5] flex items-center gap-1.5">
                      <Tag className="w-4 h-4 text-brand dark:text-[#E8735A]" />
                      {t('filters.foodType')}
                    </span>
                    <button
                      onClick={() => onTagsChange?.([])}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold transition-all duration-200 cursor-pointer border ${
                        selectedTags.length === 0
                          ? 'bg-brand text-white border-brand shadow-sm shadow-brand/20'
                          : 'bg-gray-50 dark:bg-[#3D312A] text-gray-500 dark:text-[#C8BFB0] border-gray-100 dark:border-[#4D3D32] hover:border-brand/40 hover:text-brand'
                      }`}
                    >
                      🏷️ {t('filters.all')}
                    </button>
                  </div>

                  {/* Vertical grouped tags container */}
                  <div className="flex flex-col gap-3">
                    {groupedTags.map((group) => (
                      <div key={group.label} className="flex flex-col gap-2">
                        <span className="text-[10px] font-bold text-gray-400 dark:text-[#7A6A5A] uppercase tracking-wider flex items-center gap-1">
                          {group.emoji} {labelForGroup(group.label)}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {group.tags.map((tag) => {
                            const isActive = selectedTags.includes(tag.toLowerCase());
                            const emoji = getTagEmoji(tag);
                            return (
                              <button
                                key={tag}
                                onClick={() => {
                                  if (isActive) {
                                    onTagsChange?.(selectedTags.filter(t => t !== tag.toLowerCase()));
                                  } else {
                                    onTagsChange?.([...selectedTags, tag.toLowerCase()]);
                                  }
                                }}
                                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 whitespace-nowrap cursor-pointer border ${
                                  isActive
                                    ? 'bg-brand text-white border-brand shadow-md shadow-brand/20'
                                    : 'bg-gray-50 dark:bg-[#3D312A] text-gray-600 dark:text-[#C8BFB0] border-gray-100 dark:border-[#4D3D32] hover:border-brand/40 hover:text-brand'
                                }`}
                              >
                                {emoji} {labelForTag(tag)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
    </div>
  );
}
