"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSelector } from "react-redux";
import Link from "next/link";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useWeather } from "../hooks/useWeather";
import { RootState } from "../store";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface NewspaperMenuItem {
  slot: "breakfast" | "lunch" | "dinner";
  restaurant_id: string;
  restaurant_name: string;
  address?: string;
  rating_avg: number;
  image_url?: string;
  price_range?: string;
  open_time?: string;
  close_time?: string;
  google_maps_url?: string;
  lat?: number;
  lng?: number;
  suggested_dish_name?: string;
  suggested_dish_price?: number;
}

interface NewspaperMenuResponse {
  items: NewspaperMenuItem[];
  is_fallback?: boolean;
  radius_km?: number;
  message?: string;
}

export default function NewspaperMenu() {
  const [isMounted, setIsMounted] = useState(false);
  const [menu, setMenu] = useState<NewspaperMenuResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const coords = useSelector((state: RootState) => state.location.coords);
  const address = useSelector((state: RootState) => state.location.address);

  // Hydration fix: delay layout mounting until client-side is ready
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchNewspaperMenu = useCallback(async (force = false) => {
    try {
      setLoading(true);
      
      // Load from cache if not forcing refresh
      if (!force && typeof window !== "undefined") {
        const cached = sessionStorage.getItem("wanderbite_newspaper_menu");
        if (cached) {
          try {
            const parsed = JSON.parse(cached) as NewspaperMenuResponse;
            if (parsed && parsed.items && parsed.items.length > 0) {
              setMenu(parsed);
              setLoading(false);
              return;
            }
          } catch (e) {
            console.error("Failed to parse cached newspaper menu:", e);
          }
        }
      }

      const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
      const cleanUserId = userId && userId !== "guest" ? userId : "";

      let url = `${BACKEND_URL}/api/v1/search/newspaper-menu`;
      const params = new URLSearchParams();
      if (coords?.lat && coords?.lng) {
        params.append("lat", coords.lat.toString());
        params.append("lng", coords.lng.toString());
      }
      if (cleanUserId) {
        params.append("user_id", cleanUserId);
      }
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error("Failed to fetch newspaper menu");
      const data = (await res.json()) as NewspaperMenuResponse;
      setMenu(data);
      
      // Cache the result
      if (typeof window !== "undefined") {
        sessionStorage.setItem("wanderbite_newspaper_menu", JSON.stringify(data));
      }
    } catch (err) {
      console.error("Error fetching newspaper menu:", err);
    } finally {
      setLoading(false);
    }
  }, [coords]);

  // Prevent duplicate fetching on coords loads
  const fetchedCoordsRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isMounted) return;
    const coordKey = coords ? `${coords.lat},${coords.lng}` : "global";
    if (fetchedCoordsRef.current !== coordKey) {
      fetchedCoordsRef.current = coordKey;
      fetchNewspaperMenu();
    }
  }, [isMounted, coords, fetchNewspaperMenu]);

  // Weather pairing
  const weatherCoords = useMemo(() => {
    if (coords?.lat && coords?.lng) {
      return [{ id: "current", lat: coords.lat, lng: coords.lng }];
    }
    return [];
  }, [coords]);

  const { weatherMap } = useWeather(weatherCoords);
  const weatherInfo = weatherMap["current"];

  const weatherDescription = weatherInfo?.description || "trời dịu mát";

  const weatherAdjective = useMemo(() => {
    if (!weatherInfo) return "hấp dẫn";
    const descLower = weatherInfo.description.toLowerCase();
    if (
      descLower.includes("mưa") ||
      descLower.includes("giông") ||
      descLower.includes("bão") ||
      descLower.includes("lạnh")
    ) {
      return "ấm lòng";
    }
    if (
      descLower.includes("nắng") ||
      descLower.includes("quang") ||
      descLower.includes("nóng")
    ) {
      return "thanh mát";
    }
    if (
      descLower.includes("sương") ||
      descLower.includes("mây") ||
      descLower.includes("âm u")
    ) {
      return "đậm đà";
    }
    return "hấp dẫn";
  }, [weatherInfo]);

  // Geographic context parsing
  const city = useMemo(() => {
    if (!address) return "vị trí của bạn";
    const parts = address.split(",");
    if (parts.length >= 2) {
      const provincePart = parts[parts.length - 2].trim();
      return provincePart.replace(/^(Tỉnh|Thành phố|Thành Phố|TP\.|Tp\.)\s+/i, "").trim();
    }
    return address;
  }, [address]);

  // Date generators
  const dateInfo = useMemo(() => {
    const d = new Date();
    const daysOfWeek = ["Chủ Nhật", "thứ Hai", "thứ Ba", "thứ Tư", "thứ Năm", "thứ Sáu", "thứ Bảy"];
    const dayName = daysOfWeek[d.getDay()];
    const hour = d.getHours();
    
    let timeSlot = "sáng";
    if (hour >= 11 && hour < 14) {
      timeSlot = "trưa";
    } else if (hour >= 14 && hour < 18) {
      timeSlot = "chiều";
    } else if (hour >= 18 || hour < 4) {
      timeSlot = "tối";
    }

    const dateStr = `${dayName}, ngày ${String(d.getDate()).padStart(2, "0")} tháng ${String(d.getMonth() + 1).padStart(2, "0")} năm ${d.getFullYear()}`;
    return { timeSlot, dayName, dateStr };
  }, []);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    // Visual spin duration (at least 500ms)
    const startTime = Date.now();
    await fetchNewspaperMenu(true); // force = true
    const elapsedTime = Date.now() - startTime;
    const remainingTime = Math.max(0, 500 - elapsedTime);
    if (remainingTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, remainingTime));
    }
    setIsRefreshing(false);
  };

  // Render skeleton during SSR loading or normal API loading to prevent CLS
  if (!isMounted || (loading && !menu)) {
    return (
      <div className="w-full min-h-[480px] bg-[#FAF6EE] dark:bg-[#332B25] border border-[#d2c2ad] dark:border-[#4d3d32] rounded-lg p-6 animate-pulse flex flex-col justify-between shadow-md mb-8">
        <div className="border-b-4 border-[#3D312A]/30 dark:border-[#E6DFD5]/30 pb-4">
          <div className="h-10 bg-[#3D312A]/15 dark:bg-[#E6DFD5]/15 rounded w-1/3 mx-auto mb-4" />
          <div className="h-4 bg-[#3D312A]/15 dark:bg-[#E6DFD5]/15 rounded w-2/3 mx-auto" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 flex-grow">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col space-y-4">
              <div className="h-4 bg-[#3D312A]/15 dark:bg-[#E6DFD5]/15 rounded w-1/4" />
              <div className="aspect-[4/3] w-full bg-[#3D312A]/15 dark:bg-[#E6DFD5]/15 rounded" />
              <div className="h-6 bg-[#3D312A]/15 dark:bg-[#E6DFD5]/15 rounded w-3/4" />
              <div className="h-4 bg-[#3D312A]/15 dark:bg-[#E6DFD5]/15 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Display message if menu is empty
  const items = menu?.items || [];
  
  if (menu && items.length === 0) {
    return (
      <div className="relative w-full min-h-[480px] bg-[#FAF6EE] dark:bg-[#332B25] border border-[#d2c2ad] dark:border-[#4d3d32] shadow-md rounded-lg p-6 text-[#3D312A] dark:text-[#E6DFD5] mb-8 font-serif transition-colors duration-300 flex flex-col justify-between">
        <div className="text-center">
          <span className="text-[10px] tracking-widest font-mono uppercase text-[#3D312A]/70 dark:text-[#E6DFD5]/70 block mb-1">
            Ấm Thực Bản Tin
          </span>
          <h1 
            className="text-4xl md:text-5xl font-bold uppercase tracking-wide text-[#2B221E] dark:text-[#F3EDE2] leading-none mb-3"
            style={{ fontFamily: '"DFVN Paper Kuto", "Segoe UI", Roboto, sans-serif' }}
          >
            Wanderbite Daily
          </h1>
          <div className="border-t-4 border-b border-[#3D312A] dark:border-[#E6DFD5] py-2 my-3 flex flex-wrap justify-between items-center text-[10px] md:text-xs tracking-wider font-mono uppercase text-[#3D312A]/80 dark:text-[#E6DFD5]/80">
            <span>BẢN TIN SỐ: #W-{dateInfo.dayName.replace(" ", "")}</span>
            <span className="font-bold">{dateInfo.dateStr}</span>
            <span>GIÁ: 0đ (Miễn phí)</span>
          </div>
        </div>

        <div className="flex-grow flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="text-4xl mb-4 text-[#8A3324]/40 dark:text-[#E27A67]/40">📰</div>
          <h3 
            className="text-xl font-bold mb-2 text-[#2B221E] dark:text-[#F3EDE2]"
            style={{ fontFamily: '"DFVN Paper Kuto", "Segoe UI", Roboto, sans-serif' }}
          >
            Bản tin trống
          </h3>
          <p className="text-sm italic text-[#3D312A]/80 dark:text-[#E6DFD5]/80 max-w-md">
            {menu.message || "Không tìm thấy quán ăn nào phù hợp trong bán kính hoạt động quanh vị trí của bạn."}
          </p>
          <p className="text-xs font-mono text-[#3D312A]/60 dark:text-[#E6DFD5]/60 mt-4">
            (Thử cấp quyền vị trí GPS chính xác hơn hoặc nhấn nút Stamp bên dưới để thử lại)
          </p>
        </div>

        {/* Decorative Vintage Stamp Refresh Button */}
        <button 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="absolute bottom-3 right-3 md:bottom-5 md:right-5 bg-transparent border-2 border-dashed border-[#8A3324] hover:border-[#8A3324]/80 text-[#8A3324] dark:border-[#E27A67] dark:text-[#E27A67] rounded-full p-2 font-mono text-[8px] uppercase font-bold tracking-wider select-none hover:scale-105 active:scale-95 transition-all duration-300 rotate-12 cursor-pointer flex flex-col items-center justify-center w-24 h-24 text-center z-10"
          title="Ấn để xem bản tin ẩm thực khác"
        >
          <span className={`text-[8px] tracking-widest ${isRefreshing ? "animate-spin" : ""}`}>
            XEM
          </span>
          <span className="text-[9px] mt-0.5 font-bold">BẢN TIN KHÁC</span>
          <span className="text-[6px] tracking-normal text-[#8A3324]/60 dark:text-[#E27A67]/60 mt-1 block">
            ★ ★ ★
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-[480px] bg-[#FAF6EE] dark:bg-[#332B25] border border-[#d2c2ad] dark:border-[#4d3d32] shadow-md rounded-lg p-6 text-[#3D312A] dark:text-[#E6DFD5] mb-8 font-serif transition-colors duration-300">
      
      {/* Newspaper Top section */}
      <div className="text-center">
        <span className="text-[10px] tracking-widest font-mono uppercase text-[#3D312A]/70 dark:text-[#E6DFD5]/70 block mb-1">
          Ấm Thực Bản Tin
        </span>
        
        {/* Title / Masthead */}
        <h1 
          className="text-4xl md:text-5xl font-bold uppercase tracking-wide text-[#2B221E] dark:text-[#F3EDE2] leading-none mb-3"
          style={{ fontFamily: '"DFVN Paper Kuto", "Segoe UI", Roboto, sans-serif' }}
        >
          Wanderbite Daily
        </h1>

        {/* Double borders metadata panel */}
        <div className="border-t-4 border-b border-[#3D312A] dark:border-[#E6DFD5] py-2 my-3 flex flex-wrap justify-between items-center text-[10px] md:text-xs tracking-wider font-mono uppercase text-[#3D312A]/80 dark:text-[#E6DFD5]/80">
          <span>BẢN TIN SỐ: #W-{dateInfo.dayName.replace(" ", "")}</span>
          <span className="font-bold">{dateInfo.dateStr}</span>
          <span>GIÁ: 0đ (Miễn phí)</span>
        </div>

        {menu?.is_fallback && menu.message && (
          <div className="w-full text-center py-1.5 px-3 bg-[#8A3324]/5 dark:bg-[#E27A67]/5 border border-dashed border-[#8A3324]/30 dark:border-[#E27A67]/30 rounded text-[11px] font-mono italic text-[#8A3324] dark:text-[#E27A67] my-2">
            ⚠️ {menu.message}
          </div>
        )}
      </div>

      {/* Main Headline */}
      <div className="text-center my-6 max-w-3xl mx-auto border-b border-[#3D312A]/10 dark:border-[#E6DFD5]/10 pb-4">
        <h2 
          className="text-xl md:text-2xl font-bold text-[#2B221E] dark:text-[#F3EDE2] italic leading-tight"
          style={{ fontFamily: '"DFVN Paper Kuto", "Segoe UI", Roboto, sans-serif' }}
        >
          &ldquo;Wanderbite, bản tin {dateInfo.timeSlot} {dateInfo.dayName}. Thực đơn {weatherAdjective} cho ngày {weatherDescription.toLowerCase()} tại {city}&rdquo;
        </h2>
      </div>

      {/* 3 Columns Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#3D312A]/20 dark:divide-[#E6DFD5]/20 mt-6 gap-6 md:gap-0">
        {items.map((item, idx) => {
          const slotLabels = {
            breakfast: "Bữa Sáng (06h - 10h)",
            lunch: "Bữa Trưa (11h - 14h)",
            dinner: "Bữa Tối (17h - 21h)"
          };

          return (
            <div 
              key={item.slot} 
              className={`flex flex-col ${
                idx === 0 ? "md:pr-6 pb-6 md:pb-0" : idx === 1 ? "md:px-6 py-6 md:py-0" : "md:pl-6 pt-6 md:pt-0"
              }`}
            >
              {/* Column Slot Tag */}
              <div className="flex justify-between items-center mb-3">
                <span className="text-[11px] font-mono tracking-wider uppercase font-semibold text-[#8A3324] dark:text-[#E27A67]">
                  ✦ {slotLabels[item.slot]}
                </span>
                <span className="text-[10px] font-mono text-[#3D312A]/60 dark:text-[#E6DFD5]/60">
                  Phần {idx + 1}
                </span>
              </div>

              {/* Vintage Sepia-to-color Image Box */}
              <Link href={`/restaurant/${item.restaurant_id}`} className="group relative block w-full aspect-[4/3] overflow-hidden border border-[#3D312A]/20 dark:border-[#E6DFD5]/20 bg-[#e7dfd3] dark:bg-[#2c2420] rounded mb-3">
                <ImageWithFallback 
                  src={item.image_url || "/images/default_food.jpg"} 
                  alt={item.restaurant_name}
                  className="w-full h-full object-cover filter grayscale sepia brightness-90 contrast-105 transition-all duration-500 group-hover:filter-none group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-[#8A3324]/5 opacity-20 mix-blend-color transition-opacity group-hover:opacity-0" />
              </Link>

              {/* Restaurant Name */}
              <h3 className="text-lg font-bold leading-tight mb-1 hover:text-[#8A3324] dark:hover:text-[#E27A67] transition-colors duration-200">
                <Link href={`/restaurant/${item.restaurant_id}`}>
                  {item.restaurant_name}
                </Link>
              </h3>

              {/* Rating Star Badge */}
              <div className="flex items-center space-x-1 mb-2">
                <span className="text-[#D4AF37] text-xs">★</span>
                <span className="text-xs font-mono font-semibold">{item.rating_avg.toFixed(1)}</span>
                <span className="text-xs font-mono text-[#3D312A]/50 dark:text-[#E6DFD5]/50">
                  {item.price_range ? `· ${item.price_range}` : ""}
                </span>
              </div>

              {/* Suggested Dish Feature */}
              {item.suggested_dish_name && (
                <div className="mt-auto bg-[#3D312A]/5 dark:bg-[#E6DFD5]/5 border border-dashed border-[#3D312A]/20 dark:border-[#E6DFD5]/20 rounded p-3 text-xs leading-snug">
                  <div className="font-mono uppercase font-bold text-[9px] text-[#3D312A]/60 dark:text-[#E6DFD5]/60 mb-1">
                    Gợi ý món ngon:
                  </div>
                  <div className="font-semibold text-sm text-[#2B221E] dark:text-[#F3EDE2]">
                    {item.suggested_dish_name}
                  </div>
                  {item.suggested_dish_price && (
                    <div className="font-mono text-[#8A3324] dark:text-[#E27A67] mt-0.5">
                      Giá chỉ: {item.suggested_dish_price.toLocaleString("vi-VN")}đ
                    </div>
                  )}
                </div>
              )}

              {/* Operating Time and Address metadata */}
              <div className="text-[10px] text-[#3D312A]/70 dark:text-[#E6DFD5]/70 font-mono mt-3 space-y-1">
                {(item.open_time && item.close_time) && (
                  <div>Mở cửa: {item.open_time.slice(0, 5)} - {item.close_time.slice(0, 5)}</div>
                )}
                {item.address && (
                  <div className="line-clamp-2">Địa chỉ: {item.address}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Decorative Vintage Stamp Refresh Button */}
      <button 
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="absolute bottom-3 right-3 md:bottom-5 md:right-5 bg-transparent border-2 border-dashed border-[#8A3324] hover:border-[#8A3324]/80 text-[#8A3324] dark:border-[#E27A67] dark:text-[#E27A67] rounded-full p-2 font-mono text-[8px] uppercase font-bold tracking-wider select-none hover:scale-105 active:scale-95 transition-all duration-300 rotate-12 cursor-pointer flex flex-col items-center justify-center w-24 h-24 text-center z-10"
        title="Ấn để xem bản tin ẩm thực khác"
      >
        <span className={`text-[8px] tracking-widest ${isRefreshing ? "animate-spin" : ""}`}>
          XEM
        </span>
        <span className="text-[9px] mt-0.5 font-bold">BẢN TIN KHÁC</span>
        <span className="text-[6px] tracking-normal text-[#8A3324]/60 dark:text-[#E27A67]/60 mt-1 block">
          ★ ★ ★
        </span>
      </button>
    </div>
  );
}
