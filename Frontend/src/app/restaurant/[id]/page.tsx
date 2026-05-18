'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  MapPin,
  Navigation,
  Star,
  Clock,
  UtensilsCrossed,
  Info,
  ChevronRight,
  X,
  AlertTriangle,
  ShieldCheck,
  Trash2,
  MessageSquarePlus,
  Send,
  Eye
} from 'lucide-react';
import Image from 'next/image';
import { interactionService } from '../../../services/interactionService';
import { AppShell } from '../../../components/AppShell';
import { toast } from 'sonner';

interface Dish {
  id: string;
  name: string;
  price: number;
  image_url: string;
  allergens?: string[];
}

interface Review {
  id: string;
  user_id: string | null;
  reviewer_name: string;
  rating: number;
  text: string;
  date: string;
  is_anonymous: boolean;
  anonymous_number: number | null;
}

interface Restaurant {
  id: string;
  name: string;
  address: string;
  google_maps_url: string;
  image_url: string;
  rating_avg: number;
  total_reviews: number;
  price_range: string | null;
  open_time: string | null;
  close_time: string | null;
  is_open_now: boolean;
  lat?: number;
  lng?: number;
  tags: string[];
  reviews: Review[];
  dishes: Dish[];
}

export default function RestaurantDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeRestaurantId, setActiveRestaurantId] = useState<string | null>(null);
  const sessionId = searchParams.get('session_id');

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [userAllergies, setUserAllergies] = useState<string[]>([]);
  const [isAllergenSectionOpen, setIsAllergenSectionOpen] = useState(true);

  // Auth & reviews state
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isAllReviewsOpen, setIsAllReviewsOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [isWriteReviewOpen, setIsWriteReviewOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setCurrentUserId(localStorage.getItem('user_id'));
    setAuthToken(localStorage.getItem('access_token'));
  }, []);

  useEffect(() => {
    if (restaurant) setReviews(restaurant.reviews || []);
  }, [restaurant]);

  const hasOpenedReview = React.useRef(false);

  useEffect(() => {
    const reviewIdParam = searchParams.get('reviewId');
    if (reviewIdParam && reviews.length > 0 && !hasOpenedReview.current) {
      const reviewToOpen = reviews.find(r => r.id === reviewIdParam);
      if (reviewToOpen) {
        setSelectedReview(reviewToOpen);
        hasOpenedReview.current = true;
      }
    }
  }, [searchParams, reviews]);

  const handleDeleteReview = async (reviewId: string) => {
    if (!authToken || !activeRestaurantId) return;
    setIsDeleting(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    try {
      const res = await fetch(`${apiUrl}/api/v1/restaurants/${activeRestaurantId}/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok || res.status === 204) {
        setReviews(prev => prev.filter(r => r.id !== reviewId));
        toast.success("Xóa bình luận thành công!");
        
        // Ghi nhận tương tác xóa bình luận
        interactionService.logInteraction({
          res_id: activeRestaurantId,
          action_type: "DELETE_REVIEW",
          metadata: { review_id: reviewId, source: "restaurant_detail_page" }
        });
      } else if (res.status === 401) {
        window.dispatchEvent(new Event("auth-session-expired"));
      } else {
        toast.error("Không thể xóa bình luận. Vui lòng thử lại!");
      }
    } catch (err) {
      console.error("Failed to delete review:", err);
      toast.error("Lỗi kết nối hệ thống khi xóa bình luận!");
    } finally {
      setPendingDeleteId(null);
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    let idToUse: string | null = null;

    // [FIX-CONFLICT]: Đọc ID nhà hàng từ sessionStorage thay vì URL để giữ link (slug) sạch
    // Ưu tiên 1: Lấy từ sessionStorage (nếu đi từ trang kết quả)
    if (typeof window !== 'undefined') {
      idToUse = sessionStorage.getItem('current_res_id');
    }

    // Ưu tiên 2: Fallback lấy từ URL nếu không có (VD: F5 hoặc share link cũ)
    if (!idToUse) {
      let idFromUrl = params.id as string;
      try {
        idFromUrl = decodeURIComponent(idFromUrl);
        const decoded = atob(idFromUrl);
        if (/^[\x20-\x7E]*$/.test(decoded)) {
          idFromUrl = decoded;
        }
      } catch (e) {
        // Fallback for raw ID
      }
      idToUse = idFromUrl;
    }

    setActiveRestaurantId(idToUse);
  }, [params.id]);

  useEffect(() => {
    if (!activeRestaurantId) return;

    const fetchDetail = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${apiUrl}/api/v1/restaurants/${activeRestaurantId}`);
        if (!res.ok) throw new Error('Không thể lấy thông tin nhà hàng.');
        const data = await res.json();
        setRestaurant(data);

        // Log view interaction
        interactionService.logInteraction({
          res_id: data.id,
          action_type: "VIEW_RESTAURANT",
          metadata: { restaurant_name: data.name }
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetail();

    // Fetch user allergies if logged in
    const userId = localStorage.getItem('user_id');
    if (userId) {
      const fetchAllergies = async () => {
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
          const res = await fetch(`${apiUrl}/api/v1/users/${userId}/allergies`);
          if (res.ok) {
            const data = await res.json();
            console.log("Fetched user allergies for detail page:", data.allergies);
            setUserAllergies(data.allergies || []);
          } else {
            console.warn("Allergy fetch returned:", res.status);
          }
        } catch (err) {
          console.error("Failed to fetch user allergies:", err);
        }
      };
      fetchAllergies();
    }
  }, [activeRestaurantId]);

  // Track viewing duration
  useEffect(() => {
    if (!restaurant) return;

    const startTime = Date.now();

    return () => {
      // Calculate duration when component unmounts (user leaves page)
      const durationSec = Math.floor((Date.now() - startTime) / 1000);
      if (durationSec > 0) {
        interactionService.logInteraction({
          res_id: restaurant.id,
          action_type: "VIEW_RESTAURANT_DURATION",
          duration_sec: durationSec,
          search_session_id: sessionId || undefined,
          metadata: { source: "restaurant_detail_page_exit" }
        });
      }
    };
  }, [restaurant, sessionId]);

  const handleBack = () => {
    let mode = searchParams.get('mode');
    let sId = sessionId;
    // [FIX-CONFLICT]: Lấy lại session_id và mode từ bộ nhớ ngầm để quay về trang kết quả mượt mà
    if (typeof window !== 'undefined') {
      if (!mode) mode = sessionStorage.getItem('current_search_mode');
      if (!sId) sId = sessionStorage.getItem('current_search_session_id');
    }

    if (sId) {
      router.push(`/result`);
    } else {
      router.push('/');
    }
  };

  if (isLoading) return <AppShell><LoadingSkeleton /></AppShell>;
  if (error || !restaurant) return <AppShell><ErrorState message={error || 'Không tìm thấy dữ liệu.'} onBack={handleBack} /></AppShell>;
  // Allergen detection logic
  const ALLERGY_MAP: Record<string, string[]> = {
    "peanut": ["peanut", "groundnut", "satay", "lạc", "đậu phộng", "sa tế"],
    "lạc": ["peanut", "groundnut", "satay", "lạc", "đậu phộng", "sa tế"],
    "đậu phộng": ["peanut", "groundnut", "satay", "lạc", "đậu phộng", "sa tế"],
    "milk": ["milk", "dairy", "cheese", "butter", "sữa", "phô mai", "bơ"],
    "sữa": ["milk", "dairy", "cheese", "butter", "sữa", "phô mai", "bơ"],
    "phô mai": ["milk", "dairy", "cheese", "butter", "sữa", "phô mai", "bơ"],
    "shrimp": ["shrimp", "prawn", "tôm", "ruốc"],
    "tôm": ["shrimp", "prawn", "tôm", "ruốc"],
    "ruốc": ["shrimp", "prawn", "tôm", "ruốc"],
    "seafood": ["seafood", "fish", "crab", "squid", "hải sản", "cá", "cua", "mực"],
    "hải sản": ["seafood", "fish", "crab", "squid", "hải sản", "cá", "cua", "mực"],
    "egg": ["egg", "trứng", "hột"],
    "trứng": ["egg", "trứng", "hột"],
    "soy": ["soy", "đậu nành", "tương", "tofu", "đậu hũ"],
    "đậu nành": ["soy", "đậu nành", "tương", "tofu", "đậu hũ"],
    "đậu hũ": ["soy", "đậu nành", "tương", "tofu", "đậu hũ"]
  };

  const getMatchedAllergies = (dishAllergens: string[] | undefined) => {
    if (!dishAllergens || !userAllergies.length) return [];
    const matched: string[] = [];

    dishAllergens.forEach(da => {
      const daNorm = da.toLowerCase().trim();
      userAllergies.forEach(ua => {
        const uaNorm = ua.toLowerCase().trim();
        const keywords = ALLERGY_MAP[uaNorm] || [uaNorm];
        if (keywords.some(kw => daNorm.includes(kw))) {
          matched.push(ua);
        }
      });
    });

    if (matched.length > 0) {
      console.log(`Matched allergy for dish:`, { dishAllergens, userAllergies, matched });
    }
    return Array.from(new Set(matched));
  };

  const dishesWithAllergens = restaurant.dishes.map(dish => ({
    ...dish,
    matchedAllergies: getMatchedAllergies(dish.allergens)
  })).filter(d => d.matchedAllergies.length > 0);


  return (
    <AppShell>
      <div className="pb-20 relative">
        {/* ── Header / Hero Section ── */}
        <div className="relative h-[40vh] md:h-[50vh] w-full">
          {/* Back Button */}
          <button
            onClick={handleBack}
            className="absolute top-6 left-6 z-20 p-3 bg-white/90 dark:bg-[#3D312A]/90 backdrop-blur-md rounded-full shadow-lg hover:scale-110 transition-transform"
          >
            <ArrowLeft className="w-6 h-6 text-gray-900 dark:text-[#E6DFD5]" />
          </button>

          {/* Hero Image */}
          <div className="absolute inset-0">
            <Image
              src={restaurant.image_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80'}
              alt={restaurant.name}
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/20 to-transparent" />
          </div>

          {/* Restaurant Info Overlay */}
          <div className="absolute bottom-0 left-0 w-full p-6 md:p-10 text-white">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="text-3xl md:text-5xl font-bold mb-3">{restaurant.name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm md:text-base opacity-90">
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  <span className="font-semibold">
                    {restaurant.total_reviews > 0
                      ? restaurant.rating_avg.toFixed(1)
                      : "Chưa có đánh giá"}
                    {restaurant.total_reviews > 0 && (
                      <span className="font-normal text-gray-200 ml-1">
                        ({restaurant.total_reviews} đánh giá)
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-5 h-5 text-red-400" />
                  <span>{restaurant.address}</span>
                </div>
                {restaurant.price_range && (
                  <div className="flex items-center gap-1">
                    <span className="w-5 h-5 flex items-center justify-center text-green-400 font-bold text-lg">$</span>
                    <span className="font-medium">{restaurant.price_range}</span>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>

        {/* ── Main Content ── */}
        <div className="max-w-7xl mx-auto px-6 -mt-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Left Column: Menu & Details */}
            <div className="lg:col-span-2 space-y-10">

              {/* Quick Actions (Mobile Sticky bottom alternative) */}
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    if (restaurant.google_maps_url) {
                      window.open(restaurant.google_maps_url, '_blank');
                    } else {
                      window.open(`https://maps.google.com/?q=${encodeURIComponent(restaurant.address)}`, '_blank');
                    }
                  }}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-4 bg-brand hover:bg-brand-hover text-white font-bold rounded-2xl shadow-xl shadow-brand/20 transition-all transform hover:-translate-y-1"
                >
                  <Navigation className="w-5 h-5" />
                  Chỉ đường ngay
                </button>
              </div>

              {/* Allergen Warning Section */}
              {dishesWithAllergens.length > 0 && (
                <section className="bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-3xl overflow-hidden shadow-sm">
                  <button
                    onClick={() => setIsAllergenSectionOpen(!isAllergenSectionOpen)}
                    className="w-full flex items-center justify-between p-5 hover:bg-amber-100/50 dark:hover:bg-amber-500/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 dark:bg-amber-500/20 rounded-xl">
                        <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-500" />
                      </div>
                      <div className="text-left">
                        <h2 className="text-lg font-bold text-amber-900 dark:text-amber-200">Lưu ý dị ứng của bạn</h2>
                        <p className="text-sm text-amber-700 dark:text-amber-400">Nhà hàng này có {dishesWithAllergens.length} món chứa thành phần bạn bị dị ứng</p>
                      </div>
                    </div>
                    <ChevronRight className={`w-5 h-5 text-amber-500 transition-transform ${isAllergenSectionOpen ? 'rotate-90' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isAllergenSectionOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 pt-2 space-y-3 border-t border-amber-100 dark:border-amber-500/10">
                          {dishesWithAllergens.map((d, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm">
                              <span className="text-amber-500 mt-1">•</span>
                              <p className="text-gray-700 dark:text-gray-300">
                                <span className="font-bold">{d.name}</span>
                                <span className="text-gray-400 mx-2">→</span>
                                <span className="text-amber-600 dark:text-amber-400 font-medium">
                                  Chứa: {d.matchedAllergies.join(", ")}
                                </span>
                              </p>
                            </div>
                          ))}
                          <div className="mt-4 p-3 bg-green-50 dark:bg-green-500/10 rounded-xl flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-green-600 dark:text-green-500" />
                            <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                              Các món còn lại trong thực đơn an toàn để bạn thưởng thức.
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </section>
              )}

              {/* Menu Section */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-brand-muted dark:bg-brand/20 rounded-lg">
                    <UtensilsCrossed className="w-6 h-6 text-brand dark:text-[#E8735A]" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-[#E6DFD5]">Thực đơn nổi bật</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {restaurant.dishes.length > 0 ? (
                    restaurant.dishes.map((dish, idx) => (
                      <motion.div
                        key={dish.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.1 }}
                        className="group bg-white dark:bg-[#3D312A] rounded-3xl overflow-hidden shadow-sm border border-gray-100 dark:border-[#4D3D32] hover:shadow-xl transition-all"
                      >
                        <div className="flex p-4 gap-4">
                          <div className="relative w-24 h-24 flex-shrink-0">
                            <Image
                              src={dish.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80'}
                              alt={dish.name}
                              fill
                              sizes="(max-width: 768px) 100vw, 96px"
                              className="object-cover rounded-2xl"
                            />
                          </div>
                          <div className="flex flex-col justify-between py-1">
                            <div>
                              <h3 className="font-bold text-gray-900 dark:text-[#E6DFD5] group-hover:text-brand transition-colors">
                                {dish.name}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-gray-400 line-clamp-1">Hương vị đậm đà, tươi ngon</p>
                                {getMatchedAllergies(dish.allergens).length > 0 ? (
                                  <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-[10px] font-bold border border-red-200 dark:border-red-500/30">
                                    ⚠️ Dị ứng
                                  </span>
                                ) : (
                                  <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400 text-[10px] font-bold border border-green-200 dark:border-green-500/20">
                                    ✅ An toàn
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-brand dark:text-[#E8735A] font-bold">
                              {dish.price.toLocaleString('vi-VN')} ₫
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="col-span-full py-10 text-center bg-gray-100 dark:bg-[#3D312A]/50 rounded-3xl">
                      <p className="text-gray-500">Đang cập nhật thực đơn...</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Reviews removed from left column — now in sidebar */}
            </div>

            {/* Right Column: Sidebar Info */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-[#3D312A] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-[#4D3D32]">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-[#E6DFD5]">
                  <Info className="w-5 h-5 text-brand dark:text-[#E8735A]" />
                  Thông tin chung
                </h3>
                <div className="space-y-5">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-700 dark:text-[#C8BFB0]">Giờ mở cửa</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-gray-500">
                          {restaurant.open_time && restaurant.close_time
                            ? `${restaurant.open_time} - ${restaurant.close_time}`
                            : 'Đang cập nhật'}
                        </p>
                        {restaurant.is_open_now ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400">
                            Đang mở cửa
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400">
                            Đã đóng cửa
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {restaurant.tags && restaurant.tags.length > 0 && (
                    <div className="flex items-start gap-3 pt-4 border-t border-gray-100 dark:border-[#4D3D32]">
                      <UtensilsCrossed className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-gray-700 dark:text-[#C8BFB0] mb-2">Phân loại</p>
                        <div className="flex flex-wrap gap-2">
                          {restaurant.tags.map((tag, i) => (
                            <span key={i} className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider bg-brand-muted dark:bg-brand/10 text-brand-hover dark:text-[#E6DFD5] rounded-full border border-brand-muted dark:border-brand/20">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Reviews Panel — above map */}
              <div id="reviews-section" className="bg-white dark:bg-[#3D312A] p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-[#4D3D32]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold flex items-center gap-2 text-gray-900 dark:text-[#E6DFD5]">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    Bình luận
                  </h3>
                  <div className="flex gap-1.5">
                    {authToken && (
                      <button onClick={() => setIsWriteReviewOpen(true)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl bg-brand text-white hover:bg-brand-hover transition-colors shadow-sm shadow-brand/10">
                        <MessageSquarePlus className="w-3.5 h-3.5" />
                        Đánh giá
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                  {reviews.slice(0, 3).map((review, idx) => (
                    <div key={review.id || idx} className="bg-gray-50 dark:bg-[#2A2420] p-3 rounded-2xl border border-gray-100 dark:border-[#4D3D32]">
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-bold text-[11px] text-gray-800 dark:text-[#E6DFD5] line-clamp-1">{review.reviewer_name || 'Ẩn danh'}</p>
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center gap-0.5">
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            <span className="text-[10px] font-bold text-yellow-700 dark:text-yellow-400">{review.rating?.toFixed(1)}</span>
                          </div>
                          <button
                            onClick={() => {
                              interactionService.logInteraction({
                                res_id: restaurant.id,
                                action_type: "VIEW_REVIEW_DETAIL",
                                metadata: { review_id: review.id, reviewer_name: review.reviewer_name || 'Ẩn danh', source: "sidebar_comment_eye" }
                              });
                              setSelectedReview(review);
                            }}
                            className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-[#3D312A] hover:text-brand transition-colors"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-3 h-3" />
                          </button>
                          {currentUserId && review.user_id === currentUserId && (
                            <button onClick={() => setPendingDeleteId(review.id)}
                              className="p-1 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 transition-colors">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-[#9A8A7A] line-clamp-2">{review.text || 'Không có nội dung.'}</p>
                    </div>
                  ))}
                  {reviews.length === 0 && (
                    <p className="text-center text-xs text-gray-400 py-4">Chưa có bình luận nào.</p>
                  )}
                </div>
                {reviews.length > 0 && (
                  <button onClick={() => setIsAllReviewsOpen(true)} className="w-full mt-3 text-xs font-semibold text-brand hover:underline text-center">
                    Xem tất cả bình luận →
                  </button>
                )}
              </div>

              {/* Map Section */}
              <div className="bg-white dark:bg-[#3D312A] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-[#4D3D32]">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-[#E6DFD5]">
                  <MapPin className="w-5 h-5 text-blue-500" />
                  Vị trí nhà hàng
                </h3>
                <div
                  className="w-full h-[300px] rounded-2xl overflow-hidden border border-gray-200 dark:border-[#4D3D32] shadow-inner bg-gray-200 dark:bg-[#3D312A] relative group cursor-pointer"
                  onClick={() => setIsMapModalOpen(true)}
                >
                  {/* Transparent overlay to capture clicks */}
                  <div className="absolute inset-0 z-10 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 bg-white dark:bg-[#3D312A] px-4 py-2 rounded-full font-bold text-sm shadow-lg transition-opacity flex items-center gap-2 text-gray-800 dark:text-[#E6DFD5]">
                      <MapPin className="w-4 h-4 text-brand dark:text-[#E8735A]" />
                      Phóng to bản đồ
                    </div>
                  </div>
                  {/* Bản đồ không còn lớp phủ mờ, hiển thị sắc nét 100% */}
                  <iframe
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    src={
                      restaurant.lat && restaurant.lng
                        ? `https://maps.google.com/maps?q=${restaurant.lat},${restaurant.lng}&hl=vi&z=16&output=embed`
                        : `https://maps.google.com/maps?q=${encodeURIComponent(restaurant.address)}&hl=vi&z=16&output=embed`
                    }
                  ></iframe>

                  {/* Nhãn thông tin nhỏ gọn ở góc, không che khuất vị trí trung tâm */}
                  <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
                    <p className="text-[9px] uppercase tracking-wider font-bold bg-white/90 dark:bg-[#3D312A]/90 text-gray-500 px-2 py-1 rounded-md shadow-sm border border-gray-100 dark:border-[#4D3D32]">
                      Interactive
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── Map Modal ── */}
        <AnimatePresence>
          {isMapModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsMapModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-5xl h-[80vh] bg-white dark:bg-[#2A2420] rounded-3xl overflow-hidden shadow-2xl flex flex-col"
              >
                <div className="p-4 border-b border-gray-100 dark:border-[#3D312A] flex justify-between items-center bg-gray-50 dark:bg-[#2A2420]">
                  <h3 className="text-lg md:text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-[#E6DFD5]">
                    <MapPin className="w-6 h-6 text-brand dark:text-[#E8735A]" />
                    Bản đồ: {restaurant.name}
                  </h3>
                  <button
                    onClick={() => setIsMapModalOpen(false)}
                    className="p-2 bg-gray-200 hover:bg-gray-300 dark:bg-[#3D312A] dark:hover:bg-gray-700 rounded-full transition-colors text-gray-700 dark:text-[#C8BFB0]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 w-full bg-gray-200 dark:bg-[#3D312A] relative">
                  <iframe
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    src={
                      restaurant.lat && restaurant.lng
                        ? `https://maps.google.com/maps?q=${restaurant.lat},${restaurant.lng}&hl=vi&z=16&output=embed`
                        : `https://maps.google.com/maps?q=${encodeURIComponent(restaurant.address)}&hl=vi&z=16&output=embed`
                    }
                  ></iframe>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* ── All Reviews Modal ── */}
        <AnimatePresence>
          {(isAllReviewsOpen || selectedReview) && restaurant && (
            <AllReviewsModal
              restaurantId={activeRestaurantId || ''}
              restaurantName={restaurant.name}
              reviews={selectedReview ? [selectedReview] : reviews}
              currentUserId={currentUserId}
              authToken={authToken}
              onClose={() => { setIsAllReviewsOpen(false); setSelectedReview(null); }}
              onReviewDeleted={(id) => {
                setReviews(prev => prev.filter(r => r.id !== id));
                if (selectedReview?.id === id) setSelectedReview(null);
              }}
              onWriteReview={() => { setIsAllReviewsOpen(false); setSelectedReview(null); setIsWriteReviewOpen(true); }}
              isDetailView={!!selectedReview}
            />
          )}
        </AnimatePresence>

        {/* ── Write Review Modal ── */}
        <AnimatePresence>
          {isWriteReviewOpen && restaurant && (
            <WriteReviewModal
              restaurantId={activeRestaurantId || ''}
              restaurantName={restaurant.name}
              authToken={authToken}
              onClose={() => setIsWriteReviewOpen(false)}
              onReviewAdded={(r) => setReviews(prev => [r, ...prev])}
            />
          )}
        </AnimatePresence>

        {/* ── Delete Confirm Modal ── */}
        <AnimatePresence>
          {pendingDeleteId && (
            <DeleteConfirmModal
              onConfirm={() => handleDeleteReview(pendingDeleteId)}
              onCancel={() => setPendingDeleteId(null)}
            />
          )}
        </AnimatePresence>

      </div>
    </AppShell>
  );
}

/* ── Auxiliary Components ── */

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#FAF7F2] dark:bg-[#2A2420] animate-pulse">
      <div className="h-[40vh] bg-gray-200 dark:bg-[#3D312A]" />
      <div className="max-w-7xl mx-auto px-6 -mt-8 flex flex-col gap-8">
        <div className="h-14 w-48 bg-gray-200 dark:bg-[#3D312A] rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-40 bg-gray-200 dark:bg-[#3D312A] rounded-3xl" />
            <div className="h-80 bg-gray-200 dark:bg-[#3D312A] rounded-3xl" />
          </div>
          <div className="h-60 bg-gray-200 dark:bg-[#3D312A] rounded-3xl" />
        </div>
      </div>
    </div>
  );
}

function ErrorState({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#FAF7F2] dark:bg-[#2A2420]">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-950 rounded-full flex items-center justify-center mx-auto mb-6">
          <Info className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-[#E6DFD5] mb-2">Oops! Có lỗi xảy ra</h2>
        <p className="text-gray-500 mb-8">{message}</p>
        <button
          onClick={onBack}
          className="px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full font-bold hover:scale-105 transition-transform"
        >
          Quay lại
        </button>
      </div>
    </div>
  );
}

/* ── AllReviewsModal ── */
/* ── AllReviewsModal ── */
interface AllReviewsModalProps {
  restaurantId: string;
  restaurantName: string;
  reviews: Review[];
  currentUserId: string | null;
  authToken: string | null;
  onClose: () => void;
  onReviewDeleted: (id: string) => void;
  onWriteReview?: () => void;
  isDetailView?: boolean;
}

function AllReviewsModal({ restaurantId, restaurantName, reviews, currentUserId, authToken, onClose, onReviewDeleted, onWriteReview, isDetailView }: AllReviewsModalProps) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const handleDelete = async (reviewId: string) => {
    if (!authToken) return;
    try {
      const res = await fetch(`${apiUrl}/api/v1/restaurants/${restaurantId}/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok || res.status === 204) {
        onReviewDeleted(reviewId);
        setPendingDeleteId(null);
        toast.success("Xóa bình luận thành công!");
        
        // Ghi nhận tương tác xóa bình luận
        interactionService.logInteraction({
          res_id: restaurantId,
          action_type: "DELETE_REVIEW",
          metadata: { review_id: reviewId, source: "reviews_modal" }
        });
      } else if (res.status === 401) {
        window.dispatchEvent(new Event("auth-session-expired"));
      } else {
        toast.error("Không thể xóa bình luận. Vui lòng thử lại!");
      }
    } catch (err) {
      console.error("Failed to delete review in modal:", err);
      toast.error("Lỗi kết nối hệ thống khi xóa bình luận!");
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-10 md:p-16 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[80vh] my-auto bg-white dark:bg-[#2A2420] rounded-3xl overflow-hidden shadow-2xl flex flex-col">

        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-[#3D312A] flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-[#E6DFD5] flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" /> {isDetailView ? 'Chi tiết bình luận' : 'Bình luận'}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">{restaurantName}</p>
          </div>
          <div className="flex items-center gap-2">
            {authToken && onWriteReview && (
              <button onClick={onWriteReview} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-brand text-white hover:bg-brand-hover transition-colors shadow-md shadow-brand/10 mr-1">
                <MessageSquarePlus className="w-4 h-4" />
                Viết đánh giá
              </button>
            )}
            <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-[#3D312A] dark:hover:bg-[#4D3D32] rounded-full transition-colors">
              <X className="w-5 h-5 text-gray-700 dark:text-[#C8BFB0]" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {reviews.length === 0 && (
            <div className="py-12 text-center text-gray-400">
              <Star className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Chưa có bình luận nào. Hãy là người đầu tiên!</p>
            </div>
          )}
          {reviews.map((review, idx) => (
            <motion.div key={review.id || idx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
              className="bg-gray-50 dark:bg-[#3D312A] p-4 rounded-2xl border border-gray-100 dark:border-[#4D3D32]">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-gradient-to-br from-brand to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {(review.reviewer_name || 'A').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900 dark:text-[#E6DFD5]">{review.reviewer_name || 'Ẩn danh'}</p>
                    <p className="text-xs text-gray-400">{review.date || 'Gần đây'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-50 dark:bg-yellow-500/10 rounded-lg">
                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                    <span className="text-xs font-bold text-yellow-700 dark:text-yellow-400">{review.rating?.toFixed(1)}</span>
                  </div>
                  {currentUserId && review.user_id === currentUserId && (
                    <button onClick={() => setPendingDeleteId(review.id)}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-[#C8BFB0] leading-relaxed">{review.text || 'Không có nội dung.'}</p>
            </motion.div>
          ))}
        </div>

        <AnimatePresence>
          {pendingDeleteId && (
            <DeleteConfirmModal onConfirm={() => handleDelete(pendingDeleteId)} onCancel={() => setPendingDeleteId(null)} />
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

/* ── WriteReviewModal ── */
interface WriteReviewModalProps {
  restaurantId: string;
  restaurantName: string;
  authToken: string | null;
  onClose: () => void;
  onReviewAdded: (r: Review) => void;
}

function WriteReviewModal({ restaurantId, restaurantName, authToken, onClose, onReviewAdded }: WriteReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [anonymousPreview, setAnonymousPreview] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const handleToggleAnonymous = async () => {
    const newVal = !isAnonymous;
    setIsAnonymous(newVal);
    if (newVal && authToken) {
      try {
        const res = await fetch(`${apiUrl}/api/v1/reviews/check-anonymous?restaurant_id=${restaurantId}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          setAnonymousPreview(data.anonymous_number);
        }
      } catch (err) {
        console.error("Failed to check anonymous status:", err);
      }
    }
  };

  const handleSubmit = async () => {
    if (rating === 0 || !authToken) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/restaurants/${restaurantId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ rating: rating * 2, text: text.trim() || null, is_anonymous: isAnonymous }),
      });
      if (res.ok) {
        const r = await res.json();
        onReviewAdded(r);
        setRating(0);
        setText('');
        setIsAnonymous(false);
        setAnonymousPreview(null);
        onClose();
        toast.success("Gửi đánh giá thành công!");
      } else if (res.status === 401) {
        window.dispatchEvent(new Event("auth-session-expired"));
      } else {
        toast.error("Không thể gửi đánh giá. Vui lòng thử lại!");
      }
    } catch (err) {
      console.error("Failed to submit review:", err);
      toast.error("Lỗi kết nối hệ thống khi gửi đánh giá!");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-10 md:p-16 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-lg my-auto bg-white dark:bg-[#2A2420] rounded-3xl overflow-hidden shadow-2xl flex flex-col p-6 space-y-4">

        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-100 dark:border-[#3D312A] pb-3">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-[#E6DFD5] flex items-center gap-2">
              <MessageSquarePlus className="w-5 h-5 text-brand" /> Viết đánh giá
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">{restaurantName}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-[#3D312A] dark:hover:bg-[#4D3D32] rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-700 dark:text-[#C8BFB0]" />
          </button>
        </div>

        {/* Form Body */}
        {authToken ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-600 dark:text-[#C8BFB0] mr-2">Điểm:</span>
              <div className="flex items-center gap-1" onMouseLeave={() => setHoverRating(0)}>
                {[1, 2, 3, 4, 5].map(s => (
                  <div key={s} className="relative w-7 h-7 transition-transform hover:scale-125 flex-shrink-0">
                    <Star className="absolute top-0 left-0 w-full h-full text-gray-300 dark:text-gray-600 fill-current pointer-events-none" />
                    {(hoverRating || rating) >= s && (
                      <Star className="absolute top-0 left-0 w-full h-full text-yellow-500 fill-current pointer-events-none" />
                    )}
                    {(hoverRating || rating) === s - 0.5 && (
                      <div className="absolute top-0 left-0 w-1/2 h-full overflow-hidden text-yellow-500 pointer-events-none">
                        <Star className="w-7 h-7 fill-current" />
                      </div>
                    )}
                    <button type="button" aria-label={`Rate ${s - 0.5} stars`} className="absolute top-0 left-0 w-1/2 h-full z-10 cursor-pointer focus:outline-none" onMouseEnter={() => setHoverRating(s - 0.5)} onClick={() => setRating(s - 0.5)} />
                    <button type="button" aria-label={`Rate ${s} stars`} className="absolute top-0 right-0 w-1/2 h-full z-10 cursor-pointer focus:outline-none" onMouseEnter={() => setHoverRating(s)} onClick={() => setRating(s)} />
                  </div>
                ))}
                <span className="ml-2 text-xs text-gray-400">{rating > 0 ? `${rating * 2}/10` : 'Chưa chọn'}</span>
              </div>
            </div>

            {/* Toggle Switch "Đánh giá ẩn danh" */}
            <div className="flex flex-col gap-1 bg-gray-50 dark:bg-[#3D312A] p-3 rounded-2xl border border-gray-100 dark:border-[#4D3D32] transition-colors duration-300">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700 dark:text-[#C8BFB0]">Đánh giá ẩn danh:</span>
                <button
                  type="button"
                  onClick={handleToggleAnonymous}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand/40 ${isAnonymous ? 'bg-brand' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isAnonymous ? 'translate-x-5' : 'translate-x-0'
                      }`}
                  />
                </button>
              </div>
              {isAnonymous && (
                <p className="text-[11px] text-brand dark:text-[#E8735A] font-semibold mt-1">
                  {anonymousPreview !== null
                    ? `Bạn sẽ bình luận dưới tên: Người ẩn danh số ${anonymousPreview}`
                    : 'Bạn sẽ bình luận dưới tên: Người ẩn danh mới'}
                </p>
              )}
            </div>

            <textarea value={text} onChange={e => setText(e.target.value)} maxLength={500}
              placeholder="Chia sẻ trải nghiệm của bạn..." rows={4}
              className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-[#3D312A] border border-gray-200 dark:border-[#4D3D32] text-sm text-gray-800 dark:text-[#E6DFD5] placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-brand/40" />

            <div className="flex justify-end pt-2">
              <button onClick={handleSubmit} disabled={rating === 0 || isSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-white text-sm font-bold hover:bg-brand-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full justify-center md:w-auto shadow-md shadow-brand/15">
                <Send className="w-4 h-4" />{isSubmitting ? 'Đang gửi...' : 'Gửi đánh giá'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <p className="text-sm text-gray-500 mb-4">Vui lòng đăng nhập để viết đánh giá.</p>
            <a href="/auth" className="px-6 py-2 rounded-xl bg-brand text-white text-sm font-bold hover:bg-brand-hover transition-colors">Đăng nhập</a>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ── DeleteConfirmModal ── */
function DeleteConfirmModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onCancel}>
      <motion.div initial={{ scale: 0.85, opacity: 0, y: 24 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.85, opacity: 0, y: 16 }}
        transition={{ type: 'spring', damping: 22, stiffness: 320 }} onClick={e => e.stopPropagation()}
        className="w-full max-w-sm bg-white dark:bg-[#2A2420] rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-[#4D3D32]">
        <div className="flex justify-center pt-8 pb-2">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center">
            <Trash2 className="w-7 h-7 text-red-500" />
          </div>
        </div>
        <div className="px-7 pt-3 pb-7 text-center">
          <h3 className="text-lg font-bold text-gray-900 dark:text-[#E6DFD5] mb-2">Xóa bình luận?</h3>
          <p className="text-sm text-gray-500 dark:text-[#9A8A7A] leading-relaxed mb-7">Hành động này không thể hoàn tác.</p>
          <div className="flex gap-3">
            <button onClick={onCancel} className="flex-1 py-3 rounded-2xl text-sm font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-[#3D312A] dark:hover:bg-[#4D3D32] text-gray-700 dark:text-[#C8BFB0] transition-all">Hủy</button>
            <button onClick={onConfirm} className="flex-1 py-3 rounded-2xl text-sm font-bold bg-red-500 hover:bg-red-600 text-white transition-all shadow-lg shadow-red-500/25 hover:-translate-y-0.5">Xóa ngay</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
