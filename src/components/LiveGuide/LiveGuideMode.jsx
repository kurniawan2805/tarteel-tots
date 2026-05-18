import { useState } from 'react';
import { QuickGrade } from '../GradingPanel/GradingPanel';
import { playChime } from '../../utils/audioEngine';

export default function LiveGuideMode({ child, chunk, onComplete, onGrade, onSessionComplete }) {
  const [repetitionCount, setRepetitionCount] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);

  const handleIncrement = () => {
    setRepetitionCount(prev => prev + 1);
    playChime('tap');
  };

  const handleGrade = (grade) => {
    onGrade?.(grade);
    setSessionComplete(true);
    playChime('complete');
  };

  if (sessionComplete) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6">
        <div className="card text-center max-w-md w-full">
          <span className="text-6xl mb-4 block">✨</span>
          <h2 className="text-2xl font-bold text-text mb-2">Session Complete!</h2>
          <p className="text-text-muted mb-4">
            {child.name} completed {repetitionCount} repetitions
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                setSessionComplete(false);
                setRepetitionCount(0);
                onComplete?.();
              }}
              className="btn-primary w-full"
            >
              Next Chunk
            </button>
            <button
              onClick={onSessionComplete}
              className="btn-secondary w-full"
            >
              Finish Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <div className="bg-review text-white p-4 text-center">
        <p className="text-sm opacity-80">Live Guide Mode</p>
        <p className="font-bold">{child.name}'s Session</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="card w-full max-w-lg text-center mb-8">
          <h2 className="text-2xl font-bold text-text mb-1">
            {chunk?.surah_name || `Surah ${chunk?.surah}`}
          </h2>
          <p className="text-sm text-text-muted mb-4">
            Ayah {chunk?.start}{chunk?.start !== chunk?.end ? ` – ${chunk?.end}` : ''}
          </p>
          
          <div className="bg-bg-dark rounded-2xl p-6 border-2 border-dashed border-white">
            <p className="text-text-muted italic text-sm">
              Recite these ayahs face-to-face with your child.
              Tap the button below for every repetition they complete.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 mb-8">
          <button
            onClick={handleIncrement}
            className="w-32 h-32 rounded-full bg-primary text-white text-6xl font-bold shadow-lg active:scale-95 transition-transform flex items-center justify-center"
          >
            +
          </button>
          <div className="text-center">
            <p className="text-5xl font-bold text-text">{repetitionCount}</p>
            <p className="text-text-muted">repetitions</p>
          </div>
        </div>

        <div className="w-full max-w-md">
          <p className="text-center text-sm font-semibold text-text mb-3">Grade this section:</p>
          <QuickGrade onGrade={handleGrade} size="lg" />
        </div>
      </div>
    </div>
  );
}
