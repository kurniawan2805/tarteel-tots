import { useState, useEffect } from 'react';
import { AudioLoopEngine, playChime } from '../utils/audioEngine';

export default function AudioPlayer({ ayahQueue, qari = 'ar.alafasy', loopsPerAyah = 5, onAyahComplete, onQueueComplete }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentAyahIndex, setCurrentAyahIndex] = useState(0);
  const [currentLoop, setCurrentLoop] = useState(0);
  const [engine] = useState(() => new AudioLoopEngine());

  useEffect(() => {
    if (ayahQueue?.length > 0) {
      engine.setQueue(ayahQueue, loopsPerAyah);
    }
  }, [ayahQueue, loopsPerAyah, engine]);

  useEffect(() => {
    engine.onAyahComplete = (ayah) => {
      playChime('tap');
      onAyahComplete?.(ayah);
    };

    engine.onQueueComplete = () => {
      setIsPlaying(false);
      setIsPaused(false);
      onQueueComplete?.();
    };
  }, [engine, onAyahComplete, onQueueComplete]);

  const handlePlay = async () => {
    if (isPaused) {
      engine.resume();
      setIsPaused(false);
      setIsPlaying(true);
    } else {
      await engine.playCurrent();
      setIsPlaying(true);
    }
  };

  const handlePause = () => {
    engine.pause();
    setIsPaused(true);
    setIsPlaying(false);
  };

  const handleStop = () => {
    engine.stop();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentAyahIndex(0);
    setCurrentLoop(0);
  };

  const handleNext = () => {
    engine.skipToNext();
    setCurrentAyahIndex(prev => prev + 1);
    setCurrentLoop(0);
  };

  return {
    isPlaying,
    isPaused,
    currentAyahIndex,
    currentLoop,
    play: handlePlay,
    pause: handlePause,
    stop: handleStop,
    next: handleNext
  };
}
