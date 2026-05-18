import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/dexie';
import { useAuth } from '../../contexts/AuthContext';
import { useSync } from '../../contexts/SyncContext';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { logout, isLocalMode } = useAuth();
  const { performSync, online, lastSync } = useSync();

  const settings = useLiveQuery(async () => {
    const items = await db.settings.toArray();
    return Object.fromEntries(items.map(s => [s.key, s.value]));
  }, []);

  const [screenTimeLimit, setScreenTimeLimit] = useState(settings?.screen_time_limit || 15);
  const [memorizeTapTarget, setMemorizeTapTarget] = useState(settings?.memorize_tap_target || 10);
  const [defaultQari, setDefaultQari] = useState(settings?.default_qari || 'ar.alafasy');
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    await db.settings.put({ key: 'screen_time_limit', value: screenTimeLimit });
    await db.settings.put({ key: 'memorize_tap_target', value: memorizeTapTarget });
    await db.settings.put({ key: 'default_qari', value: defaultQari });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClearData = async () => {
    if (window.confirm('Are you sure? This will delete all local data.')) {
      await db.delete();
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-bg pb-20">
      <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <div className="flex items-center gap-4 max-w-lg mx-auto">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-text text-xl"
          >
            ←
          </button>
          <h1 className="text-xl font-bold text-text">Settings</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        <div className="card">
          <h2 className="text-lg font-bold text-text mb-4">Screen Time</h2>
          <div>
            <label className="block text-sm font-semibold text-text mb-2">
              Auto-dim after (minutes)
            </label>
            <input
              type="range"
              min="5"
              max="30"
              step="5"
              value={screenTimeLimit}
              onChange={(e) => setScreenTimeLimit(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-text-muted mt-1">
              <span>5m</span>
              <span className="font-bold text-primary">{screenTimeLimit}m</span>
              <span>30m</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-bold text-text mb-4">Memorization</h2>
          <div>
            <label className="block text-sm font-semibold text-text mb-2">
              Daily repetition goal (taps)
            </label>
            <input
              type="range"
              min="5"
              max="30"
              step="1"
              value={memorizeTapTarget}
              onChange={(e) => setMemorizeTapTarget(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-text-muted mt-1">
              <span>5</span>
              <span className="font-bold text-primary">{memorizeTapTarget}x</span>
              <span>30</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-bold text-text mb-4">Audio</h2>
          <div>
            <label className="block text-sm font-semibold text-text mb-2">Default Reciter</label>
            <select
              value={defaultQari}
              onChange={(e) => setDefaultQari(e.target.value)}
              className="input-field"
            >
              <option value="ar.alafasy">Mishary Alafasy</option>
              <option value="ar.minshawi">Minshawi (with child repeat)</option>
              <option value="ar.husary">Husary</option>
            </select>
          </div>
        </div>

        {!isLocalMode && (
          <div className="card">
            <h2 className="text-lg font-bold text-text mb-4">Sync</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-text">Status</span>
                <span className={`text-sm font-semibold ${online ? 'text-primary' : 'text-text-muted'}`}>
                  {online ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text">Last Sync</span>
                <span className="text-sm text-text-muted">
                  {lastSync ? new Date(lastSync).toLocaleString() : 'Never'}
                </span>
              </div>
              <button
                onClick={performSync}
                className="btn-primary w-full"
              >
                Sync Now
              </button>
            </div>
          </div>
        )}

        <div className="card">
          <h2 className="text-lg font-bold text-text mb-4">Data</h2>
          <button
            onClick={handleClearData}
            className="w-full py-3 text-danger font-semibold text-center border border-danger border-opacity-30 rounded-lg"
          >
            Clear All Local Data
          </button>
        </div>

        {saved && (
          <div className="bg-primary bg-opacity-10 text-primary p-3 rounded-lg text-center text-sm font-semibold">
            Settings saved!
          </div>
        )}

        <button
          onClick={handleSave}
          className="btn-primary w-full"
        >
          Save Settings
        </button>
      </main>
    </div>
  );
}
