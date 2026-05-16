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
  X
} from 'lucide-react';
import Image from 'next/image';
import { interactionService } from '../../../services/interactionService';
import { AppShell } from '../../../components/AppShell';

interface Dish {
  id: string;
  name: string;
  price: number;
  image_url: string;
}

interface Review {
  id: string;
  reviewer_name: string;
  rating: number;
  text: string;
  date: string;
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

  const restaurantId = params.id as string;
  const sessionId = searchParams.get('session_id');

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${apiUrl}/api/v1/restaurants/${restaurantId}`);
        if (!res.ok) throw new Error('Không thể lấy thông tin nhà hàng.');
        const data = await res.json();
        setRestaurant(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetail();
  }, [restaurantId]);

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
    const mode = searchParams.get('mode');
    if (sessionId) {
      router.push(`/result?session_id=${sessionId}${mode ? `&mode=${mode}` : ''}`);
    } else {
      router.push('/');
    }
  };

  if (isLoading) return <AppShell><LoadingSkeleton /></AppShell>;
  if (error || !restaurant) return <AppShell><ErrorState message={error || 'Không tìm thấy dữ liệu.'} onBack={handleBack} /></AppShell>;


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

            {/* Menu Section */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-brand-muted dark:bg-brand/20 rounded-lg">
                  <UtensilsCrossed className="w-6 h-6 text-brand" />
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
                            <p className="text-xs text-gray-400 mt-1 line-clamp-1">Hương vị đậm đà, tươi ngon</p>
                          </div>
                          <p className="text-brand font-bold">
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

            {/* Reviews Section */}
            <section className="pt-6 border-t border-gray-100 dark:border-[#3D312A]">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-500/20 rounded-lg">
                  <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-[#E6DFD5]">Bình luận từ thực khách</h2>
              </div>

              <div className="space-y-4">
                {restaurant.reviews && restaurant.reviews.length > 0 ? (
                  restaurant.reviews.map((review, idx) => (
                    <motion.div
                      key={review.id || idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-white dark:bg-[#3D312A] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-[#4D3D32]"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-brand to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                            {(review.reviewer_name || "Ẩn danh").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-[#E6DFD5] text-sm">{review.reviewer_name || "Thực khách ẩn danh"}</p>
                            <p className="text-xs text-gray-400">{review.date || "Gần đây"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 px-2 py-1 bg-yellow-50 dark:bg-yellow-500/10 rounded-lg">
                          <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                          <span className="text-sm font-bold text-yellow-700 dark:text-yellow-500">
                            {review.rating ? review.rating.toFixed(1) : "N/A"}
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-600 dark:text-[#C8BFB0] text-sm leading-relaxed">
                        {review.text || "Người dùng không để lại lời bình luận nào."}
                      </p>
                    </motion.div>
                  ))
                ) : (
                  <div className="py-8 text-center bg-gray-50 dark:bg-[#3D312A]/30 rounded-2xl border border-dashed border-gray-200 dark:border-[#4D3D32]">
                    <p className="text-gray-500">Chưa có bình luận nào cho nhà hàng này.</p>
                  </div>
                )}
              </div>
            </section>

            {/* Removed Map Section from here */}
          </div>

          {/* Right Column: Sidebar Info */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#3D312A] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-[#4D3D32]">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-[#E6DFD5]">
                <Info className="w-5 h-5 text-brand" />
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
                          <span key={i} className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider bg-brand-muted dark:bg-brand/10 text-brand-hover dark:text-brand rounded-full border border-brand-muted dark:border-brand/20">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
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
                    <MapPin className="w-4 h-4 text-brand" />
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
                  <MapPin className="w-6 h-6 text-brand" />
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
