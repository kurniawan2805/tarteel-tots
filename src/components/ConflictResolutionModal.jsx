import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getGradeEmoji, getGradeLabel } from '../utils/spacedRepetition';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/dexie';

export default function ConflictResolutionModal({ conflicts, onResolve, onClose }) {
  useAuth();
  const [resolving, setResolving] = useState(null);
  
  const profiles = useLiveQuery(() => db.profiles.toArray(), []);
  
  const getParentName = (profileId) => {
    if (!profiles) return 'Unknown';
    const p = profiles.find(x => x.id === profileId);
    return p?.full_name || 'Unknown Parent';
  };

  if (!conflicts || conflicts.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-3xl p-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text">⚠️ Grade Conflict</h2>
          <button
            onClick={onClose}
            className="text-2xl text-text-muted hover:text-text transition-colors"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-text-muted mb-4">
          Multiple parents graded this Ayah at nearly the same time. Which grade should be kept?
        </p>

        <div className="space-y-3">
          {conflicts.conflictingGrades?.map((entry, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border-2 transition-all ${
                resolving === entry.id
                  ? 'border-primary bg-primary bg-opacity-5'
                  : 'border-border bg-white'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-4xl">{getGradeEmoji(entry.grade)}</span>
                    <div>
                      <p className="font-bold text-text">{getGradeLabel(entry.grade)}</p>
                      <p className="text-xs text-text-muted">
                        by {getParentName(entry.graded_by)}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-text-muted">
                    {new Date(entry.graded_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setResolving(entry.id);
                  onResolve(entry);
                  setTimeout(onClose, 1000);
                }}
                disabled={resolving !== null}
                className={`w-full py-2 font-bold text-xs uppercase tracking-widest rounded-lg transition-all ${
                  resolving === entry.id
                    ? 'bg-primary text-white'
                    : 'bg-bg-secondary text-primary hover:bg-bg-dark'
                } disabled:opacity-50`}
              >
                {resolving === entry.id ? '✓ Using this grade' : 'Use This Grade'}
              </button>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-text-muted text-center mt-6 opacity-50">
          Your choice will be recorded in the grade history.
        </p>
      </div>
    </div>
  );
}
