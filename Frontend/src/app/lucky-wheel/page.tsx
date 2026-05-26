"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageLayout } from "../../components/PageLayout";
import { useOptimizedLocation } from "../../hooks/useOptimizedLocation";
import { Sparkles, ArrowRight, RefreshCw, Volume2, VolumeX, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "../../components/LanguageProvider";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// Neon colors for 12 segments
const NEON_COLORS = [
  "#FF2A6D", // Neon Pink
  "#9B5DE5", // Neon Violet
  "#F15BB5", // Neon Magenta
  "#00F5D4", // Neon Teal
  "#00BBF9", // Neon Blue
  "#39FF14", // Neon Green
  "#CCFF00", // Neon Lime
  "#FF9F1C", // Neon Orange
  "#FF5E00", // Neon Dark Orange
  "#FF003C", // Neon Red
  "#FFFF33", // Neon Yellow
  "#BD00FF", // Neon Violet-Blue
];

export default function LuckyWheelPage() {
  const router = useRouter();
  const { getOptimizedLocation } = useOptimizedLocation();
  const { t, language } = useLanguage();

  const [dishes, setDishes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Keep track of current rotation value to add to it for subsequent spins
  const currentRotationRef = useRef(0);
  
  // Audio contexts / audio generator for retro arcade sounds
  const audioCtxRef = useRef<AudioContext | null>(null);
  const soundEnabledRef = useRef(soundEnabled);
  const spinTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const spinRunIdRef = useRef(0);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const clearSpinTimers = useCallback(() => {
    spinTimersRef.current.forEach(clearTimeout);
    spinTimersRef.current = [];
  }, []);

  const stopAudioContext = useCallback(() => {
    const ctx = audioCtxRef.current;
    audioCtxRef.current = null;
    ctx?.close().catch(() => undefined);
  }, []);

  const queueSpinTimer = useCallback((callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      spinTimersRef.current = spinTimersRef.current.filter((item) => item !== timer);
      callback();
    }, delay);
    spinTimersRef.current.push(timer);
  }, []);

  const ensureAudioContext = async () => {
    if (typeof window === "undefined") return null;

    const AudioContextCtor =
      window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextCtor) return null;

    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContextCtor();
    }

    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    return ctx;
  };

  // Play retro synthesised sound using Web Audio API
  const playRetroSound = async (type: "tick" | "win" | "spin") => {
    if (!soundEnabledRef.current) return;
    try {
      const ctx = await ensureAudioContext();
      if (!ctx) return;

      if (type === "tick") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else if (type === "win") {
        // Play arcade fanfare
        const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
          gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.12 + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + i * 0.12);
          osc.stop(ctx.currentTime + i * 0.12 + 0.25);
        });
      } else if (type === "spin") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(100, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      }
    } catch (e) {
      console.warn("Audio Context error:", e);
    }
  };

  const handleSoundToggle = async () => {
    const nextEnabled = !soundEnabled;
    setSoundEnabled(nextEnabled);
    soundEnabledRef.current = nextEnabled;

    if (nextEnabled) {
      await ensureAudioContext();
      void playRetroSound("tick");
    }
  };

  // Fetch 12 dishes from backend
  const fetchDishes = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const gps = await getOptimizedLocation().catch(() => null);
      const url = new URL(`${BACKEND_URL}/api/v1/search/lucky-wheel-dishes`);
      if (gps) {
        url.searchParams.append("lat", gps.lat.toString());
        url.searchParams.append("lng", gps.lng.toString());
      }
      const userId = localStorage.getItem("user_id");
      if (userId) {
        url.searchParams.append("user_id", userId);
      }

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        if (data && data.length >= 12) {
          setDishes(data.slice(0, 12));
        } else {
          // Fallback if data is corrupted or small
          setDishes([
            "Phở Bò", "Bún Chả", "Bánh Mì", "Cơm Tấm", "Bún Đậu Mắm Tôm",
            "Bún Bò Huế", "Mì Quảng", "Hủ Tiếu", "Bánh Xèo", "Gà Nướng",
            "Lẩu Thái", "Nem Nướng"
          ]);
        }
      } else {
        throw new Error(t("luckyWheelPage.serverError"));
      }
    } catch (err: any) {
      console.error("Error fetching lucky wheel dishes:", err);
      setFetchError(err.message || t("luckyWheelPage.loadError"));
      // Fallback local list
      setDishes([
        "Phở Bò", "Bún Chả", "Bánh Mì", "Cơm Tấm", "Bún Đậu Mắm Tôm",
        "Bún Bò Huế", "Mì Quảng", "Hủ Tiếu", "Bánh Xèo", "Gà Nướng",
        "Lẩu Thái", "Nem Nướng"
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDishes();
  }, [language]);

  useEffect(() => {
    return () => {
      clearSpinTimers();
      stopAudioContext();
    };
  }, [clearSpinTimers, stopAudioContext]);

  // Spin function
  const handleSpin = () => {
    if (isSpinning || dishes.length < 12) return;

    clearSpinTimers();
    const spinRunId = spinRunIdRef.current + 1;
    spinRunIdRef.current = spinRunId;
    setIsSpinning(true);
    setWinner(null);
    setShowWinnerModal(false);
    void playRetroSound("spin");

    // Number of full rotations (5 to 8 rounds) plus random angle
    const minRounds = 5;
    const maxRounds = 8;
    const randomRounds = minRounds + Math.random() * (maxRounds - minRounds);
    const addedAngle = randomRounds * 360;

    const startRotation = currentRotationRef.current;
    const newRotation = startRotation + addedAngle;
    currentRotationRef.current = newRotation;
    setRotation(newRotation);

    const duration = 6000; // must match CSS transition duration
    const startTime = Date.now();

    // cubic-bezier(0.15, 0.85, 0.1, 1) approximation using numerical integration
    // We'll use a simple ease-out cubic for the position curve: p(t) = 1 - (1-t)^3
    // but matching the actual bezier: cubic-bezier(0.15, 0.85, 0.1, 1)
    // Position at normalized time t (0-1): approximate with ease-out quintic
    const easedPosition = (t: number) => {
      // Approximate cubic-bezier(0.15, 0.85, 0.1, 1) — fast start, slow end
      return 1 - Math.pow(1 - t, 3.5);
    };

    // Schedule ticks exactly when the wheel crosses each 30° segment boundary
    // Total segments crossed = totalTicks = floor(randomRounds * 12)
    const totalTicks = Math.floor(randomRounds * 12);

    for (let tick = 1; tick <= totalTicks; tick++) {
      // What fraction of total angle has been covered when this tick fires?
      const angleFraction = (tick * 30) / addedAngle; // 0..1 fraction of total added angle
      if (angleFraction >= 1) break;

      // Invert easing: find t such that easedPosition(t) = angleFraction
      // Binary search for the time fraction
      let lo = 0, hi = 1;
      for (let iter = 0; iter < 20; iter++) {
        const mid = (lo + hi) / 2;
        if (easedPosition(mid) < angleFraction) lo = mid;
        else hi = mid;
      }
      const timeFraction = (lo + hi) / 2;
      const tickDelay = timeFraction * duration;

      const capturedTick = tick;
      queueSpinTimer(() => {
        if (spinRunIdRef.current !== spinRunId || !soundEnabledRef.current) return;
        // Only play if we haven't exceeded the duration
        if (Date.now() - startTime < duration) {
          void playRetroSound("tick");
        }
        // Suppress unused var warning
        void capturedTick;
      }, tickDelay);
    }

    // Spin complete callback
    queueSpinTimer(() => {
      clearSpinTimers();
      stopAudioContext();
      setIsSpinning(false);

      // Compute winning index
      const finalAngle = newRotation % 360;
      const normalizedAngle = ((360 - finalAngle) % 360 + 360) % 360;
      const winningIndex = Math.floor(normalizedAngle / 30) % 12;

      const winningDish = dishes[winningIndex];
      setWinner(winningDish);
      setShowWinnerModal(true);
      void playRetroSound("win");
    }, duration);
  };

  // Launch AI search with the selected winner dish
  const handleSearch = async () => {
    if (!winner) return;
    setIsSearching(true);
    setSearchStatus(t("luckyWheelPage.locating"));

    try {
      const gps = await getOptimizedLocation();
      if (!gps) {
        toast.error(t("luckyWheelPage.gpsRequired"));
        setIsSearching(false);
        return;
      }

      setSearchStatus(t("luckyWheelPage.aiSearching").replace("{dish}", winner));

      const token = localStorage.getItem("access_token");
      const userId = localStorage.getItem("user_id");

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${BACKEND_URL}/api/v1/search/recommend`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          query: winner,
          lat: gps.lat,
          lng: gps.lng,
          user_id: userId || undefined,
          search_mode: "basic",
          top_k: 24,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSearchStatus(t("luckyWheelPage.found"));
        
        if (typeof window !== "undefined") {
          sessionStorage.setItem("current_search_session_id", data.session_id);
          sessionStorage.setItem("current_search_mode", "basic");
          sessionStorage.setItem(`session_data_${data.session_id}`, JSON.stringify({
            query: winner,
            results: data.results || [],
            fallback_applied: data.fallback_applied || false,
            fallback_reason: data.fallback_reason || "",
            applied_budget: data.applied_budget ?? null,
            filtered_out_count: data.filtered_out_count || 0,
            allergen_flagged_count: data.allergen_flagged_count || 0,
            warning: data.warning || "",
            results_contain_warnings: data.results_contain_warnings || false,
          }));
        }
        
        router.push(`/result?q=${encodeURIComponent(winner)}`);
      } else {
        throw new Error(t("luckyWheelPage.responseError"));
      }
    } catch (err: any) {
      console.error("Search failed:", err);
      toast.error(t("luckyWheelPage.searchError"));
      setIsSearching(false);
    }
  };

  // SVG parameters helper
  const describeArcSector = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
      const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
      return {
        x: centerX + radius * Math.cos(angleInRadians),
        y: centerY + radius * Math.sin(angleInRadians),
      };
    };

    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    return [
      "M", x, y,
      "L", start.x, start.y,
      "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
      "Z"
    ].join(" ");
  };

  return (
    <PageLayout>
      <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center">
        {/* Retro Header Section */}
        <div className="text-center mb-8 flex flex-col items-center gap-3">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-[#3D312A] dark:text-[#E6DFD5] uppercase drop-shadow-sm">
            {t("luckyWheelPage.titlePrefix")} <span className="text-brand dark:text-[#E8735A]">{t("luckyWheelPage.titleHighlight")}</span>
          </h1>
          <p className="text-gray-500 dark:text-[#9A8A7A] max-w-md text-sm font-semibold">
            {t("luckyWheelPage.subtitle")}
          </p>

          <button
            onClick={handleSoundToggle}
            className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-[#E6DFD5]/60 dark:bg-[#3D312A]/60 text-[#3D312A] dark:text-[#E6DFD5] hover:bg-brand/10 transition-colors border border-transparent hover:border-brand/20 cursor-pointer"
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-brand" />
                <span>{t("luckyWheelPage.soundOn")}</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                <span>{t("luckyWheelPage.soundOff")}</span>
              </>
            )}
          </button>
        </div>

        {/* Fetching / Error notifications */}
        {fetchError && !isLoading && (
          <div className="mb-6 w-full max-w-md bg-amber-50 dark:bg-amber-900/10 border border-amber-300 dark:border-amber-900/40 text-amber-900 dark:text-amber-300 rounded-xl p-3.5 flex items-start gap-2.5 text-xs font-medium shadow-sm animate-fade-in">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold">{t("luckyWheelPage.nearbyErrorTitle")}</span> {fetchError}. {t("luckyWheelPage.fallbackUsing")}
            </div>
          </div>
        )}

        {isLoading ? (
          /* Retro Loader Screen */
          <div className="w-[340px] h-[340px] md:w-[420px] md:h-[420px] rounded-full border-4 border-dashed border-brand/30 flex flex-col items-center justify-center gap-3 animate-pulse bg-white/40 dark:bg-[#2A2420]/40 backdrop-blur-sm shadow-inner">
            <RefreshCw className="w-10 h-10 text-brand animate-spin" />
            <p className="text-xs font-bold uppercase tracking-wider text-[#3D312A]/70 dark:text-[#E6DFD5]/70">
              {t("luckyWheelPage.loading")}
            </p>
          </div>
        ) : (
          /* Lucky Wheel Section */
          <div className="relative flex flex-col items-center gap-10">
            {/* The Cabinet Board */}
            <div className="relative p-6 md:p-8 rounded-[40px] bg-gradient-to-b from-[#F5F0E8] to-[#EDE8DE] dark:from-[#2A2420] dark:to-[#1E1916] border-4 border-[#D5C9B8] dark:border-[#3D312A] shadow-[0_20px_50px_rgba(0,0,0,0.15),0_0_30px_rgba(232,115,90,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_30px_rgba(232,115,90,0.15)] flex flex-col items-center">
              {/* LED Ring simulation around the wheel */}
              <div className="absolute inset-4 rounded-full border-4 border-dashed border-brand/50 opacity-60 animate-[spin_20s_linear_infinite]"></div>

              {/* Glowing Arrow Pointer at the top (12 o'clock) */}
              <div className="absolute top-[2px] left-1/2 -translate-x-1/2 z-30 drop-shadow-[0_4px_10px_rgba(232,115,90,0.6)]">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <path
                    d="M20 34L35 8H5L20 34Z"
                    fill="#FF2A6D"
                    stroke="#FFFFFF"
                    strokeWidth="3"
                    strokeLinejoin="round"
                  />
                  {/* Neon light dot inside pointer */}
                  <circle cx="20" cy="14" r="3" fill="#FFFFFF" className="animate-ping" />
                </svg>
              </div>

              {/* Wheel Container */}
              <div className="relative w-[340px] h-[340px] md:w-[460px] md:h-[460px] rounded-full border-8 border-[#C8BFB0] dark:border-[#3D312A] bg-[#F0EBE3] dark:bg-[#1E1916] overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,0.15)] dark:shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] z-10">
                <div
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    transition: isSpinning ? "transform 6000ms cubic-bezier(0.15, 0.85, 0.1, 1)" : "none",
                    width: "100%",
                    height: "100%",
                  }}
                  className="origin-center"
                >
                  <svg width="100%" height="100%" viewBox="0 0 400 400" className="select-none">
                    {/* Render 12 slices */}
                    {dishes.map((dish, i) => {
                      const startAngle = i * 30;
                      const endAngle = (i + 1) * 30;
                      const color = NEON_COLORS[i % NEON_COLORS.length];
                      
                      // Calculate position for text — placed at ~68% of radius
                      const midAngle = startAngle + 15;
                      const textRadius = 130; // mid-radius for readable labels
                      const rad = ((midAngle - 90) * Math.PI) / 180;
                      const tx = 200 + textRadius * Math.cos(rad);
                      const ty = 200 + textRadius * Math.sin(rad);

                      return (
                        <g key={i}>
                          {/* Segment Path */}
                          <path
                            d={describeArcSector(200, 200, 190, startAngle, endAngle)}
                            fill={color}
                            opacity={0.85}
                            stroke="#1E1916"
                            strokeWidth="3.5"
                          />
                          
                          {/* Radial border lines */}
                          <line
                            x1="200"
                            y1="200"
                            x2={200 + 190 * Math.cos(((startAngle - 90) * Math.PI) / 180)}
                            y2={200 + 190 * Math.sin(((startAngle - 90) * Math.PI) / 180)}
                            stroke="#FFFFFF"
                            strokeWidth="1.5"
                            opacity={0.35}
                          />

                          {/* Dish label — single line, truncated to fit segment */}
                          {(() => {
                            const needsFlip = midAngle > 90 && midAngle <= 270;
                            const textRotation = needsFlip ? midAngle + 180 : midAngle;
                            // Truncate: max 8 chars, take first word if too long
                            const firstWord = dish.split(" ")[0];
                            const label = firstWord.length > 9 ? firstWord.slice(0, 8) + "…" : firstWord;
                            return (
                              <text
                                x={tx}
                                y={ty}
                                fill="#FFFFFF"
                                fontSize="15px"
                                fontWeight="900"
                                textAnchor="middle"
                                dominantBaseline="middle"
                                transform={`rotate(${textRotation}, ${tx}, ${ty})`}
                                style={{
                                  filter: "drop-shadow(1px 1px 2px rgba(0,0,0,0.9))",
                                  letterSpacing: "0.01em",
                                }}
                              >
                                {label}
                              </text>
                            );
                          })()}
                        </g>
                      );
                    })}

                    {/* Centered Decorative Inner Circle */}
                    <circle cx="200" cy="200" r="42" fill="white" fillOpacity="0.15" stroke="#FFFFFF" strokeWidth="3" />
                    <circle cx="200" cy="200" r="28" fill="white" fillOpacity="0.1" />
                  </svg>
                </div>
              </div>

              {/* Physical glowing arcade spin button */}
              <button
                onClick={handleSpin}
                disabled={isSpinning}
                className={`mt-8 px-10 py-4 rounded-2xl font-black text-lg tracking-widest uppercase transition-all duration-200 border-b-8 z-20 cursor-pointer ${
                  isSpinning
                    ? "bg-gray-600 border-gray-800 text-gray-400 translate-y-1 border-b-2 shadow-none cursor-not-allowed"
                    : "bg-[#FF2A6D] hover:bg-[#FF0055] border-[#B2003C] text-white hover:shadow-[0_0_25px_rgba(255,42,109,0.7)] active:translate-y-1 active:border-b-2"
                }`}
                style={{
                  fontFamily: '"Segoe UI", Roboto, sans-serif',
                }}
              >
                {isSpinning ? t("luckyWheelPage.spinning") : t("luckyWheelPage.spinNow")}
              </button>
            </div>

            {/* Neon Arcade Instruction Banner */}
            <div className="w-full max-w-sm text-center border border-dashed border-[#3D312A] dark:border-[#4D3D32] p-4 rounded-2xl bg-white/20 dark:bg-[#2A2420]/20 backdrop-blur-sm">
              <span className="text-[11px] font-extrabold uppercase text-[#7A6A5A] dark:text-[#9A8A7A] tracking-wider block mb-1">
                {t("luckyWheelPage.instructionTitle")}
              </span>
              <p className="text-xs text-gray-500 dark:text-[#8A7A6A] leading-relaxed">
                {t("luckyWheelPage.instruction")} <span className="font-bold text-brand dark:text-[#E8735A]">{t("luckyWheelPage.spinNow")}</span> {t("luckyWheelPage.instructionRest")}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* WINNER Retro Modal Popover */}
      <AnimatePresence>
        {showWinnerModal && winner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative w-full max-w-md rounded-3xl bg-white dark:bg-gradient-to-b dark:from-[#2A2420] dark:to-[#1E1916] border-4 border-brand p-6 md:p-8 text-center shadow-[0_0_50px_rgba(232,115,90,0.25)] dark:shadow-[0_0_50px_rgba(232,115,90,0.35)] overflow-hidden"
            >
              {/* Decorative grid pattern background */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(232,115,90,0.03)_1.5px,transparent_1.5px),linear-gradient(90deg,rgba(232,115,90,0.03)_1.5px,transparent_1.5px)] bg-[size:16px_16px] pointer-events-none"></div>

              {/* Sparkles visual */}
              <div className="flex justify-center mb-4 text-brand">
                <Sparkles className="w-12 h-12 text-brand dark:text-[#FFFF33] animate-pulse" />
              </div>

              {/* Congratulation label */}
              <h3 className="text-xs font-black uppercase tracking-widest text-brand dark:text-[#FFFF33] mb-2">
                {t("luckyWheelPage.winnerTitle")}
              </h3>

              {/* Winner Name */}
              <div className="py-5 px-6 my-4 bg-white/5 border border-brand/20 rounded-2xl shadow-inner relative">
                <div className="absolute inset-0 bg-brand/5 blur-md rounded-2xl"></div>
                <h2 className="relative text-2xl md:text-3xl font-black text-brand dark:text-[#E8735A] tracking-wide uppercase drop-shadow-md">
                  {winner}
                </h2>
              </div>

              <p className="text-xs text-gray-400 dark:text-[#9A8A7A] px-2 mb-6">
                {t("luckyWheelPage.winnerDesc").replace("{dish}", winner)}
              </p>

              {/* Button Container */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-brand to-brand-hover hover:from-brand-hover hover:to-brand text-white font-black text-sm uppercase tracking-wider shadow-[0_4px_14px_rgba(232,115,90,0.4)] hover:shadow-[0_6px_20px_rgba(232,115,90,0.6)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSearching ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{searchStatus}</span>
                    </>
                  ) : (
                    <>
                      <span>{t("luckyWheelPage.findNow")}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setShowWinnerModal(false);
                    // allow spinning again
                  }}
                  disabled={isSearching}
                  className="w-full py-3 rounded-2xl border border-gray-200 dark:border-[#4D3D32] hover:bg-gray-50 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white font-bold text-xs uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t("luckyWheelPage.backToWheel")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageLayout>
  );
}
