import { useState } from 'react';
import { db } from '../db/dexie';
import { updateChildProfile } from '../db/supabase';

const AVATARS = ['🌟', '🌙', '☀️', '🌈', '🎈', '🍀', '💎'];

export default function ChildProfileModal({ child, onClose, onUpdate }) {
  const [name, setName] = useState(child.name);
  const [age, setAge] = useState(child.age);
  const [avatar, setAvatar] = useState(child.avatar);
  const [dailyGoal, setDailyGoal] = useState(child.daily_goal_minutes);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const updates = {
        name,
        age,
        avatar,
        daily_goal_minutes: dailyGoal
      };

      // 1. Update Dexie
      await db.children.update(child.id, updates);
      
      // 2. Try to update Supabase (if online/configured)
      try {
        await updateChildProfile(child.id, updates);
      } catch (err) {
        console.warn('Supabase child update failed, will sync later:', err);
      }

      onUpdate();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update child profile');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      // 1. Delete from Dexie
      await db.children.delete(child.id);
      
      // Note: In a full implementation, we might want to delete from Supabase too,
      // but usually RLS/Sync handles this or we just mark as deleted.
      // For now, we'll just reload the dashboard state.
      
      onUpdate();
      onClose();
    } catch {
      setError('Failed to delete child');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-slide-up sm:animate-grow overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-text">Edit {child.name}'s Profile</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-bg-dark transition-colors text-text"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-danger bg-opacity-10 text-danger p-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-text-muted uppercase mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="Child's name"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-text-muted uppercase mb-2">Age</label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="3"
                max="12"
                value={age}
                onChange={(e) => setAge(parseInt(e.target.value))}
                className="flex-1 h-2 bg-bg-dark rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <span className="text-xl font-bold text-primary w-8 text-center">{age}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-text-muted uppercase mb-3">Avatar</label>
            <div className="flex gap-2 flex-wrap justify-center">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  onClick={() => setAvatar(a)}
                  className={`w-12 h-12 rounded-full text-2xl flex items-center justify-center transition-all ${
                    avatar === a
                      ? 'bg-primary bg-opacity-20 ring-2 ring-primary'
                      : 'bg-bg-dark'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-text-muted uppercase mb-2">Daily Goal (Minutes)</label>
            <select
              value={dailyGoal}
              onChange={(e) => setDailyGoal(parseInt(e.target.value))}
              className="input-field py-3 text-sm"
            >
              {[5, 10, 15, 20, 30, 45, 60].map(min => (
                <option key={min} value={min}>{min} Minutes</option>
              ))}
            </select>
          </div>

          <div className="pt-4 flex flex-col gap-3">
            <button
              onClick={handleSave}
              disabled={loading}
              className="btn-primary w-full py-4 text-lg"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>

            {showDeleteConfirm ? (
              <div className="bg-danger bg-opacity-5 p-4 rounded-xl border border-danger border-opacity-20 animate-grow">
                <p className="text-xs text-danger font-bold text-center mb-3">
                  ⚠️ ARE YOU SURE? This deletes ALL progress for {child.name}.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    className="flex-1 py-2 bg-danger text-white font-bold text-xs uppercase rounded-lg"
                  >
                    YES, DELETE
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-2 bg-bg-dark text-text font-bold text-xs uppercase rounded-lg"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-2 text-danger text-xs font-bold uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity"
              >
                Delete Profile
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
