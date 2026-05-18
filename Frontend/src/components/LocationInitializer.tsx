'use client';

import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { setLocationFromBackground, setLocationStatus, setLocationError } from '../store/slices/locationSlice';

const RETRY_DELAYS = [2000, 4000, 8000]; // 2s, 4s, 8s

export function LocationInitializer() {
  const dispatch = useDispatch();
  const attemptRef = useRef(0);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const isFetched = sessionStorage.getItem('gps_fetched');
    if (isFetched === 'true') {
      return; // Already fetched in this session
    }

    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    const fetchLocationWithBackoff = () => {
      dispatch(setLocationStatus('loading'));

      if (!navigator.geolocation) {
        dispatch(setLocationError("Trình duyệt của bạn không hỗ trợ định vị."));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          dispatch(
            setLocationFromBackground({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            })
          );
          sessionStorage.setItem('gps_fetched', 'true');
        },
        (error) => {
          console.warn('Background GPS fetch failed:', error.message);
          
          if (attemptRef.current < RETRY_DELAYS.length) {
            const delay = RETRY_DELAYS[attemptRef.current];
            attemptRef.current += 1;
            setTimeout(fetchLocationWithBackoff, delay);
          } else {
            let friendlyMsg = "Không thể xác định vị trí thực tế của bạn. Vui lòng kiểm tra lại thiết bị hoặc mạng.";
            
            if (error.code === 1) { // PERMISSION_DENIED
              friendlyMsg = "Bạn đã từ chối quyền định vị. Vui lòng cấp quyền trong cài đặt trình duyệt để tiếp tục.";
            } else if (error.code === 2) { // POSITION_UNAVAILABLE
              friendlyMsg = "Không thể xác định được vị trí của bạn lúc này. Vui lòng kiểm tra kết nối định vị trên Windows/Thiết bị của bạn.";
            } else if (error.code === 3) { // TIMEOUT
              friendlyMsg = "Tín hiệu GPS đang yếu hoặc phản hồi quá chậm. Hệ thống sẽ sử dụng vị trí gần nhất của bạn.";
            }

            dispatch(setLocationError(friendlyMsg));
            sessionStorage.setItem('gps_fetched', 'false'); // Mark as attempted but failed
          }
        },
        { 
          timeout: 5000, 
          enableHighAccuracy: false, // Tắt độ chính xác cao giúp PC/Laptop định vị qua Wi-Fi/IP siêu tốc
          maximumAge: 60000           // Cho phép sử dụng lại vị trí cũ trong 1 phút để phản hồi tức thì
        }
      );
    };

    fetchLocationWithBackoff();
  }, [dispatch]);

  return null; // This component doesn't render anything
}
