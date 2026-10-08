/**
 * useLocation Hook
 * Handles browser geolocation requests, permission errors, and coordinate caching.
 * Location is kept strictly in client-side memory and never persisted.
 */

import { useState, useCallback } from 'react';

export interface Coordinates {
  lat: number;
  lng: number;
  accuracy?: number;
  name?: string;
}

export type LocationStatus = 'idle' | 'prompting' | 'granted' | 'denied' | 'unavailable' | 'timeout';

// Standard demo coordinate presets for seamless 2-tab local testing
export const TEST_LOCATIONS: { name: string; lat: number; lng: number; description: string }[] = [
  {
    name: 'City Center (Tab 1)',
    lat: 40.7128,
    lng: -74.006,
    description: 'Downtown Hub (Base point)'
  },
  {
    name: 'Nearby Suburb (Tab 2 - 8 km away)',
    lat: 40.7484,
    lng: -73.9857,
    description: 'Within 30 km radius (~8 km) - Valid match'
  },
  {
    name: 'Another City (Tab 3 - 150 km away)',
    lat: 39.9526,
    lng: -75.1652,
    description: 'Beyond 30 km radius (Will NEVER match)'
  }
];

export function useLocation() {
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * Requests the real device GPS / Wi-Fi coordinates via the browser Geolocation API
   */
  const requestLocation = useCallback(async (): Promise<Coordinates | null> => {
    setStatus('prompting');
    setErrorMessage(null);

    if (!('geolocation' in navigator)) {
      setStatus('unavailable');
      setErrorMessage('Geolocation is not supported by your browser or environment.');
      return null;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newCoords: Coordinates = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            name: 'Device Location'
          };
          setCoords(newCoords);
          setStatus('granted');
          setErrorMessage(null);
          resolve(newCoords);
        },
        (error) => {
          console.warn('Geolocation acquisition failed:', error.code, error.message);
          let errText = 'Location permission is required to match with people within 30 km.';
          if (error.code === error.PERMISSION_DENIED) {
            setStatus('denied');
            errText = 'Location access was denied. Please allow location access in your browser to meet people nearby.';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            setStatus('unavailable');
            errText = 'Location information is currently unavailable from your device.';
          } else if (error.code === error.TIMEOUT) {
            setStatus('timeout');
            errText = 'Location request timed out. Please try again.';
          }
          setErrorMessage(errText);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 60000
        }
      );
    });
  }, []);

  /**
   * Allows picking test coordinates for multi-tab testing in developer environments
   */
  const setTestLocation = useCallback((testLoc: { name: string; lat: number; lng: number }) => {
    const newCoords: Coordinates = {
      lat: testLoc.lat,
      lng: testLoc.lng,
      name: testLoc.name
    };
    setCoords(newCoords);
    setStatus('granted');
    setErrorMessage(null);
    return newCoords;
  }, []);

  const clearLocation = useCallback(() => {
    setCoords(null);
    setStatus('idle');
    setErrorMessage(null);
  }, []);

  return {
    coords,
    status,
    errorMessage,
    requestLocation,
    setTestLocation,
    clearLocation
  };
}
