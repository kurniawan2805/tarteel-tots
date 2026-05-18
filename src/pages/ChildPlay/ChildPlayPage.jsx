import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/dexie';
import { quranMetaData } from '../../data/quranMeta';
import ChildMode from '../../components/ChildMode/ChildMode';
import { useSync } from '../../contexts/SyncContext';
import { fetchAyahText } from '../../utils/quranApi';

export default function ChildPlayPage() {
  const { childId } = useParams();
  const navigate = useNavigate();
  const { saveSession, saveProgress } = useSync();

  const child = useLiveQuery(() => db.children.get(parseInt(childId)), [childId]);
  const lastSession = useLiveQuery(
    () => db.sessions.where('child_id').equals(parseInt(childId)).reverse().first(),
    [childId]
  );
  const progress = useLiveQuery(() => db.progress.where('child_id').equals(parseInt(childId)).toArray(), [childId]);
  const settings = useLiveQuery(async () => {
    const items = await db.settings.toArray();
    return Object.fromEntries(items.map(s => [s.key, s.value]));
  }, []);

  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [ayahQueue, setAyahQueue] = useState([]);

  const { queue: baseQueue, nextBaseline, preview } = useMemo(() => {
    if (!child || !settings || !progress) return { queue: [], nextBaseline: null, preview: null };
    
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
        qari,
        isNew: true
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
      text: p.ayah_text,
      isNew: false
    }));

    return {
      queue: [...reviewQueue, ...queue],
      nextBaseline: { current_surah: currentSurah, current_ayah: currentAyah },
      preview: {
        newAyahsCount: queue.length,
        reviewAyahsCount: reviewQueue.length,
        startAyah: queue[0] ? `${queue[0].surah_name} ${queue[0].ayah_number}` : 'End'
      }
    };
  }, [child, progress, settings]);

  useEffect(() => {
    async function loadText() {
      if (!baseQueue || baseQueue.length === 0) return;
      
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

    // 1. Save Session
    await saveSession({
      child_id: parseInt(childId),
      date: new Date().toISOString().split('T')[0],
      duration,
      mode: 'interactive',
      screen_time: duration,
      audio_only_time: 0,
      ayahs_new: ayahQueue.filter(item => item.isNew).length,
      ayahs_reviewed: ayahQueue.filter(item => !item.isNew).length
    });

    // 2. Save Progress for new ayahs
    const newAyahs = ayahQueue.filter(item => item.isNew);
    for (const item of newAyahs) {
      await saveProgress({
        child_id: parseInt(childId),
        surah: item.surah,
        surah_name: item.surah_name,
        ayah_number: item.ayah_number,
        ayah_text: item.text,
        grade: 'good',
        next_review: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        last_review: new Date().toISOString(),
        repetition_count: 1
      });
    }

    // 3. Advance Baseline
    if (nextBaseline) {
      await db.children.update(parseInt(childId), {
        'memorization_baseline.current_surah': nextBaseline.current_surah,
        'memorization_baseline.current_ayah': nextBaseline.current_ayah
      });
    }

    setSessionStarted(false);
    navigate('/dashboard');
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
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 text-center">
        <span className="text-7xl mb-4 block">{child.avatar}</span>
        <h1 className="text-3xl font-bold text-text mb-2">{child.name}'s Session</h1>
        
        <div className="w-full max-w-sm grid grid-cols-2 gap-4 mb-8">
          <div className="card p-4 text-left">
            <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Previous</h3>
            {lastSession ? (
              <>
                <p className="text-sm font-bold text-text">{new Date(lastSession.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                <p className="text-xs text-text-muted">{Math.round(lastSession.duration / 60)} min session</p>
                <p className="text-xs text-primary font-bold mt-1">+{lastSession.ayahs_new || 0} ayahs</p>
              </>
            ) : (
              <p className="text-xs text-text-muted italic">No sessions yet</p>
            )}
          </div>

          <div className="card p-4 text-left">
            <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Next Up</h3>
            {preview ? (
              <>
                <p className="text-sm font-bold text-text">{preview.startAyah}</p>
                <p className="text-xs text-text-muted">{preview.newAyahsCount} new, {preview.reviewAyahsCount} review</p>
                <p className="text-xs text-secondary font-bold mt-1">Ready to start</p>
              </>
            ) : (
              <p className="text-xs text-text-muted italic">Calculating...</p>
            )}
          </div>
        </div>

        <button
          onClick={() => {
            setSessionStarted(true);
            setSessionStartTime(Date.now());
          }}
          className="w-32 h-32 rounded-full bg-primary text-white text-5xl font-bold shadow-xl animate-pulse-gentle flex items-center justify-center"
        >
          ▶
        </button>
        <p className="text-text-muted mt-6 font-medium">Tap to start learning</p>
      </div>
    );
  }

  return (
    <ChildMode
      ayahQueue={ayahQueue}
      loopsPerAyah={5}
      memorizeTarget={settings.memorize_tap_target || 10}
      screenTimeLimit={settings.screen_time_limit}
      onSessionComplete={handleSessionComplete}
    />
  );
}
