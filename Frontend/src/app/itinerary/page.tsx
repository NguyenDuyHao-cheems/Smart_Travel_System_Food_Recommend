'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useWeather } from '../../hooks/useWeather';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  Route,
  Trash2,
  ArrowLeft,
  Navigation,
  GripVertical,
  MapPin,
  ChevronRight,
  Star,
  Footprints,
  Bike,
  Car,
  X,
  ExternalLink,
  AlertCircle,
  Clock,
  TrendingUp,
  CloudRain,
  Loader2,
} from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';

import {
  removeItem,
  clearItinerary,
  setTravelMode,
  setItinerary,
  ItineraryItem,
} from '../../store/slices/itinerarySlice';
import { AppShell } from '../../components/AppShell';
import { useLanguage } from '../../components/LanguageProvider';

/* ──────────────────────────────────────────────
   Haversine distance calculation (km)
────────────────────────────────────────────── */
function haversine(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ──────────────────────────────────────────────
   Speed constants (km/h) per travel mode
────────────────────────────────────────────── */
const SPEED: Record<string, number> = {
  walking: 5,
  riding: 20,
  driving: 40,
};

function formatTime(hours: number, language: string): string {
  if (hours < 1 / 60) return language === 'en' ? '< 1 min' : '< 1 phút';
  const mins = Math.round(hours * 60);
  if (mins < 60) return language === 'en' ? `${mins} mins` : `${mins} phút`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (language === 'en') {
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return m > 0 ? `${h} giờ ${m} phút` : `${h} giờ`;
}

/* ──────────────────────────────────────────────
   Travel mode button
────────────────────────────────────────────── */
function ModeButton({
  mode,
  active,
  onClick,
  icon,
  label,
}: {
  mode: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
        active
          ? 'bg-orange-500 text-white shadow-lg shadow-orange-200/40 dark:shadow-orange-900/30 scale-105'
          : 'bg-white dark:bg-[#3D312A] text-gray-600 dark:text-[#C8BFB0] border border-gray-200 dark:border-[#4D3D32] hover:border-orange-300 hover:text-orange-600'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

/* ──────────────────────────────────────────────
   Segment distance card
────────────────────────────────────────────── */
function SegmentCard({
  from,
  to,
  distKm,
  travelMode,
  t,
  language,
}: {
  from: ItineraryItem;
  to: ItineraryItem;
  distKm: number;
  travelMode: string;
  t: (key: string) => string;
  language: string;
}) {
  const speed = SPEED[travelMode] ?? 20;
  const timeHours = distKm / speed;

  return (
    <motion.div
      initial={{ opacity: 0, scaleY: 0.9 }}
      animate={{ opacity: 1, scaleY: 1 }}
      className="relative mx-8 my-1"
    >
      {/* Vertical connector line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-orange-200 dark:bg-orange-800/50" />

      <div className="ml-10 pl-3 py-2">
        <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/40 rounded-xl px-4 py-2.5 flex flex-wrap items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5 font-bold text-orange-600 dark:text-orange-400">
            <Navigation className="w-4 h-4" />
            {distKm.toFixed(1)} km
          </span>
          <span className="flex items-center gap-1.5 text-gray-500 dark:text-[#9A8A7A]">
            <Clock className="w-3.5 h-3.5" />
            {formatTime(timeHours, language)}
          </span>
          <a
            href={`https://www.google.com/maps/dir/${from.lat},${from.lng}/${to.lat},${to.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 text-xs font-semibold text-blue-500 hover:text-blue-700 hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            {t("itinerary.directions")}
          </a>
        </div>
      </div>
    </motion.div>
  );
}

/* ──────────────────────────────────────────────
   No-coords warning banner
────────────────────────────────────────────── */
function NoCoordsBanner({ names, t }: { names: string[]; t: (key: string) => string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700/40 rounded-2xl px-5 py-4 flex items-start gap-3"
    >
      <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold text-amber-800 dark:text-amber-300 text-sm">
          {t("itinerary.missingGPSWarning")}
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
          {names.join(', ')} — {t("itinerary.missingGPSWarningDesc")}
        </p>
      </div>
    </motion.div>
  );
}

/* ──────────────────────────────────────────────
   Summary bar
────────────────────────────────────────────── */
function SummaryBar({
  totalKm,
  totalTime,
  count,
  t,
}: {
  totalKm: number;
  totalTime: string;
  count: number;
  t: (key: string) => string;
}) {
  return (
    <div className="grid grid-cols-3 gap-4 mb-8">
      {[
        { icon: <MapPin className="w-5 h-5 text-orange-500" />, label: t("itinerary.stopsCount"), value: `${count} ${t("itinerary.stopsCountValue")}` },
        { icon: <TrendingUp className="w-5 h-5 text-blue-500" />, label: t("itinerary.totalDistance"), value: `${totalKm.toFixed(1)} km` },
        { icon: <Clock className="w-5 h-5 text-green-500" />, label: t("itinerary.travelTime"), value: totalTime },
      ].map((stat) => (
        <div
          key={stat.label}
          className="bg-white dark:bg-[#3D312A] rounded-2xl border border-gray-100 dark:border-[#4D3D32] p-4 text-center shadow-sm"
        >
          <div className="flex justify-center mb-2">{stat.icon}</div>
          <p className="text-lg font-bold text-gray-900 dark:text-[#E6DFD5]">{stat.value}</p>
          <p className="text-xs text-gray-400 dark:text-[#9A8A7A] mt-0.5">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────────
   Main Page
────────────────────────────────────────────── */
export default function ItineraryPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { t, language } = useLanguage();
  const items = useSelector((state: RootState) => state.itinerary.items);
  const travelMode = useSelector((state: RootState) => state.itinerary.travelMode);
  const userCoords = useSelector((state: RootState) => state.location.coords);

  const [confirmClear, setConfirmClear] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  /* Compute segment from user's current location to first item */
  const userSegment = useMemo(() => {
    if (userCoords && items.length > 0 && items[0].lat && items[0].lng) {
      const dist = haversine(userCoords.lat, userCoords.lng, items[0].lat, items[0].lng);
      return {
        from: { id: 'user', name: t("itinerary.currentLocation"), lat: userCoords.lat, lng: userCoords.lng } as ItineraryItem,
        to: items[0],
        distKm: dist,
      };
    }
    return null;
  }, [items, userCoords, t]);

  /* Compute distances between consecutive items */
  const segments = useMemo(() => {
    const segs: { from: ItineraryItem; to: ItineraryItem; distKm: number }[] = [];
    for (let i = 0; i < items.length - 1; i++) {
      const a = items[i];
      const b = items[i + 1];
      if (a.lat && a.lng && b.lat && b.lng) {
        segs.push({ from: a, to: b, distKm: haversine(a.lat, a.lng, b.lat, b.lng) });
      } else {
        segs.push({ from: a, to: b, distKm: -1 });
      }
    }
    return segs;
  }, [items]);

  const totalKm = useMemo(() => {
    const internalDist = segments.reduce((sum, s) => (s.distKm > 0 ? sum + s.distKm : sum), 0);
    const userDist = userSegment ? userSegment.distKm : 0;
    return internalDist + userDist;
  }, [segments, userSegment]);

  const speed = SPEED[travelMode] ?? 20;
  const totalTimeStr = formatTime(totalKm / speed, language);

  const missingCoords = items.filter((it) => !it.lat || !it.lng).map((it) => it.name);

  /* Fetch weather for all stops */
  const weatherCoords = useMemo(
    () => items.filter((it) => it.lat && it.lng).map((it) => ({ id: it.id, lat: it.lat, lng: it.lng })),
    [items]
  );
  const { weatherMap, loading: weatherLoading } = useWeather(weatherCoords);
  const rainyStops = items.filter((it) => weatherMap[it.id]?.isRaining);

  const handleReorder = useCallback(
    (newOrder: ItineraryItem[]) => {
      dispatch(setItinerary(newOrder));
    },
    [dispatch]
  );

  /* Full Google Maps multi-waypoint URL starting from user current location if available */
  const mapsUrl = useMemo(() => {
    const withCoords = items.filter((it) => it.lat && it.lng);
    if (withCoords.length === 0) return null;

    const origin = userCoords
      ? `${userCoords.lat},${userCoords.lng}`
      : withCoords.length >= 2
      ? `${withCoords[0].lat},${withCoords[0].lng}`
      : null;

    if (!origin) return null;

    const dest = `${withCoords[withCoords.length - 1].lat},${withCoords[withCoords.length - 1].lng}`;

    let waypoints = '';
    if (userCoords) {
      if (withCoords.length > 1) {
        waypoints = withCoords
          .slice(0, -1)
          .map((it) => `${it.lat},${it.lng}`)
          .join('|');
      }
    } else {
      if (withCoords.length >= 2) {
        waypoints = withCoords
          .slice(1, -1)
          .map((it) => `${it.lat},${it.lng}`)
          .join('|');
      } else {
        return null;
      }
    }

    const modeParam = travelMode === 'driving' ? 'driving' : travelMode === 'riding' ? 'driving' : 'walking';
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}${
      waypoints ? `&waypoints=${waypoints}` : ''
    }&travelmode=${modeParam}`;
  }, [items, travelMode, userCoords]);

  return (
    <AppShell>
      <div className="min-h-screen bg-[#FAF7F2] dark:bg-[#2A2420] pb-24">
        {/* ── Header ── */}
        <div className="sticky top-0 z-30 bg-white/80 dark:bg-[#2A2420]/80 backdrop-blur-xl border-b border-gray-100 dark:border-[#3D312A] shadow-sm">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#3D312A] transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-[#C8BFB0]" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900 dark:text-[#E6DFD5] flex items-center gap-2">
                <Route className="w-5 h-5 text-orange-500" />
                {t("itinerary.title")}
              </h1>
              <p className="text-xs text-gray-400 dark:text-[#9A8A7A]">
                {mounted ? t("itinerary.subtitle").replace("{count}", String(items.length)) : ""}
              </p>
            </div>

            {mounted && items.length > 0 && (
              <button
                onClick={() => setConfirmClear(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors border border-red-200 dark:border-red-800/40"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {t("itinerary.clearAll")}
              </button>
            )}
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 pt-8">
          {/* Empty state */}
          {!mounted ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-24 h-24 bg-orange-50 dark:bg-orange-950/30 rounded-full flex items-center justify-center mb-6">
                <Route className="w-12 h-12 text-orange-300" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-[#E6DFD5] mb-2">
                {t("itinerary.loading")}
              </h2>
              <p className="text-gray-400 dark:text-[#9A8A7A] max-w-xs">
                {t("itinerary.pleaseWait")}
              </p>
            </div>
          ) : items.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-24 text-center"
            >
              <div className="w-24 h-24 bg-orange-50 dark:bg-orange-950/30 rounded-full flex items-center justify-center mb-6">
                <Route className="w-12 h-12 text-orange-300" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-[#E6DFD5] mb-2">
                {t("itinerary.emptyTitle")}
              </h2>
              <p className="text-gray-400 dark:text-[#9A8A7A] max-w-xs">
                {t("itinerary.emptyDesc")}
              </p>
              <button
                onClick={() => router.push('/')}
                className="mt-8 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl shadow-lg shadow-orange-200/40 transition-all hover:-translate-y-0.5"
              >
                {t("itinerary.findPlaces")}
              </button>
            </motion.div>
          ) : (
            <>
              {/* Rain warning banner */}
              {rainyStops.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-700/40 rounded-2xl px-5 py-4 flex items-start gap-3"
                >
                  <CloudRain className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-800 dark:text-blue-300 text-sm">
                      {t("itinerary.rainWarning").replace("{count}", String(rainyStops.length))}
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                      {rainyStops.map((s) => s.name).join(', ')} — {t("itinerary.rainWarningDesc")}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Weather loading indicator */}
              {weatherLoading && items.length > 0 && (
                <div className="mb-4 flex items-center gap-2 text-xs text-gray-400 dark:text-[#9A8A7A]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {t("itinerary.checkingWeather")}
                </div>
              )}

              {/* Missing coords banner */}
              {missingCoords.length > 0 && <NoCoordsBanner names={missingCoords} t={t} />}

              {/* Summary */}
              <SummaryBar totalKm={totalKm} totalTime={totalTimeStr} count={items.length} t={t} />

              {/* Travel mode selector */}
              <div className="flex items-center gap-3 mb-6 flex-wrap">
                <span className="text-sm font-semibold text-gray-500 dark:text-[#9A8A7A]">{t("itinerary.vehicleLabel")}</span>
                <ModeButton
                  mode="walking"
                  active={travelMode === 'walking'}
                  onClick={() => dispatch(setTravelMode('walking'))}
                  icon={<Footprints className="w-4 h-4" />}
                  label={t("itinerary.walking")}
                />
                <ModeButton
                  mode="riding"
                  active={travelMode === 'riding'}
                  onClick={() => dispatch(setTravelMode('riding'))}
                  icon={<Bike className="w-4 h-4" />}
                  label={t("itinerary.riding")}
                />
                <ModeButton
                  mode="driving"
                  active={travelMode === 'driving'}
                  onClick={() => dispatch(setTravelMode('driving'))}
                  icon={<Car className="w-4 h-4" />}
                  label={t("itinerary.driving")}
                />
              </div>

              {/* Estimate from user location segment */}
              {userSegment && (
                <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-2xl p-4 border border-blue-100 dark:border-blue-900/30">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                      📍
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 dark:text-[#E6DFD5] text-sm">{t("itinerary.currentLocation")}</p>
                      <p className="text-xs text-gray-400 dark:text-[#9A8A7A]">{t("itinerary.startPoint")}</p>
                    </div>
                  </div>
                  <div className="mt-3 pl-10 border-l border-dashed border-blue-200 dark:border-blue-800">
                    <div className="bg-white/80 dark:bg-[#3D312A]/80 border border-blue-100 dark:border-blue-900/40 rounded-xl px-4 py-2 flex items-center gap-4 text-xs">
                      <span className="flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400">
                        <Navigation className="w-3.5 h-3.5" />
                        {userSegment.distKm.toFixed(1)} km
                      </span>
                      <span className="flex items-center gap-1 text-gray-500 dark:text-[#9A8A7A]">
                        <Clock className="w-3.5 h-3.5" />
                        {formatTime(userSegment.distKm / speed, language)}
                      </span>
                      <a
                        href={`https://www.google.com/maps/dir/${userSegment.from.lat},${userSegment.from.lng}/${userSegment.to.lat},${userSegment.to.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto flex items-center gap-1 font-semibold text-blue-500 hover:text-blue-700 hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {t("itinerary.directions")}
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Reorderable list */}
              <Reorder.Group axis="y" values={items} onReorder={handleReorder} className="space-y-0">
                {items.map((item, idx) => (
                  <React.Fragment key={item.id}>
                    <Reorder.Item
                      value={item}
                      className="cursor-grab active:cursor-grabbing"
                    >
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -40 }}
                        transition={{ delay: idx * 0.04 }}
                        className="bg-white dark:bg-[#3D312A] rounded-2xl border border-gray-100 dark:border-[#4D3D32] shadow-sm hover:shadow-md transition-shadow mb-0"
                      >
                        <div className="flex items-center gap-3 p-4">
                          {/* Drag handle */}
                          <GripVertical className="w-5 h-5 text-gray-300 dark:text-[#6A5A4A] flex-shrink-0" />

                          {/* Stop number */}
                          <span className="w-7 h-7 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                            {idx + 1}
                          </span>

                          {/* Thumbnail */}
                          {item.img && (
                            <img
                              src={item.img}
                              alt={item.name}
                              className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-gray-100 dark:border-[#4D3D32]"
                            />
                          )}

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 dark:text-[#E6DFD5] truncate">{item.name}</p>
                            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                              {item.rating && (
                                <span className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400 font-semibold">
                                  <Star className="w-3 h-3 fill-current" />
                                  {item.rating}
                                </span>
                              )}
                              {item.price && (
                                <span className="text-xs text-gray-400 dark:text-[#9A8A7A]">
                                  {item.price}
                                </span>
                              )}
                              {item.lat && item.lng ? (
                                <span className="text-xs text-green-500 flex items-center gap-0.5">
                                  <MapPin className="w-3 h-3" /> GPS
                                </span>
                              ) : (
                                <span className="text-xs text-amber-500">{t("itinerary.missingGPS")}</span>
                              )}
                            </div>
                            {item.address && (
                              <p className="text-xs text-gray-400 dark:text-[#7A6A5A] truncate mt-0.5">{item.address}</p>
                            )}
                            {/* Rain warning per item */}
                            {weatherMap[item.id]?.isRaining && (
                              <div className="flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800/40 w-fit">
                                <CloudRain className="w-3 h-3 text-blue-500" />
                                <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                                  {weatherMap[item.id].description}
                                  {weatherMap[item.id].rainMm > 0 && ` · ${weatherMap[item.id].rainMm.toFixed(1)}mm`}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {item.google_maps_url && (
                              <a
                                href={item.google_maps_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-2 rounded-xl text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                                title={t("itinerary.openInGoogleMaps")}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                            <button
                              onClick={() => dispatch(removeItem(item.id))}
                              className="p-2 rounded-xl text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                              title={t("itinerary.deleteStopTitle")}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    </Reorder.Item>

                    {/* Segment distance between consecutive stops */}
                    {idx < items.length - 1 && segments[idx] && (
                      <AnimatePresence>
                        {segments[idx].distKm > 0 ? (
                          <SegmentCard
                            from={segments[idx].from}
                            to={segments[idx].to}
                            distKm={segments[idx].distKm}
                            travelMode={travelMode}
                            t={t}
                            language={language}
                          />
                        ) : (
                          <div className="relative mx-8 my-1">
                            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
                            <div className="ml-10 pl-3 py-2">
                              <p className="text-xs text-gray-400 italic">{t("itinerary.noDistanceData")}</p>
                            </div>
                          </div>
                        )}
                      </AnimatePresence>
                    )}
                  </React.Fragment>
                ))}
              </Reorder.Group>

              {/* Open all in Google Maps */}
              {mapsUrl && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8"
                >
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-3 w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-2xl shadow-xl shadow-orange-200/40 dark:shadow-orange-900/30 transition-all hover:-translate-y-0.5 text-base"
                  >
                    <Navigation className="w-5 h-5" />
                    {t("itinerary.openInGoogleMaps")}
                    <ChevronRight className="w-5 h-5" />
                  </a>
                  <p className="text-center text-xs text-gray-400 mt-2">
                    {t("itinerary.openInGoogleMapsDesc")}
                  </p>
                </motion.div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Confirm clear modal */}
      <AnimatePresence>
        {confirmClear && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm"
            onClick={() => setConfirmClear(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#3D312A] rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-[#4D3D32]"
            >
              <div className="w-14 h-14 bg-red-100 dark:bg-red-950/40 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-[#E6DFD5] text-center mb-2">
                {t("itinerary.clearConfirmTitle")}
              </h3>
              <p className="text-gray-500 dark:text-[#9A8A7A] text-center text-sm mb-6">
                {t("itinerary.clearConfirmDesc").replace("{count}", String(items.length))}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmClear(false)}
                  className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-[#4D3D32] text-gray-700 dark:text-[#C8BFB0] font-semibold hover:bg-gray-50 dark:hover:bg-[#4D3D32] transition-colors"
                >
                  {t("itinerary.cancelBtn")}
                </button>
                <button
                  onClick={() => {
                    dispatch(clearItinerary());
                    setConfirmClear(false);
                  }}
                  className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold shadow-lg shadow-red-200/40 transition-colors"
                >
                  {t("itinerary.clearAll")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
