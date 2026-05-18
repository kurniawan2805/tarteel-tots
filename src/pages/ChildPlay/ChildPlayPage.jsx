import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/dexie';
import { quranMetaData } from '../../data/quranMeta';
import ChildMode from '../../components/ChildMode/ChildMode';
import { useSync } from '../../hooks/useSync';
import { useSpacedRepetition } from '../../hooks/useSpacedRepetition';
import { fetchAyahText } from '../../utils/quranApi';
import { getSurahChunks, CFR_GRADES } from '../../utils/spacedRepetition';

export default function ChildPlayPage() {
  const { childId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { saveSession } = useSync();
  const { gradeChunk } = useSpacedRepetition(parseInt(childId));

  const mode = searchParams.get('mode') || 'interactive';
  const targetSurah = searchParams.get('surah');
  const targetChunkId = searchParams.get('chunk');

  const child = useLiveQuery(() => db.children.get(parseInt(childId)), [childId]);
  const lastSession = useLiveQuery(
    () => db.sessions.where('child_id').equals(parseInt(childId)).reverse().first(),
    [childId]
  );
  const settings = useLiveQuery(async () => {
    const items = await db.settings.toArray();
    return Object.fromEntries(items.map(s => [s.key, s.value]));
  }, []);

  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [ayahQueue, setAyahQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  // Generate Queue
  useEffect(() => {
    async function prepareQueue() {
      if (!child || !settings) return;
      setLoading(true);

      const qari = settings.default_qari || 'ar.alafasy';
      let queue = [];

      if (targetSurah) {
        // Mode A: Targeted Surah/Chunk
        const surahId = parseInt(targetSurah);
        const surahMeta = quranMetaData[surahId];
        const chunks = getSurahChunks(surahId, surahMeta.verses);
        const chunk = targetChunkId ? chunks.find(c => c.id === targetChunkId) : chunks[0];

        for (let a = chunk.start; a <= chunk.end; a++) {
          const text = await fetchAyahText(surahId, a);
          queue.push({
            surah: surahId,
            surah_name: surahMeta.transliteration,
            ayah_number: a,
            text,
            qari,
            chunkId: chunk.id,
            isNew: false // We treat targeted as review/intentional
          });
        }
      } else {
        // Mode B: Continuous Progression (Baseline)
        const baseline = child.memorization_baseline || { current_surah: 1, current_ayah: 1 };
        let curS = baseline.current_surah;
        let curA = baseline.current_ayah;

        // Take next 3 ayahs
        for (let i = 0; i < 3; i++) {
          const surahMeta = quranMetaData[curS];
          const text = await fetchAyahText(curS, curA);
          queue.push({
            surah: curS,
            surah_name: surahMeta.transliteration,
            ayah_number: curA,
            text,
            qari,
            isNew: true
          });

          curA++;
          if (curA > surahMeta.verses) {
            curA = 1;
            curS = (curS % 114) + 1;
          }
        }
      }

      setAyahQueue(queue);
      setLoading(false);
    }

    prepareQueue();
  }, [child, settings, targetSurah, targetChunkId]);

  const handleSessionComplete = async () => {
    const endTime = Date.now();
    const duration = Math.round((endTime - sessionStartTime) / 1000);

    // 1. Save Session
    await saveSession({
      child_id: parseInt(childId),
      date: new Date().toISOString().split('T')[0],
      duration,
      mode,
      type: targetSurah ? 'review' : 'new',
      screen_time: duration,
      audio_only_time: 0,
      ayahs_new: targetSurah ? 0 : ayahQueue.length,
      ayahs_reviewed: targetSurah ? ayahQueue.length : 0
    });

    // 2. Grade & Advance Baseline
    if (targetSurah) {
      // For targeted chunks, we assume "okay" as default completion
      // Proper grading happens in Parent Dashboard later, but we log the attempt
      const surahId = parseInt(targetSurah);
      await gradeChunk(surahId, targetChunkId, CFR_GRADES.OKAY);
    } else {
      // For new ayahs, we advance baseline
      const lastAyah = ayahQueue[ayahQueue.length - 1];
      let nextS = lastAyah.surah;
      let nextA = lastAyah.ayah_number + 1;
      if (nextA > quranMetaData[nextS].verses) {
        nextA = 1;
        nextS = (nextS % 114) + 1;
      }

      await db.children.update(parseInt(childId), {
        'memorization_baseline.current_surah': nextS,
        'memorization_baseline.current_ayah': nextA
      });

      // Also create a "seed" progress record for CFR
      const chunks = getSurahChunks(lastAyah.surah, quranMetaData[lastAyah.surah].verses);
      const chunk = chunks.find(c => lastAyah.ayah_number >= c.start && lastAyah.ayah_number <= c.end);
      await gradeChunk(lastAyah.surah, chunk.id, CFR_GRADES.HAPPY);
    }

    setSessionStarted(false);
    navigate('/dashboard');
  };

  if (!child || !settings || loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-muted font-medium">Preparing Garden...</p>
        </div>
      </div>
    );
  }

  if (!sessionStarted) {
    const preview = {
      title: targetSurah ? quranMetaData[targetSurah].transliteration : 'Continuous Learning',
      subtitle: targetSurah ? `Chunk ${targetChunkId}` : 'Growing your garden',
      ayahs: ayahQueue.length
    };

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
              </>
            ) : (
              <p className="text-xs text-text-muted italic">First session!</p>
            )}
          </div>

          <div className="card p-4 text-left">
            <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Next Up</h3>
            <p className="text-sm font-bold text-text">{preview.title}</p>
            <p className="text-xs text-text-muted">{preview.ayahs} ayahs</p>
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
      loopsPerAyah={settings.default_loops || 5}
      memorizeTarget={settings.memorize_tap_target || 10}
      screenTimeLimit={settings.screen_time_limit}
      onSessionComplete={handleSessionComplete}
    />
  );
}
