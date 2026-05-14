'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell, HelpCircle } from 'lucide-react';
import { ThemeToggle } from '../ThemeToggle';
import { UserDropdown } from '../UserDropdown';

interface HeaderProps {
  showBack?: boolean;
  backPath?: string;
  username?: string | null;
  avatar?: string | null;
}

export function Header({ showBack = false, backPath, username, avatar }: HeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (backPath) {
      router.push(backPath);
    } else {
      router.back();
    }
  };

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-8 h-[72px] bg-[#F7F8FA]/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100/60 dark:border-gray-700/60 transition-colors duration-300">
      {/* Left: Logo + Back */}
      <div className="flex items-center gap-4">
        {showBack && (
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        )}
      </div>

      {/* Right: ThemeToggle */}
      <div className="flex items-center gap-4">
        {/* ══════════════════════════════════════════════════════
            Top Bar Buttons
            ══════════════════════════════════════════════════════ */}
        <button className="relative w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer">
          <Bell className="w-[18px] h-[18px] text-gray-500 dark:text-gray-400" />
        </button>
        <button className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer">
          <HelpCircle className="w-[18px] h-[18px]" />
          <span className="font-medium">Hỗ trợ</span>
        </button>
        <UserDropdown username={username} avatar={avatar} />
      </div>
    </header>
  );
}
