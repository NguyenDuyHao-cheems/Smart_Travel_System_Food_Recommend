import { useState, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

export type SearchMode = 'basic' | 'emotion';

export function useSearchState(initialQuery: string = '') {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  let modeFromUrl = searchParams.get('mode') as SearchMode;
  // [FIX-CONFLICT]: Đọc mode từ sessionStorage thay vì URL để giữ link sạch
  if (typeof window !== 'undefined' && !modeFromUrl) {
    const sessionMode = sessionStorage.getItem('current_search_mode') as SearchMode;
    if (sessionMode === 'basic' || sessionMode === 'emotion') modeFromUrl = sessionMode;
  }
  
  const [query, setQuery] = useState(initialQuery);
  const [searchMode, setSearchMode] = useState<SearchMode>(
    modeFromUrl === 'basic' || modeFromUrl === 'emotion' ? modeFromUrl : 'basic'
  );

  useEffect(() => {
    const currentMode = searchParams.get('mode') as SearchMode;
    if (currentMode === 'basic' || currentMode === 'emotion') {
      setSearchMode(currentMode);
    }
  }, [searchParams]);

  const updateModeInUrl = useCallback((newMode: SearchMode) => {
    setSearchMode(newMode);
    if (pathname.includes('/result')) {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('current_search_mode', newMode);
      }
      // Khong day mode len URL nua de link sach
      // const params = new URLSearchParams(searchParams.toString());
      // params.set('mode', newMode);
      // router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [pathname, searchParams, router]);

  return {
    query,
    setQuery,
    searchMode,
    setSearchMode: updateModeInUrl,
  };
}
