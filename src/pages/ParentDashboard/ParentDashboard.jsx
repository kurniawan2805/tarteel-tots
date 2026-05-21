import { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/dexie';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSync } from '../../hooks/useSync';
import { getStreakDays, CFR_LEVELS, getSurahChunks } from '../../utils/spacedRepetition';
import Garden, { GardenProgress } from '../../components/Garden/Garden';
import { quranMetaData } from '../../data/quranMeta';
import { useCFR } from '../../hooks/useCFR';
import GradeCard from '../../components/GradeCard';
import RecentGradesWidget from '../../components/RecentGradesWidget';
import ChildProfileModal from '../../components/ChildProfileModal';

const QARI_NAMES = {
  'ar.alafasy': 'Mishary Alafasy',
  'ar.minshawi': 'Minshawi',
  'ar.husary': 'Husary'
};

export default function ParentDashboard() {
  const navigate = useNavigate();
  const { logout, isLocalMode, familyId } = useAuth();
  const { online, syncing, lastSync, saveProgress } = useSync();

  const rawChildren = useLiveQuery(() => db.children.toArray(), []);
  const rawSessions = useLiveQuery(() => db.sessions.toArray(), []);
  const rawProgress = useLiveQuery(() => db.progress.toArray(), []);
  const rawSettings = useLiveQuery(() => db.settings.toArray(), []);

  const children = useMemo(() => {
    if (!rawChildren) return [];
    if (isLocalMode) return rawChildren;
    if (!familyId) return [];
    return rawChildren.filter(c => c.family_id === familyId);
  }, [rawChildren, isLocalMode, familyId]);

  const sessions = useMemo(() => {
    if (!rawSessions) return [];
    if (isLocalMode) return rawSessions;
    if (!familyId) return [];
    return rawSessions.filter(s => s.family_id === familyId);
  }, [rawSessions, isLocalMode, familyId]);

  const progress = useMemo(() => {
    if (!rawProgress) return [];
    if (isLocalMode) return rawProgress;
    if (!familyId || !children.length) return [];
    const childIds = new Set(children.map(c => c.id));
    return rawProgress.filter(p => childIds.has(p.child_id));
  }, [rawProgress, isLocalMode, familyId, children]);

  const settings = useMemo(() => {
    if (!rawSettings) return {};
    return Object.fromEntries(rawSettings.map(s => [s.key, s.value]));
  }, [rawSettings]);

  const [selectedChild, setSelectedChild] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [isEditingChild, setIsEditingChild] = useState(false);
  const [manualAddMode, setManualAddMode] = useState('single'); // 'single', 'range', 'surah'
  const [manualEntry, setManualEntry] = useState({ surah: 1, ayah: 1, endAyah: 1 });
  const [selectedSurahs, setSelectedSurahs] = useState([]); // Array of surah IDs for bulk add
  const [searchTerm, setSearchTerm] = useState('');
  const [showMemorizedInList, setShowMemorizedInList] = useState(false);
  const [recentSurahs, setRecentSurahs] = useState(() => {
    const saved = localStorage.getItem('recent_surahs');
    return saved ? JSON.parse(saved) : [];
  });

  const { suggestions } = useCFR(selectedChild?.id);

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
    try {
      if (!selectedChild || !progress) return [];

      const childProgress = progress.filter(p => p.child_id === selectedChild.id);
      
      const byDate = {};
      childProgress.forEach(p => {
        const dateKey = p.lastReviewed ? new Date(p.lastReviewed).toLocaleDateString() : 'Unknown';
        if (!byDate[dateKey]) byDate[dateKey] = [];
        byDate[dateKey].push(p);
      });

      const result = Object.entries(byDate).map(([date, items]) => {
        const bySurah = {};
        items.forEach(p => {
          if (p.surah) {
            if (!bySurah[p.surah]) bySurah[p.surah] = [];
            bySurah[p.surah].push(p);
          }
        });

        const surahGroups = Object.entries(bySurah).map(([surahId, chunks]) => {
          const sId = parseInt(surahId);
          const surahMeta = quranMetaData[sId];
          const allChunks = getSurahChunks(sId, surahMeta?.verses || 7);
          
          const ranges = chunks.map(c => {
            const chunkMeta = allChunks.find(ac => ac.id === c.chunkId);
            return {
              progressId: c.id,
              surah: c.surah,
              surah_name: surahMeta?.transliteration || `Surah ${c.surah}`,
              start: chunkMeta?.start || 1,
              end: chunkMeta?.end || 1,
              grade: c.lastGrade,
              chunkId: c.chunkId,
              lastReviewed: c.lastReviewed
            };
          }).sort((a, b) => (a.start || 0) - (b.start || 0));

          return { surahId: sId, ranges };
        });

        return { date, surahGroups };
      }).sort((a, b) => new Date(b.date) - new Date(a.date));

      return result;
    } catch (err) {
      console.error('Progress calculation failed:', err);
      return [];
    }
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

  const handleStartSession = (child, mode = 'interactive', suggestedItem = null) => {
    let url = `/play/${child.id}?mode=${mode}`;
    if (suggestedItem) {
      url += `&surah=${suggestedItem.surah}`;
      if (suggestedItem.chunkId) url += `&chunk=${suggestedItem.chunkId}`;
    }
    navigate(url);
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

  const reportCardStats = useMemo(() => {
    if (!selectedChild || !progress || !sessions) return { totalMemorized: 0, streak: 0, totalMinutes: 0 };
    
    const childProgress = progress.filter(p => p.child_id === selectedChild.id);
    const childSessions = sessions.filter(s => s.child_id === selectedChild.id);
    
    // Total memorized is count of unique chunks they have a grade for
    const totalMemorized = childProgress.length;
    
    // Total time in minutes
    const totalSeconds = childSessions.reduce((acc, s) => acc + (s.duration || 0), 0);
    const totalMinutes = Math.round(totalSeconds / 60);

    return {
      totalMemorized,
      streak: childStreak,
      totalMinutes
    };
  }, [selectedChild, progress, sessions, childStreak]);

  const handleManualAdd = async () => {
    if (!selectedChild) return;
    
    const surahsToProcess = manualAddMode === 'surah' ? selectedSurahs : [manualEntry.surah];
    const now = new Date().toISOString();
    const nextSuggested = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

    for (const surahId of surahsToProcess) {
      const surahMeta = quranMetaData[surahId];
      if (!surahMeta) continue;

      const chunks = getSurahChunks(surahId, surahMeta.verses);
      let chunksToMark = [];

      if (manualAddMode === 'single') {
        const chunk = chunks.find(c => manualEntry.ayah >= c.start && manualEntry.ayah <= c.end);
        if (chunk) chunksToMark.push(chunk);
      } else if (manualAddMode === 'range') {
        const start = Math.min(manualEntry.ayah, manualEntry.endAyah);
        const end = Math.max(manualEntry.ayah, manualEntry.endAyah);
        chunksToMark = chunks.filter(c => 
          (c.start >= start && c.start <= end) || 
          (c.end >= start && c.end <= end) ||
          (start >= c.start && start <= c.end)
        );
      } else if (manualAddMode === 'surah') {
        chunksToMark = chunks;
      }

      for (const chunk of chunksToMark) {
        const exists = progress.find(p => p.child_id === selectedChild.id && p.surah === surahId && p.chunkId === chunk.id);
        if (!exists) {
          await saveProgress({
            child_id: selectedChild.id,
            surah: surahId,
            chunkId: chunk.id,
            level: 3, // Start at 'Strong Tree' for manually added
            lastReviewed: now,
            nextSuggested: nextSuggested,
            lastGrade: 'happy',
            favorite: false
          });
        }
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
              <div className="space-y-4">
                {/* Recent Grades Widget */}
                <RecentGradesWidget childId={selectedChild.id} limit={5} />

                {/* 3 Garden Visit Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {suggestions.length > 0 ? (
                    suggestions.map((card, i) => (
                      <button
                        key={i}
                        onClick={() => handleStartSession(selectedChild, 'interactive', card.item)}
                        className={`card text-left p-5 flex flex-col justify-between transition-all active:scale-[0.98] border-b-4 ${
                          card.type === 'favorite' ? 'border-danger border-opacity-30' :
                          card.type === 'due' ? 'border-primary border-opacity-30' :
                          'border-gold border-opacity-30'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="text-sm font-bold text-text">{card.title}</h3>
                            <span className="text-xl">
                              {CFR_LEVELS.find(l => l.level === card.item.level)?.icon || '🌱'}
                            </span>
                          </div>
                          <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold mb-3">{card.subtitle}</p>
                          <div className="flex items-center gap-3">
                            <div className="bg-bg-dark rounded-xl px-4 py-2 w-full">
                              <span className="text-lg font-bold text-primary">{card.item.surahName}</span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between w-full">
                          <span className="text-[9px] font-bold text-text-muted">TAP TO VISIT</span>
                          <span className="text-lg">➔</span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="card col-span-3 py-8 text-center bg-bg-dark border-dashed border-2 border-white">
                      <span className="text-4xl block mb-2">🧺</span>
                      <p className="text-sm text-text-muted font-medium italic">No garden visits today. Try adding a new surah below!</p>
                    </div>
                  )}
                </div>

                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-4xl">{selectedChild.avatar}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-text">{selectedChild.name}'s Garden</h3>
                          <button
                            onClick={() => setIsEditingChild(true)}
                            className="p-1 hover:bg-bg-dark rounded-full transition-colors text-text-muted hover:text-primary"
                            title="Edit Profile"
                          >
                            <span className="text-sm">✏️</span>
                          </button>
                        </div>
                        <GardenProgress streak={childStreak} goal={selectedChild.daily_goal_minutes * 3} />
                      </div>
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
            {/* Report Card Summary */}
            {selectedChild && (
              <div className="bg-primary bg-opacity-5 -mx-4 -mt-4 p-6 mb-6 border-b border-primary border-opacity-10 rounded-t-2xl">
                <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
                  {children?.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => setSelectedChild(child)}
                      className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                        selectedChild?.id === child.id
                          ? 'bg-primary text-white shadow-md'
                          : 'bg-white text-text-muted hover:bg-bg-dark border border-gray-100'
                      }`}
                    >
                      {child.avatar} {child.name}
                    </button>
                  ))}
                  <button
                    onClick={() => navigate('/onboarding')}
                    className="flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold bg-white text-text-muted border border-dashed border-primary border-opacity-20 hover:bg-bg-dark transition-all"
                  >
                    + Add Child
                  </button>
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <span className="text-4xl">{selectedChild.avatar}</span>
                  <div>
                    <h2 className="text-xl font-bold text-text">{selectedChild.name}'s Report Card</h2>
                    <p className="text-xs text-text-muted font-medium">Keep growing your garden! 🌴</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white p-3 rounded-2xl shadow-sm text-center">
                    <span className="text-xl block mb-1">📖</span>
                    <p className="text-lg font-black text-primary">{reportCardStats.totalMemorized}</p>
                    <p className="text-[9px] font-bold text-text-muted uppercase">Memorized</p>
                  </div>
                  <div className="bg-white p-3 rounded-2xl shadow-sm text-center">
                    <span className="text-xl block mb-1">🔥</span>
                    <p className="text-lg font-black text-secondary">{reportCardStats.streak}d</p>
                    <p className="text-[9px] font-bold text-text-muted uppercase">Streak</p>
                  </div>
                  <div className="bg-white p-3 rounded-2xl shadow-sm text-center">
                    <span className="text-xl block mb-1">⏱️</span>
                    <p className="text-lg font-black text-text">{reportCardStats.totalMinutes}m</p>
                    <p className="text-[9px] font-bold text-text-muted uppercase">Total Time</p>
                  </div>
                </div>
              </div>
            )}

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
                                <GradeCard
                                  key={idx}
                                  progressId={range.progressId}
                                  childId={selectedChild.id}
                                  surah={range.surah}
                                  chunkId={range.chunkId}
                                  lastGrade={range.grade}
                                  lastReviewed={range.lastReviewed}
                                />
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

      {isEditingChild && selectedChild && (
        <ChildProfileModal
          child={selectedChild}
          onClose={() => setIsEditingChild(false)}
          onUpdate={async () => {
            const allChildren = await db.children.toArray();
            const stillExists = allChildren.find(c => c.id === selectedChild.id);
            if (stillExists) {
              setSelectedChild(stillExists);
            } else {
              setSelectedChild(allChildren[0] || null);
            }
          }}
        />
      )}
    </div>
  );
}
