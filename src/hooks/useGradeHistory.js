import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/dexie';

export function useGradeHistory(progressId) {
  return useLiveQuery(async () => {
    if (!progressId) return [];
    
    const history = await db.grade_history
      .where('progress_id')
      .equals(progressId)
      .toArray();
    
    // Sort by date descending (newest first)
    return history.sort((a, b) => new Date(b.graded_at) - new Date(a.graded_at));
  }, [progressId]);
}

export function useGradeHistoryForChild(childId) {
  return useLiveQuery(async () => {
    if (!childId) return [];
    
    const history = await db.grade_history
      .where('child_id')
      .equals(childId)
      .toArray();
    
    // Sort by date descending (newest first)
    return history.sort((a, b) => new Date(b.graded_at) - new Date(a.graded_at));
  }, [childId]);
}
