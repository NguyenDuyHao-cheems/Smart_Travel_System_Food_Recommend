import { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { setLocation, setLocationError } from '../store/slices/locationSlice';

export function useOptimizedLocation() {
  const dispatch = useDispatch();
  const reduxCoords = useSelector((state: RootState) => state.location.coords);

  const getOptimizedLocation = useCallback(async (): Promise<{ lat: number; lng: number } | null> => {
    // Nếu đã có vị trí trong Redux, trả về ngay lập tức để không phải chờ đợi và hiện thông báo lặp lại
    if (reduxCoords) {
      return reduxCoords;
    }

    // 1. Kiểm tra nhanh trạng thái quyền truy cập trước bằng Permissions API để tránh phải chờ đợi vô ích nếu đã từ chối
    if (typeof window !== 'undefined' && navigator.permissions) {
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        if (permissionStatus.state === 'denied') {
          const errMsg = "Bạn đã từ chối quyền định vị. Vui lòng cấp quyền trong cài đặt trình duyệt để tiếp tục.";
          dispatch(setLocationError(errMsg));
          return reduxCoords;
        }
      } catch (e) {
        console.warn("Permissions API not supported for geolocation:", e);
      }
    }

    try {
      // Create a promise that rejects after 5000ms
      const timeoutPromise = new Promise<{ lat: number; lng: number }>((_, reject) => {
        const error = new Error('GPS timeout');
        (error as any).code = 3; // Geolocation TIMEOUT code
        setTimeout(() => reject(error), 5000);
      });

      // Create a promise to get actual GPS
      const gpsPromise = new Promise<{ lat: number; lng: number }>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation not supported'));
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          (err) => reject(err),
          { 
            timeout: 5000, 
            enableHighAccuracy: false, // Tắt độ chính xác cao giúp PC/Laptop định vị qua Wi-Fi/IP siêu tốc
            maximumAge: 60000           // Cho phép sử dụng lại vị trí cũ trong 1 phút để phản hồi tức thì
          }
        );
      });

      // Race them
      const result = await Promise.race([gpsPromise, timeoutPromise]);

      // If success within 5s, save to Redux and return
      dispatch(setLocation(result));
      return result;

    } catch (err: any) {
      console.warn('Optimized location fetch failed or timed out:', err);

      let friendlyMsg = "Không thể xác định vị trí thực tế của bạn. Vui lòng kiểm tra lại thiết bị hoặc mạng.";
      
      if (err.code === 1) { // PERMISSION_DENIED
        friendlyMsg = "Bạn đã từ chối quyền định vị. Vui lòng cấp quyền trong cài đặt trình duyệt để tiếp tục.";
      } else if (err.code === 2) { // POSITION_UNAVAILABLE
        friendlyMsg = "Không thể xác định được vị trí của bạn lúc này. Vui lòng kiểm tra kết nối định vị trên Windows/Thiết bị của bạn.";
      } else if (err.code === 3) { // TIMEOUT
        friendlyMsg = "Tín hiệu GPS đang yếu hoặc phản hồi quá chậm. Hệ thống sẽ sử dụng vị trí gần nhất của bạn.";
      }

      dispatch(setLocationError(friendlyMsg));
      return reduxCoords;
    }
  }, [dispatch, reduxCoords]);

  return { getOptimizedLocation };
}
