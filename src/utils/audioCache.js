import { db } from '../db/dexie';
import { getAudioUrl } from './audioEngine';

const CACHE_LIMIT = 100;

export const getAyahKey = (surah, ayah, qari) => `${surah}-${ayah}-${qari}`;

/**
 * Checks cache for ayah blob, fetches if missing.
 * Implements LRU eviction to stay within CACHE_LIMIT.
 */
export async function getOrFetchAudioBlob(surah, ayah, qari) {
  const key = getAyahKey(surah, ayah, qari);

  // 1. Try Cache
  const cached = await db.audio_cache.get(key);
  if (cached) {
    // Update last_used for LRU
    db.audio_cache.update(key, { last_used: Date.now() });
    return cached.blob;
  }

  // 2. Fetch from Network
  const url = getAudioUrl(surah, ayah, qari);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch audio for ${key}`);
  
  const blob = await response.blob();

  // 3. Save to Cache and trigger eviction check
  try {
    await db.audio_cache.put({
      key,
      surah,
      ayah,
      qari,
      blob,
      last_used: Date.now()
    });
    
    // Background eviction check
    checkAndEvictCache();
  } catch (err) {
    console.warn('Failed to save audio to IndexedDB cache:', err);
  }

  return blob;
}

/**
 * Keeps the audio_cache size under CACHE_LIMIT by removing oldest entries.
 */
async function checkAndEvictCache() {
  try {
    const count = await db.audio_cache.count();
    if (count > CACHE_LIMIT) {
      const toDelete = count - CACHE_LIMIT;
      const oldest = await db.audio_cache
        .orderBy('last_used')
        .limit(toDelete)
        .primaryKeys();
      
      await db.audio_cache.bulkDelete(oldest);
    }
  } catch (err) {
    console.warn('Cache eviction failed:', err);
  }
}
