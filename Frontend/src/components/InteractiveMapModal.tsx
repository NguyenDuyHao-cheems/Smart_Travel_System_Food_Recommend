'use client';

import { useState, useEffect, useRef } from 'react';
import { X, MapPin, Search, Loader2, Check, Compass } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface InteractiveMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCoords: { lat: number; lng: number } | null;
  initialRadius: number;
  onConfirm: (coords: { lat: number; lng: number }, address: string, radius: number) => void;
}

const getZoomForRadius = (r: number) => {
  if (r <= 2) return 15;
  if (r <= 5) return 14;
  if (r <= 10) return 13;
  if (r <= 20) return 12;
  return 11;
};

export function InteractiveMapModal({
  isOpen,
  onClose,
  initialCoords,
  initialRadius,
  onConfirm
}: InteractiveMapModalProps) {
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [selectedPos, setSelectedPos] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState<number>(initialRadius || 5.0);
  const [currentAddress, setCurrentAddress] = useState<string>('');
  const [geocoding, setGeocoding] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);

  // Reset radius when modal opens
  useEffect(() => {
    if (isOpen) {
      setRadius(initialRadius || 5.0);
    }
  }, [isOpen, initialRadius]);

  // 1. Load Leaflet CDN Assets
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).L) {
      setLeafletLoaded(true);
      return;
    }

    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    cssLink.id = 'leaflet-css';
    document.head.appendChild(cssLink);

    const jsScript = document.createElement('script');
    jsScript.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    jsScript.id = 'leaflet-js';
    jsScript.async = true;
    jsScript.onload = () => {
      setLeafletLoaded(true);
    };
    document.head.appendChild(jsScript);
  }, []);

  // 2. Initialize Leaflet Map
  useEffect(() => {
    if (!leafletLoaded || !isOpen || !mapContainerRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    // Fix marker icon resolution path
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const initialLat = initialCoords?.lat || 10.7769; // Ho Chi Minh City
    const initialLng = initialCoords?.lng || 106.7009;
    const initialZoom = getZoomForRadius(radius);

    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current).setView([initialLat, initialLng], initialZoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      mapRef.current = map;

      // Draggable search point marker
      const marker = L.marker([initialLat, initialLng], { draggable: true }).addTo(map);
      markerRef.current = marker;

      // Visual guidance search range based on selected radius
      const circle = L.circle([initialLat, initialLng], {
        color: '#E8735A',
        fillColor: '#E8735A',
        fillOpacity: 0.12,
        radius: radius * 1000
      }).addTo(map);
      circleRef.current = circle;

      // Marker drag events
      marker.on('dragend', () => {
        const position = marker.getLatLng();
        circle.setLatLng(position);
        setSelectedPos({ lat: position.lat, lng: position.lng });
      });

      // Map click events
      map.on('click', (e: any) => {
        const position = e.latlng;
        marker.setLatLng(position);
        circle.setLatLng(position);
        setSelectedPos({ lat: position.lat, lng: position.lng });
      });

      setSelectedPos({ lat: initialLat, lng: initialLng });
    } else {
      mapRef.current.setView([initialLat, initialLng], initialZoom);
      markerRef.current.setLatLng([initialLat, initialLng]);
      if (circleRef.current) {
        circleRef.current.setLatLng([initialLat, initialLng]);
        circleRef.current.setRadius(radius * 1000);
      }
      setSelectedPos({ lat: initialLat, lng: initialLng });
    }

    // Trigger map invalidation at stages of transition to ensure perfect tile layout
    const resizeMap = () => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    };
    const t1 = setTimeout(resizeMap, 100);
    const t2 = setTimeout(resizeMap, 350);
    const t3 = setTimeout(resizeMap, 600);

    // Setup ResizeObserver to catch any layout or size changes dynamically
    let resizeObserver: ResizeObserver | null = null;
    if (typeof window !== 'undefined' && window.ResizeObserver && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        resizeMap();
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      // Completely destroy and clean up the Leaflet map instance on close
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
        circleRef.current = null;
      }
    };
  }, [leafletLoaded, isOpen, initialCoords]);

  // Update circle radius and map zoom level dynamically when radius state changes
  useEffect(() => {
    if (!leafletLoaded || !isOpen) return;

    if (circleRef.current) {
      circleRef.current.setRadius(radius * 1000);
    }

    if (mapRef.current) {
      const currentZoom = mapRef.current.getZoom();
      const targetZoom = getZoomForRadius(radius);
      if (currentZoom !== targetZoom) {
        mapRef.current.setZoom(targetZoom);
      }
    }
  }, [radius, leafletLoaded, isOpen]);

  // 3. Debounced Reverse Geocoding
  useEffect(() => {
    if (!selectedPos) return;

    const timer = setTimeout(() => {
      fetchAddress(selectedPos.lat, selectedPos.lng);
    }, 500);

    return () => clearTimeout(timer);
  }, [selectedPos]);

  const fetchAddress = async (lat: number, lng: number) => {
    try {
      setGeocoding(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const response = await fetch(`${apiUrl}/api/v1/location/reverse?lat=${lat}&lng=${lng}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentAddress(data.address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      } else {
        setCurrentAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    } catch (err) {
      console.error(err);
      setCurrentAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } finally {
      setGeocoding(false);
    }
  };

  // 4. Geocode Search Query
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setSearching(true);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const { lat, lon, display_name } = data[0];
          const newLat = parseFloat(lat);
          const newLng = parseFloat(lon);

          setSelectedPos({ lat: newLat, lng: newLng });
          setCurrentAddress(display_name);

          // Update map center & elements
          if (mapRef.current) {
            mapRef.current.setView([newLat, newLng], 14);
          }
          if (markerRef.current) {
            markerRef.current.setLatLng([newLat, newLng]);
          }
          if (circleRef.current) {
            circleRef.current.setLatLng([newLat, newLng]);
          }
        } else {
          alert('Không tìm thấy địa điểm này. Vui lòng thử tìm kiếm khác!');
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const handleConfirm = () => {
    if (selectedPos) {
      onConfirm(selectedPos, currentAddress, radius);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative bg-white dark:bg-[#2A2420] rounded-3xl shadow-2xl border border-gray-100 dark:border-[#4D3D32] w-full max-w-2xl mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E6DFD5]/60 dark:border-[#3D312A]/60 bg-gray-50 dark:bg-[#2F2824]">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-brand dark:text-[#E8735A]" />
            <h3 className="text-lg font-bold text-[#3D312A] dark:text-[#E6DFD5]">Chọn vùng tìm kiếm quán</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#3D312A] transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 flex flex-col space-y-4 overflow-y-auto">
          {/* Search form */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nhập địa điểm, quận, thành phố..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-[#3D312A]/40 border border-gray-200 dark:border-[#4D3D32] rounded-2xl text-sm text-[#3D312A] dark:text-[#E6DFD5] focus:outline-none focus:border-brand dark:focus:border-brand-hover transition-colors"
              />
              <Search className="absolute left-3.5 top-3 w-4.5 h-4.5 text-gray-400" />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="px-5 py-2.5 bg-brand dark:bg-[#E8735A] hover:bg-brand-hover text-white text-sm font-bold rounded-2xl transition-all cursor-pointer flex items-center gap-2 shadow-sm"
            >
              {searching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Tìm kiếm'
              )}
            </button>
          </form>

          {/* Map display */}
          <div className="relative border border-gray-100 dark:border-[#4D3D32] rounded-2xl overflow-hidden h-[350px] bg-gray-50 dark:bg-[#201A18] flex items-center justify-center">
            {!leafletLoaded ? (
              <div className="flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-brand dark:text-[#E8735A] mb-2" />
                <span className="text-xs text-gray-400 dark:text-[#9A8A7A]">Đang tải bản đồ trực quan...</span>
              </div>
            ) : (
              <div id="group-recommend-map" ref={mapContainerRef} className="w-full h-full z-10" />
            )}
            
            {/* Guide overlay */}
            <div className="absolute bottom-4 right-4 z-20 bg-white/90 dark:bg-[#2A2420]/90 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-gray-200 dark:border-[#4D3D32] text-[10px] text-gray-500 dark:text-[#9A8A7A] pointer-events-none shadow-sm font-medium">
              💡 Click bản đồ hoặc kéo thả Marker đỏ để dời vùng tìm kiếm.
            </div>
          </div>

          {/* Search radius slider control */}
          <div className="p-4 rounded-2xl bg-orange-50/20 dark:bg-[#3D312A]/30 border border-orange-100/50 dark:border-[#4D3D32] space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-[#3D312A] dark:text-[#E6DFD5] flex items-center gap-1.5">
                📏 Bán kính tìm kiếm hiện tại:
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand/10 dark:bg-[#E8735A]/10 text-brand dark:text-[#E8735A]">
                  {radius} km
                </span>
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="30"
              step="1"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-[#3D312A] rounded-lg appearance-none cursor-pointer accent-brand dark:accent-[#E8735A]"
            />
            <div className="flex justify-between text-[10px] text-gray-400 dark:text-[#9A8A7A] px-0.5">
              <span>1 km</span>
              <span>10 km</span>
              <span>20 km</span>
              <span>30 km</span>
            </div>
          </div>

          {/* Current selected display */}
          <div className="p-4 rounded-2xl bg-brand-muted/40 dark:bg-[#3D312A]/50 border border-brand-muted/60 dark:border-[#4D3D32] flex items-start gap-3">
            <div className="p-2 bg-brand/10 dark:bg-[#E8735A]/10 text-brand dark:text-[#E8735A] rounded-xl flex-shrink-0 mt-0.5">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-gray-400 dark:text-[#9A8A7A] uppercase tracking-wider">
                  Vùng tìm kiếm được chọn
                </span>
                {geocoding && <Loader2 className="w-3 h-3 animate-spin text-brand" />}
              </div>
              <h4 className="text-xs font-bold text-[#3D312A] dark:text-[#E6DFD5] leading-snug truncate">
                {currentAddress || 'Đang xác định địa chỉ...'}
              </h4>
              {selectedPos && (
                <p className="text-[10px] text-[#7A6A5A] dark:text-[#9A8A7A] mt-1 font-mono">
                  Lat: {selectedPos.lat.toFixed(5)} · Lng: {selectedPos.lng.toFixed(5)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-[#E6DFD5]/60 dark:border-[#3D312A]/60 bg-gray-50 dark:bg-[#2F2824]">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-gray-200 dark:border-[#4D3D32] text-sm font-semibold text-gray-500 dark:text-[#9A8A7A] hover:bg-gray-100 dark:hover:bg-[#3D312A] transition-all cursor-pointer text-center"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedPos || geocoding}
            className="flex-1 py-3 rounded-2xl bg-[#3D312A] dark:bg-brand text-white hover:bg-[#4D3D32] dark:hover:bg-brand-hover text-sm font-bold shadow-md transition-all cursor-pointer text-center flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            Xác nhận vùng tìm kiếm
          </button>
        </div>
      </div>
    </div>
  );
}
