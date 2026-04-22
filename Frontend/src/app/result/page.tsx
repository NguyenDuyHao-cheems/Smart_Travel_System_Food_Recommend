'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Search, ChevronRight, Mic, Sparkles, Brain } from 'lucide-react';
import { useGeolocation } from '../../hooks/useGeolocation';

import { Header } from '../../components/ui/Header';
import { LoadingState } from '../../components/ui/LoadingState';
import { ResultCard } from '../../components/ui/ResultCard';

export default function ResultPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery] = useState('Tìm quán mì cay 7 cấp độ ở Làng Đại Học');
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
            setApiError(null);
          }
        } else {
          setApiError("Hệ thống Neural Engine đang gặp sự cố. Vui lòng thử lại sau.");
        }
      } catch (error) {
        setApiError("Không thể kết nối đến máy chủ. Hãy đảm bảo Backend đã được khởi động.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendations();
  }, [location, searchQuery]);

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white pb-20 relative overflow-x-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 -right-60 w-[500px] h-[500px] bg-cyan-900/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-amber-900/10 rounded-full blur-[120px]" />
      </div>

      <Header />

      <main className="max-w-5xl mx-auto px-6 py-16 relative z-10">
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
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-16"
              >
                <div className="inline-flex items-center gap-2 bg-purple-900/30 border border-purple-500/30 text-purple-300 text-xs font-semibold px-4 py-1.5 rounded-full mb-6 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
                  <Sparkles className="w-3 h-3" />
                  Neural Culinary Engine — Results Ready
                </div>

                <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium mb-6 tracking-tight text-white font-playfair">
                  Top 5 Lựa Chọn{' '}
                  <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-red-500">
                    Hoàn Hảo
                  </span>
                </h1>
                <p className="text-white/50 text-sm md:text-base font-light max-w-2xl mx-auto">
                  Curated by our neural engine based on your bio-metrics, location context, and culinary history.
                </p>

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

              <div className="flex flex-col gap-6">
                {apiError ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-10 border border-red-500/20 bg-red-950/10 rounded-[2rem] text-center"
                  >
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Brain className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-red-400 mb-2">Neural Link Severed</h2>
                    <p className="text-red-300/60 max-w-sm mx-auto mb-6">{apiError}</p>
                    <button 
                      onClick={() => window.location.reload()} 
                      className="px-6 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded-full transition-all"
                    >
                      Thử kết nối lại
                    </button>
                  </motion.div>
                ) : (
                  results.map((item, index) => (
                    <ResultCard key={item.id} item={item} index={index} />
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}