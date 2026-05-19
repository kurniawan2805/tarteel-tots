import { useState } from 'react';
import { useGradeHistory } from '../../hooks/useGradeHistory';
import { getGradeEmoji, getGradeLabel } from '../../utils/spacedRepetition';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/dexie';

export default function GradeCard({ progressId, childId, surah, chunkId, lastGrade, lastReviewed }) {
  const [showHistory, setShowHistory] = useState(false);
  const gradeHistory = useGradeHistory(progressId);
  
  const profiles = useLiveQuery(() => db.profiles.toArray(), []);
  
  // Get parent name by profile ID
  const getParentName = (profileId) => {
    if (!profiles) return 'Unknown';
    const profile = profiles.find(p => p.id === profileId);
    return profile?.full_name || 'Unknown Parent';
  };

  return (
    <div className="relative">
      {/* Grade Display Card */}
      <button
        onClick={() => setShowHistory(!showHistory)}
        className="w-full text-left p-3 rounded-lg border border-border hover:bg-bg-secondary transition-colors cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-semibold text-text">
              Surah {surah} {chunkId ? `(Chunk ${chunkId})` : ''}
            </p>
            {lastGrade && (
              <p className="text-xs text-text-muted mt-1">
                {getGradeLabel(lastGrade)} •{' '}
                {lastReviewed ? new Date(lastReviewed).toLocaleDateString() : 'No review'}
              </p>
            )}
          </div>
          <div className="text-3xl ml-3">
            {getGradeEmoji(lastGrade)}
          </div>
        </div>
      </button>

      {/* Grade History Modal */}
      {showHistory && gradeHistory && gradeHistory.length > 0 && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-border rounded-lg shadow-lg z-50 p-3 max-h-48 overflow-y-auto">
          <h4 className="text-sm font-bold text-text mb-2">Grade History</h4>
          <div className="space-y-2">
            {gradeHistory.map((entry, idx) => (
              <div key={idx} className="text-xs text-text-muted border-l-2 border-primary pl-2 py-1">
                <p className="font-semibold">
                  {getGradeEmoji(entry.grade)} {getGradeLabel(entry.grade)}
                </p>
                <p className="text-xs">by {getParentName(entry.graded_by)}</p>
                <p className="text-xs opacity-75">
                  {new Date(entry.graded_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attribution Text */}
      {gradeHistory && gradeHistory.length > 0 && (
        <p className="text-xs text-text-muted mt-2">
          Graded by {getParentName(gradeHistory[0].graded_by)}
        </p>
      )}
    </div>
  );
}
