'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Sparkles,
  Heart,
  Bookmark,
  Brain,
  ShieldCheck,
  ExternalLink,
  Search,
  AlertTriangle,
  Info,
  Home,
  X,
} from 'lucide-react';
import { Roboto } from 'next/font/google';
import { useGeolocation } from '../../hooks/useGeolocation';
import { Header } from '../../components/ui/Header';
import { LoadingState } from '../../components/ui/LoadingState';
import { BudgetSelector, type BudgetOption } from '../../components/BudgetSelector';
import { DistanceFilter } from '../../components/DistanceFilter';
import { Sidebar } from '../../components/Sidebar';

const roboto = Roboto({
  subsets: ['latin', 'vietnamese'],
  weight: ['300', '400', '500', '700', '900'],
});

/* ─────────────────────────────────────────────────────────────
   Tag helpers — derive tags from AI reason text
   ───────────────────────────────────────────────────────────── */
export interface RecommendResult {
  id: string | number;
  name: string;
  match: string;
  dist: string;
  distance_km?: number;
  price: string;
  rating: string;
  reason: string;
  img: string;
  tags?: string[];
  restaurantName?: string;
  distance_km?: number;
  google_maps_url?: string;
}

interface VibeTag {
  label: string;
  emoji: string;
  bgLight: string;
  bgDark: string;
  text: string;
  border: string;
}

const VIBE_TAGS: VibeTag[] = [
  { label: 'Spicy', emoji: '🔥', bgLight: 'bg-red-50', bgDark: 'dark:bg-red-500/10', text: 'text-red-500', border: 'border-red-100 dark:border-red-500/20' },
  { label: 'AC', emoji: '❄️', bgLight: 'bg-blue-50', bgDark: 'dark:bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-100 dark:border-blue-500/20' },
  { label: 'Comfort Food', emoji: '💕', bgLight: 'bg-pink-50', bgDark: 'dark:bg-pink-500/10', text: 'text-pink-500', border: 'border-pink-100 dark:border-pink-500/20' },
  { label: 'Seafood', emoji: '🧀', bgLight: 'bg-yellow-50', bgDark: 'dark:bg-yellow-500/10', text: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-100 dark:border-yellow-500/20' },
  { label: 'Sweet', emoji: '💕', bgLight: 'bg-pink-50', bgDark: 'dark:bg-pink-500/10', text: 'text-pink-500', border: 'border-pink-100 dark:border-pink-500/20' },
  { label: 'Popular', emoji: '⭐', bgLight: 'bg-amber-50', bgDark: 'dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-100 dark:border-amber-500/20' },
  { label: 'Cheap', emoji: '💰', bgLight: 'bg-green-50', bgDark: 'dark:bg-green-500/10', text: 'text-green-600 dark:text-green-400', border: 'border-green-100 dark:border-green-500/20' },
  { label: 'Classic', emoji: '🏛️', bgLight: 'bg-teal-50', bgDark: 'dark:bg-teal-500/10', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-100 dark:border-teal-500/20' },
  { label: 'Trendy', emoji: '🔥', bgLight: 'bg-violet-50', bgDark: 'dark:bg-violet-500/10', text: 'text-violet-500 dark:text-violet-400', border: 'border-violet-100 dark:border-violet-500/20' },
  { label: 'Local', emoji: '📍', bgLight: 'bg-orange-50', bgDark: 'dark:bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-100 dark:border-orange-500/20' },
];

function getTagsForItem(item: RecommendResult, index: number): VibeTag[] {
  // If API returns tags, use them; otherwise pick 2-3 based on index
  if (item.tags && Array.isArray(item.tags)) {
    return item.tags.map((t: string) => VIBE_TAGS.find(v => v.label.toLowerCase() === t.toLowerCase()) || VIBE_TAGS[0]);
  }
  // Fallback: deterministic selection based on index
  const sets = [
    [VIBE_TAGS[0], VIBE_TAGS[1], VIBE_TAGS[2]], // Spicy, AC, Comfort Food
    [VIBE_TAGS[1], VIBE_TAGS[3], VIBE_TAGS[5]], // AC, Seafood, Popular
    [VIBE_TAGS[1], VIBE_TAGS[4], VIBE_TAGS[7]], // AC, Sweet, Classic
    [VIBE_TAGS[6], VIBE_TAGS[9], VIBE_TAGS[7]], // Cheap, Local, Classic
    [VIBE_TAGS[0], VIBE_TAGS[1], VIBE_TAGS[8]], // Spicy, AC, Trendy
  ];
  return sets[index % sets.length];
}

function getMatchColor(match: string): string {
  const num = parseInt(match);
  if (num >= 95) return 'bg-green-500';
  if (num >= 90) return 'bg-green-500/90';
  if (num >= 85) return 'bg-yellow-500';
  return 'bg-orange-500';
}

/* ─────────────────────────────────────────────────────────────
   Hero Result Card (#1 — AI TOP PICK)
   ───────────────────────────────────────────────────────────── */
function HeroResultCard({ item }: { item: RecommendResult }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg dark:hover:border-gray-600 transition-all duration-300 mb-8"
    >
      {/* TOP PICK Badge */}
      <div className="px-6 pt-5">
        <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold bg-orange-500 text-white shadow-md shadow-orange-200 dark:shadow-orange-500/30">
          ⭐ AI TOP PICK - {item.match} Match
        </span>
      </div>

      <div className="flex flex-col md:flex-row">
        {/* Left: Info */}
        <div className="flex-1 p-6 md:p-8">
          {/* Rank */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-amber-400 text-lg">👍</span>
            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">#1</span>
          </div>

          {/* Food Name */}
          <h2
            className={`text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1 tracking-tight ${item.google_maps_url ? 'cursor-pointer hover:text-orange-500 transition-colors' : ''}`}
            onClick={() => item.google_maps_url && window.open(item.google_maps_url, '_blank')}
            title={item.google_maps_url ? "Xem trên Google Maps" : ""}
          >
            {item.name}
          </h2>

          {/* Restaurant Name */}
          {item.restaurantName && (
            <p
              className={`text-base font-semibold text-orange-500 mb-4 ${item.google_maps_url ? 'cursor-pointer hover:text-orange-600 transition-colors' : ''}`}
              onClick={() => item.google_maps_url && window.open(item.google_maps_url, '_blank')}
              title={item.google_maps_url ? "Xem trên Google Maps" : ""}
            >
              {item.restaurantName}
            </p>
          )}

          {/* Distance Badge */}
          {item.dist && (
            <div className="mb-5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-teal-50 dark:bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-500/30">
                <MapPin className="w-3.5 h-3.5" /> {item.dist}
              </span>
            </div>
          )}

          {/* AI Description */}
          {item.reason && (
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-6 max-w-md">
              {item.reason}
            </p>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {getTagsForItem(item, 0).map(tag => (
              <span key={tag.label} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${tag.bgLight} ${tag.bgDark} ${tag.text} border ${tag.border}`}>
                {tag.emoji} {tag.label}
              </span>
            ))}
          </div>
        </div>

        {/* Right: Image */}
        <div className="md:w-[380px] h-[280px] md:h-auto relative p-4">
          <div
            className={`w-full h-full rounded-2xl overflow-hidden relative ${item.google_maps_url ? 'cursor-pointer' : ''}`}
            onClick={() => item.google_maps_url && window.open(item.google_maps_url, '_blank')}
            title={item.google_maps_url ? "Xem trên Google Maps" : ""}
          >
            <img
              src={item.img}
              alt={item.name}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
            />
          </div>
          {/* Bookmark & Heart */}
          <div className="absolute top-6 right-6 flex gap-2">
            <button className="w-10 h-10 rounded-full bg-white/90 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:scale-110 transition-all cursor-pointer shadow-sm">
              <Bookmark className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            </button>
            <button className="w-10 h-10 rounded-full bg-white/90 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:scale-110 transition-all cursor-pointer shadow-sm">
              <Heart className="w-5 h-5 text-red-400" fill="currentColor" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Small Result Card (#2-#5)
   ───────────────────────────────────────────────────────────── */
function SmallResultCard({ item, index }: { item: RecommendResult; index: number }) {
  const tags = getTagsForItem(item, index);
  const matchColor = getMatchColor(item.match);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg dark:hover:border-gray-600 transition-all duration-300 cursor-pointer group"
    >
      {/* Image */}
      <div
        className="relative h-[180px] overflow-hidden"
        onClick={() => item.google_maps_url && window.open(item.google_maps_url, '_blank')}
        title={item.google_maps_url ? "Xem trên Google Maps" : ""}
      >
        <img
          src={item.img}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />

        {/* Rank */}
        <span className="absolute top-3 left-3 inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold bg-gray-700/90 text-white backdrop-blur-sm">
          {index + 2}
        </span>

        {/* Heart */}
        <button className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 dark:bg-gray-900/80 flex items-center justify-center hover:scale-110 transition-all cursor-pointer shadow-sm">
          <Heart className="w-4 h-4 text-red-400" />
        </button>

        {/* Bottom badges */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${matchColor} text-white`}>
            🤖 {item.match} Match
          </span>
          {item.dist && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-white/90 dark:bg-gray-900/80 text-teal-600 dark:text-teal-400 backdrop-blur-sm">
              📍 {item.dist}
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3
          className={`text-base font-bold text-gray-800 dark:text-white mb-0.5 transition-colors ${item.google_maps_url ? 'cursor-pointer hover:text-orange-500' : ''}`}
          onClick={() => item.google_maps_url && window.open(item.google_maps_url, '_blank')}
          title={item.google_maps_url ? "Xem trên Google Maps" : ""}
        >
          {item.name}
        </h3>
        {item.restaurantName && (
          <p
            className={`text-xs font-semibold text-orange-500 mb-2 ${item.google_maps_url ? 'cursor-pointer hover:text-orange-600 transition-colors' : ''}`}
            onClick={() => item.google_maps_url && window.open(item.google_maps_url, '_blank')}
            title={item.google_maps_url ? "Xem trên Google Maps" : ""}
          >
            {item.restaurantName}
          </p>
        )}
        {item.reason && (
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3 line-clamp-2">
            {item.reason}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {tags.map(tag => (
            <span key={tag.label} className={`px-2 py-1 rounded-full text-[10px] font-medium ${tag.bgLight} ${tag.bgDark} ${tag.text} border ${tag.border}`}>
              {tag.emoji} {tag.label}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Feature Bar (Bottom)
   ───────────────────────────────────────────────────────────── */
function FeatureBar() {
  const features = [
    { icon: Sparkles, bg: 'bg-orange-100 dark:bg-orange-500/20', color: 'text-orange-500', title: 'AI-Powered Recommendations', desc: 'Personalized just for you' },
    { icon: MapPin, bg: 'bg-red-100 dark:bg-red-500/20', color: 'text-red-500', title: 'Near Your Location', desc: 'Real-time GPS results' },
    { icon: Heart, bg: 'bg-pink-100 dark:bg-pink-500/20', color: 'text-pink-500', title: 'Based on Your Vibes', desc: 'Mood, weather & preferences' },
    { icon: ShieldCheck, bg: 'bg-green-100 dark:bg-green-500/20', color: 'text-green-500', title: 'Safe & Trusted', desc: 'Quality restaurants only' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-gray-700 px-6 py-5 mt-10"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map(feat => (
          <div key={feat.title} className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${feat.bg} flex items-center justify-center flex-shrink-0`}>
              <feat.icon className={`w-5 h-5 ${feat.color}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{feat.title}</p>
              <p className="text-xs text-gray-400">{feat.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ═════════════════════════════════════════════════════════════
   MAIN RESULT PAGE
   ═════════════════════════════════════════════════════════════ */
function ResultPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryFromUrl = searchParams.get('q') || '';
  const budgetFromUrl = (searchParams.get('budget') || 'auto') as BudgetOption;

  // Check for cache instantly to avoid flicker
  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window === 'undefined') return true;
    const searchParams = new URLSearchParams(window.location.search);
    const q = searchParams.get('q');
    const isRefresh = searchParams.get('refresh') === 'true';
    if (q && !isRefresh) {
      return !sessionStorage.getItem(`last_results_${q}`);
    }
    return true;
  });
  
  const [searchQuery, setSearchQuery] = useState(queryFromUrl || '');
  const [inputValue, setInputValue] = useState(searchQuery);
  const [budget, setBudget] = useState<BudgetOption>(budgetFromUrl);

  const [fallbackApplied, setFallbackApplied] = useState(false);
  const [fallbackReason, setFallbackReason] = useState<string>('');
  const [appliedBudget, setAppliedBudget] = useState<number | null>(null);

  const [filteredCount, setFilteredCount] = useState(0);
  const [allergyWarning, setAllergyWarning] = useState<string>('');

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Sync login status immediately on mount
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    setIsLoggedIn(!!token);
    
    // Save current URL as the last search URL for the Back button in settings
    if (typeof window !== 'undefined') {
      localStorage.setItem('last_search_url', window.location.pathname + window.location.search);
    }
  }, [searchParams]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showGuestNotice, setShowGuestNotice] = useState(true);

  // Distance filter state (client-side, default OFF)
  const [distanceFilterEnabled, setDistanceFilterEnabled] = useState(false);
  const [distanceRadius, setDistanceRadius] = useState(2);

  const { location, error: locError, isLoading: loadingLocation, getLocation } = useGeolocation();

  // Sync URL params to state
  useEffect(() => {
    const q = searchParams.get('q') || '';
    const b = (searchParams.get('budget') || 'auto') as BudgetOption;
    if (q) {
      setSearchQuery(q);
      setInputValue(q);
    }
    setBudget(b);
  }, [searchParams]);

  const handleSearch = () => {
    if (inputValue.trim() !== '') {
      router.push(`/result?q=${encodeURIComponent(inputValue)}&budget=${budget}&refresh=true`);
    }
  };

  useEffect(() => {
    getLocation();
  }, [getLocation]);

  const [results, setResults] = useState<RecommendResult[]>(() => {
    if (typeof window === 'undefined') return [];
    const searchParams = new URLSearchParams(window.location.search);
    const q = searchParams.get('q');
    const isRefresh = searchParams.get('refresh') === 'true';
    if (q && !isRefresh) {
      const cached = sessionStorage.getItem(`last_results_${q}`);
      if (cached) {
        try {
          return JSON.parse(cached).results;
        } catch (e) {
          return [];
        }
      }
    }
    return [];
  });
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!searchQuery) return;
    
    const isRefresh = searchParams.get('refresh') === 'true';

    // If it's a refresh or first time, show loading
    if (isRefresh || !results.length) {
      setIsLoading(true);
    }

    // Attempt instant restore from cache ONLY if NOT a refresh
    if (!isRefresh) {
      const lastData = sessionStorage.getItem(`last_results_${searchQuery}`);
      if (lastData) {
        try {
          const data = JSON.parse(lastData);
          setResults(data.results);
          setFallbackApplied(data.fallback_applied || false);
          setFallbackReason(data.fallback_reason || '');
          setAppliedBudget(data.applied_budget ?? null);
          setFilteredCount(data.filtered_out_count || 0);
          setAllergyWarning(data.warning || '');
          setApiError(null);
          setIsLoading(false); 
          return;
        } catch (e) {
          console.error("Cache restore failed", e);
        }
      }
    } else {
      // If it IS a refresh, clean the URL immediately so "Back" won't trigger it again
      const newUrl = window.location.pathname + window.location.search.replace(/[&?]refresh=true/, '');
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchQuery, searchParams]);

  useEffect(() => {
    if (!location || !searchQuery) return;

    const fetchRecommendations = async () => {
      const isRefresh = searchParams.get('refresh') === 'true';
      const cacheKey = `search_${searchQuery}_${budget}_${location.lat}_${location.lng}`;
      const cachedData = sessionStorage.getItem(cacheKey);
      
      // Use cache ONLY if not a manual refresh
      if (cachedData && !isRefresh) {
        // NO DELAY for back navigation, show instantly
        const data = JSON.parse(cachedData);
        setResults(data.results);
        setFallbackApplied(data.fallback_applied || false);
        setFallbackReason(data.fallback_reason || '');
        setAppliedBudget(data.applied_budget ?? null);
        setFilteredCount(data.filtered_out_count || 0);
        setAllergyWarning(data.warning || '');
        setApiError(null);
        setIsLoading(false);
        return;
      }

      // If no cache or first time, show loading if not already restored
      if (results.length === 0 || isRefresh) {
        setIsLoading(true);
      }

      // If it's a refresh, we want a minimum delay to show the "AI Vibe"
      const startTime = Date.now();

      const token = localStorage.getItem('access_token');
      const userId = localStorage.getItem('user_id');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
        const res = await fetch(`${apiUrl}/api/v1/search/recommend`, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            query: searchQuery,
            lat: location.lat,
            lng: location.lng,
            user_id: userId || undefined,
            budget: budget === 'auto' ? undefined : parseInt(budget, 10),
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.results) {
            setResults(data.results);
            setFallbackApplied(data.fallback_applied || false);
            setFallbackReason(data.fallback_reason || '');
            setAppliedBudget(data.applied_budget ?? null);
            setFilteredCount(data.filtered_out_count || 0);
            setAllergyWarning(data.warning || '');
            setApiError(null);
            
            sessionStorage.setItem(cacheKey, JSON.stringify(data));
            sessionStorage.setItem(`last_results_${searchQuery}`, JSON.stringify(data));
            localStorage.setItem('last_search_url', window.location.pathname + window.location.search);
          }
        } else if (res.status === 401) {
          setApiError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        } else if (res.status === 503) {
          setApiError('Hệ thống AI đang khởi động, vui lòng đợi trong giây lát...');
        } else {
          setApiError('Hệ thống AI đang gặp sự cố. Vui lòng thử lại sau.');
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          setApiError('Quá thời gian kết nối (Timeout). Hệ thống AI có thể đang khởi động, vui lòng thử lại.');
        } else {
          setApiError('Không thể kết nối đến máy chủ. Hãy đảm bảo Backend đã được khởi động.');
        }
      } finally {
        clearTimeout(timeoutId);
        
        // Differentiated delay: 1.7s from home, 1.5s for refresh
        const isFromHome = searchParams.get('from') === 'home';
        const minWait = isFromHome ? 1700 : 1500;
        
        const elapsedTime = Date.now() - startTime;
        if (elapsedTime < minWait) {
          await new Promise(resolve => setTimeout(resolve, minWait - elapsedTime));
        }
        
        setIsLoading(false);
      }
    };

    fetchRecommendations();
  }, [location, searchQuery, budget]);

  // Client-side distance filter — no API re-fetch needed
  const displayResults = useMemo(() => {
    if (!distanceFilterEnabled) return results;
    return results.filter((r) => (r.distance_km ?? 0) <= distanceRadius);
  }, [results, distanceFilterEnabled, distanceRadius]);

  const heroItem = displayResults[0];
  const gridItems = displayResults.slice(1, 5);

  return (
    <div className={`flex min-h-screen bg-[#F7F8FA] dark:bg-gray-900 transition-colors duration-300 ${roboto.className}`}>
      {/* ══════════════════════════════════════════════════════════
          Sidebar
          ══════════════════════════════════════════════════════════ */}
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />

      {/* ── Main Content ── */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'ml-[80px]' : 'ml-[260px]'}`}>
        <Header showBack={false} />

        <main className="flex-1 px-4 md:px-8 py-8 overflow-y-auto">
          <div className="max-w-5xl mx-auto">
            {/* ── Budget + Distance filter bar (Synchronized with other blocks) ── */}
            {!isLoading && (
              <div className="mb-6 p-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl shadow-sm flex flex-wrap items-center gap-x-8 gap-y-4">
                <div className="pl-4">
                  <BudgetSelector
                    value={budget}
                    onChange={(newBudget) => {
                      setBudget(newBudget);
                      router.push(`/result?q=${encodeURIComponent(inputValue)}&budget=${newBudget}&refresh=true`);
                    }}
                  />
                </div>
                <DistanceFilter
                  enabled={distanceFilterEnabled}
                  onToggle={setDistanceFilterEnabled}
                  radius={distanceRadius}
                  onRadiusChange={setDistanceRadius}
                  totalCount={results.length}
                  filteredCount={displayResults.length}
                />
              </div>
            )}

            <AnimatePresence mode="wait">
              {isLoading ? (
                <LoadingState
                  searchQuery={searchQuery}
                  locError={locError}
                  getLocation={getLocation}
                />
              ) : (
                <motion.div
                  key="results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* ─── Title Section & Search Bar ─── */}
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-10 max-w-4xl mx-auto"
                  >
                    {/* [2] Hiển thị metadata: fallback_applied === true -> show banner cảnh báo kèm fallback_reason, applied_budget, applied_radius_km dạng badge */}
                    {fallbackApplied && (
                      <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20">
                        <Info className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-yellow-800 dark:text-yellow-200 leading-relaxed mb-2">
                            <strong>AI đã mở rộng phạm vi tìm kiếm:</strong> {fallbackReason || 'Không tìm thấy kết quả chính xác theo yêu cầu khắt khe, chúng tôi đã mở rộng phạm vi và ngân sách để gợi ý cho bạn!'}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {appliedBudget != null && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300">
                                💰 Ngân sách: {appliedBudget.toLocaleString('vi-VN')}đ
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    {/* [3] Hiển thị filtered_out_count và warning (allergy filter) nếu có */}
                    {filteredCount > 0 && (
                      <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20">
                        <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-orange-800 dark:text-orange-200 leading-relaxed">
                          <strong>Cảnh báo Dị ứng:</strong> {allergyWarning || `Đã loại ${filteredCount} quán có thành phần gây dị ứng để đảm bảo an toàn.`}
                        </p>
                      </div>
                    )}

                    {/* [4] Guest Notice: Redesigned to match reference image */}
                    {!isLoggedIn && showGuestNotice && (
                      <div className="mb-6 px-5 py-3 rounded-full bg-[#F0F7FF] dark:bg-blue-500/5 border border-[#E1EFFE] dark:border-blue-500/20 flex items-center gap-3 relative shadow-sm">
                        <Sparkles className="w-5 h-5 text-blue-500 flex-shrink-0" />
                        <p className="text-[13px] md:text-sm text-gray-600 dark:text-blue-200 pr-10 whitespace-nowrap">
                          Bạn đang tìm kiếm với tư cách khách.{" "}
                          <button
                            onClick={() => router.push('/auth')}
                            className="font-bold text-blue-600 dark:text-blue-400 underline hover:text-blue-700 transition-colors"
                          >
                            Đăng nhập ngay
                          </button>
                          {" "}để AI đề xuất món ăn chính xác theo khẩu vị và chế độ ăn của riêng bạn!
                        </p>
                        <button
                          onClick={() => setShowGuestNotice(false)}
                          className="absolute right-5 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-blue-300 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* [5] Thêm ô input tìm kiếm lại */}
                    <div className="flex flex-col gap-3 mb-5">
                      <div className="flex justify-between items-center px-1">
                        <button onClick={() => router.push('/')} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-orange-500 transition-colors">
                          <Home className="w-4 h-4" /> Quay lại trang chủ
                        </button>
                      </div>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Sparkles className="h-5 w-5 text-orange-500" />
                        </div>
                        <input
                          type="text"
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSearch();
                          }}
                          className="block w-full pl-11 pr-32 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl leading-5 bg-transparent placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-base transition-all shadow-sm group-hover:shadow-md dark:text-white"
                          placeholder="Bạn muốn ăn gì hôm nay?"
                        />
                        <div className="absolute inset-y-2 right-2">
                          <button
                            onClick={handleSearch}
                            className="flex items-center gap-2 px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm h-full"
                          >
                            <Search className="w-4 h-4" />
                            <span className="hidden sm:inline">Tìm lại</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* GPS Status */}
                    <div className="mt-5 flex justify-center text-sm">
                      {loadingLocation && (
                        <span className="text-orange-400 animate-pulse font-medium">Đang định vị GPS...</span>
                      )}
                      {locError && (
                        <span className="text-red-400 font-medium">
                          ⚠️ {locError}{' '}
                          <button onClick={getLocation} className="underline hover:text-red-300 ml-1">Thử lại</button>
                        </span>
                      )}
                      {location && !loadingLocation && !locError && (
                        <span className="text-teal-500 dark:text-teal-400 flex items-center gap-1.5 font-medium">
                          <MapPin className="w-4 h-4" /> Vị trí hiện tại: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                        </span>
                      )}
                    </div>
                  </motion.div>

                  {/* ─── Results ─── */}
                  {apiError ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-10 border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-950/10 rounded-3xl text-center"
                    >
                      <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Brain className="w-8 h-8 text-red-500" />
                      </div>
                      <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">
                        Lỗi kết nối
                      </h2>
                      <p className="text-red-500 dark:text-red-300/60 max-w-sm mx-auto mb-6">{apiError}</p>
                      <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all font-medium shadow-md"
                      >
                        Thử kết nối lại
                      </button>
                    </motion.div>
                  ) : results.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="py-20 text-center bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm"
                    >
                      <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Search className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">
                        Không tìm thấy món nào!
                      </h2>
                      <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-8 leading-relaxed">
                        Rất tiếc, AI không tìm thấy kết quả nào phù hợp với yêu cầu hiện tại. Thử thay đổi từ khóa hoặc mở rộng ngân sách xem sao nhé?
                      </p>
                      <button
                        onClick={() => {
                          setInputValue('');
                          setSearchQuery('');
                          document.querySelector('input')?.focus();
                        }}
                        className="px-6 py-2.5 bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-100 dark:hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-full transition-all font-semibold"
                      >
                        Thử tìm từ khóa khác
                      </button>
                    </motion.div>
                  ) : (
                    <>
                      {/* Hero Card #1 */}
                      {heroItem && <HeroResultCard item={heroItem} />}

                      {/* Small Cards Grid #2-#5 */}
                      {gridItems.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                          {gridItems.map((item, idx) => (
                            <SmallResultCard key={item.id || idx} item={item} index={idx} />
                          ))}
                        </div>
                      )}

                      {/* Feature Bar */}
                      <FeatureBar />
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
    MAIN RESULT PAGE (wraps client component in Suspense)
    ══════════════════════════════════════════════════════════ */
export default function ResultPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F7F8FA] dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400 animate-pulse font-medium">Đang tải dữ liệu...</div>
      </div>
    }>
      <ResultPageContent />
    </Suspense>
  );
}