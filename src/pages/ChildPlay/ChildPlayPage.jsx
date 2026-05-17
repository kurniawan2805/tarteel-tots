import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/dexie';
import ChildMode from '../../components/ChildMode/ChildMode';
import { useSync } from '../../contexts/SyncContext';
import { fetchAyahText } from '../../utils/quranApi';

export default function ChildPlayPage() {
  const { childId } = useParams();
  const { saveSession } = useSync();

  const child = useLiveQuery(() => db.children.get(parseInt(childId)), [childId]);
  const progress = useLiveQuery(() => db.progress.where('child_id').equals(parseInt(childId)).toArray(), [childId]);
  const settings = useLiveQuery(async () => {
    const items = await db.settings.toArray();
    return Object.fromEntries(items.map(s => [s.key, s.value]));
  }, []);

  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [ayahQueue, setAyahQueue] = useState([]);

  const baseQueue = useMemo(() => {
    if (!child || !settings || !progress) return [];
    
    const baseline = child.memorization_baseline || {};
    let currentSurah = baseline.current_surah || 1;
    let currentAyah = baseline.current_ayah || 1;
    const direction = child.direction || 'forwards';
    const qari = settings.default_qari || 'ar.alafasy';

    const queue = [];
    for (let i = 0; i < 3; i++) {
      if (currentSurah < 1 || currentSurah > 114) break;
      
      const surahMeta = quranMetaData[currentSurah];
      queue.push({
        surah: currentSurah,
        surah_name: surahMeta.transliteration,
        ayah_number: currentAyah,
        qari
      });

      currentAyah++;
      if (currentAyah > surahMeta.verses) {
        currentAyah = 1;
        if (direction === 'forwards') {
          currentSurah++;
        } else {
          currentSurah--;
        }
      }
    }

    const dueForReview = progress?.filter(p => {
      if (!p.next_review) return false;
      return new Date(p.next_review) <= new Date();
    }) || [];

    const reviewQueue = dueForReview.slice(0, 3).map(p => ({
      surah: p.surah,
      surah_name: quranMetaData[p.surah]?.transliteration || p.surah_name,
      ayah_number: p.ayah_number,
      qari,
      text: p.ayah_text
    }));

    return [...reviewQueue, ...queue];
  }, [child, progress, settings]);

  useEffect(() => {
    async function loadText() {
      if (baseQueue.length === 0) return;
      
      const fullQueue = await Promise.all(baseQueue.map(async (item) => {
        if (item.text) return item;
        const text = await fetchAyahText(item.surah, item.ayah_number);
        return { ...item, text };
      }));
      
      setAyahQueue(fullQueue);
    }
    
    loadText();
  }, [baseQueue]);

  const handleSessionComplete = async () => {
    const endTime = Date.now();
    const duration = Math.round((endTime - sessionStartTime) / 1000);

    await saveSession({
      child_id: parseInt(childId),
      date: new Date().toISOString().split('T')[0],
      duration,
      mode: 'interactive',
      screen_time: duration,
      audio_only_time: 0
    });

    setSessionStarted(false);
  };

  if (!child || !settings) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <p className="text-text-muted">Loading...</p>
      </div>
    );
  }

  if (!sessionStarted) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6">
        <span className="text-7xl mb-6 block">{child.avatar}</span>
        <h1 className="text-3xl font-bold text-text mb-2">{child.name}'s Session</h1>
        <p className="text-text-muted mb-8">Ready to learn?</p>
        <button
          onClick={() => {
            setSessionStarted(true);
            setSessionStartTime(Date.now());
          }}
          className="w-32 h-32 rounded-full bg-primary text-white text-5xl font-bold shadow-xl animate-pulse-gentle flex items-center justify-center"
        >
          ▶
        </button>
      </div>
    );
  }

  return (
    <ChildMode
      ayahQueue={ayahQueue}
      loopsPerAyah={5}
      screenTimeLimit={settings.screen_time_limit}
      onSessionComplete={handleSessionComplete}
    />
  );
}
