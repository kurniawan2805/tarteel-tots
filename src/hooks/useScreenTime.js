import { useState, useEffect, useRef, useCallback } from 'react';
import { playChime } from '../utils/audioEngine';

export function useScreenTime(initialLimitMinutes = 15) {
  const [screenTimeSeconds, setScreenTimeSeconds] = useState(0);
  const [isDimmed, setIsDimmed] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [warningShown, setWarningShown] = useState(false);
  const [limitMinutes, setLimitMinutes] = useState(initialLimitMinutes);
  
  const intervalRef = useRef(null);
  const limitSeconds = limitMinutes * 60;
  const warningThreshold = limitSeconds - 60;

  const start = useCallback(() => {
    setIsActive(true);
    setScreenTimeSeconds(0);
    setIsDimmed(false);
    setWarningShown(false);
  }, []);

  const stop = useCallback(() => {
    setIsActive(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    setScreenTimeSeconds(0);
    setIsDimmed(false);
    setWarningShown(false);
  }, []);

  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        setScreenTimeSeconds(prev => {
          const next = prev + 1;

          if (next >= warningThreshold && !warningShown) {
            setWarningShown(true);
            playChime('wind_down');
          }

          if (next >= limitSeconds) {
            setIsDimmed(true);
          }

          return next;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, limitSeconds, warningThreshold, warningShown]);

  const minutes = Math.floor(screenTimeSeconds / 60);
  const seconds = screenTimeSeconds % 60;

  return {
    screenTimeSeconds,
    screenTimeFormatted: `${minutes}:${seconds.toString().padStart(2, '0')}`,
    isDimmed,
    isActive,
    warningShown,
    limitMinutes,
    start,
    stop,
    reset,
    setLimit: setLimitMinutes
  };
}
