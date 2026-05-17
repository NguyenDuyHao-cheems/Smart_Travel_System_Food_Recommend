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

    try {
      // Create a promise that rejects after 5000ms
      const timeoutPromise = new Promise<{ lat: number; lng: number }>((_, reject) => {
        setTimeout(() => reject(new Error('GPS timeout')), 5000);
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
          { timeout: 5000, enableHighAccuracy: true }
        );
      });

      // Race them
      const result = await Promise.race([gpsPromise, timeoutPromise]);
      
      // If success within 5s, save to Redux and return
      dispatch(setLocation(result));
      return result;

    } catch (err) {
      console.warn('Optimized location fallback to Redux:', err);
      // If timeout or error, return coords from Redux store. NO fallback hardcoded coords!
      return reduxCoords;
    }
  }, [dispatch, reduxCoords]);

  return { getOptimizedLocation };
}
