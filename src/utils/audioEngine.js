import { getOrFetchAudioBlob } from './audioCache';

const QARI_BASE_URL = 'https://cdn.islamic.network/quran/audio/128';
const WORDS_AUDIO_URL = 'https://audios.quranwbw.com/words';

let audioContext = null;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

export function getAudioUrl(surah, ayah, qari = 'ar.alafasy') {
  const globalAyah = getGlobalAyahNumber(surah, ayah);
  return `${QARI_BASE_URL}/${qari}/${globalAyah}.mp3`;
}

export function getWordAudioUrl(surah, ayah, wordNumber) {
  const s = String(surah).padStart(3, '0');
  const v = String(ayah).padStart(3, '0');
  const w = String(wordNumber).padStart(3, '0');
  return `${WORDS_AUDIO_URL}/${surah}/${s}_${v}_${w}.mp3`;
}

export function playWordAudio(surah, ayah, wordNumber) {
  const url = getWordAudioUrl(surah, ayah, wordNumber);
  const audio = new Audio(url);
  audio.play().catch(e => console.error('Word audio playback failed:', e));
}

export function getGlobalAyahNumber(surah, ayah) {
  const surahAyahCounts = [
    7, 286, 200, 176, 120, 165, 206, 75, 129, 109,
    123, 111, 43, 52, 99, 128, 111, 110, 98, 135,
    112, 78, 118, 64, 77, 227, 93, 88, 69, 60,
    34, 30, 73, 54, 45, 83, 182, 88, 75, 85,
    54, 53, 89, 59, 37, 35, 38, 29, 18, 45,
    60, 49, 62, 55, 78, 96, 29, 22, 24, 13,
    14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28,
    28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19,
    36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8,
    8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6
  ];

  let globalAyah = 0;
  for (let i = 0; i < surah - 1; i++) {
    globalAyah += surahAyahCounts[i];
  }
  return globalAyah + ayah;
}

export function playChime(type = 'success') {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    if (type === 'success') {
      oscillator.frequency.setValueAtTime(523.25, ctx.currentTime);
      oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);
    } else if (type === 'tap') {
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    } else if (type === 'complete') {
      oscillator.frequency.setValueAtTime(523.25, ctx.currentTime);
      oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15);
      oscillator.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3);
      oscillator.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.45);
    } else if (type === 'wind_down') {
      oscillator.frequency.setValueAtTime(440, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 2);
    }

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.warn('Audio chime failed:', e);
  }
}

export class AudioLoopEngine {
  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.currentQueue = [];
    this.currentIndex = 0;
    this.loopCount = 0;
    this.maxLoops = 5;
    this.onAyahComplete = null;
    this.onQueueComplete = null;
    this.isPlaying = false;
    this.isPaused = false;
    this.isAyahEnding = false;
    this.isPlayingCurrent = false;
    this.retryTimeout = null;
    this.stopAfterAyah = false;
    this.currentObjectURL = null;

    // Bind handlers for consistent `this`
    this.audio.onended = () => this.onAyahEnded();
    this.audio.onerror = () => {
      this.isPlayingCurrent = false;
      this.debounceRetry();
    };
  }

  setQueue(queue, loopsPerAyah = 5) {
    this.currentQueue = queue;
    this.maxLoops = loopsPerAyah;
    this.currentIndex = 0;
    this.loopCount = 0;
  }

  updateQueue(queue) {
    this.currentQueue = queue;
  }

  setLoops(count) {
    this.maxLoops = count;
  }

  setCurrentIndex(index) {
    if (this.currentIndex !== index) {
      this.currentIndex = index;
      this.loopCount = 0;
    }
  }

  async playCurrent() {
    if (this.isPlayingCurrent || this.isPaused) {
      return;
    }
    this.isPlayingCurrent = true;

    if (this.currentIndex >= this.currentQueue.length) {
      this.stop();
      this.onQueueComplete?.();
      this.isPlayingCurrent = false;
      return;
    }

    const ayah = this.currentQueue[this.currentIndex];
    
    try {
      // 1. Get Blob (Fast if cached)
      const blob = await getOrFetchAudioBlob(ayah.surah, ayah.ayah_number, ayah.qari);
      
      // 2. Cleanup previous ObjectURL
      if (this.currentObjectURL) {
        URL.revokeObjectURL(this.currentObjectURL);
      }

      // 3. Create fresh URL
      this.currentObjectURL = URL.createObjectURL(blob);
      this.audio.src = this.currentObjectURL;
      
      await this.audio.play();
      this.isPlaying = true;
      this.isPaused = false;
      this.isPlayingCurrent = false;
    } catch (err) {
      console.warn('Cached playback failed, falling back to network:', err);
      const url = getAudioUrl(ayah.surah, ayah.ayah_number, ayah.qari);
      this.audio.src = url;
      
      try {
        await this.audio.play();
        this.isPlaying = true;
        this.isPaused = false;
        this.isPlayingCurrent = false;
      } catch (e) {
        console.error('Network playback fallback failed:', e);
        this.isPlayingCurrent = false;
        this.debounceRetry();
      }
    }
  }

  debounceRetry() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
    this.retryTimeout = setTimeout(() => {
      this.retryTimeout = null;
      if (!this.isPaused && !this.isAyahEnding) {
        this.playCurrent();
      }
    }, 500);
  }

  onAyahEnded() {
    if (this.isAyahEnding) return;
    this.isAyahEnding = true;

    this.loopCount++;
    if (this.loopCount >= this.maxLoops) {
      this.loopCount = 0;
      this.currentIndex++;
      this.onAyahComplete?.(this.currentQueue[this.currentIndex - 1]);
      
      if (this.stopAfterAyah) {
        this.stop();
        this.isAyahEnding = false;
        return;
      }
    }

    if (this.currentIndex >= this.currentQueue.length) {
      this.stop();
      this.isPlaying = false;
      this.onQueueComplete?.();
    } else {
      this.isPlayingCurrent = false;
      setTimeout(() => {
        this.playCurrent();
      }, 50);
    }

    this.isAyahEnding = false;
  }

  pause() {
    this.audio.pause();
    this.isPaused = true;
  }

  resume() {
    this.audio.play();
    this.isPaused = false;
  }

  stop() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    this.audio.pause();
    if (this.currentObjectURL) {
      URL.revokeObjectURL(this.currentObjectURL);
      this.currentObjectURL = null;
    }
    try { 
      this.audio.currentTime = 0; 
    } catch (err) {
      console.warn('Could not reset audio current time:', err);
    }
    this.isPlaying = false;
    this.isPaused = false;
    this.loopCount = 0;
    this.isPlayingCurrent = false;
    this.isAyahEnding = false;
  }

  skipToNext() {
    this.loopCount = 0;
    this.currentIndex++;
    if (this.currentIndex < this.currentQueue.length) {
      this.isPlayingCurrent = false;
      this.playCurrent();
    } else {
      this.stop();
      this.onQueueComplete?.();
    }
  }
}

export async function cacheAudio(surah, ayah, qari = 'ar.alafasy') {
  try {
    const blob = await getOrFetchAudioBlob(surah, ayah, qari);
    return { blob, success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
