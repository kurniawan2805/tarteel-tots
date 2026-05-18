import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/dexie';
import { useSync } from '../../hooks/useSync';
import { useAuth } from '../../hooks/useAuth';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { isLocalMode, activeFamily } = useAuth();
  const { saveEvent, online, lastSync, syncing } = useSync();

  const settings = useLiveQuery(async () => {
    const items = await db.settings.toArray();
    return Object.fromEntries(items.map(s => [s.key, s.value]));
  }, []);

  // Use memo to derive current settings with defaults
  const currentSettings = useMemo(() => ({
    screen_time_limit: settings?.screen_time_limit ?? 15,
    memorize_tap_target: settings?.memorize_tap_target ?? 10,
    default_qari: settings?.default_qari ?? 'ar.alafasy'
  }), [settings]);
  
  const [showSavedToast, setShowSavedToast] = useState(false);

  const updateSetting = useCallback(async (key, value) => {
    // Save as event for multi-user sync
    await saveEvent({
      type: 'SETTING_CHANGED',
      payload: { key, value }
    });

    setShowSavedToast(true);
    const timer = setTimeout(() => setShowSavedToast(false), 2000);
    return () => clearTimeout(timer);
  }, [saveEvent]);

  const handleClearData = async () => {
    if (window.confirm('⚠️ Are you sure? This will delete all local data, including child profiles and progress.')) {
      await db.delete();
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-bg pb-20">
      <header className="bg-white shadow-sm p-4 sticky top-0 z-20">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-bg-dark transition-colors text-text"
            >
              <span className="text-2xl">←</span>
            </button>
            <h1 className="text-xl font-bold text-text">Settings</h1>
          </div>
          
          <div className="flex items-center gap-2">
             <div className={`w-2 h-2 rounded-full ${online ? 'bg-primary animate-pulse' : 'bg-text-muted'}`} />
             {syncing && <span className="text-[10px] text-text-muted font-bold animate-pulse">SYNCING</span>}
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-6">
        {/* Family Card */}
        {!isLocalMode && activeFamily && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <span className="text-xl">🏠</span>
              <h2 className="text-sm font-bold text-text-muted uppercase tracking-wider">Your Family Space</h2>
            </div>
            <div className="card border-2 border-primary border-opacity-10">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-lg font-bold text-text">{activeFamily.display_name}</p>
                  <p className="text-xs text-text-muted">Shared with your family</p>
                </div>
                <div className="bg-primary bg-opacity-10 px-3 py-1 rounded-lg">
                   <p className="text-[10px] font-bold text-primary text-center">INVITE CODE</p>
                   <p className="text-sm font-mono font-black text-primary tracking-widest">{activeFamily.family_code}</p>
                </div>
              </div>
              
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(activeFamily.family_code);
                  alert('Invite code copied! Share this with other family members so they can join your space.');
                }}
                className="w-full py-3 bg-white border-2 border-primary text-primary font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-primary hover:text-white transition-all active:scale-[0.98]"
              >
                Copy Invite Code
              </button>
            </div>
          </section>
        )}

        {/* Status Card */}
        <div className="card bg-primary bg-opacity-5 border-primary border-opacity-20 flex items-center justify-between p-4">
          <div>
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Backup Status</p>
            <p className="text-sm font-bold text-text">
              {lastSync ? `Synced ${new Date(lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Not backed up'}
            </p>
          </div>
          <span className="text-2xl">☁️</span>
        </div>

        {/* Screen Time Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <span className="text-xl">⏰</span>
            <h2 className="text-sm font-bold text-text-muted uppercase tracking-wider">Usage & Limits</h2>
          </div>
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <label className="text-sm font-semibold text-text">Auto-dim after</label>
              <span className="text-xs font-extrabold text-primary bg-primary bg-opacity-10 px-3 py-1 rounded-full">
                {currentSettings.screen_time_limit} min
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="30"
              step="5"
              value={currentSettings.screen_time_limit}
              onChange={(e) => updateSetting('screen_time_limit', parseInt(e.target.value))}
              className="w-full h-2 bg-bg-dark rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-[10px] text-text-muted mt-2 font-bold px-1">
              <span>5M</span>
              <span>15M</span>
              <span>30M</span>
            </div>
          </div>
        </section>

        {/* Learning Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <span className="text-xl">📖</span>
            <h2 className="text-sm font-bold text-text-muted uppercase tracking-wider">Learning Goals</h2>
          </div>
          <div className="card">
             <div className="flex justify-between items-center mb-4">
              <label className="text-sm font-semibold text-text">Repetition Target</label>
              <span className="text-xs font-extrabold text-secondary bg-secondary bg-opacity-10 px-3 py-1 rounded-full">
                {currentSettings.memorize_tap_target}x taps
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="30"
              step="1"
              value={currentSettings.memorize_tap_target}
              onChange={(e) => updateSetting('memorize_tap_target', parseInt(e.target.value))}
              className="w-full h-2 bg-bg-dark rounded-lg appearance-none cursor-pointer accent-secondary"
            />
            <div className="flex justify-between text-[10px] text-text-muted mt-2 font-bold px-1">
              <span>5X</span>
              <span>15X</span>
              <span>30X</span>
            </div>
          </div>
        </section>

        {/* Audio Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <span className="text-xl">🎧</span>
            <h2 className="text-sm font-bold text-text-muted uppercase tracking-wider">Audio Preference</h2>
          </div>
          <div className="card">
            <label className="block text-sm font-semibold text-text mb-3">Default Reciter</label>
            <div className="space-y-2">
              {[
                { id: 'ar.alafasy', name: 'Mishary Alafasy', desc: 'Standard clear recitation' },
                { id: 'ar.minshawi', name: 'Minshawi', desc: 'With child repeat (Recommended)' },
                { id: 'ar.husary', name: 'Husary', desc: 'Traditional slow pace' }
              ].map((qari) => (
                <button
                  key={qari.id}
                  onClick={() => updateSetting('default_qari', qari.id)}
                  className={`w-full p-4 rounded-xl text-left transition-all border-2 flex items-center justify-between ${
                    currentSettings.default_qari === qari.id
                      ? 'border-primary bg-primary bg-opacity-5'
                      : 'border-bg-dark bg-white'
                  }`}
                >
                  <div>
                    <p className="text-sm font-bold text-text">{qari.name}</p>
                    <p className="text-[10px] text-text-muted">{qari.desc}</p>
                  </div>
                  {currentSettings.default_qari === qari.id && <span className="text-primary">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Advanced Section */}
        <section className="space-y-4 pt-4">
          <div className="flex items-center gap-2 px-1">
            <span className="text-xl">⚙️</span>
            <h2 className="text-sm font-bold text-text-muted uppercase tracking-wider">Advanced</h2>
          </div>
          <div className="card border-2 border-danger border-opacity-10">
            <h3 className="text-sm font-bold text-text mb-2">Danger Zone</h3>
            <p className="text-xs text-text-muted mb-4 leading-relaxed">
              Resetting local data will clear this device. This will not affect other family members if your data was synced.
            </p>
            <button
              onClick={handleClearData}
              className="w-full py-3 text-danger font-bold text-xs uppercase tracking-widest border-2 border-danger border-opacity-20 rounded-xl hover:bg-danger hover:bg-opacity-5 transition-all"
            >
              Reset Device Data
            </button>
          </div>
        </section>

        <p className="text-[10px] text-center text-text-muted opacity-50 font-bold uppercase tracking-tighter pb-8">
          Tarteel Tots v0.4.0 • Built with Love 💚
        </p>
      </main>

      {/* Saved Toast */}
      <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 bg-night-sky text-white px-6 py-3 rounded-full text-xs font-bold shadow-xl transition-all duration-300 z-50 flex items-center gap-2 ${
        showSavedToast ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0 pointer-events-none'
      }`}>
        <span>✨</span>
        <span>SETTINGS SAVED & SYNCED</span>
      </div>
    </div>
  );
}
