'use client';

import React, { useState, useEffect, Suspense, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Sparkles,
  Heart,
  Bookmark,
  Brain,
  ShieldCheck,
  Search,
  AlertTriangle,
  Info,
  Home,
  X,
  Route,
} from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { LoadingState } from '../../components/ui/LoadingState';
import { BudgetSelector, type BudgetOption } from '../../components/BudgetSelector';
import { DistanceFilter } from '../../components/DistanceFilter';
import { SearchLoadingOverlay } from '../../components/ui/SearchLoadingOverlay';
import { SearchBar } from '../../components/SearchBar';
import { useSearchState, SearchMode } from '../../hooks/useSearchState';
import { favoriteService } from '../../services/favoriteService';
import { collectionService } from '../../services/collectionService';
import { historyService } from '../../services/historyService';
import { AddToCollectionModal } from '../../components/AddToCollectionModal';
import { toast } from 'sonner';
import { interactionService } from '../../services/interactionService';
import { useOptimizedLocation } from '../../hooks/useOptimizedLocation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { addItem, removeItem } from '../../store/slices/itinerarySlice';

export interface AllergenDishWarning {
  dish_name: string;
  matched_allergens: string[];
}
export interface RecommendResult {
  id: string;
  name: string;
  match: string;
  dist: string;
  distance_km?: number;
  lat?: number;
  lng?: number;
  price: string;
  rating: string;
  reason: string;
  img: string;
  total_reviews?: number;
  tags?: string[];
  restaurantName?: string;
  google_maps_url?: string;
  allergen_warning?: AllergenDishWarning[];
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
  { label: 'Popular', emoji: '⭐', bgLight: 'bg-amber-50', bgDark: 'dark:bg-brand/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-100 dark:border-amber-500/20' },
  { label: 'Cheap', emoji: '💰', bgLight: 'bg-green-50', bgDark: 'dark:bg-green-500/10', text: 'text-green-600 dark:text-green-400', border: 'border-green-100 dark:border-green-500/20' },
  { label: 'Classic', emoji: '🏛️', bgLight: 'bg-brand-muted', bgDark: 'dark:bg-brand/10', text: 'text-brand-hover dark:text-[#E6DFD5]', border: 'border-teal-100 dark:border-brand/20' },
  { label: 'Trendy', emoji: '🔥', bgLight: 'bg-violet-50', bgDark: 'dark:bg-violet-500/10', text: 'text-violet-500 dark:text-violet-400', border: 'border-violet-100 dark:border-violet-500/20' },
  { label: 'Local', emoji: '📍', bgLight: 'bg-brand-muted', bgDark: 'dark:bg-brand/10', text: 'text-brand dark:text-[#E8735A]', border: 'border-brand-muted dark:border-brand/20' },
];

const DEFAULT_TAG_STYLES = [
  { emoji: '🏷️', bgLight: 'bg-gray-50', bgDark: 'dark:bg-gray-500/10', text: 'text-gray-600 dark:text-[#9A8A7A]', border: 'border-gray-200 dark:border-gray-500/20' },
  { emoji: '✨', bgLight: 'bg-brand-muted', bgDark: 'dark:bg-brand/10', text: 'text-brand-hover dark:text-[#E6DFD5]', border: 'border-indigo-100 dark:border-indigo-500/20' },
  { emoji: '🌿', bgLight: 'bg-emerald-50', bgDark: 'dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-100 dark:border-emerald-500/20' }
];

function getTagsForItem(item: RecommendResult, index: number): VibeTag[] {
  if (item.tags && Array.isArray(item.tags) && item.tags.length > 0) {
    return item.tags.map((t: string, i: number) => {
      const found = VIBE_TAGS.find(v => v.label.toLowerCase() === t.toLowerCase());
      if (found) return found;
      const defaultStyle = DEFAULT_TAG_STYLES[i % DEFAULT_TAG_STYLES.length];
      return {
        label: t,
        ...defaultStyle
      };
    });
  }
  return [];
}

function getMatchColor(match: string): string {
  const num = parseInt(match);
  if (num >= 95) return 'bg-green-500';
  if (num >= 90) return 'bg-green-500/90';
  if (num >= 85) return 'bg-yellow-500';
  return 'bg-brand';
}

/* ─────────────────────────────────────────────────────────────
   Hero Result Card (#1 — AI TOP PICK)
   ───────────────────────────────────────────────────────────── */
function HeroResultCard({ item, sessionId, searchMode, onAddCollection, isModalOpen }: { item: RecommendResult; sessionId?: string; searchMode?: SearchMode; onAddCollection: (item: RecommendResult) => void; isModalOpen: boolean }) {
  const router = useRouter();
  const generateSlug = (name: string) => {
    return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const handleNavigate = () => {
    const params = new URLSearchParams();
    if (sessionId) params.set('session_id', sessionId);
    if (searchMode) params.set('mode', searchMode);
    const qs = params.toString();

    // Log interaction before navigating
    interactionService.logInteraction({
      res_id: item.id,
      action_type: "CLICK_SEARCH_RESULT",
      search_session_id: sessionId || undefined,
      metadata: { source: "hero_card" }
    });

    // [FIX-CONFLICT]: Ẩn ID nhà hàng vào sessionStorage thay vì để Base64 trên URL
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('current_res_id', item.id);
      sessionStorage.setItem('came_from_search', 'true');
    }
    const slug = generateSlug(item.name) || 'restaurant';
    router.push(`/restaurant/${slug}`);
  };

  const [isFav, setIsFav] = useState(false);
  const [isInColl, setIsInColl] = useState(false);
  const userId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null;

  const dispatch = useDispatch();
  const itineraryItems = useSelector((state: RootState) => state.itinerary.items);
  const isInItinerary = itineraryItems.some(i => i.id === item.id);

  const toggleItinerary = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isInItinerary) {
      dispatch(removeItem(item.id));
      toast.success('Đã xóa khỏi lộ trình');
    } else {
      dispatch(addItem({
        id: item.id,
        name: item.name,
        lat: item.lat,
        lng: item.lng,
        address: item.restaurantName || item.reason || '',
        img: item.img,
        rating: item.rating,
        price: item.price,
        reason: item.reason,
        google_maps_url: item.google_maps_url
      }));
      toast.success('Đã thêm vào lộ trình', {
        action: {
          label: 'Xem',
          onClick: () => router.push('/itinerary')
        }
      });
    }
  };

  useEffect(() => {
    if (userId) {
      setIsFav(favoriteService.isFavorite(userId, item.name));
      setIsInColl(collectionService.isInAnyCollection(userId, item.name));
    }
  }, [userId, item.name]);

  useEffect(() => {
    if (userId && !isModalOpen) {
      setIsInColl(collectionService.isInAnyCollection(userId, item.name));
    }
  }, [isModalOpen, userId, item.name]);

  const toggleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) {
      toast.error('Vui lòng đăng nhập để lưu yêu thích');
      return;
    }
    if (isFav) {
      favoriteService.removeFavorite(userId, item.name);
      setIsFav(false);
      toast.success('Đã xóa khỏi yêu thích');

      interactionService.logInteraction({
        res_id: item.id,
        action_type: "REMOVE_RESTAURANT",
        metadata: { restaurant_name: item.name, source_type: "favorite" }
      });
    } else {
      favoriteService.addFavorite(userId, item);
      setIsFav(true);
      toast.success('Đã thêm vào yêu thích');

      interactionService.logInteraction({
        res_id: item.id,
        action_type: "LIKE_RESTAURANT",
        metadata: { restaurant_name: item.name }
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white dark:bg-[#3D312A] rounded-3xl border border-gray-100 dark:border-[#4D3D32] shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg dark:hover:border-gray-600 transition-all duration-300 mb-8"
    >
      <div className="flex flex-col md:flex-row min-h-[340px]">
        {/* Left: Info */}
        <div className="flex-1 p-8 md:p-10 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand-muted dark:bg-brand/20 text-brand-hover dark:text-[#E6DFD5]">
              <Sparkles className="w-3.5 h-3.5" /> AI TOP PICK
            </span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
              (!isNaN(parseInt(item.match)) && parseInt(item.match) >= 90)
                ? 'bg-green-500 text-white'
                : 'bg-brand-muted dark:bg-brand/15 text-brand-hover dark:text-[#E6DFD5]'
            }`}>
              🤖 {/^\d+%?$/.test(item.match) ? `${item.match} Match` : item.match}
            </span>
            {item.allergen_warning && item.allergen_warning.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">
                <AlertTriangle className="w-3.5 h-3.5" /> {item.allergen_warning.length} món cần lưu ý
              </span>
            )}
          </div>

          <h2
            onClick={handleNavigate}
            className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-[#E6DFD5] mb-2 leading-tight cursor-pointer hover:text-brand transition-colors"
          >
            {item.name}
          </h2>

          {item.restaurantName && (
            <p className="text-base font-semibold text-brand dark:text-[#E8735A] mb-4 cursor-pointer hover:text-brand-hover transition-colors" onClick={handleNavigate}>
              {item.restaurantName}
            </p>
          )}

          {item.dist && (
            <div className="mb-5 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-brand-muted dark:bg-brand/15 text-brand-hover dark:text-[#E6DFD5] border border-brand/30 dark:border-brand/30">
                <MapPin className="w-3.5 h-3.5" /> {item.dist}
              </span>
              {item.total_reviews !== undefined && item.total_reviews > 0 && (
                <span className="text-xs text-gray-400 dark:text-[#7A6A5A] font-medium">
                  ({item.total_reviews} đánh giá)
                </span>
              )}
            </div>
          )}

          {item.reason && (
            <p className="text-sm text-gray-500 dark:text-[#9A8A7A] leading-relaxed mb-6 max-w-md">
              {item.reason}
            </p>
          )}

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
            onClick={handleNavigate}
            className="w-full h-full rounded-2xl overflow-hidden relative cursor-pointer"
          >
            <img
              src={item.img}
              alt={item.name}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
            />
          </div>
          <div className="absolute top-6 right-6 flex gap-2">
            <button
              onClick={toggleItinerary}
              className={`w-10 h-10 rounded-full bg-white/90 dark:bg-[#2A2420]/80 border border-gray-200 dark:border-[#4D3D32] flex items-center justify-center hover:scale-110 transition-all cursor-pointer shadow-sm ${isInItinerary ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-500/30' : ''}`}
              title={isInItinerary ? "Xóa khỏi lộ trình" : "Thêm vào lộ trình"}
            >
              <Route className={`w-5 h-5 ${isInItinerary ? 'text-orange-500 fill-current' : 'text-gray-400'}`} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                // [FIX-CONFLICT]: Ngăn không cho mở Modal nếu món ăn đã có trong bộ sưu tập (tránh thêm trùng lặp), hiển thị toast với icon Bookmark
                if (isInColl) {
                  toast.info("Món ăn này đã có trong bộ sưu tập của bạn.", {
                    icon: <Bookmark className="w-4 h-4" />
                  });
                  return;
                }
                onAddCollection(item);
              }}
              className={`w-10 h-10 rounded-full bg-white/90 dark:bg-[#2A2420]/80 border border-gray-200 dark:border-[#4D3D32] flex items-center justify-center hover:scale-110 transition-all cursor-pointer shadow-sm ${isInColl ? 'hover:bg-yellow-50' : 'hover:bg-brand-muted'}`}
              title={isInColl ? "Đã có trong bộ sưu tập" : "Thêm vào bộ sưu tập"}
            >
              <Bookmark className={`w-5 h-5 ${isInColl ? 'text-yellow-500 fill-current' : 'text-brand dark:text-[#E8735A]'}`} />
            </button>
            <button
              onClick={toggleFav}
              className="w-10 h-10 rounded-full bg-white/90 dark:bg-[#2A2420]/80 border border-gray-200 dark:border-[#4D3D32] flex items-center justify-center hover:scale-110 transition-all cursor-pointer shadow-sm"
            >
              <Heart className={`w-5 h-5 ${isFav ? 'text-red-500 fill-current' : 'text-gray-400'}`} />
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
// [FIX-CONFLICT]: Tương tự HeroResultCard, bổ sung prop isModalOpen và state isInColl cho SmallResultCard
function SmallResultCard({ item, index, sessionId, searchMode, onAddCollection, isModalOpen }: { item: RecommendResult; index: number; sessionId?: string; searchMode?: SearchMode; onAddCollection: (item: RecommendResult) => void; isModalOpen: boolean }) {
  const router = useRouter();
  const tags = getTagsForItem(item, index);
  const matchColor = getMatchColor(item.match);

  const generateSlug = (name: string) => {
    return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const handleNavigate = () => {
    const params = new URLSearchParams();
    if (sessionId) params.set('session_id', sessionId);
    if (searchMode) params.set('mode', searchMode);
    const qs = params.toString();

    // Log interaction before navigating
    interactionService.logInteraction({
      res_id: item.id,
      action_type: "CLICK_SEARCH_RESULT",
      search_session_id: sessionId || undefined,
      metadata: { source: "small_card", rank: index + 2 }
    });

    // [FIX-CONFLICT]: Ẩn ID nhà hàng vào sessionStorage thay vì để Base64 trên URL
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('current_res_id', item.id);
      sessionStorage.setItem('came_from_search', 'true');
    }
    const slug = generateSlug(item.name) || 'restaurant';
    router.push(`/restaurant/${slug}`);
  };

  const [isFav, setIsFav] = useState(false);
  const [isInColl, setIsInColl] = useState(false);
  const userId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null;

  const dispatch = useDispatch();
  const itineraryItems = useSelector((state: RootState) => state.itinerary.items);
  const isInItinerary = itineraryItems.some(i => i.id === item.id);

  const toggleItinerary = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isInItinerary) {
      dispatch(removeItem(item.id));
      toast.success('Đã xóa khỏi lộ trình');
    } else {
      dispatch(addItem({
        id: item.id,
        name: item.name,
        lat: item.lat,
        lng: item.lng,
        address: item.restaurantName || item.reason || '',
        img: item.img,
        rating: item.rating,
        price: item.price,
        reason: item.reason,
        google_maps_url: item.google_maps_url
      }));
      toast.success('Đã thêm vào lộ trình', {
        action: {
          label: 'Xem',
          onClick: () => router.push('/itinerary')
        }
      });
    }
  };

  useEffect(() => {
    if (userId) {
      setIsFav(favoriteService.isFavorite(userId, item.name));
      setIsInColl(collectionService.isInAnyCollection(userId, item.name));
    }
  }, [userId, item.name]);

  useEffect(() => {
    if (userId && !isModalOpen) {
      setIsInColl(collectionService.isInAnyCollection(userId, item.name));
    }
  }, [isModalOpen, userId, item.name]);

  const toggleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) {
      toast.error('Vui lòng đăng nhập để lưu yêu thích');
      return;
    }
    if (isFav) {
      favoriteService.removeFavorite(userId, item.name);
      setIsFav(false);
      toast.success('Đã xóa khỏi yêu thích');

      interactionService.logInteraction({
        res_id: item.id,
        action_type: "REMOVE_RESTAURANT",
        metadata: { restaurant_name: item.name, source_type: "favorite" }
      });
    } else {
      favoriteService.addFavorite(userId, item);
      setIsFav(true);
      toast.success('Đã thêm vào yêu thích');

      interactionService.logInteraction({
        res_id: item.id,
        action_type: "LIKE_RESTAURANT",
        metadata: { restaurant_name: item.name }
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white dark:bg-[#3D312A] rounded-2xl border border-gray-100 dark:border-[#4D3D32] shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg dark:hover:border-gray-600 transition-all duration-300 cursor-pointer group"
      onClick={handleNavigate}
    >
      <div className="relative h-[180px] overflow-hidden">
        <img
          src={item.img}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />

        <span className="absolute top-3 left-3 inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold bg-gray-700/90 text-white backdrop-blur-sm">
          {index + 2}
        </span>

        {/* Heart, Bookmark & Route */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          <button
            onClick={toggleItinerary}
            className={`w-8 h-8 rounded-full bg-white/90 dark:bg-[#2A2420]/80 flex items-center justify-center hover:scale-110 transition-all cursor-pointer shadow-sm ${isInItinerary ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-500/30' : ''}`}
            title={isInItinerary ? "Xóa khỏi lộ trình" : "Thêm vào lộ trình"}
          >
            <Route className={`w-4 h-4 ${isInItinerary ? 'text-orange-500 fill-current' : 'text-gray-400'}`} />
          </button>
          <button
            onClick={toggleFav}
            className="w-8 h-8 rounded-full bg-white/90 dark:bg-[#2A2420]/80 flex items-center justify-center hover:scale-110 transition-all cursor-pointer shadow-sm"
            title="Lưu yêu thích"
          >
            <Heart className={`w-4 h-4 ${isFav ? 'text-red-500 fill-current' : 'text-gray-400'}`} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              // [FIX-CONFLICT]: Ngăn không cho mở Modal nếu món ăn đã có trong bộ sưu tập (tránh thêm trùng lặp), hiển thị toast với icon Bookmark
              if (isInColl) {
                toast.info("Món ăn này đã có trong bộ sưu tập của bạn.", {
                  icon: <Bookmark className="w-4 h-4" />
                });
                return;
              }
              onAddCollection(item);
            }}
            className={`w-8 h-8 rounded-full bg-white/90 dark:bg-[#2A2420]/80 flex items-center justify-center hover:scale-110 transition-all cursor-pointer shadow-sm ${isInColl ? 'hover:bg-yellow-50' : 'hover:bg-brand-muted'}`}
            title={isInColl ? "Đã có trong bộ sưu tập" : "Thêm vào bộ sưu tập"}
          >
            <Bookmark className={`w-4 h-4 ${isInColl ? 'text-yellow-500 fill-current' : 'text-brand dark:text-[#E8735A]'}`} />
          </button>
        </div>

        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${matchColor} text-white whitespace-nowrap`}>
            🤖 {/^\d+%?$/.test(item.match) ? `${item.match} Match` : item.match}
          </span>
          {item.allergen_warning && item.allergen_warning.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500 text-white shadow-sm border border-amber-600">
              ⚠️ {item.allergen_warning.length} lưu ý
            </span>
          )}
          {item.dist && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-white/90 dark:bg-[#2A2420]/80 text-brand-hover dark:text-[#E6DFD5] backdrop-blur-sm whitespace-nowrap">
              📍 {item.dist}
            </span>
          )}
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-base font-bold text-gray-800 dark:text-[#E6DFD5] mb-0.5 transition-colors cursor-pointer group-hover:text-brand">
          {item.name}
        </h3>
        {item.restaurantName && (
          <p className="text-xs font-semibold text-brand dark:text-[#E8735A] mb-2">
            {item.restaurantName}
          </p>
        )}
        {item.reason && (
          <p className="text-xs text-gray-500 dark:text-[#9A8A7A] leading-relaxed mb-3 line-clamp-2">
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


function FeatureBar() {
  const features = [
    { icon: Sparkles, bg: 'bg-brand-muted dark:bg-brand/20', color: 'text-brand dark:text-[#E8735A]', title: 'AI-Powered Recommendations', desc: 'Personalized just for you' },
    { icon: MapPin, bg: 'bg-red-100 dark:bg-red-500/20', color: 'text-red-500', title: 'Near Your Location', desc: 'Real-time GPS results' },
    { icon: Heart, bg: 'bg-pink-100 dark:bg-pink-500/20', color: 'text-pink-500', title: 'Based on Your Vibes', desc: 'Mood, weather & preferences' },
    { icon: ShieldCheck, bg: 'bg-green-100 dark:bg-green-500/20', color: 'text-green-500', title: 'Safe & Trusted', desc: 'Quality restaurants only' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="bg-white dark:bg-[#3D312A] rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-[#4D3D32] px-6 py-5 mt-10"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map(feat => (
          <div key={feat.title} className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${feat.bg} flex items-center justify-center flex-shrink-0`}>
              <feat.icon className={`w-5 h-5 ${feat.color}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-[#C8BFB0]">{feat.title}</p>
              <p className="text-xs text-gray-400">{feat.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function ResultPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  let sessionIdFromUrl = searchParams.get('session_id') || '';
  // [FIX-CONFLICT]: Lấy session_id từ sessionStorage (nếu URL không có) vì ta đã giấu nó đi
  if (typeof window !== 'undefined' && !sessionIdFromUrl) {
    sessionIdFromUrl = sessionStorage.getItem('current_search_session_id') || '';
  }

  const coords = useSelector((state: RootState) => state.location.coords);
  const lastSearchCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  // Check for cache instantly to avoid flicker
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window === 'undefined') return true;
    const searchParams = new URLSearchParams(window.location.search);
    const q = searchParams.get('q');
    let sessionId = searchParams.get('session_id');
    if (!sessionId) {
      sessionId = sessionStorage.getItem('current_search_session_id');
    }
    const isRefresh = searchParams.get('refresh') === 'true';
    if (sessionId && !isRefresh) {
      if (sessionStorage.getItem(`session_data_${sessionId}`)) return false;
    }
    if (q && !isRefresh) {
      return !sessionStorage.getItem(`last_results_${q}`);
    }
    return true;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const { query: inputValue, setQuery: setInputValue, searchMode, setSearchMode } = useSearchState("");
  const [budget, setBudget] = useState<BudgetOption>('auto');
  const { getOptimizedLocation } = useOptimizedLocation();

  const [fallbackApplied, setFallbackApplied] = useState(false);
  const [fallbackReason, setFallbackReason] = useState<string>('');
  const [appliedBudget, setAppliedBudget] = useState<number | null>(null);

  const [filteredCount, setFilteredCount] = useState(0);
  const [allergenFlaggedCount, setAllergyFlaggedCount] = useState(0);
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

  const [showGuestNotice, setShowGuestNotice] = useState(true);

  const [distanceFilterEnabled, setDistanceFilterEnabled] = useState(false);
  const [distanceRadius, setDistanceRadius] = useState(2);

  const [collectionModalItem, setCollectionModalItem] = useState<RecommendResult | null>(null);

  const [results, setResults] = useState<RecommendResult[]>(() => {
    if (typeof window === 'undefined') return [];
    const searchParams = new URLSearchParams(window.location.search);
    let sessionId = searchParams.get('session_id');
    if (!sessionId) {
      sessionId = sessionStorage.getItem('current_search_session_id');
    }
    if (sessionId) {
      const cached = sessionStorage.getItem(`session_data_${sessionId}`);
      if (cached) return JSON.parse(cached).results || [];
    }
    return [];
  });
  const [apiError, setApiError] = useState<string | null>(null);

  const [isSearching, setIsSearching] = useState(false);
  const [searchLoadingMsg, setSearchLoadingMsg] = useState("Đang phân tích sở thích của bạn...");

  useEffect(() => {
    if (!sessionIdFromUrl) {
      setIsLoading(false);
      return;
    }

    const loadSession = async () => {
      // [FIX-CONFLICT]: Thêm logic Cache (sessionStorage) để lấy dữ liệu có sẵn, giúp chuyển trang không bị giật/flash loading state
      const cached = sessionStorage.getItem(`session_data_${sessionIdFromUrl}`);
      if (cached) {
        const data = JSON.parse(cached);
        setSearchQuery(data.query);
        setInputValue(data.query);
        setResults(data.results || []);
        setFallbackApplied(data.fallback_applied || false);
        setFallbackReason(data.fallback_reason || '');
        setAppliedBudget(data.applied_budget ?? null);
        setFilteredCount(data.filtered_out_count || 0);
        setAllergyFlaggedCount(data.allergen_flagged_count || 0);
        setAllergyWarning(data.warning || '');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setApiError(null);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${apiUrl}/api/v1/search/sessions/${sessionIdFromUrl}`, {
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) {
          const data = await res.json();
          sessionStorage.setItem(`session_data_${sessionIdFromUrl}`, JSON.stringify(data));
          setSearchQuery(data.query);
          setInputValue(data.query);
          setResults(data.results || []);
          setFallbackApplied(data.fallback_applied || false);
          setFallbackReason(data.fallback_reason || '');
          setAppliedBudget(data.applied_budget ?? null);
          setFilteredCount(data.filtered_out_count || 0);
          setAllergyFlaggedCount(data.allergen_flagged_count || 0);
          setAllergyWarning(data.warning || '');
        } else if (res.status === 404) {
          setApiError('Không tìm thấy phiên tìm kiếm. Link có thể đã hết hạn hoặc không tồn tại.');
        } else {
          setApiError('Lỗi khi tải kết quả. Vui lòng thử lại.');
        }
      } catch (err) {
        console.error("Load session error:", err);
        setApiError('Không thể kết nối đến máy chủ.');
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, [sessionIdFromUrl, setInputValue]);

  // Sync coords ref when coords are initially fetched/loaded
  useEffect(() => {
    if (coords && !lastSearchCoordsRef.current) {
      lastSearchCoordsRef.current = coords;
    }
  }, [coords]);

  // Listen for manual/auto location updates to refresh search results
  useEffect(() => {
    if (!coords) return;

    // If ref is not initialized, set it and do not trigger search
    if (!lastSearchCoordsRef.current) {
      lastSearchCoordsRef.current = coords;
      return;
    }

    // Check if coordinates have actually changed
    const coordsChanged =
      coords.lat !== lastSearchCoordsRef.current.lat ||
      coords.lng !== lastSearchCoordsRef.current.lng;

    if (coordsChanged && searchQuery) {
      // Update ref to prevent multiple triggers for the same coordinates
      lastSearchCoordsRef.current = coords;
      // Re-run the search with the new coordinates
      handleSearch(searchQuery);
    }
  }, [coords, searchQuery]);

  const handleSearch = async (overrideQuery?: string, overrideBudget?: BudgetOption) => {
    const finalQuery = (overrideQuery ?? inputValue).trim();
    const finalBudget = overrideBudget ?? budget;

    if (finalQuery === '') return;

    setIsSearching(true);
    setApiError(null);

    try {
      setSearchLoadingMsg("Đang xác định vị trí của bạn...");

      const gps = await getOptimizedLocation();
      if (!gps) {
        setApiError("Không thể xác định vị trí thực tế của bạn. Vui lòng kiểm tra quyền truy cập GPS để tiếp tục.");
        setIsSearching(false);
        return;
      }

      setSearchLoadingMsg("AI đang phân tích khẩu vị của bạn...");
      const token = localStorage.getItem('access_token');
      const userId = localStorage.getItem('user_id');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      const res = await fetch(`${apiUrl}/api/v1/search/recommend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: finalQuery,
          lat: gps.lat,
          lng: gps.lng,
          user_id: userId || undefined,
          budget: finalBudget === 'auto' ? undefined : parseInt(finalBudget, 10),
          search_mode: searchMode,
          top_k: 24, // Xin dư ra 24 món để bù trừ khi lọc trùng tên
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (userId) {
          historyService.addHistory(
            userId,
            finalQuery,
            finalBudget,
            Array.isArray(data.results) ? data.results.length : undefined,
            data.session_id,
            searchMode
          );
        }
        setSearchLoadingMsg("Đã có kết quả mới! Đang chuẩn bị...");
        // [FIX-CONFLICT]: Ẩn session_id và mode vào sessionStorage, đẩy query q lên URL
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('current_search_session_id', data.session_id);
          sessionStorage.setItem('current_search_mode', searchMode);
        }
        window.location.href = `/result?q=${encodeURIComponent(finalQuery)}`;
      } else {
        throw new Error("Không thể kết nối với hệ thống AI.");
      }
    } catch (err: any) {
      const msg = err?.message || "Lỗi kết nối AI. Vui lòng thử lại.";
      setApiError(msg);
    } finally {
      setIsSearching(false);
    }
  };

  const displayResults = useMemo(() => {
    let filtered = results;
    if (distanceFilterEnabled) {
      filtered = filtered.filter((r) => (r.distance_km ?? 0) <= distanceRadius);
    }

    // [FIX-CONFLICT]: Thêm logic lọc bỏ các kết quả bị trùng lặp tên (remove duplicates by name) để hiển thị danh sách sạch hơn
    const seen = new Set();
    const unique = filtered.filter(item => {
      if (!item.name) return true;
      const duplicate = seen.has(item.name);
      seen.add(item.name);
      return !duplicate;
    });

    // Cắt lấy đúng 16 món để hiển thị (1 hero + 15 small)
    return unique.slice(0, 16);
  }, [results, distanceFilterEnabled, distanceRadius]);

  const heroItem = displayResults[0];
  const gridItems = displayResults.slice(1);

  return (
    <AppShell>
      {isSearching && <SearchLoadingOverlay message={searchLoadingMsg} />}

      <div className="border-b border-[#E6DFD5]/60 dark:border-[#3D312A]/60 bg-[#FDFBF7]/80 dark:bg-[#2A2420]/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex flex-wrap items-center gap-x-4 gap-y-3">
          <BudgetSelector
            value={budget}
            onChange={(newBudget) => {
              setBudget(newBudget);
              handleSearch(inputValue, newBudget);
            }}
          />
          <DistanceFilter
            enabled={distanceFilterEnabled}
            onToggle={setDistanceFilterEnabled}
            radius={distanceRadius}
            onRadiusChange={setDistanceRadius}
            totalCount={results.length}
            filteredCount={displayResults.length}
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12 w-full">
        <AnimatePresence mode="wait">
          {(!mounted || isLoading) ? (
            <LoadingState
              searchQuery={searchQuery}
              locError={null}
              getLocation={() => { }}
            />
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-10 max-w-4xl mx-auto"
              >
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
                {allergenFlaggedCount > 0 && (
                  <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 shadow-sm">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed">
                      <strong>Lưu ý Dị ứng:</strong> Có {allergenFlaggedCount} quán ăn có chứa thành phần gây dị ứng cho bạn. AI đã đánh dấu rõ <strong>"⚠️ Cảnh báo"</strong> trên từng quán để bạn dễ dàng nhận biết.
                    </p>
                  </div>
                )}

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

                <div className="flex flex-col gap-3 mb-5">
                  <div className="flex justify-between items-center px-1">
                    <button onClick={() => router.push('/')} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-brand transition-colors">
                      <Home className="w-4 h-4" /> Quay lại trang chủ
                    </button>
                  </div>
                  <div className="relative group flex">
                    <SearchBar
                      query={inputValue}
                      setQuery={setInputValue}
                      searchMode={searchMode}
                      setSearchMode={setSearchMode}
                      onSearch={() => handleSearch()}
                      compact={true}
                    />
                  </div>
                </div>
              </motion.div>

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
                  className="py-20 text-center bg-white dark:bg-[#3D312A] rounded-3xl border border-gray-100 dark:border-[#4D3D32] shadow-sm"
                >
                  <div className="w-20 h-20 bg-gray-50 dark:bg-[#2A2420] rounded-full flex items-center justify-center mx-auto mb-6">
                    <Search className="w-10 h-10 text-gray-400 dark:text-[#7A6A5A]" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-[#E6DFD5] mb-3">
                    Không tìm thấy món nào!
                  </h2>
                  <p className="text-gray-500 dark:text-[#9A8A7A] max-w-md mx-auto mb-8 leading-relaxed">
                    Rất tiếc, AI không tìm thấy kết quả nào phù hợp với yêu cầu hiện tại. Thử thay đổi từ khóa hoặc mở rộng ngân sách xem sao nhé?
                  </p>
                  <button
                    onClick={() => {
                      setInputValue('');
                      setSearchQuery('');
                      document.querySelector('input')?.focus();
                    }}
                    className="px-6 py-2.5 bg-brand-muted dark:bg-brand/10 hover:bg-brand-muted dark:hover:bg-brand/20 text-brand-hover dark:text-[#E6DFD5] rounded-full transition-all font-semibold"
                  >
                    Thử tìm từ khóa khác
                  </button>
                </motion.div>
              ) : (
                <>
                  {/* Hero Card #1 */}
                  {heroItem && <HeroResultCard item={heroItem} sessionId={sessionIdFromUrl} searchMode={searchMode} onAddCollection={setCollectionModalItem} isModalOpen={!!collectionModalItem} />}

                  {/* Small Cards Grid #2+ */}
                  {gridItems.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {gridItems.map((item, idx) => (
                        <SmallResultCard key={item.id || idx} item={item} index={idx} sessionId={sessionIdFromUrl} searchMode={searchMode} onAddCollection={setCollectionModalItem} isModalOpen={!!collectionModalItem} />
                      ))}
                    </div>
                  )}

                  <FeatureBar />
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <AddToCollectionModal
        isOpen={!!collectionModalItem}
        onClose={() => setCollectionModalItem(null)}
        item={collectionModalItem}
      />
    </AppShell>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white dark:bg-[#2A2420] flex items-center justify-center">
        <div className="text-[#9A8A7A] dark:text-[#7A6A5A] animate-pulse font-medium">Đang tải dữ liệu...</div>
      </div>
    }>
      <ResultPageContent />
    </Suspense>
  );
}
