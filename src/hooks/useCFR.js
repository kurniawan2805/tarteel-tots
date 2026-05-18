import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/dexie';
import { calculatePriority } from '../utils/spacedRepetition';
import { quranMetaData } from '../data/quranMeta';

/**
 * Hook to manage the CFR (Confidence-First Repetition) recommendations
 */
export function useCFR(childId) {
  const progress = useLiveQuery(
    () => db.progress.where('child_id').equals(parseInt(childId)).toArray(),
    [childId]
  );

  const suggestions = useMemo(() => {
    if (!progress || progress.length === 0) return [];

    // 1. Calculate Priority for all
    const scored = progress.map(p => ({
      ...p,
      surahName: quranMetaData[p.surah]?.transliteration || `Surah ${p.surah}`,
      priority: calculatePriority(p)
    }));

    const cards = [];

    // Card 1: Old Favorite (Highest favorite score)
    const favorites = scored
      .filter(p => p.favorite)
      .sort((a, b) => b.priority - a.priority);
    
    if (favorites.length > 0) {
      cards.push({
        type: 'favorite',
        title: '❤️ Old Favorite',
        subtitle: 'Start with an easy win!',
        item: favorites[0]
      });
    }

    // Card 2: Needs Water (Highest due priority)
    const due = scored
      .filter(p => !cards.some(c => c.item.id === p.id)) // Avoid duplicates
      .sort((a, b) => b.priority - a.priority);

    if (due.length > 0) {
      cards.push({
        type: 'due',
        title: '💧 Needs Water',
        subtitle: 'A gentle review visit',
        item: due[0]
      });
    }

    // Card 3: Quick Win (Shortest/Easiest or just next in priority)
    const quick = scored
      .filter(p => !cards.some(c => c.item.id === p.id))
      .sort((a, b) => {
        // Sort by level (lower level = easier usually) then priority
        return a.level - b.level || b.priority - a.priority;
      });

    if (quick.length > 0) {
      cards.push({
        type: 'quick',
        title: '⚡ Quick Win',
        subtitle: 'Low energy session',
        item: quick[0]
      });
    }

    return cards;
  }, [progress]);

  return { suggestions, rawProgress: progress };
}
