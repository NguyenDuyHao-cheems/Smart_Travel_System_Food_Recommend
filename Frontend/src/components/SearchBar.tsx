'use client';

import React, { useEffect, useState } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { SearchTypeMenu } from './ui/SearchTypeMenu';
import { SearchMode } from '../hooks/useSearchState';

interface SearchBarProps {
  query: string;
  setQuery: (q: string) => void;
  searchMode: SearchMode;
  setSearchMode: (m: SearchMode) => void;
  onSearch: () => void;
  compact?: boolean;
}

export function SearchBar({
  query,
  setQuery,
  searchMode,
  setSearchMode,
  onSearch,
  compact = false,
}: SearchBarProps) {
  const [placeholderText, setPlaceholderText] = useState("");
  const [phIndex, setPhIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (compact) return;

    const placeholders = [
      "Một tô phở bò nóng hổi...", 
      "Đồ ăn vặt dưới 50k...", 
      "Món Thái cay xé lưỡi...", 
      "Trà sữa trân châu đường đen..."
    ];
    const currentPhrase = placeholders[phIndex];
    const typingSpeed = isDeleting ? 40 : 80;

    const timer = setTimeout(() => {
      if (!isDeleting && charIndex === currentPhrase.length) {
        setTimeout(() => setIsDeleting(true), 1500);
      } else if (isDeleting && charIndex === 0) {
        setIsDeleting(false);
        setPhIndex((prev) => (prev + 1) % placeholders.length);
      } else {
        setCharIndex((prev) => prev + (isDeleting ? -1 : 1));
        setPlaceholderText(currentPhrase.substring(0, charIndex + (isDeleting ? -1 : 1)));
      }
    }, typingSpeed);

    return () => clearTimeout(timer);
  }, [charIndex, isDeleting, phIndex, compact]);

  if (compact) {
    return (
      <form 
        onSubmit={(e) => { e.preventDefault(); onSearch(); }} 
        className="relative group w-full flex"
      >
        <div className="absolute inset-y-0 left-0 pl-2 flex items-center z-10 gap-1.5 pointer-events-auto">
          <SearchTypeMenu mode={searchMode} onChange={setSearchMode} compact={true} />
          <div className="pointer-events-none">
            <Sparkles className="h-5 w-5 text-orange-500" />
          </div>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="block w-full pl-[95px] pr-32 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl leading-5 bg-transparent placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-base transition-all shadow-sm group-hover:shadow-md dark:text-white"
          placeholder="Bạn muốn ăn gì hôm nay?"
        />
        <div className="absolute inset-y-2 right-2 z-10">
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm h-full"
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Tìm lại</span>
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="relative mb-6">
      <form 
        onSubmit={(e) => { e.preventDefault(); onSearch(); }}
        className="flex items-center bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md dark:hover:shadow-none hover:border-gray-300 dark:hover:border-gray-600 transition-all focus-within:shadow-md focus-within:border-orange-300 dark:focus-within:border-orange-500/50 focus-within:ring-4 focus-within:ring-orange-50 dark:focus-within:ring-orange-500/10 dark:focus-within:shadow-[0_0_20px_rgba(255,143,0,0.15)] relative z-10"
      >
        <div className="flex items-center pl-3 py-2 gap-2 relative z-20">
          <SearchTypeMenu mode={searchMode} onChange={setSearchMode} compact={false} />
          <Sparkles className="w-5 h-5 text-orange-400 pointer-events-none" />
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholderText || "Mô tả món ăn bạn muốn..."}
          className="flex-1 bg-transparent border-none outline-none py-4 px-2 text-[15px] text-gray-700 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 font-normal relative z-10"
        />

        <button
          type="submit"
          className="flex items-center gap-2 bg-gradient-to-r from-orange-400 to-orange-500 text-white px-6 py-3 rounded-full font-semibold text-[14px] mr-1.5 hover:from-orange-500 hover:to-orange-600 transition-all shadow-md shadow-orange-200 dark:shadow-[0_0_20px_rgba(255,143,0,0.4)] hover:shadow-[0_0_20px_rgba(255,143,0,0.3)] hover:scale-105 active:scale-[0.97] cursor-pointer whitespace-nowrap relative z-10"
        >
          <Search className="w-4 h-4" />
          Tìm kiếm
        </button>
      </form>
    </div>
  );
}
