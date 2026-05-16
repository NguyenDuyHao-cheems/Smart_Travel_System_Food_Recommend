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

const PLACEHOLDERS = [
  "Một tô phở bò nóng hổi...",
  "Đồ ăn vặt dưới 50k...",
  "Món Thái cay xé lưỡi...",
  "Trà sữa trân châu đường đen...",
];

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

  // Typewriter placeholder — only for full mode
  useEffect(() => {
    if (compact) return;

    const currentPhrase = PLACEHOLDERS[phIndex];
    const typingSpeed = isDeleting ? 40 : 80;

    const timer = setTimeout(() => {
      if (!isDeleting && charIndex === currentPhrase.length) {
        setTimeout(() => setIsDeleting(true), 1500);
      } else if (isDeleting && charIndex === 0) {
        setIsDeleting(false);
        setPhIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
      } else {
        setCharIndex((prev) => prev + (isDeleting ? -1 : 1));
        setPlaceholderText(currentPhrase.substring(0, charIndex + (isDeleting ? -1 : 1)));
      }
    }, typingSpeed);

    return () => clearTimeout(timer);
  }, [charIndex, isDeleting, phIndex, compact]);

  /* ── Compact mode (result page) ── */
  if (compact) {
    return (
      <form
        onSubmit={(e) => { e.preventDefault(); onSearch(); }}
        className="flex items-stretch bg-[#FFFDF9] dark:bg-[#DFD8C8] rounded-full border-2 border-[#3D312A] shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-all duration-150 focus-within:translate-x-[2px] focus-within:translate-y-[2px] focus-within:shadow-[2px_2px_0px_rgba(0,0,0,1)] relative z-10 w-full"
      >
        <div className="flex items-center pl-3 py-1.5 relative z-20">
          <SearchTypeMenu mode={searchMode} onChange={setSearchMode} compact={true} />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none py-3 px-3 text-[14px] text-[#3D312A] dark:text-[#3D312A] placeholder:text-[#9A8A7A] font-normal relative z-10"
          placeholder="Bạn muốn ăn gì hôm nay?"
        />
        <div className="flex items-center p-1.5">
          <button
            type="submit"
            className="flex items-center gap-2 bg-brand hover:bg-brand-hover text-white px-5 py-2.5 rounded-full font-bold text-[13px] uppercase tracking-wide border-l-2 border-[#3D312A] transition-colors cursor-pointer whitespace-nowrap relative z-10"
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Tìm lại</span>
          </button>
        </div>
      </form>
    );
  }

  /* ── Full mode (home page) — Retro pill hard shadow ── */
  return (
    <div className="relative mb-6">
      <form
        onSubmit={(e) => { e.preventDefault(); onSearch(); }}
        className="flex items-stretch bg-[#FFFDF9] dark:bg-[#DFD8C8] rounded-full border-2 border-[#3D312A] shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-all duration-150 focus-within:translate-x-[2px] focus-within:translate-y-[2px] focus-within:shadow-[2px_2px_0px_rgba(0,0,0,1)] relative z-10"
      >
        {/* Search type + sparkles */}
        <div className="flex items-center pl-3 py-2 relative z-20">
          <SearchTypeMenu mode={searchMode} onChange={setSearchMode} compact={false} />
        </div>

        {/* Input */}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholderText || "Mô tả món ăn bạn muốn..."}
          className="flex-1 bg-transparent border-none outline-none py-4 px-3 text-[15px] text-[#3D312A] dark:text-[#3D312A] placeholder:text-[#9A8A7A] font-normal relative z-10"
        />

        {/* Submit button */}
        <button
          type="submit"
          className="flex items-center gap-2 bg-brand hover:bg-brand-hover text-white px-8 py-3 rounded-full font-bold text-[14px] uppercase tracking-wide border-l-2 border-[#3D312A] transition-colors cursor-pointer whitespace-nowrap relative z-10"
        >
          <Search className="w-4 h-4" />
          Tìm kiếm
        </button>
      </form>
    </div>
  );
}
