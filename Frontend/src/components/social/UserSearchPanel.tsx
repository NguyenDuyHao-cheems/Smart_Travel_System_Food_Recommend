'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, UserCheck, Loader2, X } from 'lucide-react';
import { useLanguage } from '../LanguageProvider';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface UserResult {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  is_following: boolean;
}

export function UserSearchPanel() {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [followingState, setFollowingState] = useState<Record<string, boolean>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // Sync followingState from search results
  useEffect(() => {
    const map: Record<string, boolean> = {};
    results.forEach(u => { map[u.id] = u.is_following; });
    setFollowingState(map);
  }, [results]);

  const doSearch = async (q: string) => {
    setIsSearching(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(
        `${BACKEND_URL}/api/v1/social/users/search?q=${encodeURIComponent(q)}`,
        { headers: { Authorization: token ? `Bearer ${token}` : '' } }
      );
      if (res.ok) setResults(await res.json());
    } catch { /* silent */ }
    finally { setIsSearching(false); }
  };

  const handleFollow = async (userId: string) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    // Optimistic
    setFollowingState(prev => ({ ...prev, [userId]: !prev[userId] }));
    try {
      await fetch(`${BACKEND_URL}/api/v1/social/users/${userId}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Revert on error
      setFollowingState(prev => ({ ...prev, [userId]: !prev[userId] }));
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      {/* Search input */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
        {isSearching
          ? <Loader2 className="w-4 h-4 text-muted-foreground animate-spin shrink-0" />
          : <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        }
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t("feed.searchFriends")}
          className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults([]); }}>
            <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="divide-y divide-border">
          {results.map(user => {
            const isFollowing = followingState[user.id] ?? user.is_following;
            const avatar = user.avatar_url ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`;
            return (
              <div key={user.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 transition-colors">
                <img src={avatar} alt={user.username}
                  className="w-8 h-8 rounded-full border border-border bg-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate text-foreground">
                    {user.full_name || user.username}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                </div>
                <button
                  onClick={() => handleFollow(user.id)}
                  className={`shrink-0 flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full border transition-all ${
                    isFollowing
                      ? 'border-border text-muted-foreground hover:border-red-400 hover:text-red-500'
                      : 'border-brand text-brand hover:bg-brand hover:text-white'
                  }`}
                >
                  {isFollowing
                    ? <><UserCheck className="w-3 h-3" /> {t("feed.searchPanel.following")}</>
                    : <><UserPlus className="w-3 h-3" /> {t("feed.searchPanel.follow")}</>
                  }
                </button>
              </div>
            );
          })}
        </div>
      )}

      {query && !isSearching && results.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">
          {t("feed.searchPanel.noMatch")}
        </p>
      )}
    </div>
  );
}
