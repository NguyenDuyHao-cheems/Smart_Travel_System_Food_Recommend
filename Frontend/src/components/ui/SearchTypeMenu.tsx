'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Search, Check } from 'lucide-react';
import { SearchMode } from '../../hooks/useSearchState';
import { useLanguage } from '../LanguageProvider';

export interface SearchTypeMenuProps {
  mode: SearchMode;
  onChange: (mode: SearchMode) => void;
  compact?: boolean;
}

const OPTIONS = [
  {
    id: 'basic' as SearchMode,
    labelKey: 'searchType.basic',
    icon: Search,
    color: 'text-brand dark:text-[#E8735A]',
    bgHover: 'hover:bg-brand-muted dark:hover:bg-brand/10',
  },
  {
    id: 'emotion' as SearchMode,
    labelKey: 'searchType.emotion',
    icon: Sparkles,
    color: 'text-brand dark:text-[#E8735A]',
    bgHover: 'hover:bg-brand-muted dark:hover:bg-brand/10',
  },
];

export function SearchTypeMenu({ mode, onChange, compact = false }: SearchTypeMenuProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Current active option
  const activeOption = OPTIONS.find((o) => o.id === mode) ?? OPTIONS[0];
  const ActiveIcon = activeOption.icon;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative z-20 flex items-center" ref={menuRef}>
      {/* Trigger — shows current mode icon */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-center transition-all outline-none rounded-full
          ${compact
            ? 'w-8 h-8 hover:bg-brand-muted dark:hover:bg-brand/10'
            : 'w-10 h-10 hover:bg-brand-muted dark:hover:bg-brand/10'
          }`}
        title={`${t('searchType.mode')}: ${t(activeOption.labelKey)}`}
      >
        <ActiveIcon
          className={`text-brand dark:text-[#E8735A] ${compact ? 'w-4 h-4' : 'w-5 h-5'}`}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute top-full left-0 mt-2 w-[220px] bg-[#FDFBF7] dark:bg-[#2A2420] rounded-2xl shadow-xl border border-[#E6DFD5] dark:border-[#3D312A] overflow-hidden ${compact ? 'mt-1' : ''}`}
          >
            <div className="p-1">
              {OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = mode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onChange(opt.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left
                      ${isSelected ? 'bg-brand-muted dark:bg-brand/10' : ''}
                      ${opt.bgHover}
                    `}
                  >
                    <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-white dark:bg-[#3D312A] shadow-sm' : ''}`}>
                      <Icon className={`w-4 h-4 ${opt.color}`} />
                    </div>
                    <span className={`flex-1 text-sm font-medium ${isSelected ? 'text-[#3D312A] dark:text-[#E6DFD5]' : 'text-[#7A6A5A] dark:text-[#9A8A7A]'}`}>
                      {t(opt.labelKey)}
                    </span>
                    {isSelected && (
                      <Check className="w-4 h-4 text-brand dark:text-[#E8735A]" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
