import { useState, useEffect, useRef } from 'react';
import { AudioLoopEngine, playChime, playWordAudio } from '../../utils/audioEngine';
import { useScreenTime } from '../../hooks/useScreenTime';

export default function ChildMode({ 
  ayahQueue, 
  loopsPerAyah = 5,
  memorizeTarget = 10,
  screenTimeLimit = 15,
  onSessionComplete 
}) {
  const [phase, setPhase] = useState('listen'); // 'listen' | 'memorize' | 'review'
  const [currentAyahIndex, setCurrentAyahIndex] = useState(0);
  const [loopTarget, setLoopTarget] = useState(loopsPerAyah);
  const [tapCount, setTapCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const engine = useRef(new AudioLoopEngine());
  const { screenTimeFormatted, isDimmed, warningShown, start, stop } = useScreenTime(screenTimeLimit);

  useEffect(() => {
    start();
    return () => stop();
  }, [start, stop]);

  useEffect(() => {
    const currentEngine = engine.current;
    if (ayahQueue?.length > 0) {
      currentEngine.updateQueue(ayahQueue);
      currentEngine.setCurrentIndex(currentAyahIndex);
      currentEngine.setLoops(loopTarget);
      currentEngine.stopAfterAyah = true;
    }

    currentEngine.onAyahComplete = () => {
      playChime('success');
      setIsPlaying(false);
    };

    currentEngine.onQueueComplete = () => {
      setIsPlaying(false);
    };

    return () => {
      currentEngine.onAyahComplete = null;
      currentEngine.onQueueComplete = null;
      currentEngine.stop();
    };
  }, [ayahQueue, loopTarget, currentAyahIndex, onSessionComplete]);

  const currentAyah = ayahQueue?.[currentAyahIndex];

  const handlePlay = async () => {
    await engine.current.playCurrent();
    setIsPlaying(true);
  };

  const handlePause = () => {
    engine.current.pause();
    setIsPlaying(false);
  };

  const handleStop = () => {
    engine.current.stop();
    setIsPlaying(false);
  };

  const handleExit = () => {
    engine.current.stop();
    onSessionComplete?.();
  };

  const handleNextPhase = () => {
    engine.current.stop();
    setIsPlaying(false);
    if (phase === 'listen') {
      setPhase('memorize');
      setTapCount(0);
    } else if (phase === 'memorize') {
      if (currentAyahIndex === 0) {
        // First ayah done, go to next ayah's listen phase
        moveToNextAyah();
      } else {
        setPhase('review');
      }
    } else if (phase === 'review') {
      moveToNextAyah();
    }
  };

  const moveToNextAyah = () => {
    if (currentAyahIndex >= ayahQueue.length - 1) {
      onSessionComplete?.();
    } else {
      setCurrentAyahIndex(prev => prev + 1);
      setPhase('listen');
      setTapCount(0);
    }
  };

  const handleLoopToggle = async () => {
    const targets = [3, 5, 10, 20];
    const currentIndex = targets.indexOf(loopTarget);
    const nextTarget = targets[(currentIndex + 1) % targets.length];
    
    // Stop current play and reset loop count
    engine.current.stop();
    setIsPlaying(false);
    
    // Update target
    setLoopTarget(nextTarget);
    engine.current.setLoops(nextTarget);
    
    // Auto-play with new target
    await engine.current.playCurrent();
    setIsPlaying(true);
  };

  const handleChildTap = () => {
    const newCount = tapCount + 1;
    setTapCount(newCount);
    playChime('tap');
  };

  const handleWordClick = (wordIndex) => {
    if (currentAyah) {
      playWordAudio(currentAyah.surah, currentAyah.ayah_number, wordIndex + 1);
    }
  };

  const handlePlayFullAyah = (ayah) => {
    // Fallback play if engine doesn't expose it or just use a new Audio
    import('../../utils/audioEngine').then(({ getAudioUrl }) => {
      const audioUrl = getAudioUrl(ayah.surah, ayah.ayah_number, ayah.qari);
      const audio = new Audio(audioUrl);
      audio.play();
    });
  };

  const progressPercentage = ayahQueue?.length > 0
    ? (currentAyahIndex / ayahQueue.length) * 100
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

      {/* Progress Bar */}
      <div className="absolute top-0 left-0 h-1.5 bg-primary transition-all duration-500 z-10" style={{ width: `${progressPercentage}%` }} />

      <div className="flex-1 flex flex-col items-center p-6 mt-12 overflow-y-auto pb-12">
        {phase !== 'review' && (
          <div className="mb-8 text-center w-full">
            <h2 className="text-primary font-bold mb-4 uppercase tracking-widest text-sm">
              Phase: {phase === 'listen' ? '👂 Hearing & Reading' : '📖 Memorizing'}
            </h2>
            {currentAyah?.text ? (
              <div className="arabic-text text-5xl text-text flex flex-wrap justify-center gap-x-4 gap-y-4 mb-2 leading-relaxed" dir="rtl">
                {currentAyah.text.split(' ').map((word, index) => (
                  <span 
                    key={index}
                    onClick={() => handleWordClick(index)}
                    className="cursor-pointer hover:text-primary transition-colors active:scale-110 transform"
                  >
                    {word}
                  </span>
                ))}
                <span className="ayah-number whitespace-nowrap">
                  ۝{currentAyah.ayah_number}
                </span>
              </div>
            ) : (
              <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-primary bg-opacity-20 animate-pulse-gentle flex items-center justify-center">
                <span className="text-6xl">🎵</span>
              </div>
            )}
            <p className="text-text-muted text-sm mt-4">
              {currentAyah?.surah_name || `Surah ${currentAyah?.surah}`} : Ayah {currentAyah?.ayah_number}
            </p>
          </div>
        )}

        {phase === 'listen' && (
          <div className="flex flex-col items-center gap-8 w-full">
            <div className="flex items-center gap-6">
              <button
                onClick={handleLoopToggle}
                className="px-6 py-3 rounded-xl bg-white border-2 border-primary text-primary font-bold shadow-sm active:scale-95 transition-transform"
              >
                🔁 {loopTarget}x
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
              </div>
            </div>

            <button
              onClick={handleNextPhase}
              className="w-full max-w-xs py-4 rounded-2xl bg-secondary text-white font-bold text-xl shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              Next: Memorize ➔
            </button>
          </div>
        )}

        {phase === 'memorize' && (
          <div className="flex flex-col items-center gap-8 w-full">
            <div className="relative">
              <button
                onClick={handleChildTap}
                className="w-48 h-48 rounded-full bg-gold text-text shadow-xl active:scale-90 transition-all flex flex-col items-center justify-center border-8 border-white"
              >
                <span className="text-5xl font-bold">{tapCount}</span>
                <span className="text-lg opacity-60">/ {memorizeTarget}</span>
                <span className="text-sm font-bold mt-2 uppercase tracking-tighter">I said it!</span>
              </button>
              {tapCount >= memorizeTarget && (
                <div className="absolute -top-2 -right-2 bg-success text-white w-10 h-10 rounded-full flex items-center justify-center text-xl animate-bounce">
                  ✓
                </div>
              )}
            </div>

            <button
              onClick={handleNextPhase}
              disabled={tapCount < memorizeTarget}
              className={`w-full max-w-xs py-4 rounded-2xl font-bold text-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${
                tapCount >= memorizeTarget ? 'bg-primary text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {currentAyahIndex === 0 ? 'Next Ayah ➔' : 'Review Progress ➔'}
            </button>
            
            <button 
              onClick={() => handlePlayFullAyah(currentAyah)}
              className="text-primary font-semibold text-sm underline opacity-60"
            >
              I forgot... play again
            </button>
          </div>
        )}

        {phase === 'review' && (
          <div className="w-full max-w-lg flex flex-col">
            <h2 className="text-2xl font-bold text-text mb-6 text-center">🌟 Session Progress</h2>
            <div className="space-y-6 px-2">
              {ayahQueue.slice(Math.max(0, currentAyahIndex - 4), currentAyahIndex + 1).map((ayah, i) => (
                <div key={i} className={`p-4 rounded-2xl bg-white shadow-sm border-l-4 ${ayah === currentAyah ? 'border-primary' : 'border-gold opacity-70'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-text-muted">
                      {ayah.surah_name} : {ayah.ayah_number}
                    </span>
                    <button 
                      onClick={() => handlePlayFullAyah(ayah)}
                      className="w-8 h-8 rounded-full bg-primary bg-opacity-10 text-primary flex items-center justify-center"
                    >
                      ▶
                    </button>
                  </div>
                  <div className="arabic-text text-2xl text-text text-right leading-relaxed" dir="rtl">
                    {ayah.text.split(' ').map((word, idx) => (
                      <span 
                        key={idx}
                        onClick={() => playWordAudio(ayah.surah, ayah.ayah_number, idx + 1)}
                        className="cursor-pointer hover:text-primary transition-colors"
                      >
                        {word}{' '}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <button
              onClick={handleNextPhase}
              className="w-full mt-6 py-4 rounded-2xl bg-primary text-white font-bold text-xl shadow-lg active:scale-95 transition-transform"
            >
              Section Complete! Next ➔
            </button>
          </div>
        )}
      </div>

      <div className="p-4 text-center">
        <p className="text-xs text-text-muted">{screenTimeFormatted}</p>
      </div>
    </div>
  );
}
