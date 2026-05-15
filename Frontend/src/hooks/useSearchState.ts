import { useState, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

export type SearchMode = 'basic' | 'emotion';

export function useSearchState(initialQuery: string = '') {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const modeFromUrl = searchParams.get('mode') as SearchMode;
  
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
      const params = new URLSearchParams(searchParams.toString());
      params.set('mode', newMode);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [pathname, searchParams, router]);

  return {
    query,
    setQuery,
    searchMode,
    setSearchMode: updateModeInUrl,
  };
}
