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

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    error: null,
    isLoading: false,
  });

  const getLocation = useCallback(() => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    if (!navigator.geolocation) {
      setState({
        location: null,
        error: 'Trình duyệt của bạn không hỗ trợ Geolocation API.',
        isLoading: false,
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          location: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          error: null,
          isLoading: false,
        });
      },
      (error) => {
        let errorMessage = 'Không thể lấy được vị trí hiện tại.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Bạn đã từ chối yêu cầu truy cập vị trí.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Thông tin vị trí không khả dụng. Vui lòng bật GPS trên thiết bị.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Yêu cầu lấy vị trí bị quá thời gian (Timeout).';
            break;
        }
        setState({
          location: null,
          error: errorMessage,
          isLoading: false,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  return { ...state, getLocation };
}
