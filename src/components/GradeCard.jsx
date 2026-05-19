import { useState } from 'react';
import { useGradeHistory } from '../hooks/useGradeHistory';
import { useGradeConflicts } from '../hooks/useGradeConflicts';
import { getGradeEmoji, getGradeLabel } from '../utils/spacedRepetition';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/dexie';
import ConflictResolutionModal from './ConflictResolutionModal';
import { resolveGradeConflict } from '../db/supabase';

export default function GradeCard({ progressId, childId, surah, chunkId, lastGrade, lastReviewed }) {
  const [showHistory, setShowHistory] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [resolving, setResolving] = useState(false);
  const gradeHistory = useGradeHistory(progressId);
  const conflicts = useGradeConflicts(progressId);
  
  const profiles = useLiveQuery(() => db.profiles.toArray(), []);
  
  // Get parent name by profile ID
  const getParentName = (profileId) => {
    if (!profiles) return 'Unknown';
    const profile = profiles.find(p => p.id === profileId);
    return profile?.full_name || 'Unknown Parent';
  };

  const handleResolveConflict = async (selectedGrade) => {
    try {
      setResolving(true);
      await resolveGradeConflict(selectedGrade.id, progressId);
      setShowConflictModal(false);
    } catch (err) {
      alert(`Failed to resolve conflict: ${err.message}`);
    } finally {
      setResolving(false);
    }
  };

  // Show conflict indicator
  const hasConflict = conflicts && conflicts.length > 0;

  return (
    <div className="relative">
      {/* Grade Display Card */}
      <button
        onClick={() => {
          if (hasConflict) {
            setShowConflictModal(true);
          } else {
            setShowHistory(!showHistory);
          }
        }}
        className={`w-full text-left p-3 rounded-lg border ${
          hasConflict
            ? 'border-danger border-2 bg-danger bg-opacity-5 hover:bg-danger hover:bg-opacity-10'
            : 'border-border hover:bg-bg-secondary'
        } transition-colors cursor-pointer`}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-semibold text-text">
                Surah {surah} {chunkId ? `(Chunk ${chunkId})` : ''}
              </p>
              {hasConflict && (
                <span className="text-xs font-bold bg-danger text-white px-2 py-1 rounded">
                  ⚠️ CONFLICT
                </span>
              )}
            </div>
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
      {gradeHistory && gradeHistory.length > 0 && !hasConflict && (
        <p className="text-xs text-text-muted mt-2">
          Graded by {getParentName(gradeHistory[0].graded_by)}
        </p>
      )}

      {/* Conflict Resolution Modal */}
      {showConflictModal && (
        <ConflictResolutionModal
          conflicts={conflicts[0]}
          onResolve={handleResolveConflict}
          onClose={() => setShowConflictModal(false)}
        />
      )}
    </div>
  );
}
