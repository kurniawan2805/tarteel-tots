import { useState, useEffect, useRef } from 'react';
import { getOrFetchAudioBlob, getAyahKey } from '../utils/audioCache';

/**
 * Orchestrates preloading of current and next ayahs.
 * Uses a sliding window of 3 ayahs.
 */
export function useAudioPreload(ayahQueue, currentIndex) {
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'partial' | 'error'
  const [isCurrentReady, setIsCurrentReady] = useState(false);
  const loadedKeysRef = useRef(new Set());

  // Handle empty queue case
  useEffect(() => {
    if (!ayahQueue || ayahQueue.length === 0) {
      setIsCurrentReady(false);
      setStatus('ready');
    }
  }, [ayahQueue]);

  useEffect(() => {
    if (!ayahQueue || ayahQueue.length === 0) return;

    let mounted = true;

    async function preload() {
       // ...

      // Current + next 2
      const windowSize = 3;
      const toLoad = ayahQueue.slice(currentIndex, currentIndex + windowSize);
      
      let successCount = 0;
      
      for (const ayah of toLoad) {
        const key = getAyahKey(ayah.surah, ayah.ayah_number, ayah.qari);
        if (loadedKeysRef.current.has(key)) {
          successCount++;
          continue;
        }

        try {
          await getOrFetchAudioBlob(ayah.surah, ayah.ayah_number, ayah.qari);
          if (mounted) {
            loadedKeysRef.current.add(key);
            successCount++;
          }
        } catch (err) {
          console.warn(`Preload failed for ${key}:`, err);
        }
      }

      if (mounted) {
        // Update current readiness
        const currentAyah = ayahQueue[currentIndex];
        const currentKey = currentAyah ? getAyahKey(currentAyah.surah, currentAyah.ayah_number, currentAyah.qari) : null;
        setIsCurrentReady(loadedKeysRef.current.has(currentKey));

        if (successCount === toLoad.length) setStatus('ready');
        else if (successCount > 0) setStatus('partial');
        else setStatus('error');
      }
    }

    preload();

    return () => {
      mounted = false;
    };
  }, [ayahQueue, currentIndex]);

  return { status, isCurrentReady };
}
