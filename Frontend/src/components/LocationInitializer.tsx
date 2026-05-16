'use client';

import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { setLocationFromBackground, setLocationStatus } from '../store/slices/locationSlice';

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
        dispatch(setLocationStatus('error'));
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
            dispatch(setLocationStatus('error'));
            sessionStorage.setItem('gps_fetched', 'false'); // Mark as attempted but failed
          }
        },
        { timeout: 5000, enableHighAccuracy: true }
      );
    };

    fetchLocationWithBackoff();
  }, [dispatch]);

  return null; // This component doesn't render anything
}
