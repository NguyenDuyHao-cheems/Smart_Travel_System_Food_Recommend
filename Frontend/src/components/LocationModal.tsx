'use client';

import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { X, MapPin, Navigation, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { RootState } from '../store';
import { setLocation, setLocationStatus } from '../store/slices/locationSlice';
import { toast } from 'sonner';
import { useGeolocation } from '../hooks/useGeolocation';
import { useLanguage } from './LanguageProvider';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LocationModal({ isOpen, onClose }: LocationModalProps) {
  const { t } = useLanguage();
  const dispatch = useDispatch();
  const coords = useSelector((state: RootState) => state.location.coords);
  const address = useSelector((state: RootState) => state.location.address);
  const status = useSelector((state: RootState) => state.location.status);

  const [inputLat, setInputLat] = useState('');
  const [inputLng, setInputLng] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const gpsSuccessHandledRef = useRef<boolean>(true);
  const gpsErrorHandledRef = useRef<boolean>(true);

  const { location: gpsLocation, error: gpsError, isLoading: gpsLoading, getLocation } = useGeolocation();
  const isUpdatingGPS = gpsLoading;

  // Sync inputs with redux store coordinates when modal opens or coordinates change
  useEffect(() => {
    if (coords) {
      setInputLat(coords.lat.toString());
      setInputLng(coords.lng.toString());
    }
  }, [coords, isOpen]);

  // Handle GPS location success callback
  useEffect(() => {
    if (gpsLocation && !gpsSuccessHandledRef.current) {
      gpsSuccessHandledRef.current = true;
      dispatch(setLocation(gpsLocation));
      if (typeof window !== 'undefined') {
        localStorage.setItem('user_cached_gps', JSON.stringify(gpsLocation));
        localStorage.removeItem('user_cached_address');
      }
      setInputLat(gpsLocation.lat.toString());
      setInputLng(gpsLocation.lng.toString());
      toast.success(t('locationModal.gpsSuccess'));
      
      // Auto close modal after 800ms so user has time to read the success toast
      const timer = setTimeout(() => {
        onClose();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [gpsLocation, dispatch, onClose]);

  // Handle GPS location error callback
  useEffect(() => {
    if (gpsError && !gpsErrorHandledRef.current) {
      gpsErrorHandledRef.current = true;
      setErrorMsg(gpsError);
      dispatch(setLocationStatus('error'));
    }
  }, [gpsError, dispatch]);

  if (!isOpen) return null;

  const handleUpdateGPS = () => {
    if (typeof window === 'undefined') return;
    
    const now = Date.now();
    if (now - lastUpdateRef.current < 2000) {
      toast.warning(t('locationModal.waitWarning'));
      return;
    }
    lastUpdateRef.current = now;
    
    setErrorMsg(null);
    dispatch(setLocationStatus('loading'));
    gpsSuccessHandledRef.current = false;
    gpsErrorHandledRef.current = false;
    getLocation();
  };

  const handleSaveManual = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const now = Date.now();
    if (now - lastUpdateRef.current < 2000) {
      toast.warning(t('locationModal.waitWarning'));
      return;
    }
    lastUpdateRef.current = now;

    const lat = parseFloat(inputLat);
    const lng = parseFloat(inputLng);

    if (isNaN(lat) || isNaN(lng)) {
      setErrorMsg(t('locationModal.invalidNumber'));
      return;
    }

    if (lat < -90 || lat > 90) {
      setErrorMsg(t('locationModal.invalidLatitude'));
      return;
    }

    if (lng < -180 || lng > 180) {
      setErrorMsg(t('locationModal.invalidLongitude'));
      return;
    }

    dispatch(setLocation({ lat, lng }));
    if (typeof window !== 'undefined') {
      localStorage.setItem('user_cached_gps', JSON.stringify({ lat, lng }));
      localStorage.removeItem('user_cached_address');
    }
    toast.success(t('locationModal.manualSuccess'));
    onClose();
  };

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Modal Container */}
      <div
        className="relative bg-white dark:bg-[#2A2420] rounded-3xl shadow-2xl border border-gray-100 dark:border-[#4D3D32] w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E6DFD5]/60 dark:border-[#3D312A]/60 bg-gray-50 dark:bg-[#2F2824]">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-brand dark:text-[#E8735A]" />
            <h3 className="text-lg font-bold text-[#3D312A] dark:text-[#E6DFD5]">{t('locationModal.title')}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#3D312A] transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Current Address display */}
          <div className="mb-6 p-4 rounded-2xl bg-brand-muted/40 dark:bg-brand/5 border border-brand-muted/60 dark:border-brand/10">
            <p className="text-xs font-semibold text-gray-400 dark:text-[#9A8A7A] uppercase tracking-wider mb-1">
              {t('locationModal.recording')}
            </p>
            <h4 className="text-sm font-bold text-[#3D312A] dark:text-[#E6DFD5] leading-snug">
              {address || t('locationModal.addressUpdating')}
            </h4>
            {coords && (
              <p className="text-xs text-[#7A6A5A] dark:text-[#9A8A7A] mt-1.5 flex gap-3 font-mono">
                <span>Lat: {coords.lat.toFixed(6)}</span>
                <span>Lng: {coords.lng.toFixed(6)}</span>
              </p>
            )}
            <p className="text-[10px] text-gray-400/80 dark:text-[#9A8A7A]/60 mt-1.5">
              Dữ liệu bản đồ & địa chỉ © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline hover:text-brand dark:hover:text-[#E8735A]">OpenStreetMap contributors</a>
            </p>
            
            {/* Status indicator */}
            <div className="mt-3 flex items-center gap-1.5 text-xs">
              {status === 'success' ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-green-600 dark:text-green-400 font-medium">{t('locationModal.located')}</span>
                </>
              ) : status === 'loading' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-brand animate-spin" />
                  <span className="text-brand dark:text-[#E8735A] font-medium">{t('locationModal.findingCoords')}</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-amber-600 dark:text-amber-400 font-medium">{t('locationModal.locationError')}</span>
                </>
              )}
            </div>
          </div>

          {/* Quick Refresh GPS Button */}
          <button
            type="button"
            onClick={handleUpdateGPS}
            disabled={isUpdatingGPS}
            className="w-full mb-6 py-3 px-4 flex items-center justify-center gap-2 bg-brand text-white text-sm font-bold rounded-2xl hover:bg-brand-hover disabled:opacity-75 transition-colors shadow-sm shadow-brand/20 cursor-pointer"
          >
            <Navigation className={`w-4 h-4 ${isUpdatingGPS ? 'animate-pulse' : ''}`} />
            {isUpdatingGPS ? t('locationModal.updatingGps') : t('locationModal.autoGps')}
          </button>

          {/* Custom coordinate form */}
          <div className="relative mb-4 flex items-center">
            <div className="flex-grow border-t border-gray-200 dark:border-[#3D312A]" />
            <span className="flex-shrink mx-4 text-xs font-semibold text-gray-400 dark:text-[#7A6A5A] uppercase tracking-wider">
              {t('locationModal.manualDivider')}
            </span>
            <div className="flex-grow border-t border-gray-200 dark:border-[#3D312A]" />
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSaveManual} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#7A6A5A] dark:text-[#9A8A7A] mb-1.5 ml-1">
                  {t('locationModal.latitude')}
                </label>
                <input
                  type="text"
                  value={inputLat}
                  onChange={(e) => setInputLat(e.target.value)}
                  placeholder="Vd: 21.028"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#3D312A]/40 border border-gray-200 dark:border-[#4D3D32] rounded-xl text-sm text-[#3D312A] dark:text-[#E6DFD5] focus:outline-none focus:border-brand dark:focus:border-brand-hover transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#7A6A5A] dark:text-[#9A8A7A] mb-1.5 ml-1">
                  {t('locationModal.longitude')}
                </label>
                <input
                  type="text"
                  value={inputLng}
                  onChange={(e) => setInputLng(e.target.value)}
                  placeholder="Vd: 105.834"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#3D312A]/40 border border-gray-200 dark:border-[#4D3D32] rounded-xl text-sm text-[#3D312A] dark:text-[#E6DFD5] focus:outline-none focus:border-brand dark:focus:border-brand-hover transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-full border border-gray-200 dark:border-[#4D3D32] text-sm font-semibold text-gray-500 dark:text-[#9A8A7A] hover:bg-gray-50 dark:hover:bg-[#3D312A] transition-all cursor-pointer"
              >
                {t('locationModal.cancel')}
              </button>
              <button
                type="submit"
                className="flex-1 py-3 rounded-full bg-[#3D312A] dark:bg-white text-white dark:text-[#2A2420] hover:bg-[#4D3D32] dark:hover:bg-[#E6DFD5] text-sm font-bold shadow-md transition-all cursor-pointer"
              >
                {t('locationModal.manualUpdate')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
