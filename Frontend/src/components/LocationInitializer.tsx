'use client';

import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setLocationFromBackground, setLocationStatus, setLocationAddress } from '../store/slices/locationSlice';
import { RootState } from '../store';
import { getAddressFromCoords } from '../services/locationService';

const RETRY_DELAYS = [2000, 4000, 8000]; // 2s, 4s, 8s

export function LocationInitializer() {
  const dispatch = useDispatch();
  const coords = useSelector((state: RootState) => state.location.coords);
  const currentAddress = useSelector((state: RootState) => state.location.address);
  const attemptRef = useRef(0);
  const isFetchingRef = useRef(false);

  // Sync address when coordinates change
  useEffect(() => {
    if (!coords) return;
    
    // Check if the current address matches the cached coordinates to avoid redundant API calls
    try {
      const cachedStr = localStorage.getItem('user_cached_gps');
      const cachedAddr = localStorage.getItem('user_cached_address');
      if (cachedStr && cachedAddr) {
        const cachedCoords = JSON.parse(cachedStr);
        if (
          cachedCoords.lat === coords.lat && 
          cachedCoords.lng === coords.lng && 
          currentAddress === cachedAddr
        ) {
          return; // Match found, skip fetch
        }
      }
    } catch (e) {
      // Ignore cache check errors
    }

    getAddressFromCoords(coords.lat, coords.lng).then((addr) => {
      dispatch(setLocationAddress(addr));
      localStorage.setItem('user_cached_address', addr);
    });
  }, [coords?.lat, coords?.lng, dispatch, currentAddress]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // 1. Load previously cached coordinates on mount to prevent empty UI on refresh
    try {
      const cachedStr = localStorage.getItem('user_cached_gps');
      if (cachedStr) {
        const cachedCoords = JSON.parse(cachedStr);
        if (cachedCoords && typeof cachedCoords.lat === 'number' && typeof cachedCoords.lng === 'number') {
          dispatch(setLocationFromBackground(cachedCoords));
          const cachedAddr = localStorage.getItem('user_cached_address');
          if (cachedAddr) {
            dispatch(setLocationAddress(cachedAddr));
          }
        }
      }
    } catch (e) {
      console.warn('Failed to parse cached GPS coordinates:', e);
    }
    
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
          const newCoords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          dispatch(setLocationFromBackground(newCoords));
          localStorage.setItem('user_cached_gps', JSON.stringify(newCoords));
          sessionStorage.setItem('gps_fetched', 'true');
        },
        (error) => {
          console.warn('Background GPS fetch failed:', error.message);
          
          if (attemptRef.current < RETRY_DELAYS.length) {
            const delay = RETRY_DELAYS[attemptRef.current];
            attemptRef.current += 1;
            setTimeout(fetchLocationWithBackoff, delay);
          } else {
            // Fallback to default location of seeded restaurants (Thu Duc, HCMC)
            const fallbackCoords = { lat: 10.880, lng: 106.808 };
            dispatch(setLocationFromBackground(fallbackCoords));
            dispatch(setLocationStatus('success'));
            localStorage.setItem('user_cached_gps', JSON.stringify(fallbackCoords));
            sessionStorage.setItem('gps_fetched', 'true');
          }
        },
        { timeout: 5000, enableHighAccuracy: true }
      );
    };

    fetchLocationWithBackoff();
  }, [dispatch]);

  return null; // This component doesn't render anything
}
