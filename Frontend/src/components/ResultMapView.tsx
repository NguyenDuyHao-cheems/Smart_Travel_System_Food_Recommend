'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LocateFixed, Minus, Plus, Radius, Utensils, Star } from 'lucide-react';
import type { RecommendResult } from '../app/result/page';
import { useLanguage } from './LanguageProvider';

export interface MapViewport {
  centerLat: number;
  centerLng: number;
  north: number;
  south: number;
  east: number;
  west: number;
  radiusKm?: number;
}

interface ResultMapViewProps {
  results: RecommendResult[];
  fallbackCenter?: { lat: number; lng: number } | null;
  isSearching?: boolean;
  onViewportSearch: (viewport: MapViewport) => void;
  selectedId?: string | null;
  onSelectId?: (id: string | null) => void;
}

const TILE_SIZE = 256;
const MIN_ZOOM = 11;
const MAX_ZOOM = 17;
const DEFAULT_CENTER = { lat: 10.7769, lng: 106.7009 };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function wrapTileX(x: number, zoom: number) {
  const max = 2 ** zoom;
  return ((x % max) + max) % max;
}

function project(lat: number, lng: number, zoom: number) {
  const sinLat = Math.sin((clamp(lat, -85.05112878, 85.05112878) * Math.PI) / 180);
  const scale = TILE_SIZE * 2 ** zoom;
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale,
  };
}

function unproject(x: number, y: number, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(Math.sinh(n));
  return { lat, lng };
}

function hasCoordinates(item: RecommendResult) {
  return typeof item.lat === 'number' && typeof item.lng === 'number';
}

function getCleanRating(ratingStr: string | undefined) {
  if (!ratingStr) return '—';
  const cleanStr = ratingStr.trim().replace(',', '.');
  const parsed = parseFloat(cleanStr);
  if (isNaN(parsed)) return '—';
  return parsed.toFixed(1);
}

function translateMapReason(reason: string, language: 'vi' | 'en') {
  if (language !== 'en') return reason;
  return reason
    .replace(/Đánh giá xuất sắc/g, 'Excellent rating')
    .replace(/Đánh giá cao/g, 'Highly rated');
}

export function ResultMapView({
  results,
  fallbackCenter,
  isSearching = false,
  onViewportSearch,
  selectedId: propSelectedId,
  onSelectId: propOnSelectId,
}: ResultMapViewProps) {
  const { language, t } = useLanguage();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; center: { lat: number; lng: number }; moved: boolean } | null>(null);
  const hasInteractedRef = useRef(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(14);
  const [localSelectedId, setLocalSelectedId] = useState<string | null>(null);
  const [selectedRadiusKm, setSelectedRadiusKm] = useState<number | null>(null);
  const [circleCenter, setCircleCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [hoverCircleCenter, setHoverCircleCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const selectedId = propSelectedId !== undefined ? propSelectedId : localSelectedId;
  const onSelectId = propOnSelectId || setLocalSelectedId;

  const mapResults = useMemo(() => results.filter(hasCoordinates), [results]);
  const initialCenter = useMemo(() => {
    const points: { lat: number; lng: number }[] = [];
    if (fallbackCenter) {
      points.push(fallbackCenter);
    }
    mapResults.forEach((item) => {
      if (typeof item.lat === 'number' && typeof item.lng === 'number') {
        points.push({ lat: item.lat, lng: item.lng });
      }
    });

    if (points.length === 0) return DEFAULT_CENTER;

    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    points.forEach((p) => {
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
    });

    return {
      lat: (minLat + maxLat) / 2,
      lng: (minLng + maxLng) / 2,
    };
  }, [fallbackCenter, mapResults]);

  const [center, setCenter] = useState(initialCenter);

  useEffect(() => {
    if (hasInteractedRef.current || size.width === 0 || size.height === 0) return;

    const points: { lat: number; lng: number }[] = [];
    if (fallbackCenter) {
      points.push(fallbackCenter);
    }
    mapResults.forEach((item) => {
      if (typeof item.lat === 'number' && typeof item.lng === 'number') {
        points.push({ lat: item.lat, lng: item.lng });
      }
    });

    if (points.length === 0) return;

    if (points.length === 1) {
      setCenter(points[0]);
      setZoom(14);
      return;
    }

    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    points.forEach((p) => {
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
    });

    const nextCenter = {
      lat: (minLat + maxLat) / 2,
      lng: (minLng + maxLng) / 2,
    };

    const pad = 1.35;
    const pMin = project(minLat, minLng, 0);
    const pMax = project(maxLat, maxLng, 0);
    const pixelDeltaX = Math.abs(pMax.x - pMin.x);
    const pixelDeltaY = Math.abs(pMax.y - pMin.y);

    const zoomX = Math.log(size.width / (pixelDeltaX || 1) / pad) / Math.log(2);
    const zoomY = Math.log(size.height / (pixelDeltaY || 1) / pad) / Math.log(2);

    const nextZoom = clamp(Math.floor(Math.min(zoomX, zoomY)), MIN_ZOOM, MAX_ZOOM);

    setCenter(nextCenter);
    setZoom(nextZoom);
  }, [fallbackCenter, mapResults, size]);

  useEffect(() => {
    if (!selectedRadiusKm) {
      setCircleCenter(null);
      setHoverCircleCenter(null);
    }
  }, [selectedRadiusKm]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const observer = new ResizeObserver(([entry]) => {
      const rect = entry.contentRect;
      setSize({ width: rect.width, height: rect.height });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || size.width === 0 || size.height === 0) return;

    const handleWheelEvent = (event: WheelEvent) => {
      // Don't zoom if target is inside a map control (like zoom buttons, radius buttons)
      if ((event.target as HTMLElement).closest('[data-map-control="true"]')) {
        return;
      }
      
      event.preventDefault();

      const delta = event.deltaY < 0 ? 1 : -1;
      const newZoom = clamp(zoom + delta, MIN_ZOOM, MAX_ZOOM);

      if (newZoom !== zoom) {
        const rect = container.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        const currentCenterPoint = project(center.lat, center.lng, zoom);
        const currentTopLeft = {
          x: currentCenterPoint.x - size.width / 2,
          y: currentCenterPoint.y - size.height / 2,
        };

        const mouseLatLng = unproject(currentTopLeft.x + mouseX, currentTopLeft.y + mouseY, zoom);
        const mousePointAtNewZoom = project(mouseLatLng.lat, mouseLatLng.lng, newZoom);
        
        const newCenterPoint = {
          x: mousePointAtNewZoom.x - mouseX + size.width / 2,
          y: mousePointAtNewZoom.y - mouseY + size.height / 2,
        };

        const newCenterLatLng = unproject(newCenterPoint.x, newCenterPoint.y, newZoom);
        
        hasInteractedRef.current = true;
        setZoom(newZoom);
        setCenter(newCenterLatLng);
      }
    };

    container.addEventListener('wheel', handleWheelEvent, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheelEvent);
    };
  }, [zoom, center, size]);

  const centerPoint = project(center.lat, center.lng, zoom);
  const topLeft = {
    x: centerPoint.x - size.width / 2,
    y: centerPoint.y - size.height / 2,
  };

  const tiles = useMemo(() => {
    if (!size.width || !size.height) return [];

    const minTileX = Math.floor(topLeft.x / TILE_SIZE);
    const maxTileX = Math.floor((topLeft.x + size.width) / TILE_SIZE);
    const minTileY = Math.floor(topLeft.y / TILE_SIZE);
    const maxTileY = Math.floor((topLeft.y + size.height) / TILE_SIZE);
    const maxTile = 2 ** zoom - 1;
    const nextTiles: { key: string; src: string; left: number; top: number }[] = [];

    for (let x = minTileX; x <= maxTileX; x += 1) {
      for (let y = minTileY; y <= maxTileY; y += 1) {
        if (y < 0 || y > maxTile) continue;
        const wrappedX = wrapTileX(x, zoom);
        nextTiles.push({
          key: `${zoom}-${x}-${y}`,
          src: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png`,
          left: x * TILE_SIZE - topLeft.x,
          top: y * TILE_SIZE - topLeft.y,
        });
      }
    }

    return nextTiles;
  }, [size.height, size.width, topLeft.x, topLeft.y, zoom]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('[data-map-control="true"]')) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      center,
      moved: false,
    };
    setIsDragging(true);
  };

  const getPointerLatLng = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return unproject(
      topLeft.x + event.clientX - rect.left,
      topLeft.y + event.clientY - rect.top,
      zoom
    );
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) {
      if (selectedRadiusKm && !(event.target as HTMLElement).closest('[data-map-control="true"]')) {
        setHoverCircleCenter(getPointerLatLng(event));
      }
      return;
    }
    const movedDistance = Math.hypot(event.clientX - dragRef.current.x, event.clientY - dragRef.current.y);
    if (movedDistance > 4) {
      dragRef.current.moved = true;
      setHoverCircleCenter(null);
    }

    const startPoint = project(dragRef.current.center.lat, dragRef.current.center.lng, zoom);
    const nextCenter = unproject(
      startPoint.x - (event.clientX - dragRef.current.x),
      startPoint.y - (event.clientY - dragRef.current.y),
      zoom
    );

    hasInteractedRef.current = true;
    setCenter(nextCenter);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    if ((event.target as HTMLElement).closest('[data-map-control="true"]')) {
      dragRef.current = null;
      return;
    }
    const dragState = dragRef.current;
    if (dragState) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;

    if (!dragState || dragState.moved || !selectedRadiusKm || size.width === 0 || size.height === 0) {
      return;
    }

    const nextCenter = getPointerLatLng(event);
    const circleBounds = getCircleBounds(nextCenter.lat, nextCenter.lng, selectedRadiusKm);

    setCircleCenter(nextCenter);
    setHoverCircleCenter(nextCenter);
    onViewportSearch({
      centerLat: nextCenter.lat,
      centerLng: nextCenter.lng,
      radiusKm: selectedRadiusKm,
      ...circleBounds,
    });
  };

  const handleZoom = (delta: number) => {
    hasInteractedRef.current = true;
    setZoom((current) => clamp(current + delta, MIN_ZOOM, MAX_ZOOM));
  };

  const recenter = () => {
    if (fallbackCenter && typeof fallbackCenter.lat === 'number' && typeof fallbackCenter.lng === 'number') {
      setCenter(fallbackCenter);
      setZoom(15);
      hasInteractedRef.current = true;
    } else {
      hasInteractedRef.current = false;
      setCenter(initialCenter);
    }
  };

  const activeCircleCenter = hoverCircleCenter ?? circleCenter ?? (selectedRadiusKm ? center : null);

  const circlePixels = useMemo(() => {
    if (!activeCircleCenter || !selectedRadiusKm || size.width === 0 || size.height === 0) return null;

    const circlePoint = project(activeCircleCenter.lat, activeCircleCenter.lng, zoom);
    const edge = project(
      activeCircleCenter.lat,
      activeCircleCenter.lng + selectedRadiusKm / Math.max(111.0 * Math.cos((activeCircleCenter.lat * Math.PI) / 180), 1.0),
      zoom
    );
    const radiusPx = Math.abs(edge.x - circlePoint.x);

    return {
      left: circlePoint.x - topLeft.x,
      top: circlePoint.y - topLeft.y,
      radius: radiusPx,
    };
  }, [activeCircleCenter, selectedRadiusKm, size.height, size.width, topLeft.x, topLeft.y, zoom]);

  return (
    <div className="h-full min-h-[520px] rounded-3xl overflow-hidden border border-gray-100 dark:border-[#4D3D32] bg-white dark:bg-[#3D312A] shadow-sm flex flex-col">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-[#4D3D32] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-9 h-9 rounded-full bg-brand-muted dark:bg-brand/10 text-brand-hover dark:text-[#E6DFD5] flex items-center justify-center flex-shrink-0">
            <Utensils className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-800 dark:text-[#E6DFD5] truncate">{t('resultMap.title')}</p>
            <p className="text-[11px] text-gray-400 dark:text-[#9A8A7A]">{mapResults.length} {t('resultMap.withCoordinates')}</p>
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        className={`relative flex-1 overflow-hidden bg-[#E6DFD5] dark:bg-[#2A2420] touch-none select-none ${
          isDragging
            ? 'cursor-grabbing'
            : selectedRadiusKm
            ? 'cursor-crosshair active:cursor-grabbing'
            : 'cursor-grab active:cursor-grabbing'
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={() => setHoverCircleCenter(null)}
        onDragStart={(e) => e.preventDefault()}
      >
        {tiles.map((tile) => (
          <img
            key={tile.key}
            src={tile.src}
            alt=""
            draggable={false}
            className="absolute w-[256px] h-[256px] select-none pointer-events-none"
            style={{ left: tile.left, top: tile.top }}
          />
        ))}

        <div className="absolute inset-0 bg-[#2A2420]/0 dark:bg-[#2A2420]/25 pointer-events-none" />

        <div data-map-control="true" className="absolute top-4 left-4 z-30 flex flex-wrap items-center gap-2 rounded-2xl bg-white/95 dark:bg-[#2A2420]/95 border border-gray-200 dark:border-[#4D3D32] shadow-sm px-3 py-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-600 dark:text-[#C8BFB0]">
            <Radius className="w-3.5 h-3.5" />
            {t('resultMap.selectArea')}
          </span>
          {[2, 4, 8].map((radiusKm) => (
            <button
              key={radiusKm}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                const nextRadius = selectedRadiusKm === radiusKm ? null : radiusKm;
                setSelectedRadiusKm(nextRadius);
                if (!nextRadius) {
                  setCircleCenter(null);
                  setHoverCircleCenter(null);
                }
              }}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                selectedRadiusKm === radiusKm
                  ? 'bg-brand text-white border-brand'
                  : 'bg-gray-50 dark:bg-[#3D312A] text-gray-600 dark:text-[#C8BFB0] border-gray-200 dark:border-[#4D3D32] hover:border-brand/50'
              }`}
            >
              {radiusKm} km
            </button>
          ))}
          {selectedRadiusKm && (
            <button
              key="clear-radius"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setSelectedRadiusKm(null);
                setCircleCenter(null);
                setHoverCircleCenter(null);
              }}
              className="px-2.5 py-1 rounded-full text-[11px] font-bold border border-red-200 dark:border-red-950 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100 transition-all cursor-pointer hover:scale-105"
            >
              {t('resultMap.off')}
            </button>
          )}
        </div>

        {circlePixels && selectedRadiusKm && (
          <>
            <div
              className="absolute z-10 rounded-full border-2 border-brand bg-brand/15 shadow-[0_0_0_9999px_rgba(42,36,32,0.08)] pointer-events-none"
              style={{
                left: circlePixels.left - circlePixels.radius,
                top: circlePixels.top - circlePixels.radius,
                width: circlePixels.radius * 2,
                height: circlePixels.radius * 2,
              }}
            />
            <div
              className="absolute z-20 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{ left: circlePixels.left, top: circlePixels.top }}
            >
              <span className="block w-3 h-3 rounded-full bg-brand border-2 border-white shadow-md" />
              <span className="absolute left-1/2 top-4 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/95 dark:bg-[#2A2420]/95 border border-gray-200 dark:border-[#4D3D32] px-2 py-1 text-[10px] font-bold text-brand shadow-sm">
                {selectedRadiusKm} km
              </span>
            </div>
          </>
        )}

        {fallbackCenter && typeof fallbackCenter.lat === 'number' && typeof fallbackCenter.lng === 'number' && (
          <div
            data-map-control="true"
            className="absolute -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none"
            style={{
              left: project(fallbackCenter.lat, fallbackCenter.lng, zoom).x - topLeft.x,
              top: project(fallbackCenter.lat, fallbackCenter.lng, zoom).y - topLeft.y,
            }}
          >
            <span className="absolute inset-0 rounded-full bg-[#FFD700]/30 animate-ping" />
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#FFD700] border-2 border-black shadow-lg text-black relative z-10">
              <Star className="w-4 h-4 fill-black" />
            </span>
          </div>
        )}

        {mapResults.map((item, index) => {
          const point = project(item.lat || 0, item.lng || 0, zoom);
          const left = point.x - topLeft.x;
          const top = point.y - topLeft.y;
          const selected = selectedId === item.id;

          return (
            <button
              key={item.id || index}
              type="button"
              data-map-control="true"
              onClick={(event) => {
                event.stopPropagation();
                onSelectId(item.id === selectedId ? null : item.id);
              }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 group ${
                selected ? 'z-30 scale-110' : 'z-20 hover:scale-105'
              }`}
              style={{ left, top }}
              title={item.name}
            >
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 shadow-md transition-all ${
                selected
                  ? 'bg-brand border-white scale-110 ring-4 ring-brand/20'
                  : 'bg-[#123D2A] border-white/90'
              }`}>
                <img
                  src="/images/fork-knife.png"
                  alt="Restaurant"
                  className="w-4 h-4 invert"
                />
              </div>

              {selected && (
                <div className="absolute left-1/2 bottom-[calc(100%+8px)] -translate-x-1/2 w-52 rounded-2xl bg-white dark:bg-[#2A2420] border border-gray-100 dark:border-[#4D3D32] shadow-xl px-3 py-2 text-left z-50">
                  <span className="block text-xs font-bold text-gray-800 dark:text-[#E6DFD5]">{item.name}</span>
                  <span className="mt-1 flex items-center justify-between text-[11px] text-gray-500 dark:text-[#9A8A7A]">
                    {item.dist && <span>📍 {item.dist}</span>}
                    <span>⭐ {getCleanRating(item.rating)}</span>
                  </span>
                  {item.reason && (
                    <p className="mt-1 text-[10px] text-gray-400 dark:text-[#7A6A5A] line-clamp-2 leading-relaxed">
                      {translateMapReason(item.reason, language)}
                    </p>
                  )}
                </div>
              )}
            </button>
          );
        })}

        <div data-map-control="true" className="absolute top-4 right-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleZoom(1);
            }}
            className="w-9 h-9 rounded-full bg-white/95 dark:bg-[#2A2420]/95 border border-gray-200 dark:border-[#4D3D32] text-gray-700 dark:text-[#E6DFD5] flex items-center justify-center shadow-sm hover:scale-105 transition-transform"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleZoom(-1);
            }}
            className="w-9 h-9 rounded-full bg-white/95 dark:bg-[#2A2420]/95 border border-gray-200 dark:border-[#4D3D32] text-gray-700 dark:text-[#E6DFD5] flex items-center justify-center shadow-sm hover:scale-105 transition-transform"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              recenter();
            }}
            className="w-9 h-9 rounded-full bg-white/95 dark:bg-[#2A2420]/95 border border-gray-200 dark:border-[#4D3D32] text-gray-700 dark:text-[#E6DFD5] flex items-center justify-center shadow-sm hover:scale-105 transition-transform"
          >
            <LocateFixed className="w-4 h-4" />
          </button>
        </div>

        <div className="absolute left-4 bottom-4 max-w-[calc(100%-2rem)] rounded-2xl bg-white/90 dark:bg-[#2A2420]/90 border border-gray-200 dark:border-[#4D3D32] px-3 py-2 text-[11px] font-semibold text-gray-600 dark:text-[#C8BFB0] shadow-sm pointer-events-none">
          {isSearching
            ? t('resultMap.filteringArea')
            : selectedRadiusKm
              ? t('resultMap.clickToFilter').replace('{radius}', String(selectedRadiusKm))
              : t('resultMap.chooseRadius')}
        </div>

        <span className="absolute right-3 bottom-3 px-2 py-1 rounded-full bg-white/80 dark:bg-[#2A2420]/80 text-[10px] text-gray-500 dark:text-[#9A8A7A]">
          OpenStreetMap
        </span>
      </div>
    </div>
  );
}

function getCircleBounds(lat: number, lng: number, radiusKm: number) {
  const latDelta = radiusKm / 111.0;
  const lngDelta = radiusKm / Math.max(111.0 * Math.cos((lat * Math.PI) / 180), 1.0);

  return {
    north: lat + latDelta,
    south: lat - latDelta,
    east: lng + lngDelta,
    west: lng - lngDelta,
  };
}
