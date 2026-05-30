import { useState, useCallback } from 'react';

interface LocationData {
  lat: number;
  lng: number;
}

interface GeolocationState {
  location: LocationData | null;
  error: string | null;
  isLoading: boolean;
}

type Language = 'vi' | 'en';

const GEOLOCATION_ERRORS = {
  vi: {
    unsupported: 'Trình duyệt của bạn không hỗ trợ Geolocation API.',
    unknown: 'Không thể lấy được vị trí hiện tại.',
    denied: 'Bạn đã từ chối yêu cầu truy cập vị trí. Vui lòng cho phép để tiếp tục.',
    unavailable: 'Thông tin vị trí không khả dụng. Vui lòng kiểm tra cài đặt GPS.',
    timeout: 'Yêu cầu lấy vị trí bị quá thời gian (Timeout). Hãy thử lại hoặc kiểm tra kết nối mạng.',
  },
  en: {
    unsupported: 'Your browser does not support the Geolocation API.',
    unknown: 'Unable to get your current location.',
    denied: 'Location access was denied. Please allow it to continue.',
    unavailable: 'Location information is unavailable. Please check your GPS settings.',
    timeout: 'Location request timed out. Please try again or check your network connection.',
  },
};

export function useGeolocation(language: Language = 'vi') {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    error: null,
    isLoading: false,
  });

  const getLocation = useCallback(() => {
    const copy = GEOLOCATION_ERRORS[language];
    setState({ location: null, isLoading: true, error: null });

    if (!navigator.geolocation) {
      setState({
        location: null,
        error: copy.unsupported,
        isLoading: false,
      });
      return;
    }

    // Cấu hình ban đầu: Ưu tiên độ chính xác cao (GPS)
    const options = {
      enableHighAccuracy: true, // Bật độ chính xác cao
      timeout: 15000,           // Chờ tối đa 15 giây
      maximumAge: 300000,       // Sử dụng kết quả cũ trong vòng 5 phút (nếu có)
    };

    const handleError = (error: GeolocationPositionError) => {
      // CƠ CHẾ DỰ PHÒNG (FALLBACK): 
      // Nếu lấy độ chính xác cao bị lỗi hoặc quá thời gian (Timeout)
      if (options.enableHighAccuracy) {
        console.warn("Lấy vị trí chính xác cao thất bại, đang thử lại với độ chính xác thường...");
        
        navigator.geolocation.getCurrentPosition(
          handleSuccess,
          handleFinalError,
          { 
            ...options, 
            enableHighAccuracy: false, // Tắt độ chính xác cao để lấy nhanh hơn (qua Wifi/IP)
            timeout: 10000             // Chờ thêm 10 giây cho lần thử này
          }
        );
        return;
      }
      handleFinalError(error);
    };

    const handleSuccess = (position: GeolocationPosition) => {
      setState({
        location: {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        },
        error: null,
        isLoading: false,
      });
    };

    const handleFinalError = (error: GeolocationPositionError) => {
      let errorMessage = copy.unknown;
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = copy.denied;
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = copy.unavailable;
          break;
        case error.TIMEOUT:
          errorMessage = copy.timeout;
          break;
      }
      setState({
        location: null,
        error: errorMessage,
        isLoading: false,
      });
    };

    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, options);
  }, [language]);

  return { ...state, getLocation };
}
