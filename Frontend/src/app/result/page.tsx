'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Sparkles, Search, Star, Navigation, ExternalLink, Brain, ChevronRight, Mic } from 'lucide-react';
import { useGeolocation } from '../../hooks/useGeolocation';

// ─── Các dòng trạng thái hiển thị xoay vòng trên màn hình loading ───────────
const AI_STATUS_MESSAGES = [
  'Khởi động Neural Engine...',
  'Đang quét không gian vector ẩm thực...',
  'Đang phân tích độ khớp sinh trắc học...',
  'Tổng hợp kết quả tối ưu...',
];

// ─── Thẻ Skeleton giữ chỗ trong khi chờ kết quả ────────────────────────────
function SkeletonCard({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-[#121A2A] border border-white/5 rounded-[2rem] overflow-hidden flex flex-col md:flex-row shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
    >
      {/* Skeleton phần ảnh */}
      <div className="md:w-[320px] h-64 md:h-auto shrink-0 p-4">
        <div className="w-full h-full rounded-2xl bg-white/[0.04] animate-pulse" />
      </div>
      {/* Skeleton phần nội dung */}
      <div className="p-6 md:p-8 flex flex-col justify-between flex-1 gap-4">
        <div className="space-y-3">
          <div className="h-7 w-2/3 rounded-full bg-white/[0.06] animate-pulse" />
          <div className="flex gap-4">
            <div className="h-4 w-16 rounded-full bg-white/[0.04] animate-pulse" />
            <div className="h-4 w-20 rounded-full bg-white/[0.04] animate-pulse" />
            <div className="h-4 w-14 rounded-full bg-white/[0.04] animate-pulse" />
          </div>
          <div className="h-4 w-full rounded-full bg-white/[0.04] animate-pulse" />
          <div className="h-4 w-5/6 rounded-full bg-white/[0.04] animate-pulse" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-28 rounded-full bg-white/[0.06] animate-pulse" />
          <div className="h-10 w-36 rounded-full bg-white/[0.04] animate-pulse" />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Text trạng thái chạy động (hiệu ứng blink kiểu hacker) ───────────────────
function HackerStatusText() {
  const [msgIdx, setMsgIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const cycle = () => {
      setVisible(false);
      setTimeout(() => {
        setMsgIdx(prev => (prev + 1) % AI_STATUS_MESSAGES.length);
        setVisible(true);
      }, 300);
    };
    const interval = setInterval(cycle, 1400);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.p
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.25 }}
      className="text-sm md:text-base font-mono font-semibold tracking-widest uppercase"
      style={{
        color: '#22d3ee',
        textShadow: '0 0 12px rgba(34,211,238,0.75), 0 0 28px rgba(34,211,238,0.35)',
      }}
    >
      {AI_STATUS_MESSAGES[msgIdx]}
    </motion.p>
  );
}

// ─── Component trang chính ─────────────────────────────────────────────────────
export default function ResultPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery] = useState('Tìm quán mì cay 7 cấp độ ở Làng Đại Học');
  const { location, error: locError, isLoading: loadingLocation, getLocation } = useGeolocation();

  useEffect(() => {
    // Tự động bắt GPS khi load vào trang
    getLocation();
  }, [getLocation]);

  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    // Chỉ bắt đầu gọi API khi đã có toạ độ GPS
    if (!location) return;

    const fetchRecommendations = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('http://127.0.0.1:8000/api/v1/search/recommend', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: searchQuery,
            lat: location.lat,
            lng: location.lng
          })
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data && data.results) {
            setResults(data.results);
          }
        } else {
          console.error("Backend error:", await res.text());
        }
      } catch (error) {
        console.error("Lỗi khi kết nối đến backend API:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendations();
  }, [location, searchQuery]);

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white font-sans pb-20 relative overflow-x-hidden">

      {/* Các vùng phát sáng nền (Ambient Glow) */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 -right-60 w-[500px] h-[500px] bg-cyan-900/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-amber-900/10 rounded-full blur-[120px]" />
      </div>

      {/* ===== THANH ĐIỀU HƯỚNG TRÊN CÙNG ===== */}
      <header className="px-6 md:px-10 py-4 flex items-center justify-between border-b border-white/5 bg-[#0B0F19]/90 backdrop-blur-xl sticky top-0 z-50">

        {/* Logo thương hiệu */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-[0_0_16px_rgba(245,158,11,0.4)] shrink-0">
            <span className="text-white font-black text-xs leading-none">T&T</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-lg tracking-tight text-white">TASTE&amp;TRAVEL</span>
            <span className="font-black text-sm text-amber-500 tracking-wider">AI</span>
          </div>
        </div>

        {/* Thanh điều hướng giữa */}
        <nav className="hidden md:flex items-center gap-7">
          <a href="#" className="text-sm text-white/50 hover:text-white transition-colors duration-200">Explore</a>
          <a href="#" className="text-sm text-white/50 hover:text-white transition-colors duration-200">AI Picks</a>
          <a href="#" className="text-sm text-amber-400 font-medium hover:text-amber-300 transition-colors duration-200">Results</a>
          <a href="#" className="text-sm text-white/50 hover:text-white transition-colors duration-200">Experiences</a>
        </nav>

        {/* Phần bên phải: Login + Avatar */}
        <div className="flex items-center gap-3">
          <button className="hidden sm:flex items-center px-4 py-2 rounded-full border border-white/15 text-sm text-white/80 hover:border-white/30 hover:text-white transition-all duration-200 bg-white/[0.03]">
            Login
          </button>
          <div className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center bg-white/5 hover:bg-white/10 hover:border-amber-500/30 cursor-pointer transition-all duration-300">
            <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16 relative z-10">

        <AnimatePresence mode="wait">
          {/* ===== TRẠNG THÁI LOADING ===== */}
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              {/* Khu vực hiệu ứng AI đang xử lý */}
              <div className="flex flex-col items-center text-center mb-14">

                {/* Icon Brain AI có hiệu ứng xoay và phát sáng */}
                <div className="relative mb-8">
                  {/* Vòng sóng ngoài cùng */}
                  <motion.div
                    animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute inset-0 rounded-full border border-cyan-400/40"
                    style={{ margin: '-16px' }}
                  />
                  {/* Vòng sóng giữa */}
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
                    className="absolute inset-0 rounded-full border border-cyan-500/30"
                    style={{ margin: '-8px' }}
                  />
                  {/* Khung chứa icon xoay */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                    className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-400/30 flex items-center justify-center backdrop-blur-xl"
                    style={{ boxShadow: '0 0 40px rgba(34,211,238,0.3), 0 0 80px rgba(168,85,247,0.15)' }}
                  >
                    <Brain className="w-9 h-9 text-cyan-400" style={{ filter: 'drop-shadow(0 0 8px rgba(34,211,238,0.8))' }} />
                  </motion.div>
                </div>

                {/* Badge trạng thái AI */}
                <div
                  className="inline-flex items-center gap-2 border border-cyan-500/30 text-cyan-400 text-xs font-semibold px-4 py-1.5 rounded-full mb-5"
                  style={{
                    background: 'rgba(8,145,178,0.1)',
                    boxShadow: '0 0 20px rgba(34,211,238,0.12)',
                  }}
                >
                  <motion.span
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0"
                  />
                  AI PROCESSING — NEURAL ENGINE ACTIVE
                </div>

                {/* Tiêu đề lớn */}
                <h1
                  className="text-3xl md:text-4xl font-bold mb-3 tracking-tight"
                  style={{
                    background: 'linear-gradient(135deg, #22d3ee 0%, #a78bfa 60%, #f59e0b 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Đang Xử Lý Yêu Cầu
                </h1>

                {/* Hiển thị câu truy vấn người dùng */}
                <p className="text-white/40 text-sm mb-6 max-w-md border border-white/5 rounded-xl px-4 py-2 bg-white/[0.02] font-mono">
                  &ldquo;{searchQuery}&rdquo;
                </p>

                {/* Dòng chữ trạng thái kiểu hacker */}
                <HackerStatusText />

                {/* Nếu có lỗi GPS, hiển thị ngay trên màn hình loading */}
                {locError && (
                  <div className="mt-8 p-4 bg-red-900/30 border border-red-500/50 rounded-xl text-red-300 text-sm max-w-sm flex flex-col items-center gap-3">
                    <p>⚠️ {locError}</p>
                    <button onClick={getLocation} className="px-4 py-2 bg-red-500/20 hover:bg-red-500/40 rounded-full font-semibold transition">
                      Khử chặn vị trí và Thử Lại
                    </button>
                  </div>
                )}

                {/* Thanh tiến trình chạy động */}
                <div className="mt-6 w-64 h-0.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                    className="h-full w-1/2 rounded-full"
                    style={{ background: 'linear-gradient(90deg, transparent, #22d3ee, #a78bfa, transparent)' }}
                  />
                </div>
              </div>

              {/* Các thẻ Skeleton giữ chỗ */}
              <div className="flex flex-col gap-6">
                {[0, 1, 2, 3].map(i => (
                  <SkeletonCard key={i} delay={i * 0.08} />
                ))}
              </div>
            </motion.div>
          ) : (
            /* ===== TRẠNG THÁI HIỂN THỊ KẾT QUẢ ===== */
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {/* Khu vực tiêu đề */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-16"
              >
                {/* Badge trạng thái màu tím */}
                <div className="inline-flex items-center gap-2 bg-purple-900/30 border border-purple-500/30 text-purple-300 text-xs font-semibold px-4 py-1.5 rounded-full mb-6 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
                  <Sparkles className="w-3 h-3" />
                  Neural Culinary Engine — Results Ready
                </div>

                <h1 className="text-4xl md:text-5xl lg:text-6xl font-playfair font-medium mb-6 tracking-tight text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                  Top 5 Lựa Chọn{' '}
                  <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-red-500">
                    Hoàn Hảo
                  </span>
                </h1>
                <p className="text-white/50 text-sm md:text-base font-light max-w-2xl mx-auto">
                  Curated by our neural engine based on your bio-metrics, location context, and culinary history.
                </p>

                {/* Thanh tìm kiếm lại */}
                <div className="mt-8 max-w-2xl mx-auto relative">
                  <div className="relative flex items-center bg-[#121A2A]/80 backdrop-blur-xl border border-white/10 rounded-[2rem] px-5 py-4 gap-3 focus-within:border-amber-500/40 focus-within:shadow-[0_0_30px_rgba(245,158,11,0.12)] transition-all duration-300">
                    <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />
                    <Brain className="w-5 h-5 text-amber-400 shrink-0" />
                    <input
                      type="text"
                      defaultValue={searchQuery}
                      className="flex-1 bg-transparent border-none outline-none text-sm text-white/80 placeholder-white/30 min-w-0"
                    />
                    <Mic className="w-5 h-5 text-white/30 hover:text-white/60 cursor-pointer transition-colors shrink-0" />
                    <button className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 text-white text-sm font-semibold shadow-[0_0_20px_rgba(245,158,11,0.35)] hover:shadow-[0_0_30px_rgba(245,158,11,0.55)] hover:scale-[1.02] transition-all duration-300 shrink-0 whitespace-nowrap">
                      Tìm lại
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />
                  </div>
                  
                  {/* Hiển thị lỗi hoặc trạng thái định vị GPS */}
                  <div className="absolute -bottom-8 left-0 right-0 flex justify-center text-sm">
                    {loadingLocation && <span className="text-cyan-400 animate-pulse font-medium">Đang định vị vệ tinh GPS...</span>}
                    {locError && (
                      <span className="text-red-400 font-medium">
                        ⚠️ {locError} <button onClick={getLocation} className="underline hover:text-red-300 ml-1">Thử Lại</button>
                      </span>
                    )}
                    {location && !loadingLocation && !locError && (
                      <span className="text-emerald-400 flex items-center gap-1.5 font-medium">
                        <MapPin className="w-4 h-4" /> Đã kết nối Neural GPS: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Danh sách thẻ kết quả */}
              <div className="flex flex-col gap-6">
                {results.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-[#121A2A]/40 backdrop-blur-2xl border border-white/5 rounded-[2rem] overflow-hidden flex flex-col md:flex-row hover:border-white/10 hover:shadow-[0_0_40px_rgba(245,158,11,0.06)] transition-all duration-500 shadow-[0_8px_32px_rgba(0,0,0,0.5)] group relative"
                  >
                    {/* Lớp phủ sáng bên trong (Glassmorphism) */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none rounded-[2rem]" />

                    {/* Cột hình ảnh */}
                    <div className="md:w-[320px] h-64 md:h-auto relative shrink-0 p-4">
                      <div className="w-full h-full relative rounded-2xl overflow-hidden">
                        <img
                          src={item.img}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                        {/* Lớp phủ gradient trên ảnh */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                        <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-md rounded-full w-9 h-9 flex items-center justify-center border border-white/10 text-sm font-semibold text-white/90 shadow-lg">
                          #{index + 1}
                        </div>
                      </div>
                    </div>

                    {/* Cột nội dung */}
                    <div className="p-6 md:p-8 flex flex-col justify-between flex-1">
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <h2 className="text-2xl font-semibold text-white tracking-wide" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{item.name}</h2>
                          <div className="bg-amber-950/40 text-amber-400 text-xs font-semibold px-3 py-1.5 rounded-full border border-amber-700/40 flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.15)] whitespace-nowrap ml-3">
                            <Sparkles className="w-3 h-3" />
                            {item.match} Match
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-5 text-white/60 text-sm mb-5 font-medium">
                          <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-purple-400" /> {item.dist}</span>
                          <span className="flex items-center gap-1.5"><span className="text-green-400 font-bold">$</span> {item.price}</span>
                          <span className="flex items-center gap-1.5"><Star className="w-4 h-4 text-amber-400 fill-amber-400" /> {item.rating}</span>
                        </div>

                        <div className="mb-6">
                          <div className="flex items-center gap-2 mb-2">
                            <Brain className="w-3.5 h-3.5 text-purple-400" />
                            <span className="text-purple-400 text-xs font-semibold uppercase tracking-widest">AI Analysis</span>
                          </div>
                          <p className="text-white/50 italic leading-relaxed text-[15px] border-l-2 border-white/10 pl-4 py-1 font-sans">
                            &ldquo;{item.reason}&rdquo;
                          </p>
                        </div>
                      </div>

                      {/* Các nút hành động */}
                      <div className="flex flex-wrap gap-3 mt-auto">
                        <button className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 text-white text-sm font-semibold shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] hover:scale-[1.02] transition-all duration-300 group/btn">
                          <ExternalLink className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" />
                          Đặt ngay
                        </button>
                        <button className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/10 bg-white/5 text-white/70 text-sm font-semibold hover:bg-white/10 hover:border-white/20 hover:text-white hover:scale-[1.02] transition-all duration-300 group/btn">
                          <Navigation className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" />
                          Xem trên bản đồ
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}