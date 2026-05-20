'use client';

import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { X, MapPin, Navigation, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { RootState } from '../store';
import { setLocation, setLocationStatus } from '../store/slices/locationSlice';
import { toast } from 'sonner';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LocationModal({ isOpen, onClose }: LocationModalProps) {
  const dispatch = useDispatch();
  const coords = useSelector((state: RootState) => state.location.coords);
  const address = useSelector((state: RootState) => state.location.address);
  const status = useSelector((state: RootState) => state.location.status);

  const [inputLat, setInputLat] = useState('');
  const [inputLng, setInputLng] = useState('');
  const [isUpdatingGPS, setIsUpdatingGPS] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync inputs with redux store coordinates when modal opens or coordinates change
  useEffect(() => {
    if (coords) {
      setInputLat(coords.lat.toString());
      setInputLng(coords.lng.toString());
    }
  }, [coords, isOpen]);

  if (!isOpen) return null;

  const handleUpdateGPS = () => {
    if (typeof window === 'undefined') return;
    
    setIsUpdatingGPS(true);
    setErrorMsg(null);
    dispatch(setLocationStatus('loading'));

    if (!navigator.geolocation) {
      setErrorMsg('Trình duyệt của bạn không hỗ trợ định vị GPS.');
      dispatch(setLocationStatus('error'));
      setIsUpdatingGPS(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newCoords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        // Background sets coords and changes status to success
        dispatch(setLocation(newCoords));
        setInputLat(newCoords.lat.toString());
        setInputLng(newCoords.lng.toString());
        setIsUpdatingGPS(false);
        toast.success('Định vị GPS thành công!');
      },
      (err) => {
        console.warn('GPS query failed:', err.message);
        setErrorMsg('Không thể truy cập GPS. Hãy kiểm tra quyền truy cập của trình duyệt.');
        dispatch(setLocationStatus('error'));
        setIsUpdatingGPS(false);
        toast.error('Lấy GPS thất bại.');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleSaveManual = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const lat = parseFloat(inputLat);
    const lng = parseFloat(inputLng);

    if (isNaN(lat) || isNaN(lng)) {
      setErrorMsg('Kinh độ và vĩ độ phải là chữ số hợp lệ.');
      return;
    }

    if (lat < -90 || lat > 90) {
      setErrorMsg('Vĩ độ (Latitude) phải nằm trong khoảng từ -90 đến 90.');
      return;
    }

    if (lng < -180 || lng > 180) {
      setErrorMsg('Kinh độ (Longitude) phải nằm trong khoảng từ -180 đến 180.');
      return;
    }

    dispatch(setLocation({ lat, lng }));
    toast.success('Đã lưu vị trí thủ công thành công!');
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
            <h3 className="text-lg font-bold text-[#3D312A] dark:text-[#E6DFD5]">Vị trí hiện tại của bạn</h3>
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
              Hệ thống đang ghi nhận
            </p>
            <h4 className="text-sm font-bold text-[#3D312A] dark:text-[#E6DFD5] leading-snug">
              {address || 'Đang cập nhật địa chỉ hoặc chưa định vị...'}
            </h4>
            {coords && (
              <p className="text-xs text-[#7A6A5A] dark:text-[#9A8A7A] mt-1.5 flex gap-3 font-mono">
                <span>Lat: {coords.lat.toFixed(6)}</span>
                <span>Lng: {coords.lng.toFixed(6)}</span>
              </p>
            )}
            
            {/* Status indicator */}
            <div className="mt-3 flex items-center gap-1.5 text-xs">
              {status === 'success' ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-green-600 dark:text-green-400 font-medium">Đã xác định vị trí</span>
                </>
              ) : status === 'loading' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-brand animate-spin" />
                  <span className="text-brand dark:text-[#E8735A] font-medium">Đang tìm tọa độ...</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-amber-600 dark:text-amber-400 font-medium">Định vị bị lỗi / chưa cấp quyền</span>
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
            {isUpdatingGPS ? 'Đang cập nhật qua GPS...' : 'Cập nhật tự động (Dùng GPS)'}
          </button>

          {/* Custom coordinate form */}
          <div className="relative mb-4 flex items-center">
            <div className="flex-grow border-t border-gray-200 dark:border-[#3D312A]" />
            <span className="flex-shrink mx-4 text-xs font-semibold text-gray-400 dark:text-[#7A6A5A] uppercase tracking-wider">
              Hoặc nhập thủ công
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
                  Vĩ độ (Latitude)
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
                  Kinh độ (Longitude)
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
                Hủy
              </button>
              <button
                type="submit"
                className="flex-1 py-3 rounded-full bg-[#3D312A] dark:bg-white text-white dark:text-[#2A2420] hover:bg-[#4D3D32] dark:hover:bg-[#E6DFD5] text-sm font-bold shadow-md transition-all cursor-pointer"
              >
                Lưu vị trí
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
