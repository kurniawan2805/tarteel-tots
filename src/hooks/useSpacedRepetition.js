import { useState, useCallback } from 'react';
import { db } from '../db/dexie';
import { getNextReviewDate } from '../utils/spacedRepetition';

export function useSpacedRepetition(childId) {
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadProgress = useCallback(async () => {
    setLoading(true);
    const items = await db.progress.where('child_id').equals(childId).toArray();
    setProgress(items);
    setLoading(false);
  }, [childId]);

  const gradeAyah = useCallback(async (surah, ayahNumber, grade, repetitionCount = 0) => {
    const existing = await db.progress
      .where({ child_id: childId, surah, ayah_number: ayahNumber })
      .first();

    const nextReview = getNextReviewDate(grade, existing?.review_interval_days);
    const interval = grade === 'needs_help' ? 1 : grade === 'good' ? 3 : 7;

    if (existing) {
      await db.progress.update(existing.id, {
        grade,
        next_review: nextReview,
        last_review: new Date().toISOString(),
        repetition_count: repetitionCount,
        review_interval_days: interval
      });
    } else {
      await db.progress.add({
        child_id: childId,
        surah,
        ayah_number: ayahNumber,
        grade,
        next_review: nextReview,
        last_review: new Date().toISOString(),
        repetition_count: repetitionCount,
        review_interval_days: interval,
        created_at: new Date().toISOString(),
        synced: false
      });
    }

    await loadProgress();
  }, [childId, loadProgress]);

  const getDueForReview = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return progress.filter(p => {
      if (!p.next_review) return true;
      return new Date(p.next_review) <= today;
    });
  }, [progress]);

  const getNeedsHelp = useCallback(() => {
    return progress.filter(p => p.grade === 'needs_help');
  }, [progress]);

  return {
    progress,
    loading,
    loadProgress,
    gradeAyah,
    getDueForReview,
    getNeedsHelp
  };
}
