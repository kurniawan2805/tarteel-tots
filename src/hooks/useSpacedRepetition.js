import { useState, useCallback } from 'react';
import { db } from '../db/dexie';
import { calculateNextReview } from '../utils/spacedRepetition';

export function useSpacedRepetition(childId) {
  const [loading, setLoading] = useState(false);

  const gradeChunk = useCallback(async (surah, chunkId, grade) => {
    setLoading(true);
    try {
      const existing = await db.progress
        .where({ child_id: childId, surah, chunkId })
        .first();

      const { nextLevel, nextSuggested } = calculateNextReview(existing?.level || 1, grade);

      if (existing) {
        await db.progress.update(existing.id, {
          level: nextLevel,
          lastGrade: grade,
          lastReviewed: new Date().toISOString(),
          nextSuggested: nextSuggested,
          synced: 0 // Will be picked up by sync
        });
      } else {
        await db.progress.add({
          child_id: childId,
          surah,
          chunkId,
          level: nextLevel,
          lastGrade: grade,
          lastReviewed: new Date().toISOString(),
          nextSuggested: nextSuggested,
          favorite: false,
          created_at: new Date().toISOString(),
          synced: 0
        });
      }
    } finally {
      setLoading(false);
    }
  }, [childId]);

  const toggleFavorite = useCallback(async (surah, chunkId) => {
    const existing = await db.progress
      .where({ child_id: childId, surah, chunkId })
      .first();
    
    if (existing) {
      await db.progress.update(existing.id, {
        favorite: !existing.favorite,
        synced: 0
      });
    }
  }, [childId]);

  return {
    loading,
    gradeChunk,
    toggleFavorite
  };
}
