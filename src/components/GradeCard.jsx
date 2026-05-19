import { useState } from 'react';
import { useGradeHistory } from '../hooks/useGradeHistory';
import { useGradeConflicts } from '../hooks/useGradeConflicts';
import { getGradeEmoji, getGradeLabel, CFR_GRADES, calculateNextReview } from '../utils/spacedRepetition';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/dexie';
import ConflictResolutionModal from './ConflictResolutionModal';
import { resolveGradeConflict } from '../db/supabase';

export default function GradeCard({ progressId, surah, chunkId, lastGrade, lastReviewed }) {
  const [showHistory, setShowHistory] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
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

  const handleEditGrade = async (newGrade) => {
    try {
      setResolving(true);
      const existing = await db.progress.get(progressId);
      if (!existing) return;

      // Recalculate level/next review based on the new grade
      // We use current level for the calculation
      const { nextLevel, nextSuggested } = calculateNextReview(existing.level, newGrade);

      await db.progress.update(progressId, {
        lastGrade: newGrade,
        level: nextLevel,
        nextSuggested: nextSuggested,
        lastReviewed: new Date().toISOString(),
        synced: 0 // Mark for sync
      });

      setIsEditing(false);
    } catch (err) {
      alert(`Failed to update grade: ${err.message}`);
    } finally {
      setResolving(false);
    }
  };

  // Show conflict indicator
  const hasConflict = conflicts && conflicts.length > 0;

  return (
    <div className="relative group">
      {/* Grade Display Card */}
      <div className="relative">
        <button
          onClick={() => {
            if (hasConflict) {
              setShowConflictModal(true);
            } else if (!isEditing) {
              setShowHistory(!showHistory);
            }
          }}
          className={`w-full text-left p-3 rounded-lg border ${
            hasConflict
              ? 'border-danger border-2 bg-danger bg-opacity-5 hover:bg-danger hover:bg-opacity-10'
              : 'border-border hover:bg-bg-secondary'
          } transition-colors cursor-pointer pr-10`}
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

        {/* Inline Edit Trigger */}
        {!hasConflict && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(!isEditing);
              setShowHistory(false);
            }}
            className="absolute top-3 right-3 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-bg-dark transition-all text-text-muted"
            title="Edit Grade"
          >
            <span className="text-xs">✏️</span>
          </button>
        )}
      </div>

      {/* Edit Mode Panel */}
      {isEditing && (
        <div className="absolute top-0 left-0 right-0 bottom-0 bg-white z-10 flex items-center justify-center rounded-lg shadow-inner animate-grow border-2 border-primary border-opacity-20 p-2">
          <div className="flex gap-2 w-full h-full">
            {[
              { id: CFR_GRADES.HAPPY, emoji: '🟢', color: 'bg-success' },
              { id: CFR_GRADES.OKAY, emoji: '🟡', color: 'bg-warning' },
              { id: CFR_GRADES.TRY_AGAIN, emoji: '🔴', color: 'bg-danger' }
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => handleEditGrade(opt.id)}
                disabled={resolving}
                className={`flex-1 ${opt.color} text-white rounded-lg flex flex-col items-center justify-center transition-transform active:scale-95 disabled:opacity-50`}
              >
                <span className="text-xl">{opt.emoji}</span>
                <span className="text-[8px] font-bold uppercase">{opt.id.replace('_', ' ')}</span>
              </button>
            ))}
            <button
              onClick={() => setIsEditing(false)}
              className="px-2 bg-bg-dark text-text-muted rounded-lg flex items-center justify-center"
            >
              <span className="text-xs font-bold">✕</span>
            </button>
          </div>
        </div>
      )}

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
