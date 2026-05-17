import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/dexie';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSync } from '../../contexts/SyncContext';
import { getStreakDays, getGardenStage } from '../../utils/spacedRepetition';
import Garden, { GardenProgress } from '../../components/Garden/Garden';
import { quranMetaData } from '../../data/quranMeta';

const QARI_NAMES = {
  'ar.alafasy': 'Mishary Alafasy',
  'ar.minshawi': 'Minshawi',
  'ar.husary': 'Husary'
};

export default function ParentDashboard() {
  const navigate = useNavigate();
  const { user, logout, isLocalMode } = useAuth();
  const { online, syncing, lastSync, performSync } = useSync();

  const children = useLiveQuery(() => db.children.toArray(), []);
  const sessions = useLiveQuery(() => db.sessions.toArray(), []);
  const progress = useLiveQuery(() => db.progress.toArray(), []);
  const settings = useLiveQuery(async () => {
    const items = await db.settings.toArray();
    return Object.fromEntries(items.map(s => [s.key, s.value]));
  }, []);

  const [selectedChild, setSelectedChild] = useState(null);
  const [activeTab, setActiveTab] = useState('home');

  useEffect(() => {
    if (children?.length > 0 && !selectedChild) {
      setSelectedChild(children[0]);
    }
  }, [children, selectedChild]);

  const handleStartSession = (child, mode = 'interactive') => {
    navigate(`/play/${child.id}?mode=${mode}`);
  };

  const handleStartLiveGuide = (child) => {
    navigate(`/live-guide/${child.id}`);
  };

  const totalScreenTime = sessions?.reduce((acc, s) => acc + (s.screen_time || 0), 0) || 0;
  const totalAudioOnlyTime = sessions?.reduce((acc, s) => acc + (s.audio_only_time || 0), 0) || 0;
  const audioOnlyPercentage = totalScreenTime + totalAudioOnlyTime > 0
    ? Math.round((totalAudioOnlyTime / (totalScreenTime + totalAudioOnlyTime)) * 100)
    : 0;

  const childStreak = selectedChild
    ? getStreakDays(sessions?.filter(s => s.child_id === selectedChild.id) || [])
    : 0;

  return (
    <div className="min-h-screen bg-bg pb-20">
      <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <h1 className="text-xl font-bold text-text">Tarteel Tots</h1>
            {isLocalMode && (
              <span className="text-xs text-text-muted">Local Mode</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${online ? 'bg-primary' : 'bg-text-muted'}`} />
            {syncing && <span className="text-xs text-text-muted animate-pulse">Syncing...</span>}
            <button
              onClick={() => navigate('/settings')}
              className="text-text-muted text-xl"
            >
              ⚙️
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {activeTab === 'home' && (
          <>
            <div className="card">
              <h2 className="text-lg font-bold text-text mb-3">Your Children</h2>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {children?.map((child) => {
                  const streak = getStreakDays(sessions?.filter(s => s.child_id === child.id) || []);
                  const { emoji } = getGardenStage(streak);
                  return (
                    <button
                      key={child.id}
                      onClick={() => setSelectedChild(child)}
                      className={`flex-shrink-0 p-3 rounded-xl text-center transition-all min-w-24 ${
                        selectedChild?.id === child.id
                          ? 'bg-primary bg-opacity-10 ring-2 ring-primary'
                          : 'bg-bg-dark'
                      }`}
                    >
                      <span className="text-3xl block mb-1">{child.avatar}</span>
                      <span className="text-sm font-semibold text-text">{child.name}</span>
                      <span className="text-xs text-text-muted block">{streak}🔥</span>
                    </button>
                  );
                })}
                <button
                  onClick={() => navigate('/onboarding')}
                  className="flex-shrink-0 p-3 rounded-xl bg-bg-dark text-text-muted min-w-24 flex flex-col items-center justify-center"
                >
                  <span className="text-2xl">+</span>
                  <span className="text-xs">Add</span>
                </button>
              </div>
            </div>

            {selectedChild && (
              <div className="card">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-4xl">{selectedChild.avatar}</span>
                  <div>
                    <h3 className="text-lg font-bold text-text">{selectedChild.name}'s Garden</h3>
                    <GardenProgress streak={childStreak} goal={selectedChild.daily_goal_minutes * 3} />
                  </div>
                </div>
                <Garden streak={childStreak} size="lg" />

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <button
                    onClick={() => handleStartSession(selectedChild, 'interactive')}
                    className="btn-primary text-center"
                  >
                    🎮 Play Mode
                  </button>
                  <button
                    onClick={() => handleStartLiveGuide(selectedChild)}
                    className="btn-secondary text-center"
                  >
                    👤 Live Guide
                  </button>
                </div>
              </div>
            )}

            <div className="card">
              <h3 className="text-lg font-bold text-text mb-3">Screen Time Balance</h3>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="h-4 bg-bg-dark rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-review transition-all"
                      style={{ width: `${100 - audioOnlyPercentage}%` }}
                    />
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${audioOnlyPercentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-text-muted">
                    <span>Screen: {Math.round(totalScreenTime / 60)}m</span>
                    <span>Audio: {Math.round(totalAudioOnlyTime / 60)}m</span>
                  </div>
                </div>
              </div>
              {audioOnlyPercentage > 50 && (
                <div className="mt-3 bg-primary bg-opacity-10 p-3 rounded-lg text-center">
                  <span className="text-2xl block mb-1">🌟</span>
                  <p className="text-sm font-semibold text-primary">Great balance!</p>
                  <p className="text-xs text-text-muted">More audio-only time means less screen strain</p>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'progress' && (
          <div className="card">
            <h2 className="text-lg font-bold text-text mb-4">Progress</h2>
            {selectedChild && (
              <>
                <p className="text-sm text-text-muted mb-3">
                  {selectedChild.name}'s memorization progress
                </p>
                {progress?.filter(p => p.child_id === selectedChild.id)?.length === 0 ? (
                  <p className="text-center text-text-muted py-8">No progress yet. Start a session!</p>
                ) : (
                  <div className="space-y-2">
                    {progress
                      ?.filter(p => p.child_id === selectedChild.id)
                      ?.sort((a, b) => new Date(b.last_review) - new Date(a.last_review))
                      ?.slice(0, 10)
                      ?.map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-3 bg-bg-dark rounded-lg">
                          <div>
                            <p className="text-sm font-semibold text-text">
                              {quranMetaData[p.surah]?.transliteration || `Surah ${p.surah}`} : Ayah {p.ayah_number}
                            </p>
                            <p className="text-xs text-text-muted">
                              Last reviewed: {p.last_review ? new Date(p.last_review).toLocaleDateString() : 'Never'}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            p.grade === 'perfect' ? 'bg-success text-white' :
                            p.grade === 'good' ? 'bg-warning text-white' :
                            'bg-danger text-white'
                          }`}>
                            {p.grade === 'perfect' ? '🟢 Perfect' :
                             p.grade === 'good' ? '🟡 Good' :
                             '🔴 Needs Help'}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-4">
            <div className="card">
              <h2 className="text-lg font-bold text-text mb-4">Settings</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-text">Screen Time Limit</span>
                  <span className="text-text-muted">{settings?.screen_time_limit || 15} min</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text">Default Qari</span>
                  <span className="text-text-muted">
                    {QARI_NAMES[settings?.default_qari] || 'Mishary Alafasy'}
                  </span>
                </div>
                {!isLocalMode && (
                  <div className="flex items-center justify-between">
                    <span className="text-text">Last Sync</span>
                    <span className="text-text-muted">
                      {lastSync ? new Date(lastSync).toLocaleTimeString() : 'Never'}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => navigate('/settings')}
                  className="btn-secondary w-full mt-4"
                >
                  Manage Settings
                </button>
              </div>
            </div>

            <button
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
              className="w-full py-3 text-danger font-semibold text-center"
            >
              Logout
            </button>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-bg-dark px-6 py-2 z-10">
        <div className="max-w-lg mx-auto flex justify-around">
          {[
            { id: 'home', icon: '🏠', label: 'Home' },
            { id: 'progress', icon: '📊', label: 'Progress' },
            { id: 'settings', icon: '⚙️', label: 'Settings' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center py-2 px-4 rounded-lg transition-all ${
                activeTab === tab.id ? 'text-primary' : 'text-text-muted'
              }`}
            >
              <span className="text-xl mb-1">{tab.icon}</span>
              <span className="text-xs">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
