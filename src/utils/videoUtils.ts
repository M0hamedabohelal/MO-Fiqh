// videoUtils.ts — دوال مساعدة لمشغل الفيديو وتحليل الوقت وروابط يوتيوب

export interface YTPlayerInstance {
  getCurrentTime: () => number;
  getPlayerState: () => number;
  pauseVideo: () => void;
  playVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  destroy: () => void;
  getIframe: () => HTMLIFrameElement;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement | string,
        options: {
          videoId?: string;
          width?: string | number;
          height?: string | number;
          playerVars?: Record<string, unknown>;
          events?: {
            onReady?: (event?: { target?: YTPlayerInstance }) => void;
            onStateChange?: (event?: { data?: number; target?: YTPlayerInstance }) => void;
            onError?: (event?: unknown) => void;
          };
        }
      ) => YTPlayerInstance;
      PlayerState?: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiPromise: Promise<void> | null = null;

export function loadYouTubeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise<void>((resolve) => {
    const existingTag = document.getElementById('youtube-iframe-api');
    if (!existingTag) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
    }

    const originalCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof originalCallback === 'function') {
        try {
          originalCallback();
        } catch {
          // ignore
        }
      }
      resolve();
    };

    const interval = setInterval(() => {
      if (window.YT && window.YT.Player) {
        clearInterval(interval);
        resolve();
      }
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      resolve();
    }, 8000);
  });

  return ytApiPromise;
}

// Convert time (mm:ss or seconds) to total seconds
export const parseTime = (time: string | undefined): number => {
  if (!time) return 0;
  const timeStr = time.toString().trim();
  if (!timeStr) return 0;
  let total = NaN;
  if (timeStr.includes(':')) {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 2) {
      total = parts[0] * 60 + parts[1]; // mm:ss
    } else if (parts.length === 3) {
      total = parts[0] * 3600 + parts[1] * 60 + parts[2]; // hh:mm:ss
    }
  } else {
    total = parseInt(timeStr, 10);
  }
  return Number.isFinite(total) && total >= 0 ? Math.floor(total) : 0;
};

// Extract the videoId from the YouTube URL
export const extractVideoId = (url: string | undefined): string | null => {
  if (!url) return null;
  const regExp = /(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regExp);
  return match ? match[1] : null;
};
