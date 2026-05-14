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
  ChevronRight
} from 'lucide-react';
import Image from 'next/image';

interface Dish {
  id: string;
  name: string;
  price: number;
  image_url: string;
}

interface Restaurant {
  id: string;
  name: string;
  address: string;
  google_maps_url: string;
  image_url: string;
  rating_avg: number;
  lat?: number;
  lng?: number;
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

  const handleBack = () => {
    if (sessionId) {
      router.push(`/result?session_id=${sessionId}`);
    } else {
      router.push('/');
    }
  };

  if (isLoading) return <LoadingSkeleton />;
  if (error || !restaurant) return <ErrorState message={error || 'Không tìm thấy dữ liệu.'} onBack={handleBack} />;


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
      {/* ── Header / Hero Section ── */}
      <div className="relative h-[40vh] md:h-[50vh] w-full">
        {/* Back Button */}
        <button 
          onClick={handleBack}
          className="absolute top-6 left-6 z-20 p-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-full shadow-lg hover:scale-110 transition-transform"
        >
          <ArrowLeft className="w-6 h-6 text-gray-900 dark:text-white" />
        </button>

        {/* Hero Image */}
        <div className="absolute inset-0">
          <Image
            src={restaurant.image_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80'}
            alt={restaurant.name}
            fill
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
                <span className="font-semibold">{restaurant.rating_avg.toFixed(1)}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-5 h-5 text-red-400" />
                <span>{restaurant.address}</span>
              </div>
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
                onClick={() => window.open(restaurant.google_maps_url, '_blank')}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl shadow-xl shadow-orange-500/20 transition-all transform hover:-translate-y-1"
              >
                <Navigation className="w-5 h-5" />
                Chỉ đường ngay
              </button>
            </div>

            {/* Menu Section */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-orange-100 dark:bg-orange-500/20 rounded-lg">
                  <UtensilsCrossed className="w-6 h-6 text-orange-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Thực đơn nổi bật</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {restaurant.dishes.length > 0 ? (
                  restaurant.dishes.map((dish, idx) => (
                    <motion.div
                      key={dish.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      className="group bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all"
                    >
                      <div className="flex p-4 gap-4">
                        <div className="relative w-24 h-24 flex-shrink-0">
                          <Image
                            src={dish.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80'}
                            alt={dish.name}
                            fill
                            className="object-cover rounded-2xl"
                          />
                        </div>
                        <div className="flex flex-col justify-between py-1">
                          <div>
                            <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-orange-500 transition-colors">
                              {dish.name}
                            </h3>
                            <p className="text-xs text-gray-400 mt-1 line-clamp-1">Hương vị đậm đà, tươi ngon</p>
                          </div>
                          <p className="text-orange-500 font-bold">
                            {dish.price.toLocaleString('vi-VN')} ₫
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-full py-10 text-center bg-gray-100 dark:bg-gray-800/50 rounded-3xl">
                    <p className="text-gray-500">Đang cập nhật thực đơn...</p>
                  </div>
                )}
              </div>
            </section>

            {/* Map Section */}
            <section className="pb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg">
                  <MapPin className="w-6 h-6 text-blue-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Vị trí nhà hàng</h2>
              </div>
              <div className="w-full h-[400px] rounded-3xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-inner bg-gray-200 dark:bg-gray-800 relative">
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
                <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
                   <p className="text-[10px] uppercase tracking-wider font-bold bg-white/90 dark:bg-gray-800/90 text-gray-500 px-3 py-1.5 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                      Google Maps Interactive
                   </p>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Sidebar Info */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                <Info className="w-5 h-5 text-orange-500" />
                Thông tin chung
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Giờ mở cửa</p>
                    <p className="text-xs text-gray-500">08:00 - 22:00 (Hàng ngày)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <UtensilsCrossed className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Phong cách</p>
                    <p className="text-xs text-gray-500">Ẩm thực địa phương, Hiện đại</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Support Box */}
            <div className="bg-gradient-to-br from-orange-500 to-pink-500 p-6 rounded-3xl text-white">
              <h3 className="font-bold mb-2">Cần đặt chỗ trước?</h3>
              <p className="text-xs opacity-90 mb-4">Hãy gọi cho chúng tôi để được giữ chỗ tốt nhất cho bữa tối của bạn.</p>
              <button className="w-full py-3 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl font-bold transition-colors">
                Gọi 1900 xxxx
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

/* ── Auxiliary Components ── */

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 animate-pulse">
      <div className="h-[40vh] bg-gray-200 dark:bg-gray-800" />
      <div className="max-w-7xl mx-auto px-6 -mt-8 flex flex-col gap-8">
        <div className="h-14 w-48 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded-3xl" />
            <div className="h-80 bg-gray-200 dark:bg-gray-800 rounded-3xl" />
          </div>
          <div className="h-60 bg-gray-200 dark:bg-gray-800 rounded-3xl" />
        </div>
      </div>
    </div>
  );
}

function ErrorState({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-950">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-950 rounded-full flex items-center justify-center mx-auto mb-6">
          <Info className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Oops! Có lỗi xảy ra</h2>
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
