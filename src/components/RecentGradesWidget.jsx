import { useGradeHistoryForChild } from '../hooks/useGradeHistory';
import { getGradeEmoji, getGradeLabel } from '../utils/spacedRepetition';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/dexie';

export default function RecentGradesWidget({ childId, limit = 5 }) {
  const gradeHistory = useGradeHistoryForChild(childId);
  const profiles = useLiveQuery(() => db.profiles.toArray(), []);

  if (!gradeHistory || gradeHistory.length === 0) {
    return (
      <div className="card">
        <h3 className="text-sm font-bold text-text mb-2">Recent Grades</h3>
        <p className="text-xs text-text-muted">No grades yet. Start a session!</p>
      </div>
    );
  }

  const getParentName = (profileId) => {
    if (!profiles) return 'Unknown';
    const profile = profiles.find(p => p.id === profileId);
    return profile?.full_name || 'Unknown Parent';
  };

  const recent = gradeHistory.slice(0, limit);

  return (
    <div className="card">
      <h3 className="text-sm font-bold text-text mb-3">Recent Grades</h3>
      <div className="space-y-2">
        {recent.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between p-2 bg-bg-dark rounded-lg">
            <div className="flex-1">
              <p className="text-xs font-semibold text-text">
                {getGradeEmoji(entry.grade)} {getGradeLabel(entry.grade)}
              </p>
              <p className="text-[10px] text-text-muted">
                by {getParentName(entry.graded_by)} • {new Date(entry.graded_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
