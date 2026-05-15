'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Sparkles, Search, Check } from 'lucide-react';
import { SearchMode } from '../../hooks/useSearchState';

export interface SearchTypeMenuProps {
  mode: SearchMode;
  onChange: (mode: SearchMode) => void;
  compact?: boolean;
}

const OPTIONS = [
  {
    id: 'basic' as SearchMode,
    label: 'Tìm kiếm cơ bản',
    icon: Search,
    color: 'text-blue-500',
    bgHover: 'hover:bg-blue-50 dark:hover:bg-blue-500/10'
  },
  {
    id: 'emotion' as SearchMode,
    label: 'Tìm kiếm cảm xúc',
    icon: Sparkles,
    color: 'text-orange-500',
    bgHover: 'hover:bg-orange-50 dark:hover:bg-orange-500/10'
  }
];

export function SearchTypeMenu({ mode, onChange, compact = false }: SearchTypeMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-center transition-all outline-none rounded-full
          ${compact 
            ? 'w-8 h-8 hover:bg-gray-100 dark:hover:bg-gray-700' 
            : 'w-10 h-10 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        title="Chọn chế độ tìm kiếm"
      >
        <Menu className={`text-gray-500 dark:text-gray-400 ${compact ? 'w-4 h-4' : 'w-5 h-5'}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute top-full left-0 mt-2 w-[220px] bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden ${compact ? 'mt-1' : ''}`}
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
                      ${isSelected ? 'bg-gray-50 dark:bg-gray-700/50' : ''} 
                      ${opt.bgHover}
                    `}
                  >
                    <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-white dark:bg-gray-800 shadow-sm' : ''}`}>
                      <Icon className={`w-4 h-4 ${opt.color}`} />
                    </div>
                    <span className={`flex-1 text-sm font-medium ${isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                      {opt.label}
                    </span>
                    {isSelected && (
                      <Check className="w-4 h-4 text-blue-500" />
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
