import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/dexie';
import LiveGuideMode from '../../components/LiveGuide/LiveGuideMode';
import { useSync } from '../../contexts/SyncContext';

export default function LiveGuidePage() {
  const { childId } = useParams();
  const navigate = useNavigate();
  const { saveProgress, saveSession } = useSync();

  const child = useLiveQuery(() => db.children.get(parseInt(childId)), [childId]);

  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [currentAyah, setCurrentAyah] = useState(null);
  const [ayahsCompleted, setAyahsCompleted] = useState([]);

  useEffect(() => {
    if (child && !sessionStarted) {
      const baseline = child.memorization_baseline || {};
      setCurrentAyah({
        surah: baseline.current_surah || 1,
        ayah_number: baseline.current_ayah || 1,
        surah_name: `Surah ${baseline.current_surah || 1}`
      });
    }
  }, [child, sessionStarted]);

  const handleGrade = async (gradeData) => {
    await saveProgress({
      child_id: parseInt(childId),
      ...gradeData
    });

    setAyahsCompleted([...ayahsCompleted, gradeData]);
  };

  const handleNextAyah = () => {
    if (currentAyah) {
      setCurrentAyah({
        ...currentAyah,
        ayah_number: currentAyah.ayah_number + 1
      });
    }
  };

  const handleSessionComplete = async () => {
    const endTime = Date.now();
    const duration = Math.round((endTime - sessionStartTime) / 1000);

    await saveSession({
      child_id: parseInt(childId),
      date: new Date().toISOString().split('T')[0],
      duration,
      mode: 'live_guide',
      screen_time: 0,
      audio_only_time: duration
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
      ayah={currentAyah}
      onGrade={handleGrade}
      onComplete={handleNextAyah}
    />
  );
}
