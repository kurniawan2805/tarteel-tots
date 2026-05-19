import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/dexie';

export function useGradeConflicts(progressId) {
  return useLiveQuery(async () => {
    if (!progressId) return [];
    
    const entries = await db.grade_history
      .where('progressId')
      .equals(progressId)
      .toArray();
    
    if (!entries || entries.length === 1) return [];
    
    // Group by grade, find if multiple different grades within 30sec
    const now = new Date();
    const thirtySecsAgo = new Date(now - 30 * 1000);
    const recentEntries = entries.filter(e => new Date(e.graded_at) >= thirtySecsAgo);
    
    const uniqueGrades = new Set(recentEntries.map(e => e.grade));
    
    // Return conflicts if >1 unique grade in recent 30sec window
    if (uniqueGrades.size > 1) {
      return recentEntries.sort((a, b) => new Date(b.graded_at) - new Date(a.graded_at));
    }
    
    return [];
  }, [progressId]);
}

// Get all conflicting grades across a child's progress
export function useChildGradeConflicts(childId) {
  return useLiveQuery(async () => {
    if (!childId) return [];
    
    const allEntries = await db.grade_history
      .where('childId')
      .equals(childId)
      .toArray();
    
    if (!allEntries) return [];
    
    // Group by progress_id
    const byProgress = {};
    allEntries.forEach(entry => {
      if (!byProgress[entry.progressId]) byProgress[entry.progressId] = [];
      byProgress[entry.progressId].push(entry);
    });
    
    // Find conflicts (multiple grades per progress within 30sec)
    const conflicts = [];
    const now = new Date();
    const thirtySecsAgo = new Date(now - 30 * 1000);
    
    Object.entries(byProgress).forEach(([progressId, entries]) => {
      const recentEntries = entries.filter(e => new Date(e.graded_at) >= thirtySecsAgo);
      const uniqueGrades = new Set(recentEntries.map(e => e.grade));
      
      if (uniqueGrades.size > 1) {
        conflicts.push({
          progressId,
          conflictingGrades: recentEntries.sort((a, b) => new Date(b.graded_at) - new Date(a.graded_at))
        });
      }
    });
    
    return conflicts;
  }, [childId]);
}
