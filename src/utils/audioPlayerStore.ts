// audioPlayerStore.ts — مخزن إدارة المشغل الصوتي العام والعائم
// يدعم الاستماع المستمر أثناء التنقل بين المسائل والكتب، مع مزامنة لحظية عبر useSyncExternalStore.

export interface ActiveAudioTrack {
  url: string;
  title: string;
  lessonId: string | number;
  bookName?: string;
  chapterName?: string;
  startTime?: string;
  endTime?: string;
}

export interface AudioPlayerState {
  track: ActiveAudioTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
}

// تحويل "mm:ss" أو ثوانٍ إلى رقم
export function parseAudioSeconds(time: string | undefined): number {
  if (!time) return 0;
  const timeStr = time.toString().trim();
  if (!timeStr) return 0;
  if (timeStr.includes(':')) {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  const total = parseInt(timeStr, 10);
  return Number.isFinite(total) && total >= 0 ? Math.floor(total) : 0;
}

// تنسيق الثواني إلى عرض رقمي (2080 -> 34:40)
export function formatAudioTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m).padStart(2, '0');
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}

let state: AudioPlayerState = {
  track: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  playbackRate: 1,
};

const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

// عنصر الصوت العام
let audioElement: HTMLAudioElement | null = null;

function getAudioElement(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (!audioElement) {
    audioElement = new Audio();
    audioElement.preload = 'metadata';

    audioElement.addEventListener('play', () => {
      state = { ...state, isPlaying: true };
      notify();
    });

    audioElement.addEventListener('pause', () => {
      state = { ...state, isPlaying: false };
      notify();
    });

    audioElement.addEventListener('timeupdate', () => {
      if (!audioElement) return;
      const cur = audioElement.currentTime;
      const endSec = state.track?.endTime ? parseAudioSeconds(state.track.endTime) : 0;
      const startSec = state.track?.startTime ? parseAudioSeconds(state.track.startTime) : 0;

      // توقف عند نهاية المسألة إن كانت محددة
      if (endSec > startSec && cur >= endSec) {
        audioElement.pause();
        return;
      }
      state = { ...state, currentTime: cur };
      notify();
    });

    audioElement.addEventListener('loadedmetadata', () => {
      if (!audioElement) return;
      const d = audioElement.duration || 0;
      state = { ...state, duration: d };
      // إذا كان وقت البداية المطلوب يتجاوز مدة المقطع الفعلي، نرجع إلى البداية
      if (state.currentTime > d) {
        audioElement.currentTime = 0;
        state = { ...state, currentTime: 0 };
      }
      notify();
    });

    audioElement.addEventListener('ended', () => {
      state = { ...state, isPlaying: false, currentTime: 0 };
      notify();
    });
  }
  return audioElement;
}

export const audioPlayerStore = {
  getState(): AudioPlayerState {
    return state;
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  play(track: ActiveAudioTrack, rate = 1): void {
    const el = getAudioElement();
    if (!el) return;

    const startSec = parseAudioSeconds(track.startTime);
    const sameTrack = state.track?.url === track.url;

    state = {
      ...state,
      track,
      playbackRate: rate,
      isPlaying: true,
      currentTime: sameTrack ? el.currentTime : startSec,
    };
    notify();

    if (!sameTrack) {
      el.src = track.url;
      el.playbackRate = rate;
      if (startSec > 0) {
        el.currentTime = startSec;
      }
    } else {
      el.playbackRate = rate;
    }

    const playPromise = el.play();
    if (playPromise !== undefined && typeof playPromise.catch === 'function') {
      playPromise.catch((err) => {
        console.warn('[audioPlayerStore] تعذر التشغيل التلقائي:', err);
        state = { ...state, isPlaying: false };
        notify();
      });
    }
  },

  pause(): void {
    const el = getAudioElement();
    if (el) {
      el.pause();
    }
    state = { ...state, isPlaying: false };
    notify();
  },

  toggle(): void {
    if (state.isPlaying) {
      this.pause();
    } else if (state.track) {
      const el = getAudioElement();
      if (el) {
        const p = el.play();
        if (p !== undefined && typeof p.catch === 'function') {
          p.catch(() => {});
        }
      }
      state = { ...state, isPlaying: true };
      notify();
    }
  },

  seek(seconds: number): void {
    const el = getAudioElement();
    if (el) {
      el.currentTime = Math.max(0, seconds);
      state = { ...state, currentTime: el.currentTime };
      notify();
    }
  },

  setRate(rate: number): void {
    const el = getAudioElement();
    if (el) {
      el.playbackRate = rate;
    }
    state = { ...state, playbackRate: rate };
    notify();
  },

  stop(): void {
    const el = getAudioElement();
    if (el) {
      el.pause();
      el.currentTime = 0;
      if (el.src && el.src.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(el.src);
        } catch {
          // ignore
        }
      }
      el.removeAttribute('src');
      el.load();
    }
    state = {
      track: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      playbackRate: 1,
    };
    notify();
  },
};
