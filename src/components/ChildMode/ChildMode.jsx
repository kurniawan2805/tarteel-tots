import { useState, useEffect, useMemo } from 'react';
import { AudioLoopEngine, playChime, playWordAudio } from '../../utils/audioEngine';
import { useScreenTime } from '../../hooks/useScreenTime';

export default function ChildMode({ 
  ayahQueue, 
  loopsPerAyah = 5, 
  screenTimeLimit = 15,
  onSessionComplete 
}) {
  const [currentAyahIndex, setCurrentAyahIndex] = useState(0);
  const [loopProgress] = useState(0);
  const [tapCount, setTapCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const engine = useMemo(() => new AudioLoopEngine(), []);
  const { screenTimeFormatted, isDimmed, warningShown, start, stop } = useScreenTime(screenTimeLimit);

  useEffect(() => {
    start();
    return () => stop();
  }, [start, stop]);

  useEffect(() => {
    if (ayahQueue?.length > 0) {
      engine.setQueue(ayahQueue, loopsPerAyah);
    }

    engine.onAyahComplete = () => {
      playChime('success');
      setCurrentAyahIndex(prev => prev + 1);
    };

    engine.onQueueComplete = () => {
      setIsPlaying(false);
      onSessionComplete?.();
    };

    return () => {
      engine.onAyahComplete = null;
      engine.onQueueComplete = null;
      engine.stop();
    };
  }, [ayahQueue, loopsPerAyah, engine, onSessionComplete]);

  const currentAyah = ayahQueue?.[currentAyahIndex];

  const handlePlay = async () => {
    await engine.playCurrent();
    setIsPlaying(true);
  };

  const handlePause = () => {
    engine.pause();
    setIsPlaying(false);
  };

  const handleStop = () => {
    engine.stop();
    setIsPlaying(false);
  };

  const handleExit = () => {
    engine.stop();
    onSessionComplete?.();
  };

  const handleChildTap = () => {
    setTapCount(prev => prev + 1);
    playChime('tap');
  };

  const handleWordClick = (wordIndex) => {
    if (currentAyah) {
      playWordAudio(currentAyah.surah, currentAyah.ayah_number, wordIndex + 1);
    }
  };

  const progressPercentage = ayahQueue?.length > 0
    ? ((currentAyahIndex + loopProgress / loopsPerAyah) / ayahQueue.length) * 100
    : 0;

  if (isDimmed) {
    return (
      <div className="min-h-screen bg-night-sky flex flex-col items-center justify-center p-6 transition-all duration-1000">
        <div className="text-center">
          <span className="text-8xl mb-6 block opacity-50">😴</span>
          <p className="text-white text-xl mb-2 opacity-70">Radio Mode</p>
          <p className="text-white text-sm opacity-50 mb-8">
            Time to rest your eyes! Just listen...
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={isPlaying ? handlePause : handlePlay}
              className="w-20 h-20 rounded-full bg-white bg-opacity-10 text-white text-3xl flex items-center justify-center"
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
          </div>
          <p className="text-white text-xs opacity-30 mt-8">{screenTimeFormatted}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col relative overflow-hidden">
      {warningShown && (
        <div className="absolute top-0 left-0 right-0 bg-warning bg-opacity-20 p-2 text-center text-sm text-text">
          ⏰ Almost time for Radio Mode!
        </div>
      )}

      <button
        onClick={handleExit}
        className="absolute top-4 left-4 z-20 w-12 h-12 rounded-full bg-white bg-opacity-80 text-text-muted shadow-sm flex items-center justify-center text-xl hover:text-danger transition-colors"
      >
        ✕
      </button>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="mb-8 text-center">
          {currentAyah?.text ? (
            <div className="arabic-text text-5xl text-text flex flex-wrap justify-center gap-x-4 gap-y-2 mb-2" dir="rtl">
              {currentAyah.text.split(' ').map((word, index) => (
                <span 
                  key={index}
                  onClick={() => handleWordClick(index)}
                  className="cursor-pointer hover:text-primary transition-colors active:scale-110 transform"
                >
                  {word}
                </span>
              ))}
              <span className="ayah-number">
                ۝{currentAyah.ayah_number}
              </span>
            </div>
          ) : (
            <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-primary bg-opacity-20 animate-pulse-gentle flex items-center justify-center">
              <span className="text-6xl">🎵</span>
            </div>
          )}
          <p className="text-text-muted text-sm">
            {currentAyah?.surah_name || `Surah ${currentAyah?.surah}`} : Ayah {currentAyah?.ayah_number}
          </p>
        </div>

        <div className="relative mb-8">
          <svg className="w-48 h-48" viewBox="0 0 120 120">
            <circle
              cx="60" cy="60" r="54"
              fill="none"
              stroke="#E5E7EB"
              strokeWidth="8"
            />
            <circle
              cx="60" cy="60" r="54"
              fill="none"
              stroke="#48C78E"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${progressPercentage * 3.39} 339`}
              transform="rotate(-90 60 60)"
              className="transition-all duration-300"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-text">{tapCount}</span>
            <span className="text-xs text-text-muted">taps</span>
          </div>
        </div>

        <button
          onClick={handleChildTap}
          className="w-full max-w-xs h-20 rounded-2xl bg-gold text-text font-bold text-xl shadow-lg active:scale-95 transition-transform mb-6"
        >
          I said it! 👆
        </button>

        <div className="flex gap-4">
          <button
            onClick={isPlaying ? handlePause : handlePlay}
            className="w-20 h-20 rounded-full bg-primary text-white text-3xl shadow-lg active:scale-95 transition-transform flex items-center justify-center"
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button
            onClick={handleStop}
            className="w-20 h-20 rounded-full bg-bg-dark text-text-muted text-2xl shadow-lg active:scale-95 transition-transform flex items-center justify-center"
          >
            ⏹
          </button>
          <button
            onClick={() => {
              engine.skipToNext();
              setCurrentAyahIndex(prev => prev + 1);
            }}
            className="w-20 h-20 rounded-full bg-review text-white text-2xl shadow-lg active:scale-95 transition-transform flex items-center justify-center"
          >
            ⏭
          </button>
        </div>
      </div>

      <div className="p-4 text-center">
        <p className="text-xs text-text-muted">{screenTimeFormatted}</p>
      </div>
    </div>
  );
}
