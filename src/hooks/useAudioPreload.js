import { useState, useEffect } from 'react';
import { getOrFetchAudioBlob, getAyahKey } from '../utils/audioCache';

/**
 * Orchestrates preloading of current and next ayahs.
 * Uses a sliding window of 3 ayahs.
 */
export function useAudioPreload(ayahQueue, currentIndex) {
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'partial' | 'error'
  const [loadedKeys, setLoadedKeys] = useState(new Set());

  useEffect(() => {
    if (!ayahQueue || ayahQueue.length === 0) return;

    let mounted = true;

    async function preload() {
      // Current + next 2
      const windowSize = 3;
      const toLoad = ayahQueue.slice(currentIndex, currentIndex + windowSize);
      
      let successCount = 0;
      let newLoadedKeys = new Set(loadedKeys);
      let changed = false;
      
      for (const ayah of toLoad) {
        const key = getAyahKey(ayah.surah, ayah.ayah_number, ayah.qari);
        if (loadedKeys.has(key) || newLoadedKeys.has(key)) {
          successCount++;
          continue;
        }

        try {
          await getOrFetchAudioBlob(ayah.surah, ayah.ayah_number, ayah.qari);
          if (mounted) {
            newLoadedKeys.add(key);
            successCount++;
            changed = true;
          }
        } catch (err) {
          console.warn(`Preload failed for ${key}:`, err);
        }
      }

      if (mounted) {
        if (changed) {
          setLoadedKeys(prev => {
            const updated = new Set(prev);
            newLoadedKeys.forEach(k => updated.add(k));
            return updated;
          });
        }
        
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

  const currentAyah = ayahQueue?.[currentIndex];
  const isCurrentReady = currentAyah 
    ? loadedKeys.has(getAyahKey(currentAyah.surah, currentAyah.ayah_number, currentAyah.qari))
    : false;

  return { status, isCurrentReady };
}
