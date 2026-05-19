import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function FamilyManagement() {
  const { joinFamilySpace, initFamilySpace } = useAuth();
  const [mode, setMode] = useState(null); // 'join' | 'create'
  const [familyCode, setFamilyCode] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async () => {
    if (!familyCode.trim()) return;
    setLoading(true);
    setError('');
    try {
      await joinFamilySpace(familyCode);
      alert('✅ Successfully joined family!');
      setMode(null);
      setFamilyCode('');
    } catch (err) {
      setError(err.message || 'Failed to join family');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!familyName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const family = await initFamilySpace(familyName);
      alert(`✅ Family "${family.display_name}" created! New invite code: ${family.family_code}`);
      setMode(null);
      setFamilyName('');
      window.location.reload(); // Refresh to show new family
    } catch (err) {
      setError(err.message || 'Failed to create family');
    } finally {
      setLoading(false);
    }
  };

  if (!mode) {
    return (
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <span className="text-xl">➕</span>
          <h2 className="text-sm font-bold text-text-muted uppercase tracking-wider">Family Management</h2>
        </div>
        <div className="space-y-2">
          <button
            onClick={() => setMode('create')}
            className="w-full p-4 rounded-2xl border-2 border-primary bg-primary bg-opacity-5 text-left transition-all active:scale-[0.98]"
          >
            <p className="text-lg font-bold text-primary mb-1">✨ Create New Family</p>
            <p className="text-xs text-text-muted">Start a new family space</p>
          </button>
          
          <button
            onClick={() => setMode('join')}
            className="w-full p-4 rounded-2xl border-2 border-secondary bg-secondary bg-opacity-5 text-left transition-all active:scale-[0.98]"
          >
            <p className="text-lg font-bold text-secondary mb-1">🤝 Join Family</p>
            <p className="text-xs text-text-muted">Enter a code from another family member</p>
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <span className="text-xl">{mode === 'join' ? '🤝' : '✨'}</span>
        <h2 className="text-sm font-bold text-text-muted uppercase tracking-wider">
          {mode === 'join' ? 'Join Family' : 'Create Family'}
        </h2>
      </div>

      <div className="card space-y-4 animate-grow">
        {error && (
          <div className="bg-danger bg-opacity-10 text-danger p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {mode === 'join' ? (
          <>
            <div>
              <label className="block text-sm font-semibold text-text mb-2">Family Code</label>
              <input
                type="text"
                value={familyCode}
                onChange={(e) => setFamilyCode(e.target.value.toUpperCase())}
                className="input-field text-center text-2xl font-mono tracking-widest"
                placeholder="TT-XXXX"
                maxLength={7}
                autoFocus
              />
            </div>
            <button
              onClick={handleJoin}
              disabled={loading || !familyCode.trim()}
              className="btn-primary w-full disabled:opacity-50"
            >
              {loading ? 'Joining...' : 'Join Family'}
            </button>
          </>
        ) : (
          <>
            <div>
              <label className="block text-sm font-semibold text-text mb-2">Family Name</label>
              <input
                type="text"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                className="input-field"
                placeholder="e.g. The Ahmed Family"
                autoFocus
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={loading || !familyName.trim()}
              className="btn-primary w-full disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Family'}
            </button>
          </>
        )}

        <button
          onClick={() => setMode(null)}
          className="w-full py-2 text-text-muted text-xs font-bold"
        >
          Cancel
        </button>
      </div>
    </section>
  );
}
