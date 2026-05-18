import { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/dexie';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSync } from '../../hooks/useSync';
import { getStreakDays } from '../../utils/spacedRepetition';
import Garden, { GardenProgress } from '../../components/Garden/Garden';
import { quranMetaData } from '../../data/quranMeta';
import { fetchAyahText, fetchSurahText } from '../../utils/quranApi';

const QARI_NAMES = {
  'ar.alafasy': 'Mishary Alafasy',
  'ar.minshawi': 'Minshawi',
  'ar.husary': 'Husary'
};

export default function ParentDashboard() {
  const navigate = useNavigate();
  const { logout, isLocalMode } = useAuth();
  const { online, syncing, lastSync, saveProgress } = useSync();

  const children = useLiveQuery(() => db.children.toArray(), []);
  const sessions = useLiveQuery(() => db.sessions.toArray(), []);
  const progress = useLiveQuery(() => db.progress.toArray(), []);
  const settings = useLiveQuery(async () => {
    const items = await db.settings.toArray();
    return Object.fromEntries(items.map(s => [s.key, s.value]));
  }, []);

  const [selectedChild, setSelectedChild] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [manualAddMode, setManualAddMode] = useState('single'); // 'single', 'range', 'surah'
  const [manualEntry, setManualEntry] = useState({ surah: 1, ayah: 1, endAyah: 1 });
  const [selectedSurahs, setSelectedSurahs] = useState([]); // Array of surah IDs for bulk add
  const [searchTerm, setSearchTerm] = useState('');
  const [showMemorizedInList, setShowMemorizedInList] = useState(false);
  const [recentSurahs, setRecentSurahs] = useState(() => {
    const saved = localStorage.getItem('recent_surahs');
    return saved ? JSON.parse(saved) : [];
  });

  const memorizedSurahIds = useMemo(() => {
    if (!selectedChild || !progress) return new Set();
    const childProgress = progress.filter(p => p.child_id === selectedChild.id);
    return new Set(childProgress.map(p => p.surah));
  }, [progress, selectedChild]);

  const toggleSurahSelection = (id) => {
    if (manualAddMode === 'surah') {
      setSelectedSurahs(prev => 
        prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
      );
    } else {
      setManualEntry({ ...manualEntry, surah: id, ayah: 1, endAyah: 1 });
      setSelectedSurahs([id]);
    }
  };

  const updateRecentSurahs = (surahId) => {
    const updated = [surahId, ...recentSurahs.filter(id => id !== surahId)].slice(0, 5);
    setRecentSurahs(updated);
    localStorage.setItem('recent_surahs', JSON.stringify(updated));
  };

  const groupedProgress = useMemo(() => {
    if (!selectedChild || !progress) return [];

    const childProgress = progress.filter(p => p.child_id === selectedChild.id);
    
    // 1. Group by Date
    const byDate = {};
    childProgress.forEach(p => {
      const dateKey = p.last_review ? new Date(p.last_review).toLocaleDateString() : 'Unknown';
      if (!byDate[dateKey]) byDate[dateKey] = [];
      byDate[dateKey].push(p);
    });

    const result = Object.entries(byDate).map(([date, items]) => {
      // 2. Group by Surah within each date
      const bySurah = {};
      items.forEach(p => {
        if (!bySurah[p.surah]) bySurah[p.surah] = [];
        bySurah[p.surah].push(p);
      });

      const surahGroups = Object.entries(bySurah).map(([surahId, ayahs]) => {
        const sorted = ayahs.sort((a, b) => a.ayah_number - b.ayah_number);
        const ranges = [];
        let currentRange = null;

        sorted.forEach(a => {
          if (!currentRange) {
            currentRange = { surah: a.surah, surah_name: a.surah_name, start: a.ayah_number, end: a.ayah_number, grade: a.grade };
          } else if (a.ayah_number === currentRange.end + 1) {
            currentRange.end = a.ayah_number;
            // Aggregate grade: if any is 'needs_help', overall is 'needs_help'
            if (a.grade === 'needs_help') currentRange.grade = 'needs_help';
            else if (a.grade === 'good' && currentRange.grade === 'perfect') currentRange.grade = 'good';
          } else {
            ranges.push(currentRange);
            currentRange = { surah: a.surah, surah_name: a.surah_name, start: a.ayah_number, end: a.ayah_number, grade: a.grade };
          }
        });
        if (currentRange) ranges.push(currentRange);

        return { surahId, ranges };
      });

      return { date, surahGroups };
    }).sort((a, b) => new Date(b.date) - new Date(a.date));

    return result;
  }, [progress, selectedChild]);

  useEffect(() => {
    if (children?.length > 0 && !selectedChild) {
      const firstChild = children[0];
      const timer = setTimeout(() => {
        setSelectedChild(firstChild);
      }, 0);
      return () => clearTimeout(timer);
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

  const handleManualAdd = async () => {
    if (!selectedChild) return;
    
    let ayahsToAdd = [];
    const surahsToProcess = manualAddMode === 'surah' ? selectedSurahs : [manualEntry.surah];

    for (const surahId of surahsToProcess) {
      if (manualAddMode === 'single') {
        const text = await fetchAyahText(surahId, manualEntry.ayah);
        if (text) ayahsToAdd.push({ surah: surahId, ayah: manualEntry.ayah, text });
      } else {
        const surahData = await fetchSurahText(surahId);
        if (surahData) {
          if (manualAddMode === 'range') {
            const start = Math.min(manualEntry.ayah, manualEntry.endAyah);
            const end = Math.max(manualEntry.ayah, manualEntry.endAyah);
            for (let i = start; i <= end; i++) {
              const ayahData = surahData.find(a => a.numberInSurah === i);
              if (ayahData) ayahsToAdd.push({ surah: surahId, ayah: i, text: ayahData.text });
            }
          } else if (manualAddMode === 'surah') {
            ayahsToAdd.push(...surahData.map(a => ({ surah: surahId, ayah: a.numberInSurah, text: a.text })));
          }
        }
      }
    }

    const now = new Date().toISOString();
    const nextReview = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    for (const item of ayahsToAdd) {
      const exists = progress.find(p => p.child_id === selectedChild.id && p.surah === item.surah && p.ayah_number === item.ayah);
      if (!exists) {
        await saveProgress({
          child_id: selectedChild.id,
          surah: item.surah,
          surah_name: quranMetaData[item.surah].transliteration,
          ayah_number: item.ayah,
          ayah_text: item.text,
          grade: 'perfect',
          next_review: nextReview,
          last_review: now,
          repetition_count: 1
        });
      }
    }

    if (surahsToProcess.length > 0) {
      updateRecentSurahs(surahsToProcess[0]);
    }
    
    setIsAddingManual(false);
    setSelectedSurahs([]);
    setManualAddMode('single');
  };

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
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-text">Progress</h2>
              <button
                onClick={() => setIsAddingManual(!isAddingManual)}
                className="text-primary text-sm font-bold"
              >
                {isAddingManual ? 'Cancel' : '+ Manually Add'}
              </button>
            </div>

            {isAddingManual && (
              <div className="bg-bg-dark p-4 rounded-xl mb-6 animate-grow">
                <p className="text-xs font-bold text-text-muted uppercase mb-4 text-center">Add Memorized Progress</p>
                
                {/* Mode Tabs */}
                <div className="flex bg-white rounded-lg p-1 mb-4 shadow-inner">
                  {['single', 'range', 'surah'].map(mode => (
                    <button
                      key={mode}
                      onClick={() => {
                        setManualAddMode(mode);
                        setSelectedSurahs([]); // Clear bulk selection when mode changes
                      }}
                      className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                        manualAddMode === mode ? 'bg-primary text-white shadow-sm' : 'text-text-muted'
                      }`}
                    >
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center ml-1 mb-2">
                      <label className="block text-[10px] font-bold text-text-muted uppercase">Select Surah</label>
                      <button 
                        onClick={() => setShowMemorizedInList(!showMemorizedInList)}
                        className={`text-[9px] font-bold px-2 py-0.5 rounded border transition-colors ${
                          showMemorizedInList ? 'bg-primary text-white border-primary' : 'bg-white text-text-muted border-gray-200'
                        }`}
                      >
                        {showMemorizedInList ? 'SHOWING ALL' : 'HIDING MEMORIZED'}
                      </button>
                    </div>
                    
                    {/* Search Bar */}
                    <div className="relative mb-3">
                      <input
                        type="text"
                        placeholder="Search surah..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input-field py-2 pl-9 text-sm"
                      />
                      <span className="absolute left-3 top-2.5 opacity-30">🔍</span>
                    </div>

                    <div className="max-h-60 overflow-y-auto pr-1 space-y-4">
                      {searchTerm ? (
                        /* Search Results */
                        <div className="grid grid-cols-2 gap-2">
                          {quranMetaData.slice(1)
                            .filter(s => {
                              const matchesSearch = s.transliteration.toLowerCase().includes(searchTerm.toLowerCase()) || s.id.toString() === searchTerm;
                              const isMemorized = memorizedSurahIds.has(s.id);
                              return matchesSearch && (showMemorizedInList || !isMemorized);
                            })
                            .map(s => (
                              <button
                                key={s.id}
                                onClick={() => {
                                  toggleSurahSelection(s.id);
                                  if (manualAddMode !== 'surah') setSearchTerm('');
                                }}
                                className={`p-2 text-xs rounded-lg border text-left transition-all relative ${
                                  (manualAddMode === 'surah' ? selectedSurahs.includes(s.id) : manualEntry.surah === s.id) 
                                    ? 'bg-primary border-primary text-white font-bold' 
                                    : 'bg-white border-gray-100 text-text'
                                } ${memorizedSurahIds.has(s.id) ? 'opacity-60 ring-1 ring-gold ring-inset' : ''}`}
                              >
                                {manualAddMode === 'surah' && (
                                  <span className="mr-1">{selectedSurahs.includes(s.id) ? '☑️' : '⬜'}</span>
                                )}
                                {s.id}. {s.transliteration}
                                {memorizedSurahIds.has(s.id) && <span className="absolute top-1 right-1 text-[8px]">⭐</span>}
                              </button>
                            ))
                          }
                        </div>
                      ) : (
                        <>
                          {/* Recent Section */}
                          {recentSurahs.length > 0 && (
                            <div>
                              <p className="text-[9px] font-bold text-text-muted uppercase tracking-tighter mb-2">Recent</p>
                              <div className="grid grid-cols-2 gap-2">
                                {recentSurahs.map(id => {
                                  const s = quranMetaData[id];
                                  const isMemorized = memorizedSurahIds.has(id);
                                  if (!showMemorizedInList && isMemorized) return null;
                                  return (
                                    <button
                                      key={id}
                                      onClick={() => toggleSurahSelection(id)}
                                      className={`p-2 text-xs rounded-lg border text-left transition-all relative ${
                                        (manualAddMode === 'surah' ? selectedSurahs.includes(id) : manualEntry.surah === id) 
                                          ? 'bg-primary border-primary text-white font-bold' 
                                          : 'bg-white border-gray-100 text-text'
                                      } ${isMemorized ? 'opacity-60 ring-1 ring-gold ring-inset' : ''}`}
                                    >
                                      {manualAddMode === 'surah' && (
                                        <span className="mr-1">{selectedSurahs.includes(id) ? '☑️' : '⬜'}</span>
                                      )}
                                      {s.transliteration}
                                      {isMemorized && <span className="absolute top-1 right-1 text-[8px]">⭐</span>}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Juz Amma Section - REVERSED ORDER (114 -> 78) */}
                          <div>
                            <p className="text-[9px] font-bold text-text-muted uppercase tracking-tighter mb-2">Juz Amma (Reversed)</p>
                            <div className="grid grid-cols-2 gap-2">
                              {[...quranMetaData.slice(78)].reverse().map(s => {
                                const isMemorized = memorizedSurahIds.has(s.id);
                                if (!showMemorizedInList && isMemorized) return null;
                                return (
                                  <button
                                    key={s.id}
                                    onClick={() => toggleSurahSelection(s.id)}
                                    className={`p-2 text-xs rounded-lg border text-left transition-all relative ${
                                      (manualAddMode === 'surah' ? selectedSurahs.includes(s.id) : manualEntry.surah === s.id) 
                                        ? 'bg-primary border-primary text-white font-bold' 
                                        : 'bg-white border-gray-100 text-text'
                                    } ${isMemorized ? 'opacity-60 ring-1 ring-gold ring-inset' : ''}`}
                                  >
                                    {manualAddMode === 'surah' && (
                                      <span className="mr-1">{selectedSurahs.includes(s.id) ? '☑️' : '⬜'}</span>
                                    )}
                                    {s.transliteration}
                                    {isMemorized && <span className="absolute top-1 right-1 text-[8px]">⭐</span>}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* All Surahs Section */}
                          <div>
                            <p className="text-[9px] font-bold text-text-muted uppercase tracking-tighter mb-2">All Surahs</p>
                            <div className="grid grid-cols-2 gap-2">
                              {quranMetaData.slice(1, 78).map(s => {
                                const isMemorized = memorizedSurahIds.has(s.id);
                                if (!showMemorizedInList && isMemorized) return null;
                                return (
                                  <button
                                    key={s.id}
                                    onClick={() => toggleSurahSelection(s.id)}
                                    className={`p-2 text-xs rounded-lg border text-left transition-all relative ${
                                      (manualAddMode === 'surah' ? selectedSurahs.includes(s.id) : manualEntry.surah === s.id) 
                                        ? 'bg-primary border-primary text-white font-bold' 
                                        : 'bg-white border-gray-100 text-text'
                                    } ${isMemorized ? 'opacity-60 ring-1 ring-gold ring-inset' : ''}`}
                                  >
                                    {manualAddMode === 'surah' && (
                                      <span className="mr-1">{selectedSurahs.includes(s.id) ? '☑️' : '⬜'}</span>
                                    )}
                                    {s.id}. {s.transliteration}
                                    {isMemorized && <span className="absolute top-1 right-1 text-[8px]">⭐</span>}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {manualAddMode !== 'surah' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-text-muted uppercase ml-1 mb-1">
                          {manualAddMode === 'single' ? 'Ayah' : 'Start Ayah'}
                        </label>
                        <select
                          value={manualEntry.ayah}
                          onChange={(e) => setManualEntry({ ...manualEntry, ayah: parseInt(e.target.value) })}
                          className="input-field py-2 text-sm"
                        >
                          {Array.from({ length: quranMetaData[manualEntry.surah]?.verses || 0 }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>Ayah {n}</option>
                          ))}
                        </select>
                      </div>

                      {manualAddMode === 'range' && (
                        <div>
                          <label className="block text-[10px] font-bold text-text-muted uppercase ml-1 mb-1">End Ayah</label>
                          <select
                            value={manualEntry.endAyah}
                            onChange={(e) => setManualEntry({ ...manualEntry, endAyah: parseInt(e.target.value) })}
                            className="input-field py-2 text-sm"
                          >
                            {Array.from({ length: quranMetaData[manualEntry.surah]?.verses || 0 }, (_, i) => i + 1).map((n) => (
                              <option key={n} value={n}>Ayah {n}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleManualAdd}
                  className="btn-primary w-full py-3 text-sm mt-6"
                >
                  Confirm Entry
                </button>
              </div>
            )}

            {selectedChild && (
              <>
                <p className="text-sm text-text-muted mb-4">
                  {selectedChild.name}'s memorization progress
                </p>
                {groupedProgress.length === 0 ? (
                  <p className="text-center text-text-muted py-8">No progress yet. Start a session!</p>
                ) : (
                  <div className="space-y-8">
                    {groupedProgress.map((group) => (
                      <div key={group.date}>
                        <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-3 border-b border-bg-dark pb-1">
                          {group.date}
                        </h3>
                        <div className="space-y-3">
                          {group.surahGroups.map((surahGroup) => (
                            <div key={surahGroup.surahId} className="space-y-2">
                              {surahGroup.ranges.map((range, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-bg-dark rounded-xl border border-white shadow-sm">
                                  <div>
                                    <p className="text-sm font-bold text-text">
                                      {range.surah_name}
                                    </p>
                                    <p className="text-xs text-text-muted">
                                      {range.start === range.end 
                                        ? `Ayah ${range.start}` 
                                        : `Ayahs ${range.start} – ${range.end}`}
                                    </p>
                                  </div>
                                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold text-white shadow-sm ${
                                    range.grade === 'perfect' ? 'bg-success' :
                                    range.grade === 'good' ? 'bg-warning' :
                                    'bg-danger'
                                  }`}>
                                    {range.grade === 'perfect' ? 'PERFECT' :
                                     range.grade === 'good' ? 'GOOD' :
                                     'NEEDS HELP'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
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
