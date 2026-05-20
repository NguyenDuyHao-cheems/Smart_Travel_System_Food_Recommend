import { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { setLocation } from '../store/slices/locationSlice';

export function useOptimizedLocation() {
  const dispatch = useDispatch();
  const reduxCoords = useSelector((state: RootState) => state.location.coords);

  const getOptimizedLocation = useCallback(async (): Promise<{ lat: number; lng: number } | null> => {
    // Nếu đã có vị trí trong Redux, trả về ngay lập tức để không phải chờ đợi và hiện thông báo lặp lại
    if (reduxCoords) {
      return reduxCoords;
    }

    // Lấy tọa độ đã lưu/cache trước đó từ localStorage (nếu có)
    let cachedCoords: { lat: number; lng: number } | null = null;
    try {
      if (typeof window !== 'undefined') {
        const cachedStr = localStorage.getItem('user_cached_gps');
        if (cachedStr) {
          cachedCoords = JSON.parse(cachedStr);
        }
      }
    } catch (e) {
      console.warn('Failed to read user_cached_gps from localStorage:', e);
    }

    try {
      // Tạo promise quá giờ sau 5000ms
      const timeoutPromise = new Promise<{ lat: number; lng: number }>((_, reject) => {
        setTimeout(() => reject(new Error('GPS timeout')), 5000);
      });

      // Tạo promise lấy GPS thực tế
      const gpsPromise = new Promise<{ lat: number; lng: number }>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation not supported'));
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          (err) => reject(err),
          { timeout: 5000, enableHighAccuracy: true }
        );
      });

      // Đua tốc độ lấy GPS trong 5s
      const result = await Promise.race([gpsPromise, timeoutPromise]);

      // Nếu thành công trong 5s, lưu vào Redux, cập nhật cache localStorage và trả về
      dispatch(setLocation(result));
      if (typeof window !== 'undefined') {
        localStorage.setItem('user_cached_gps', JSON.stringify(result));
      }
      return result;

    } catch (err) {
      console.warn('Optimized location fallback to previously saved GPS:', err);
      
      // Nếu quá 5s hoặc bị lỗi phần cứng, lấy địa chỉ đã được lưu trước đó (từ Redux hoặc localStorage)
      const fallbackCoords = reduxCoords || cachedCoords;
      if (fallbackCoords) {
        console.info('Successfully retrieved and returning cached GPS fallback:', fallbackCoords);
        return fallbackCoords;
      }
      
      // Nếu hoàn toàn chưa có địa chỉ nào lưu trước đó, trả về tọa độ mặc định (Thủ Đức, HCM)
      const defaultCoords = { lat: 10.880, lng: 106.808 };
      dispatch(setLocation(defaultCoords));
      if (typeof window !== 'undefined') {
        localStorage.setItem('user_cached_gps', JSON.stringify(defaultCoords));
      }
      return defaultCoords;
    }
  }, [dispatch, reduxCoords]);

  return { getOptimizedLocation };
}
