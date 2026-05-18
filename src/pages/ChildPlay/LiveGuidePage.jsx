import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/dexie';
import LiveGuideMode from '../../components/LiveGuide/LiveGuideMode';
import { useSync } from '../../hooks/useSync';
import { useSpacedRepetition } from '../../hooks/useSpacedRepetition';
import { getSurahChunks } from '../../utils/spacedRepetition';
import { quranMetaData } from '../../data/quranMeta';

export default function LiveGuidePage() {
  const { childId } = useParams();
  const navigate = useNavigate();
  const { saveSession } = useSync();
  const { gradeChunk } = useSpacedRepetition(parseInt(childId));

  const child = useLiveQuery(() => db.children.get(parseInt(childId)), [childId]);

  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [currentChunk, setCurrentChunk] = useState(null);

  useEffect(() => {
    if (child && !sessionStarted && !currentChunk) {
      const baseline = child.memorization_baseline || { current_surah: 1, current_ayah: 1 };
      const surahId = baseline.current_surah;
      const surahMeta = quranMetaData[surahId];
      if (surahMeta) {
        const chunks = getSurahChunks(surahId, surahMeta.verses);
        const chunk = chunks.find(c => baseline.current_ayah >= c.start && baseline.current_ayah <= c.end) || chunks[0];
        
        setCurrentChunk({
          surah: surahId,
          surah_name: surahMeta.transliteration,
          ...chunk
        });
      }
    }
  }, [child, sessionStarted, currentChunk]);

  const handleGrade = async (grade) => {
    if (!currentChunk) return;
    
    await gradeChunk(currentChunk.surah, currentChunk.id, grade);

    // Advance baseline if it was the current baseline
    if (child.memorization_baseline?.current_surah === currentChunk.surah) {
      const surahMeta = quranMetaData[currentChunk.surah];
      let nextA = currentChunk.end + 1;
      let nextS = currentChunk.surah;
      
      if (nextA > surahMeta.verses) {
        nextA = 1;
        nextS = (nextS % 114) + 1;
      }
      
      await db.children.update(child.id, {
        'memorization_baseline.current_surah': nextS,
        'memorization_baseline.current_ayah': nextA
      });
    }
  };

  const handleNextChunk = () => {
    if (!currentChunk) return;
    
    const surahMeta = quranMetaData[currentChunk.surah];
    const chunks = getSurahChunks(currentChunk.surah, surahMeta.verses);
    const currentIndex = chunks.findIndex(c => c.id === currentChunk.id);
    
    if (currentIndex < chunks.length - 1) {
      setCurrentChunk({
        ...currentChunk,
        ...chunks[currentIndex + 1]
      });
    } else {
      const nextS = (currentChunk.surah % 114) + 1;
      const nextSurahMeta = quranMetaData[nextS];
      const nextChunks = getSurahChunks(nextS, nextSurahMeta.verses);
      setCurrentChunk({
        surah: nextS,
        surah_name: nextSurahMeta.transliteration,
        ...nextChunks[0]
      });
    }
  };

  const finalizeSession = async () => {
    const endTime = Date.now();
    const duration = Math.round((endTime - sessionStartTime) / 1000);

    await saveSession({
      child_id: parseInt(childId),
      family_id: child.family_id,
      date: new Date().toISOString().split('T')[0],
      duration,
      mode: 'live_guide',
      type: 'mixed',
      screen_time: 0,
      audio_only_time: duration,
      ayahs_reviewed: 0,
      ayahs_new: 0
    });

    navigate('/dashboard');
  };

  if (!child) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <p className="text-text-muted">Loading...</p>
      </div>
    );
  }

  if (!sessionStarted) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6">
        <div className="card text-center max-w-md w-full">
          <span className="text-6xl mb-4 block">👤</span>
          <h1 className="text-2xl font-bold text-text mb-2">Live Guide Mode</h1>
          <p className="text-text-muted mb-6">
            Face the screen towards you. Recite to {child.name} face-to-face, then tap to log their progress.
          </p>
          <div className="bg-review bg-opacity-10 p-4 rounded-lg mb-6">
            <p className="text-sm text-review-dark font-semibold">Zero screen time for your child!</p>
            <p className="text-xs text-text-muted mt-1">All interaction happens through you.</p>
          </div>
          <button
            onClick={() => {
              setSessionStarted(true);
              setSessionStartTime(Date.now());
            }}
            className="btn-secondary w-full"
          >
            Start Session
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-3 text-text-muted text-sm mt-2"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <LiveGuideMode
      child={child}
      chunk={currentChunk}
      onGrade={handleGrade}
      onComplete={handleNextChunk}
      onSessionComplete={finalizeSession}
    />
  );
}
