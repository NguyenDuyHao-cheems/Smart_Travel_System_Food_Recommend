'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Tag, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from './LanguageProvider';
import { translateRestaurantTag } from '../lib/recommendationText';

/* ── Emoji mapping for common Vietnamese food tags ── */
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

function getTagEmoji(tagName: string): string {
  const key = tagName.toLowerCase();
  return TAG_EMOJI_MAP[key] || '✨';
}

interface TagFilterProps {
  /** All available tag names (from results or API) */
  tags: string[];
  /** Currently selected tag (null = show all) */
  selectedTag: string | null;
  /** Callback when a tag is selected/deselected */
  onSelect: (tag: string | null) => void;
}

export function TagFilter({ tags, selectedTag, onSelect }: TagFilterProps) {
  const { language, t } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', updateScrollState, { passive: true });
      return () => el.removeEventListener('scroll', updateScrollState);
    }
  }, [tags]);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === 'left' ? -200 : 200, behavior: 'smooth' });
  };

  if (tags.length === 0) return null;

  return (
    <div className="w-full flex items-center gap-2 relative">
      {/* Label */}
      <span className="flex-shrink-0 flex items-center gap-1.5 text-xs font-bold text-gray-400 dark:text-[#9A8A7A] uppercase tracking-wider whitespace-nowrap">
        <Tag className="w-3.5 h-3.5" />
        {t('tagFilter.label')}
      </span>

      {/* Left scroll arrow */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="flex-shrink-0 w-7 h-7 rounded-full bg-white dark:bg-[#3D312A] border border-gray-100 dark:border-[#4D3D32] flex items-center justify-center shadow-sm hover:shadow-md transition-all cursor-pointer z-10"
          aria-label={t('tagFilter.scrollLeft')}
        >
          <ChevronLeft className="w-4 h-4 text-gray-500 dark:text-[#9A8A7A]" />
        </button>
      )}

      {/* Scrollable tag chips container */}
      <div
        ref={scrollRef}
        className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-none scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* "All" chip */}
        <button
          onClick={() => onSelect(null)}
          className={`flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 whitespace-nowrap cursor-pointer border ${
            selectedTag === null
              ? 'bg-brand text-white border-brand shadow-md shadow-brand/20'
              : 'bg-white dark:bg-[#3D312A] text-gray-600 dark:text-[#C8BFB0] border-gray-100 dark:border-[#4D3D32] hover:border-brand/40 hover:text-brand'
          }`}
        >
          🏷️ {t('tagFilter.all')}
        </button>

        {/* Tag chips */}
        {tags.map((tag) => {
          const isActive = selectedTag === tag;
          const emoji = getTagEmoji(tag);
          return (
            <button
              key={tag}
              onClick={() => onSelect(isActive ? null : tag)}
              className={`flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 whitespace-nowrap cursor-pointer border ${
                isActive
                  ? 'bg-brand text-white border-brand shadow-md shadow-brand/20'
                  : 'bg-white dark:bg-[#3D312A] text-gray-600 dark:text-[#C8BFB0] border-gray-100 dark:border-[#4D3D32] hover:border-brand/40 hover:text-brand'
              }`}
            >
              {emoji} {translateRestaurantTag(tag, language)}
            </button>
          );
        })}
      </div>

      {/* Right scroll arrow */}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="flex-shrink-0 w-7 h-7 rounded-full bg-white dark:bg-[#3D312A] border border-gray-100 dark:border-[#4D3D32] flex items-center justify-center shadow-sm hover:shadow-md transition-all cursor-pointer z-10"
          aria-label={t('tagFilter.scrollRight')}
        >
          <ChevronRight className="w-4 h-4 text-gray-500 dark:text-[#9A8A7A]" />
        </button>
      )}
    </div>
  );
}
