'use client';

import React, { useState, useEffect, Suspense, useMemo, useRef, useCallback } from 'react';
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
  Map as MapIcon,
  LogOut,
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-react';
import { AppShell } from '../../components/AppShell';
import { LoadingState } from '../../components/ui/LoadingState';
import { BudgetSelector, type BudgetOption, budgetToRange } from '../../components/BudgetSelector';
import { makeAuthenticatedRequest } from "../utils/apiClient";
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
import { setRawResults } from '../../store/slices/searchSlice';
import { SortSelector, type SortOption } from '../../components/SortSelector';
import { AdvancedFilters, type AdvancedFilterState } from '../../components/AdvancedFilters';
import { ResultMapView, type MapViewport } from '../../components/ResultMapView';
import { useLanguage } from '../../components/LanguageProvider';

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
  is_vegetarian?: boolean;
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

const RESULT_TAG_LABELS_EN: Record<string, string> = {
  'trà sữa': 'milk tea',
  'bò': 'beef',
  'đánh giá cao': 'highly rated',
  'cao cấp': 'premium',
  'cà phê': 'coffee',
  'mở khuya': 'open late',
  'hải sản': 'seafood',
  'nướng': 'grill',
  'gà': 'chicken',
  'heo': 'pork',
  'cơm': 'rice',
  'phở': 'pho',
  'bún': 'vermicelli',
  'mì': 'noodles',
  'lẩu': 'hotpot',
  'món chay': 'vegetarian',
  'giá rẻ': 'budget',
  'tầm trung': 'mid-range',
};

function translateResultTag(label: string, language: 'vi' | 'en') {
  return language === 'en' ? RESULT_TAG_LABELS_EN[label.toLowerCase()] || label : label;
}

function translateResultReason(reason: string, language: 'vi' | 'en') {
  if (language !== 'en') return reason;
  return reason
    .replace(/Đánh giá xuất sắc/g, 'Excellent rating')
    .replace(/Đánh giá cao/g, 'Highly rated');
}

const TAG_EMOJI_MAP: Record<string, string> = {
  'gà': '🍗', 'bò': '🥩', 'heo': '🐷',
  'cơm': '🍚', 'phở': '🍜', 'bún': '🍜', 'mì': '🍝',
  'hải sản': '🦐', 'lẩu': '🫕', 'nướng': '🔥',
  'trà sữa': '🧋', 'cà phê': '☕', 'đồ uống': '🥤',
  'sushi': '🍣', 'pizza': '🍕', 'burger': '🍔',
  'tráng miệng': '🍰', 'dessert': '🍰',
  'cháo': '🥣', 'healthy': '🥗', 'món chay': '🌿',
  'ăn sáng': '🌅', 'ăn trưa': '☀️', 'ăn tối': '🌙',
  'ăn vặt': '🍿', 'ăn khuya': '🌃',
  'đánh giá cao': '⭐', 'nhiều đánh giá': '💬',
  'giá rẻ': '💰', 'tầm trung': '💵', 'cao cấp': '💎',
  'chiên': '🍤', 'fastfood': '🍔', 'xào': '🍝', 'mì xào': '🍝',
  'hấp': '🥟', 'luộc': '🥟', 'trộn': '🥗', 'gỏi': '🥗', 'salad': '🥗', 'chay': '🌿',
};

function getTagsForItem(item: RecommendResult, index: number): VibeTag[] {
  if (item.tags && Array.isArray(item.tags) && item.tags.length > 0) {
    return item.tags.map((t: string, i: number) => {
      const found = VIBE_TAGS.find(v => v.label.toLowerCase() === t.toLowerCase());
      if (found) return found;
      const defaultStyle = DEFAULT_TAG_STYLES[i % DEFAULT_TAG_STYLES.length];
      const emoji = TAG_EMOJI_MAP[t.toLowerCase()] || defaultStyle.emoji;
      return {
        label: t,
        ...defaultStyle,
        emoji
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
   Helper to parse price and rating for client-side sorting
   ───────────────────────────────────────────────────────────── */
function parsePrice(priceStr: string): number {
  if (!priceStr) return 0;
  // E.g. "50.000đ - 100.000đ" -> "50000đ - 100000đ"
  let clean = priceStr.toLowerCase().replace(/\./g, '');
  // E.g. "50k" -> "50000"
  clean = clean.replace(/(\d+)k/g, '$1000');
  const matches = clean.match(/\d+/g);
  if (!matches || matches.length === 0) return 0;
  return parseInt(matches[0], 10);
}

/* ─────────────────────────────────────────────────────────────
   Hero Result Card (#1 — AI TOP PICK)
   ───────────────────────────────────────────────────────────── */
function HeroResultCard({ item, sessionId, searchMode, onAddCollection, isModalOpen }: { item: RecommendResult; sessionId?: string; searchMode?: SearchMode; onAddCollection: (item: RecommendResult) => void; isModalOpen: boolean }) {
  const { language, t } = useLanguage();
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
      toast.success(t('result.removedItineraryToast'));
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
      toast.success(t('result.addedItineraryToast'), {
        action: {
          label: t('result.view'),
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
      toast.error(t('result.loginToSaveFavorite'));
      return;
    }
    if (isFav) {
      favoriteService.removeFavorite(userId, item.name);
      setIsFav(false);
      toast.success(t('result.removedFavoriteToast'));

      interactionService.logInteraction({
        res_id: item.id,
        action_type: "REMOVE_RESTAURANT",
        metadata: { restaurant_name: item.name, source_type: "favorite" }
      });
    } else {
      favoriteService.addFavorite(userId, item);
      setIsFav(true);
      toast.success(t('result.addedFavoriteToast'));

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
                <AlertTriangle className="w-3.5 h-3.5" /> {item.allergen_warning.length} {t('result.itemsToNote')}
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
                  ({item.total_reviews} {t('result.reviews')})
                </span>
              )}
            </div>
          )}

          {item.reason && (
            <p className="text-sm text-gray-500 dark:text-[#9A8A7A] leading-relaxed mb-6 max-w-md">
              {translateResultReason(item.reason, language)}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {getTagsForItem(item, 0).map(tag => (
              <span key={tag.label} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${tag.bgLight} ${tag.bgDark} ${tag.text} border ${tag.border}`}>
                {tag.emoji} {translateResultTag(tag.label, language)}
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
              title={isInItinerary ? t('result.removeItinerary') : t('result.addItinerary')}
            >
              <Route className={`w-5 h-5 ${isInItinerary ? 'text-orange-500 fill-current' : 'text-gray-400'}`} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                // [FIX-CONFLICT]: Ngăn không cho mở Modal nếu món ăn đã có trong bộ sưu tập (tránh thêm trùng lặp), hiển thị toast với icon Bookmark
                if (isInColl) {
                  toast.info(t('result.alreadyInCollection'), {
                    icon: <Bookmark className="w-4 h-4" />
                  });
                  return;
                }
                onAddCollection(item);
              }}
              className={`w-10 h-10 rounded-full bg-white/90 dark:bg-[#2A2420]/80 border border-gray-200 dark:border-[#4D3D32] flex items-center justify-center hover:scale-110 transition-all cursor-pointer shadow-sm ${isInColl ? 'hover:bg-yellow-50' : 'hover:bg-brand-muted'}`}
              title={isInColl ? t('result.alreadyInCollectionShort') : t('result.addCollection')}
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
function SmallResultCard({ item, index, rank, sessionId, searchMode, onAddCollection, isModalOpen }: { item: RecommendResult; index: number; rank?: number; sessionId?: string; searchMode?: SearchMode; onAddCollection: (item: RecommendResult) => void; isModalOpen: boolean }) {
  const { language, t } = useLanguage();
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
      toast.success(t('result.removedItineraryToast'));
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
      toast.success(t('result.addedItineraryToast'), {
        action: {
          label: t('result.view'),
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
      toast.error(t('result.loginToSaveFavorite'));
      return;
    }
    if (isFav) {
      favoriteService.removeFavorite(userId, item.name);
      setIsFav(false);
      toast.success(t('result.removedFavoriteToast'));

      interactionService.logInteraction({
        res_id: item.id,
        action_type: "REMOVE_RESTAURANT",
        metadata: { restaurant_name: item.name, source_type: "favorite" }
      });
    } else {
      favoriteService.addFavorite(userId, item);
      setIsFav(true);
      toast.success(t('result.addedFavoriteToast'));

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
      className="bg-white dark:bg-[#3D312A] rounded-2xl border border-gray-100 dark:border-[#4D3D32] shadow-sm dark:shadow-none overflow-hidden hover:shadow-lg dark:hover:border-gray-600 transition-all duration-300 cursor-pointer group shrink-0"
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
          {rank !== undefined ? rank : index + 2}
        </span>

        {/* Heart, Bookmark & Route */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          <button
            onClick={toggleItinerary}
            className={`w-8 h-8 rounded-full bg-white/90 dark:bg-[#2A2420]/80 flex items-center justify-center hover:scale-110 transition-all cursor-pointer shadow-sm ${isInItinerary ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-500/30' : ''}`}
            title={isInItinerary ? t('result.removeItinerary') : t('result.addItinerary')}
          >
            <Route className={`w-4 h-4 ${isInItinerary ? 'text-orange-500 fill-current' : 'text-gray-400'}`} />
          </button>
          <button
            onClick={toggleFav}
            className="w-8 h-8 rounded-full bg-white/90 dark:bg-[#2A2420]/80 flex items-center justify-center hover:scale-110 transition-all cursor-pointer shadow-sm"
            title={t('result.saveFavorite')}
          >
            <Heart className={`w-4 h-4 ${isFav ? 'text-red-500 fill-current' : 'text-gray-400'}`} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              // [FIX-CONFLICT]: Ngăn không cho mở Modal nếu món ăn đã có trong bộ sưu tập (tránh thêm trùng lặp), hiển thị toast với icon Bookmark
              if (isInColl) {
                toast.info(t('result.alreadyInCollection'), {
                  icon: <Bookmark className="w-4 h-4" />
                });
                return;
              }
              onAddCollection(item);
            }}
            className={`w-8 h-8 rounded-full bg-white/90 dark:bg-[#2A2420]/80 flex items-center justify-center hover:scale-110 transition-all cursor-pointer shadow-sm ${isInColl ? 'hover:bg-yellow-50' : 'hover:bg-brand-muted'}`}
            title={isInColl ? t('result.alreadyInCollectionShort') : t('result.addCollection')}
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
              ⚠️ {item.allergen_warning.length} {t('result.notes')}
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
            {translateResultReason(item.reason, language)}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {tags.map(tag => (
            <span key={tag.label} className={`px-2 py-1 rounded-full text-[10px] font-medium ${tag.bgLight} ${tag.bgDark} ${tag.text} border ${tag.border}`}>
              {tag.emoji} {translateResultTag(tag.label, language)}
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

const isPriceInRange = (priceStr: string, min: number, max: number): boolean => {
  if (!priceStr || priceStr.toLowerCase().includes('liên hệ')) return false;

  // Trường hợp 1: Có chứa ký tự 'k' (ví dụ: "30k - 50k")
  const matches = priceStr.match(/(\d+)k/gi);
  if (matches) {
    const values = matches.map(m => parseInt(m.replace(/k/i, '')) * 1000);
    const itemMin = Math.min(...values);
    const itemMax = Math.max(...values);
    return itemMax >= min && itemMin <= max;
  }

  // Trường hợp 2: Số đầy đủ (ví dụ: "30.000 - 50.000", "30,000đ")
  // Xoá bỏ dấu chấm, phẩy phân cách hàng nghìn
  const normalizedStr = priceStr.replace(/[.,]/g, '');
  const digitMatches = normalizedStr.match(/\d+/g);
  
  if (digitMatches) {
    const values = digitMatches.map(m => parseInt(m)).filter(v => v >= 1000);
    if (values.length > 0) {
      const itemMin = Math.min(...values);
      const itemMax = Math.max(...values);
      return itemMax >= min && itemMin <= max;
    }
  }

  return false;
};

function ResultPageContent() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get('q') || '';
  let sessionIdFromUrl = searchParams.get('session_id') || '';
  const isMapEntryWithoutSearch = searchParams.get('map') === '1' && !urlQuery && !sessionIdFromUrl;
  // [FIX-CONFLICT]: Lấy session_id từ sessionStorage (nếu URL không có) vì ta đã giấu nó đi
  if (typeof window !== 'undefined' && !sessionIdFromUrl && !isMapEntryWithoutSearch) {
    sessionIdFromUrl = sessionStorage.getItem('current_search_session_id') || '';
  }

  const dispatch = useDispatch();
  const rawResults = useSelector((state: RootState) => state.search.rawResults);
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
    const mapEntryWithoutSearch = searchParams.get('map') === '1' && !q && !sessionId;
    if (mapEntryWithoutSearch) return false;
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
  const [budget, setBudget] = useState<BudgetOption>(() => {
    if (typeof window === 'undefined') return 'auto';
    const b = searchParams.get('budget');
    if (b && ['30000', '50000', '100000', '200000'].includes(b)) {
      return b as BudgetOption;
    }
    return 'auto';
  });
  const { getOptimizedLocation } = useOptimizedLocation();

  const [fallbackApplied, setFallbackApplied] = useState(false);
  const [fallbackReason, setFallbackReason] = useState<string>('');
  const [appliedBudget, setAppliedBudget] = useState<number | null>(null);

  const [filteredCount, setFilteredCount] = useState(0);
  const [allergenFlaggedCount, setAllergyFlaggedCount] = useState(0);
  const [allergyWarning, setAllergyWarning] = useState<string>('');

  // Sync budget to URL when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (budget === 'auto') {
        url.searchParams.delete('budget');
      } else {
        url.searchParams.set('budget', budget);
      }
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  }, [budget]);

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

  // Sync budget from URL
  useEffect(() => {
    const urlBudget = searchParams.get('budget');
    if (urlBudget && urlBudget !== 'auto') {
      setBudget(urlBudget as BudgetOption);
    }
  }, [searchParams]);

  const [showGuestNotice, setShowGuestNotice] = useState(true);

  const [distanceFilterEnabled, setDistanceFilterEnabled] = useState(false);
  const [distanceRadius, setDistanceRadius] = useState(2);
  const [mapViewEnabled, setMapViewEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('map') === '1';
  });
  const [showMapFilters, setShowMapFilters] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedId) {
      const element = document.getElementById(`restaurant-card-${selectedId}`);
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  }, [selectedId]);

  useEffect(() => {
    if (searchParams.get('map') === '1') {
      setMapViewEnabled(true);
    }
  }, [searchParams]);



  const [collectionModalItem, setCollectionModalItem] = useState<RecommendResult | null>(null);

  useEffect(() => {
    if (rawResults.length === 0 && typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      let sessionId = searchParams.get('session_id');
      const q = searchParams.get('q');
      const mapEntryWithoutSearch = searchParams.get('map') === '1' && !q && !sessionId;
      if (!mapEntryWithoutSearch) {
        if (!sessionId) {
          sessionId = sessionStorage.getItem('current_search_session_id');
        }
        if (sessionId) {
          const cached = sessionStorage.getItem(`session_data_${sessionId}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed.results) {
              dispatch(setRawResults(parsed.results));
            }
          }
        }
      }
    }
  }, [dispatch]);
const [sortBy, setSortBy] = useState<SortOption>('recommend');
  const [advFilters, setAdvFilters] = useState<AdvancedFilterState>({
    minPrice: null,
    maxPrice: null,
    minRating: null,
    vegetarianOnly: false,
  });
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const activeAdvFilterCount = [
    advFilters.minPrice !== null || advFilters.maxPrice !== null,
    advFilters.minRating !== null,
    advFilters.vegetarianOnly,
  ].filter(Boolean).length + selectedTags.length;
  const hasActiveAdvFilters = activeAdvFilterCount > 0;
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (mapViewEnabled) {
      setIsAdvancedFiltersOpen(false);
    }
  }, [mapViewEnabled]);

  const [isRestored, setIsRestored] = useState(false);

  // Restore filter state from sessionStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined' || !sessionIdFromUrl) return;

    const saved = sessionStorage.getItem(`search_state_${sessionIdFromUrl}`);
    if (saved) {
      try {
        const state = JSON.parse(saved);
        if (state.advFilters) setAdvFilters(state.advFilters);
        if (state.selectedTags) {
          setSelectedTags(state.selectedTags);
        } else if (state.selectedTag) {
          setSelectedTags([state.selectedTag]);
        }
        if (state.isAdvancedFiltersOpen !== undefined) setIsAdvancedFiltersOpen(state.isAdvancedFiltersOpen);
        if (state.sortBy) setSortBy(state.sortBy);
        if (state.distanceFilterEnabled !== undefined) setDistanceFilterEnabled(state.distanceFilterEnabled);
        if (state.distanceRadius !== undefined) setDistanceRadius(state.distanceRadius);
        if (state.budget) setBudget(state.budget);
      } catch (e) {
        console.error("Error restoring filter state:", e);
      }
    }
    setIsRestored(true);
  }, [sessionIdFromUrl]);

  // Save filter state to sessionStorage when parameters change
  useEffect(() => {
    if (!isRestored || !sessionIdFromUrl || typeof window === 'undefined') return;

    const state = {
      advFilters,
      selectedTags,
      isAdvancedFiltersOpen,
      sortBy,
      distanceFilterEnabled,
      distanceRadius,
      budget,
    };
    sessionStorage.setItem(`search_state_${sessionIdFromUrl}`, JSON.stringify(state));
  }, [
    isRestored,
    sessionIdFromUrl,
    advFilters,
    selectedTags,
    isAdvancedFiltersOpen,
    sortBy,
    distanceFilterEnabled,
    distanceRadius,
    budget,
  ]);

  const results = useMemo(() => {
    if (budget === 'auto') return rawResults;
    const range = budgetToRange(budget);
    if (!range) return rawResults;
    return rawResults.filter(item => isPriceInRange(item.price, range.min, range.max));
  }, [rawResults, budget]);

  // Tự động thu thập tất cả tag duy nhất có trong kết quả trả về từ API
  const availableTags = useMemo(() => {
    const tagsSet = new Set<string>();
    rawResults.forEach((r) => {
      r.tags?.forEach((t) => tagsSet.add(t));
    });
    return Array.from(tagsSet);
  }, [rawResults]);

  const [isSearching, setIsSearching] = useState(false);
  const [searchLoadingMsg, setSearchLoadingMsg] = useState(t('result.loadingAnalyzing'));

  const abortControllerRef = useRef<AbortController | null>(null);
  const mapDragRef = useRef(false);

  const handleCancelSearch = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsSearching(false);
  };

  useEffect(() => {
    if (!sessionIdFromUrl) {
      if (isMapEntryWithoutSearch) {
        setSearchQuery('');
        setInputValue('');
        dispatch(setRawResults([]));
      }
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
        dispatch(setRawResults(data.results || []));
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
        const res = await makeAuthenticatedRequest(`/api/v1/search/sessions/${sessionIdFromUrl}`, {
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) {
          const data = await res.json();
          sessionStorage.setItem(`session_data_${sessionIdFromUrl}`, JSON.stringify(data));
          setSearchQuery(data.query);
          setInputValue(data.query);
          dispatch(setRawResults(data.results || []));
          setFallbackApplied(data.fallback_applied || false);
          setFallbackReason(data.fallback_reason || '');
          setAppliedBudget(data.applied_budget ?? null);
          setFilteredCount(data.filtered_out_count || 0);
          setAllergyFlaggedCount(data.allergen_flagged_count || 0);
          setAllergyWarning(data.warning || '');
        } else if (res.status === 404) {
          setApiError(t('result.sessionNotFound'));
        } else {
          setApiError(t('result.loadResultsError'));
        }
      } catch (err) {
        console.error("Load session error:", err);
        setApiError(t('result.serverConnectionError'));
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, [isMapEntryWithoutSearch, sessionIdFromUrl, setInputValue]);

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

  const handleSearch = async (
    overrideQuery?: string,
    overrideBudget?: BudgetOption,
    options?: { viewport?: MapViewport; stayOnPage?: boolean }
  ) => {
    const finalQuery = (overrideQuery ?? inputValue).trim();
    const finalBudget = overrideBudget ?? budget;

    if (finalQuery === '') return;

    setIsSearching(true);
    setApiError(null);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setSearchLoadingMsg(t('result.loadingLocation'));

      const gps = await getOptimizedLocation();
      if (controller.signal.aborted) return;
      if (!gps && !options?.viewport) {
        setApiError(t('result.gpsRequiredError'));
        setIsSearching(false);
        return;
      }

      setSearchLoadingMsg(t('result.loadingAnalyzing'));
      const userId = localStorage.getItem('user_id');
      const requestLat = gps?.lat ?? options?.viewport?.centerLat;
      const requestLng = gps?.lng ?? options?.viewport?.centerLng;

      const res = await makeAuthenticatedRequest(`/api/v1/search/recommend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          query: finalQuery,
          lat: requestLat,
          lng: requestLng,
          user_id: userId || undefined,
          // Bỏ qua budget ở Backend để lấy mảng dữ liệu lớn
          search_mode: searchMode,
          map_center_lat: options?.viewport?.centerLat,
          map_center_lng: options?.viewport?.centerLng,
          map_north: options?.viewport?.north,
          map_south: options?.viewport?.south,
          map_east: options?.viewport?.east,
          map_west: options?.viewport?.west,
          map_radius_km: options?.viewport?.radiusKm,
          top_k: 100, // Lấy 1 mẻ lớn 100 món để lọc trên Frontend
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
        setSearchLoadingMsg(t('result.loadingPreparing'));
        // [FIX-CONFLICT]: Ẩn session_id và mode vào sessionStorage, đẩy query q lên URL
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('current_search_session_id', data.session_id);
          sessionStorage.setItem('current_search_mode', searchMode);
          sessionStorage.setItem(`session_data_${data.session_id}`, JSON.stringify({
            query: finalQuery,
            results: data.results || [],
            fallback_applied: data.fallback_applied || false,
            fallback_reason: data.fallback_reason || '',
            applied_budget: data.applied_budget ?? null,
            filtered_out_count: data.filtered_out_count || 0,
            allergen_flagged_count: data.allergen_flagged_count || 0,
            warning: data.warning || '',
          }));
        }
        if (options?.stayOnPage) {
          setSearchQuery(finalQuery);
          setInputValue(finalQuery);
          dispatch(setRawResults(data.results || []));
          setFallbackApplied(data.fallback_applied || false);
          setFallbackReason(data.fallback_reason || '');
          setAppliedBudget(data.applied_budget ?? null);
          setFilteredCount(data.filtered_out_count || 0);
          setAllergyFlaggedCount(data.allergen_flagged_count || 0);
          setAllergyWarning(data.warning || '');
          if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            params.set('q', finalQuery);
            if (mapViewEnabled) {
              params.set('map', '1');
            }
            window.history.replaceState(null, '', `/result?${params.toString()}`);
          }
        } else {
          const params = new URLSearchParams();
          params.set('q', finalQuery);
          if (finalBudget !== 'auto') {
            params.set('budget', String(finalBudget));
          }
          window.location.href = `/result?${params.toString()}`;
        }
      } else {
        throw new Error(t('result.aiConnectionError'));
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      const msg = err?.message || t('result.aiConnectionRetry');
      setApiError(msg);
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setIsSearching(false);
    }
  };

  const handleViewportSearch = useCallback((viewport: MapViewport) => {
    const queryForMap = (inputValue || searchQuery).trim();
    if (!queryForMap) return;
    handleSearch(queryForMap, budget, { viewport, stayOnPage: true });
  }, [budget, inputValue, searchMode, searchQuery]);

  const displayResults = useMemo(() => {
    let filtered = results;

    // Apply tag filter (client-side)
    if (selectedTags.length > 0) {
      filtered = filtered.filter((r) =>
        selectedTags.every((selTag) =>
          r.tags?.some((t) => t.toLowerCase() === selTag.toLowerCase())
        )
      );
    }

    if (distanceFilterEnabled) {
      filtered = filtered.filter((r) => (r.distance_km ?? 0) <= distanceRadius);
    }

    // Apply vegetarian filter
    if (advFilters.vegetarianOnly) {
      filtered = filtered.filter((r) => r.is_vegetarian === true);
    }

    // Apply rating filter
    if (advFilters.minRating !== null) {
      filtered = filtered.filter((r) => {
        const rate = parseFloat(r.rating);
        return !isNaN(rate) && rate >= advFilters.minRating!;
      });
    }

    // Apply price range filter
    if (advFilters.minPrice !== null || advFilters.maxPrice !== null) {
      filtered = filtered.filter((r) => {
        const priceVal = parsePrice(r.price);
        if (priceVal === 0) return advFilters.minPrice === null || advFilters.minPrice === 0;
        const matchesMin = advFilters.minPrice === null || priceVal >= advFilters.minPrice;
        const matchesMax = advFilters.maxPrice === null || priceVal <= advFilters.maxPrice;
        return matchesMin && matchesMax;
      });
    }

    // [FIX-CONFLICT]: Thêm logic lọc bỏ các kết quả bị trùng lặp tên (remove duplicates by name) để hiển thị danh sách sạch hơn
    const seen = new Set();
    const unique = filtered.filter(item => {
      if (!item.name) return true;
      const duplicate = seen.has(item.name);
      seen.add(item.name);
      return !duplicate;
    });

    let sorted = [...unique];
    if (sortBy === 'distance') {
      sorted.sort((a, b) => {
        const distA = a.distance_km ?? Infinity;
        const distB = b.distance_km ?? Infinity;
        return distA - distB;
      });
    } else if (sortBy === 'price_asc') {
      sorted.sort((a, b) => {
        const valA = parsePrice(a.price);
        const valB = parsePrice(b.price);
        const priceA = valA === 0 ? Infinity : valA;
        const priceB = valB === 0 ? Infinity : valB;
        return priceA - priceB;
      });
    } else if (sortBy === 'price_desc') {
      sorted.sort((a, b) => {
        const priceA = parsePrice(a.price);
        const priceB = parsePrice(b.price);
        return priceB - priceA;
      });
    } else if (sortBy === 'rating') {
      sorted.sort((a, b) => {
        const rateA = parseFloat(a.rating) || 0;
        const rateB = parseFloat(b.rating) || 0;
        return rateB - rateA;
      });
    }

    // Cắt lấy đúng 16 món để hiển thị (1 hero + 15 small)
    return sorted.slice(0, 16);
  }, [results, distanceFilterEnabled, distanceRadius, sortBy, advFilters, selectedTags]);

  const heroItem = displayResults[0];
  const gridItems = displayResults.slice(1);
  const fallbackMapCenter = coords || lastSearchCoordsRef.current;

  const renderResultCards = (compact = false) => (
    <>
      {heroItem && (
        <HeroResultCard
          item={heroItem}
          sessionId={sessionIdFromUrl}
          searchMode={searchMode}
          onAddCollection={setCollectionModalItem}
          isModalOpen={!!collectionModalItem}
        />
      )}

      {gridItems.length > 0 && (
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${compact ? 'lg:grid-cols-2' : 'lg:grid-cols-3'} gap-5`}>
          {gridItems.map((item, idx) => (
            <SmallResultCard
              key={item.id || idx}
              item={item}
              index={idx}
              sessionId={sessionIdFromUrl}
              searchMode={searchMode}
              onAddCollection={setCollectionModalItem}
              isModalOpen={!!collectionModalItem}
            />
          ))}
        </div>
      )}

      <FeatureBar />
    </>
  );
  const mapFloatingButton = (
    <motion.button
      drag
      dragMomentum={false}
      onDragStart={() => {
        mapDragRef.current = true;
      }}
      onDragEnd={() => {
        setTimeout(() => {
          mapDragRef.current = false;
        }, 100);
      }}
      type="button"
      onClick={() => {
        if (mapDragRef.current) return;
        const next = !mapViewEnabled;
        setMapViewEnabled(next);
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          if (next) {
            params.set('map', '1');
          } else {
            params.delete('map');
          }
          const queryString = params.toString();
          window.history.replaceState(null, '', queryString ? `/result?${queryString}` : '/result');
        }
      }}
      className={`fixed right-4 top-28 z-[100] inline-flex items-center justify-center gap-2 h-11 px-4 rounded-full border-2 border-[#3D312A] shadow-[4px_4px_0px_rgba(61,49,42,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_rgba(61,49,42,1)] transition-colors duration-150 cursor-grab active:cursor-grabbing font-black text-xs uppercase tracking-wide ${
        mapViewEnabled
          ? 'bg-brand text-white hover:bg-brand-hover'
          : 'bg-white dark:bg-[#3D312A] text-[#3D312A] dark:text-[#E6DFD5] hover:text-brand'
      }`}
      title={mapViewEnabled ? t('result.exitMapTitle') : t('result.showMapTitle')}
      aria-label={mapViewEnabled ? t('result.exitMapTitle') : t('result.showMapTitle')}
    >
      <LogOut className={`w-4 h-4 pointer-events-none ${mapViewEnabled ? 'block' : 'hidden'}`} />
      <MapIcon className={`w-4 h-4 pointer-events-none ${mapViewEnabled ? 'hidden' : 'block'}`} />
      <span className="pointer-events-none">{mapViewEnabled ? t('result.exitMap') : t('result.map')}</span>
    </motion.button>
  );

  return (
    <AppShell>
      {isSearching && <SearchLoadingOverlay message={searchLoadingMsg} onCancel={handleCancelSearch} />}
      {mounted && mapFloatingButton}

      {!mapViewEnabled && (
        <div className="border-b border-[#E6DFD5]/60 dark:border-[#3D312A]/60 bg-[#FDFBF7]/80 dark:bg-[#2A2420]/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex flex-col gap-3">
            {/* Row 1: Budget and Distance Filters */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
              <BudgetSelector
                value={budget}
                onChange={(newBudget) => {
                  setBudget(newBudget);
                }}
              />
              <DistanceFilter
                enabled={distanceFilterEnabled}
                onToggle={setDistanceFilterEnabled}
                radius={distanceRadius}
                onRadiusChange={setDistanceRadius}
                totalCount={mounted ? results.length : 0}
                filteredCount={mounted ? displayResults.length : 0}
              />
            </div>

            <div className="h-px bg-gray-200/50 dark:bg-[#3D312A]/50" />

            {/* Row 2: Sort Selector */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
              <SortSelector
                value={sortBy}
                onChange={setSortBy}
                hasCoordinates={mounted ? !!coords : false}
              />
            </div>

            <div className="h-px bg-gray-200/50 dark:bg-[#3D312A]/50" />

            {/* Row 3: Advanced Filter Toggle Button and Reset */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsAdvancedFiltersOpen(prev => !prev)}
                className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 cursor-pointer ${
                  isAdvancedFiltersOpen || hasActiveAdvFilters
                    ? 'bg-brand-muted dark:bg-brand/10 border-brand/40 dark:border-brand/30 text-brand-hover dark:text-[#E6DFD5] shadow-sm shadow-brand/5 dark:shadow-none'
                    : 'bg-white dark:bg-[#3D312A] border-gray-200 dark:border-[#4D3D32] text-gray-600 dark:text-[#9A8A7A] hover:border-brand/70 hover:text-brand-hover'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                {t('result.advancedFilters')}
                {activeAdvFilterCount > 0 && (
                  <span className="bg-brand text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold ml-0.5">
                    {activeAdvFilterCount}
                  </span>
                )}
              </button>
              {hasActiveAdvFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setAdvFilters({ minPrice: null, maxPrice: null, minRating: null, vegetarianOnly: false });
                    setSelectedTags([]);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 px-2.5 py-1 rounded-lg transition-all"
                >
                  <RotateCcw className="w-3 h-3" />
                  {t('result.reset')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 md:px-8 w-full flex flex-col lg:flex-row gap-0 lg:gap-8 items-start py-8 md:py-12">
        {/* Left Sidebar for Filters (Collapsible) */}
        <div className={`transition-all duration-300 overflow-hidden flex-shrink-0 ${isAdvancedFiltersOpen ? 'w-full lg:w-[320px] opacity-100 mb-8 lg:mb-0' : 'w-0 opacity-0 h-0 lg:h-auto'}`}>
          <div className="lg:sticky lg:top-24 w-full lg:w-[320px]">
            <AdvancedFilters
              filters={advFilters}
              onChange={setAdvFilters}
              totalCount={mounted ? results.length : 0}
              filteredCount={mounted ? displayResults.length : 0}
              availableTags={mounted ? availableTags : []}
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
              isOpen={true} // The component itself is always 'open' visually, the container hides it
            />
          </div>
        </div>

        {/* Right Content for Results */}
        <div className={`flex-1 min-w-0 w-full transition-all duration-300 ${
          mapViewEnabled ? 'xl:flex xl:flex-col xl:h-full' : ''
        }`}>
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
              className={mapViewEnabled ? "xl:flex xl:flex-col xl:h-full xl:min-h-0" : ""}
            >
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`max-w-4xl mx-auto w-full ${
                  mapViewEnabled ? 'xl:mb-6 xl:flex-shrink-0' : 'mb-10'
                }`}
              >
                {fallbackApplied && (
                  <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20">
                    <Info className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-yellow-800 dark:text-yellow-200 leading-relaxed mb-2">
                        <strong>{t('result.fallbackTitle')}</strong> {fallbackReason || t('result.fallbackDesc')}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {appliedBudget != null && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300">
                            💰 {t('result.budget')}: {appliedBudget.toLocaleString('vi-VN')}đ
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
                      <strong>{t('result.allergyNoticeTitle')}</strong> {t('result.allergyNoticeDesc').replace('{count}', String(allergenFlaggedCount))}
                    </p>
                  </div>
                )}

                {!isLoggedIn && showGuestNotice && (
                  <div className="mb-6 px-5 py-3 rounded-2xl bg-[#F0F7FF] dark:bg-blue-500/5 border border-[#E1EFFE] dark:border-blue-500/20 flex items-start sm:items-center gap-3 relative shadow-sm">
                    <Sparkles className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5 sm:mt-0" />
                    <p className="text-[13px] md:text-sm text-gray-600 dark:text-blue-200 pr-8 sm:pr-12 leading-relaxed">
                      {t('result.guestSearching')}{" "}
                      <button
                        onClick={() => router.push('/auth')}
                        className="font-bold text-blue-600 dark:text-blue-400 underline decoration-blue-400/50 hover:decoration-blue-600 hover:text-blue-700 dark:hover:text-blue-300 transition-all cursor-pointer inline-block hover:-translate-y-[1px] active:translate-y-0"
                      >
                        {t('result.loginNow')}
                      </button>
                      {" "}{t('result.loginBenefit')}
                    </p>
                    <button
                      onClick={() => setShowGuestNotice(false)}
                      className="absolute right-3 top-3 sm:right-4 sm:top-1/2 sm:-translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-blue-300 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="flex flex-col gap-3 mb-5">
                  <div className="flex justify-between items-center px-1">
                    <button onClick={() => router.push('/')} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-brand transition-colors">
                      <Home className="w-4 h-4" /> {t('result.backHome')}
                    </button>
                  </div>
                  <div className="relative group flex">
                    <SearchBar
                      query={inputValue}
                      setQuery={setInputValue}
                      searchMode={searchMode}
                      setSearchMode={setSearchMode}
                      onSearch={() => handleSearch(inputValue, undefined, mapViewEnabled ? { stayOnPage: true } : undefined)}
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
                    {t('result.connectionError')}
                  </h2>
                  <p className="text-red-500 dark:text-red-300/60 max-w-sm mx-auto mb-6">{apiError}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all font-medium shadow-md"
                  >
                    {t('result.retryConnection')}
                  </button>
                </motion.div>
              ) : mapViewEnabled ? (
                <div className="flex flex-col xl:flex-row gap-6 items-stretch min-h-[calc(100vh-12rem)] w-full">
                  <div className="w-full xl:w-[450px] xl:shrink-0 flex flex-col gap-4">
                    {results.length === 0 ? (
                      <div className="py-16 text-center bg-white dark:bg-[#3D312A] rounded-3xl border border-gray-100 dark:border-[#4D3D32] shadow-sm">
                        <div className="w-16 h-16 bg-gray-50 dark:bg-[#2A2420] rounded-full flex items-center justify-center mx-auto mb-5">
                          <Search className="w-8 h-8 text-gray-400 dark:text-[#7A6A5A]" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-[#E6DFD5] mb-2">
                          {t('result.mapEmptyTitle')}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-[#9A8A7A] max-w-md mx-auto leading-relaxed">
                          {t('result.mapEmptyDesc')}
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Sort & Filter Controls Inside Left Panel */}
                        <div className={`flex items-center justify-between gap-3 bg-white dark:bg-[#3D312A] p-4 rounded-2xl border border-gray-100 dark:border-[#4D3D32] shadow-sm ${mapViewEnabled ? 'xl:flex-shrink-0' : ''}`}>
                          <div className="flex-1">
                            <SortSelector
                              value={sortBy}
                              onChange={setSortBy}
                              hasCoordinates={!!coords}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowMapFilters(!showMapFilters)}
                            className={`h-10 px-4 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                              showMapFilters
                                ? 'bg-[#123D2A] border-[#123D2A] text-white'
                                : 'bg-gray-50 dark:bg-[#3D312A] text-gray-600 dark:text-[#C8BFB0] border-gray-200 dark:border-[#4D3D32] hover:border-[#123D2A]/50'
                            }`}
                          >
                            <SlidersHorizontal className="w-4 h-4" />
                            <span>{t('result.filters')}</span>
                          </button>
                        </div>

                        {/* Collapsible Advanced Filters panel */}
                        {showMapFilters && (
                          <div className={`p-4 bg-white dark:bg-[#3D312A] rounded-2xl border border-gray-100 dark:border-[#4D3D32] shadow-sm flex flex-col gap-4 ${mapViewEnabled ? 'xl:flex-shrink-0 xl:overflow-y-auto xl:max-h-[50%]' : ''}`}>
                            <div className="flex flex-col gap-2">
                              <p className="text-[11px] font-bold text-gray-400 dark:text-[#9A8A7A] uppercase tracking-wide">{t('result.budgetDistance')}</p>
                              <div className="flex flex-wrap items-center gap-2">
                                <BudgetSelector
                                  value={budget}
                                  onChange={(newBudget) => {
                                    setBudget(newBudget);
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
                            <div className="h-px bg-gray-100 dark:bg-[#4D3D32]/40" />
                            <div className="flex flex-col gap-2">
                              <p className="text-[11px] font-bold text-gray-400 dark:text-[#9A8A7A] uppercase tracking-wide">{t('result.advancedFilterShort')}</p>
                              <AdvancedFilters
                                filters={advFilters}
                                onChange={setAdvFilters}
                                totalCount={results.length}
                                filteredCount={displayResults.length}
                              />
                            </div>
                          </div>
                        )}

                        {/* Vertical list of restaurants */}
                        <div className="flex flex-col gap-5 pr-1">
                          {displayResults.map((item, idx) => (
                            <div
                              key={item.id || idx}
                              id={`restaurant-card-${item.id}`}
                              onClick={() => setSelectedId(item.id)}
                              className={`transition-all duration-300 rounded-2xl ${
                                selectedId === item.id
                                  ? 'ring-2 ring-brand ring-offset-2 dark:ring-offset-[#2A2420]'
                                  : ''
                              }`}
                            >
                              <SmallResultCard
                                item={item}
                                index={idx}
                                rank={idx + 1}
                                sessionId={sessionIdFromUrl}
                                searchMode={searchMode}
                                onAddCollection={setCollectionModalItem}
                                isModalOpen={!!collectionModalItem}
                              />
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="w-full xl:flex-1 order-first xl:order-none xl:sticky xl:top-24 xl:h-[calc(100vh-120px)] h-[600px]">
                    <ResultMapView
                      results={displayResults}
                      fallbackCenter={fallbackMapCenter}
                      isSearching={isSearching}
                      onViewportSearch={handleViewportSearch}
                      selectedId={selectedId}
                      onSelectId={setSelectedId}
                    />
                  </div>
                </div>
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
                    {t('result.noResultsTitle')}
                  </h2>
                  <p className="text-gray-500 dark:text-[#9A8A7A] max-w-md mx-auto mb-8 leading-relaxed">
                    {t('result.noResultsDesc')}
                  </p>
                  <button
                    onClick={() => {
                      setInputValue('');
                      setSearchQuery('');
                      document.querySelector('input')?.focus();
                    }}
                    className="px-6 py-2.5 bg-brand-muted dark:bg-brand/10 hover:bg-brand-muted dark:hover:bg-brand/20 text-brand-hover dark:text-[#E6DFD5] rounded-full transition-all font-semibold"
                  >
                    {t('result.tryAnotherKeyword')}
                  </button>
                </motion.div>
              ) : renderResultCards(false)}
            </motion.div>
          )}
          </AnimatePresence>
        </div>
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
        <div className="text-[#9A8A7A] dark:text-[#7A6A5A] animate-pulse font-medium">Loading data...</div>
      </div>
    }>
      <ResultPageContent />
    </Suspense>
  );
}
