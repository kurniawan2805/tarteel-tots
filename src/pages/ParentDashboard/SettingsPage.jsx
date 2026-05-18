import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/dexie';
import { useAuth } from '../../hooks/useAuth';
import { useSync } from '../../hooks/useSync';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { isLocalMode } = useAuth();
  const { performSync, online, lastSync, syncing, syncError } = useSync();

  const settings = useLiveQuery(async () => {
    const items = await db.settings.toArray();
    return Object.fromEntries(items.map(s => [s.key, s.value]));
  }, []);

  const [screenTimeLimit, setScreenTimeLimit] = useState(15);
  const [memorizeTapTarget, setMemorizeTapTarget] = useState(10);
  const [defaultQari, setDefaultQari] = useState('ar.alafasy');
  const [saved, setSaved] = useState(false);

  // Sync local state when settings are loaded from DB
  useEffect(() => {
    if (settings) {
      const timer = setTimeout(() => {
        if (settings.screen_time_limit !== undefined) setScreenTimeLimit(settings.screen_time_limit);
        if (settings.memorize_tap_target !== undefined) setMemorizeTapTarget(settings.memorize_tap_target);
        if (settings.default_qari !== undefined) setDefaultQari(settings.default_qari);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [settings]);

  const handleSave = async () => {
    await db.settings.put({ key: 'screen_time_limit', value: screenTimeLimit });
    await db.settings.put({ key: 'memorize_tap_target', value: memorizeTapTarget });
    await db.settings.put({ key: 'default_qari', value: defaultQari });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClearData = async () => {
    if (window.confirm('⚠️ Are you sure? This will delete all local data, including child profiles and progress.')) {
      await db.delete();
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-bg pb-32">
      <header className="bg-white shadow-sm p-4 sticky top-0 z-20">
        <div className="flex items-center gap-4 max-w-lg mx-auto">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-bg-dark transition-colors text-text"
          >
            <span className="text-2xl">←</span>
          </button>
          <h1 className="text-xl font-bold text-text">Parent Settings</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-6">
        {/* Screen Time Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <span className="text-xl">⏰</span>
            <h2 className="text-sm font-bold text-text-muted uppercase tracking-wider">Usage & Limits</h2>
          </div>
          <div className="card">
            <label className="block text-sm font-semibold text-text mb-4">
              Auto-dim after (minutes)
            </label>
            <input
              type="range"
              min="5"
              max="30"
              step="5"
              value={screenTimeLimit}
              onChange={(e) => setScreenTimeLimit(parseInt(e.target.value))}
              className="w-full h-2 bg-bg-dark rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-xs text-text-muted mt-3 px-1">
              <span>5m</span>
              <span className="font-extrabold text-primary bg-primary bg-opacity-10 px-3 py-1 rounded-full">{screenTimeLimit} minutes</span>
              <span>30m</span>
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
            <label className="block text-sm font-semibold text-text mb-4">
              Daily repetition target (taps)
            </label>
            <input
              type="range"
              min="5"
              max="30"
              step="1"
              value={memorizeTapTarget}
              onChange={(e) => setMemorizeTapTarget(parseInt(e.target.value))}
              className="w-full h-2 bg-bg-dark rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-xs text-text-muted mt-3 px-1">
              <span>5x</span>
              <span className="font-extrabold text-primary bg-primary bg-opacity-10 px-3 py-1 rounded-full">{memorizeTapTarget} repetitions</span>
              <span>30x</span>
            </div>
          </div>
        </section>

        {/* Audio Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <span className="text-xl">🎧</span>
            <h2 className="text-sm font-bold text-text-muted uppercase tracking-wider">Audio Configuration</h2>
          </div>
          <div className="card">
            <label className="block text-sm font-semibold text-text mb-3">Default Reciter</label>
            <select
              value={defaultQari}
              onChange={(e) => setDefaultQari(e.target.value)}
              className="input-field bg-white border-2 border-bg-dark focus:border-primary transition-all rounded-xl"
            >
              <option value="ar.alafasy">Mishary Alafasy</option>
              <option value="ar.minshawi">Minshawi (with child repeat)</option>
              <option value="ar.husary">Husary</option>
            </select>
            <p className="text-[10px] text-text-muted mt-3 italic px-1">
              Note: Pre-loading works best with Alafasy.
            </p>
          </div>
        </section>

        {/* Sync Section */}
        {!isLocalMode && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <span className="text-xl">☁️</span>
              <h2 className="text-sm font-bold text-text-muted uppercase tracking-wider">Cloud Sync</h2>
            </div>
            <div className="card space-y-4">
              <div className="flex items-center justify-between p-3 bg-bg rounded-xl">
                <span className="text-sm font-medium text-text">Network Status</span>
                <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${online ? 'bg-success bg-opacity-10 text-success' : 'bg-gray-100 text-text-muted'}`}>
                  <span className={`w-2 h-2 rounded-full ${online ? 'bg-success animate-pulse' : 'bg-gray-400'}`}></span>
                  {online ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
              
              <div className="flex items-center justify-between px-1">
                <div>
                  <p className="text-xs font-bold text-text">Last Backup</p>
                  <p className="text-[10px] text-text-muted">
                    {lastSync ? new Date(lastSync).toLocaleString() : 'Never synced'}
                  </p>
                </div>
                <button
                  onClick={performSync}
                  disabled={!online || syncing}
                  className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm flex items-center gap-2 ${
                    online && !syncing 
                      ? 'bg-white border-2 border-primary text-primary active:scale-95' 
                      : 'bg-gray-50 text-gray-400 border-2 border-gray-100 cursor-not-allowed'
                  }`}
                >
                  {syncing ? (
                    <>
                      <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
                      SYNCING...
                    </>
                  ) : 'SYNC NOW'}
                </button>
              </div>

              {syncError && (
                <div className="p-3 bg-danger bg-opacity-10 rounded-xl">
                  <p className="text-[10px] font-bold text-danger leading-tight">
                    ❌ Sync Error: {syncError}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Data Management Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <span className="text-xl">⚙️</span>
            <h2 className="text-sm font-bold text-text-muted uppercase tracking-wider">Advanced</h2>
          </div>
          <div className="card border-2 border-danger border-opacity-10">
            <h3 className="text-sm font-bold text-text mb-2">Danger Zone</h3>
            <p className="text-xs text-text-muted mb-4">
              Deleting local data will clear everything from this device. If not synced, this cannot be undone.
            </p>
            <button
              onClick={handleClearData}
              className="w-full py-3 text-danger font-bold text-xs uppercase tracking-widest border-2 border-danger border-opacity-20 rounded-xl hover:bg-danger hover:bg-opacity-5 transition-all"
            >
              Reset All Local Data
            </button>
          </div>
        </section>
      </main>

      {/* Floating Save Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white bg-opacity-80 backdrop-blur-md border-t border-bg-dark z-30">
        <div className="max-w-lg mx-auto">
          {saved ? (
            <div className="flex items-center justify-center gap-2 py-3.5 bg-success text-white rounded-2xl font-bold">
              <span>✅</span>
              <span>SAVED SUCCESSFULLY</span>
            </div>
          ) : (
            <button
              onClick={handleSave}
              className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-sm tracking-widest shadow-lg shadow-primary-light active:scale-[0.98] transition-all"
            >
              SAVE CHANGES
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
