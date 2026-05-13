'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MapPin, ArrowLeft, ExternalLink, Utensils } from 'lucide-react';
import { Roboto } from 'next/font/google';

const roboto = Roboto({
  subsets: ['latin', 'vietnamese'],
  weight: ['300', '400', '500', '700', '900'],
});

interface Dish {
  name: string;
  price: number;
  image_url?: string;
}

interface RestaurantDetail {
  id: string;
  name: string;
  address?: string;
  google_maps_url?: string;
}

interface RestaurantWithDishes {
  restaurant: RestaurantDetail;
  dishes: Dish[];
}

export default function RestaurantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [data, setData] = useState<RestaurantWithDishes | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
        const res = await fetch(`${apiUrl}/api/v1/restaurants/${id}`);
        if (!res.ok) {
          if (res.status === 404) throw new Error('Không tìm thấy nhà hàng.');
          throw new Error('Đã có lỗi xảy ra khi tải dữ liệu.');
        }
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) fetchRestaurant();
  }, [id]);

  if (isLoading) {
    return (
      <div className={`min-h-screen bg-[#F7F8FA] dark:bg-gray-900 flex items-center justify-center ${roboto.className}`}>
        <div className="text-gray-500 dark:text-gray-400 animate-pulse font-medium">Đang tải dữ liệu nhà hàng...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`min-h-screen bg-[#F7F8FA] dark:bg-gray-900 flex flex-col items-center justify-center ${roboto.className}`}>
        <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center mb-6">
          <Utensils className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">Lỗi tải dữ liệu</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">{error || 'Không tìm thấy thông tin nhà hàng.'}</p>
        <button
          onClick={() => window.close()}
          className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-full transition-all font-medium shadow-md"
        >
          Đóng trang này
        </button>
      </div>
    );
  }

  const { restaurant, dishes } = data;

  return (
    <div className={`min-h-screen bg-[#F7F8FA] dark:bg-gray-900 pb-12 ${roboto.className}`}>
      {/* Header Bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-6 py-4 sticky top-0 z-10 flex items-center shadow-sm">
        <button
          onClick={() => window.close()}
          title="Đóng trang này"
          className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors mr-4"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">
          Chi tiết nhà hàng
        </h1>
      </div>

      <div className="max-w-5xl mx-auto px-6 md:px-10 mt-8">
        {/* Restaurant Info Section */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-gray-700 mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {restaurant.name}
          </h1>

          {restaurant.address && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 flex items-start gap-2">
              <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5 text-orange-500" />
              <span>{restaurant.address}</span>
            </p>
          )}

          {restaurant.google_maps_url && (
            <button
              onClick={() => window.open(restaurant.google_maps_url, '_blank')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 font-medium rounded-xl hover:bg-orange-100 dark:hover:bg-orange-500/20 transition-colors"
            >
              <ExternalLink className="w-4 h-4" /> Xem đường đi trên Bản đồ
            </button>
          )}
        </div>

        {/* Menu Section */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
            <Utensils className="w-6 h-6 text-orange-500" />
            Thực đơn
          </h2>

          {dishes.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
              Nhà hàng này chưa cập nhật thực đơn.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {dishes.map((dish, idx) => (
                <div key={idx} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden hover:shadow-md transition-shadow group flex items-center p-3 gap-4">
                  {/* Dish Image */}
                  <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-900 flex-shrink-0 relative">
                    {dish.image_url ? (
                      <img
                        src={dish.image_url}
                        alt={dish.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://placehold.co/400x400?text=No+Image';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <Utensils className="w-8 h-8" />
                      </div>
                    )}
                  </div>

                  {/* Dish Info */}
                  <div className="flex-1 py-1 pr-2">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-1 line-clamp-2 leading-tight">
                      {dish.name}
                    </h3>
                    <p className="text-orange-500 font-semibold text-sm">
                      {dish.price.toLocaleString('vi-VN')} VND
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
