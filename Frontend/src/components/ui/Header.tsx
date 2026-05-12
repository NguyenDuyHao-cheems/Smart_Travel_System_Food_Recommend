'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User } from 'lucide-react';
import { ThemeToggle } from '../ThemeToggle';

interface HeaderProps {
  showBack?: boolean;
}

export function Header({ showBack = false }: HeaderProps) {
  const router = useRouter();
  const [username, setUsername] = React.useState<string | null>(null);

  React.useEffect(() => {
    const token = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('username');
    if (token) {
      setUsername(storedUser || 'User');
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('username');
    localStorage.removeItem('food_recsys_userid');
    setUsername(null);
    router.push('/auth');
  };

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-8 py-4 bg-[#F7F8FA]/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100/60 dark:border-gray-700/60 transition-colors duration-300">
      {/* Left: Logo + Back */}
      <div className="flex items-center gap-4">
        {showBack && (
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        )}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shadow-md shadow-orange-200 dark:shadow-orange-500/20">
            <span className="text-white text-lg">🍜</span>
          </div>
          <span className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">
            Wanderbite
          </span>
        </div>
      </div>

      {/* Right: ThemeToggle */}
      <div className="flex items-center gap-4">
        {/* [HIDDEN] Top Bar Buttons — Uncomment khi kết nối chức năng */}
        {/* <button className="relative w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer">
          <Bell className="w-[18px] h-[18px] text-gray-500 dark:text-gray-400" />
        </button> */}
        {/* <button className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer">
          <HelpCircle className="w-[18px] h-[18px]" />
        </button> */}
        {/* <button className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer">
          <Globe className="w-[18px] h-[18px]" />
          <span className="font-medium">Tiếng Việt</span>
        </button> */}
        <ThemeToggle />
        
        {username ? (
          <div className="flex items-center gap-3 ml-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden">
                <User className="w-5 h-5 text-gray-400" />
              </div>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 hidden sm:block">
                {username}
              </span>
            </div>
            <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>
            <button 
              onClick={handleLogout}
              className="text-[13px] font-semibold text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors cursor-pointer"
            >
              Đăng xuất
            </button>
          </div>
        ) : (
          <button 
            onClick={() => router.push('/auth')}
            className="ml-2 px-4 py-2 rounded-xl bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-500 text-sm font-bold hover:bg-orange-100 dark:hover:bg-orange-500/20 transition-colors cursor-pointer"
          >
            Đăng nhập
          </button>
        )}
      </div>
    </header>
  );
}
