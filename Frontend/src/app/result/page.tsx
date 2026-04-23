'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Sparkles,
  Heart,
  Bookmark,
  Brain,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { Roboto } from 'next/font/google';
import { useGeolocation } from '../../hooks/useGeolocation';
import { Header } from '../../components/ui/Header';
import { LoadingState } from '../../components/ui/LoadingState';

const roboto = Roboto({
  subsets: ['latin', 'vietnamese'],
  weight: ['300', '400', '500', '700', '900'],
});

/* ─────────────────────────────────────────────────────────────
   Tag helpers — derive tags from AI reason text
   ───────────────────────────────────────────────────────────── */
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

function getTagsForItem(item: any, index: number): VibeTag[] {
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
function HeroResultCard({ item }: { item: any }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
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
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1 tracking-tight">
            {item.name}
          </h2>

          {/* Restaurant Name */}
          {item.restaurantName && (
            <p className="text-base font-semibold text-orange-500 mb-4">
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
          <div className="w-full h-full rounded-2xl overflow-hidden relative">
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
function SmallResultCard({ item, index }: { item: any; index: number }) {
  const tags = getTagsForItem(item, index);
  const matchColor = getMatchColor(item.match);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg dark:hover:border-gray-600 transition-all duration-300 cursor-pointer group"
    >
      {/* Image */}
      <div className="relative h-[180px] overflow-hidden">
        <img
          src={item.img}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

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
        <h3 className="text-base font-bold text-gray-800 dark:text-white mb-0.5 group-hover:text-orange-500 transition-colors">
          {item.name}
        </h3>
        {item.restaurantName && (
          <p className="text-xs font-semibold text-orange-500 mb-2">{item.restaurantName}</p>
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
export default function ResultPage() {
  const searchParams = useSearchParams();
  const queryFromUrl = searchParams.get('q') || '';
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery] = useState(queryFromUrl || 'Tìm quán mì cay 7 cấp độ ở Làng Đại Học');
  const { location, error: locError, isLoading: loadingLocation, getLocation } = useGeolocation();

  useEffect(() => {
    getLocation();
  }, [getLocation]);

  const [results, setResults] = useState<any[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!location) return;

    const fetchRecommendations = async () => {
      setIsLoading(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
        const res = await fetch(`${apiUrl}/api/v1/search/recommend`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: searchQuery,
            lat: location.lat,
            lng: location.lng,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.results) {
            setResults(data.results);
            setApiError(null);
          }
        } else {
          setApiError('Hệ thống AI đang gặp sự cố. Vui lòng thử lại sau.');
        }
      } catch {
        setApiError('Không thể kết nối đến máy chủ. Hãy đảm bảo Backend đã được khởi động.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendations();
  }, [location, searchQuery]);

  const heroItem = results[0];
  const gridItems = results.slice(1, 5);

  return (
    <div className={`flex min-h-screen bg-[#F7F8FA] dark:bg-gray-900 transition-colors duration-300 ${roboto.className}`}>
      {/* ══════════════════════════════════════════════════════════
          [HIDDEN] Sidebar — Uncomment khi các trang con hoạt động
          ══════════════════════════════════════════════════════════ */}
      {/* <Sidebar /> */}

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col">
        <Header showBack={true} />

        <main className="flex-1 px-6 md:px-10 py-8 overflow-y-auto">
          <div className="max-w-5xl mx-auto">
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
                  transition={{ duration: 0.5 }}
                >
                  {/* ─── Title Section ─── */}
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-10"
                  >
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-orange-50 dark:bg-orange-500/20 mb-5">
                      <Sparkles className="w-7 h-7 text-orange-500" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight">
                      Here is your <span className="text-orange-500">Culinary Vibe</span> today! ✨
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
                      AI has analyzed your mood, location, and preferences.
                    </p>

                    {/* GPS Status */}
                    <div className="mt-4 flex justify-center text-sm">
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
                          <MapPin className="w-4 h-4" /> GPS: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
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