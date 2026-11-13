// كارد الفيديو — لا يحمّل المشغّل قبل طلب المستخدم لتقليل استهلاك البيانات، مع حراسة وقت صارمة (Strict Time Guard).
import { useState, useRef, useEffect } from 'react';
import {
  FiHeadphones,
  FiPlay,
  FiExternalLink,
  FiClock,
  FiCheckCircle,
  FiRotateCcw,
} from 'react-icons/fi';

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
            onReady?: (event: { target: YTPlayerInstance }) => void;
            onStateChange?: (event: { data: number; target: YTPlayerInstance }) => void;
            onError?: (event: unknown) => void;
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

export interface VideoCardProps {
  videoUrl?: string;
  startTime?: string;
  endTime?: string;
  videoTimestamp?: string;
  title?: string;
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

const VideoCard = ({ videoUrl, startTime, endTime, videoTimestamp, title }: VideoCardProps) => {
  const [autoPlay, setAutoPlay] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);

  const videoId = extractVideoId(videoUrl);
  const effectiveStart = startTime || videoTimestamp;
  const startSeconds = parseTime(effectiveStart);
  const endSeconds = parseTime(endTime);

  const startLabel = (effectiveStart || '').trim();
  const endLabel = (endTime || '').trim();
  const hasStart = startLabel !== '' && startSeconds > 0;
  const hasEnd = endLabel !== '' && endSeconds > startSeconds;

  const playerId = `yt-player-${videoId || 'unknown'}`;

  // 1. حراسة الوقت الصارمة (Strict Time Guard)
  useEffect(() => {
    if (!autoPlay || !videoId) return;

    let isMounted = true;
    let guardTimer: ReturnType<typeof setInterval> | null = null;

    const clearGuard = () => {
      if (guardTimer) {
        clearInterval(guardTimer);
        guardTimer = null;
      }
    };

    const checkBoundaries = (p: YTPlayerInstance) => {
      try {
        if (typeof p.getCurrentTime !== 'function') return;
        const cur = p.getCurrentTime();
        if (typeof cur !== 'number' || Number.isNaN(cur)) return;

        // 1. عند وقت النهاية بالضبط أو تجاوزه: إيقاف فوري وتثبيت المؤشر عند النهاية
        if (hasEnd && cur >= endSeconds) {
          if (typeof p.pauseVideo === 'function') p.pauseVideo();
          if (typeof p.seekTo === 'function') p.seekTo(endSeconds, true);
          setIsEnded(true);
          return;
        }

        // 2. إذا سحب المستمع بيده لما قبل البداية: إرجاعه فوراً إلى وقت البداية
        if (hasStart && cur < startSeconds - 0.5) {
          if (typeof p.seekTo === 'function') p.seekTo(startSeconds, true);
          return;
        }

        if (hasEnd && cur < endSeconds) {
          setIsEnded(false);
        }
      } catch {
        // حماية عند انفصال الاتصال بالمشغّل
      }
    };

    const startGuard = (p: YTPlayerInstance) => {
      clearGuard();
      // مراقب لحظي يعمل كل 100 مللي ثانية باستمرار
      guardTimer = setInterval(() => {
        checkBoundaries(p);
      }, 100);
    };

    // مستمع رسائل postMessage المباشر من يوتيوب كحارس إضافي لحظي فائق السرعة
    const handleMessage = (e: MessageEvent) => {
      if (!isMounted || !playerRef.current) return;
      if (typeof e.data !== 'string') return;
      try {
        const parsed = JSON.parse(e.data);
        if (parsed.event === 'infoDelivery' && parsed.info) {
          if (typeof parsed.info.currentTime === 'number') {
            const cur = parsed.info.currentTime;
            if (hasEnd && cur >= endSeconds) {
              playerRef.current.pauseVideo();
              playerRef.current.seekTo(endSeconds, true);
              setIsEnded(true);
            } else if (hasStart && cur < startSeconds - 0.5) {
              playerRef.current.seekTo(startSeconds, true);
            }
          }
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener('message', handleMessage);

    void loadYouTubeApi().then(() => {
      if (!isMounted) return;
      const targetEl = document.getElementById(playerId);
      if (!targetEl || !window.YT || !window.YT.Player) return;

      try {
        const player = new window.YT.Player(targetEl, {
          videoId,
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 1,
            enablejsapi: 1,
            start: startSeconds,
            end: hasEnd ? endSeconds : undefined,
            rel: 0,
            modestbranding: 1,
            origin: typeof window !== 'undefined' ? window.location.origin : undefined,
          },
          events: {
            onReady: (event: any) => {
              if (!isMounted) return;
              setIframeLoaded(true);
              const p = event?.target || player;
              playerRef.current = p;
              checkBoundaries(p);
              startGuard(p);
            },
            onStateChange: (event: any) => {
              if (!isMounted) return;
              const p = event?.target || player;
              checkBoundaries(p);
              // 1 = PLAYING
              if (event?.data === 1) {
                startGuard(p);
              } else {
                checkBoundaries(p);
              }
            },
          },
        });
        playerRef.current = player;
      } catch (err) {
        console.warn('[VideoCard] تعذر ربط حارس الوقت بمشغل يوتيوب:', err);
      }
    });

    return () => {
      isMounted = false;
      clearGuard();
      window.removeEventListener('message', handleMessage);
      if (playerRef.current) {
        try {
          if (typeof playerRef.current.destroy === 'function') {
            playerRef.current.destroy();
          }
        } catch {
          // ignore
        }
        playerRef.current = null;
      }
    };
  }, [autoPlay, videoId, playerId, hasStart, hasEnd, startSeconds, endSeconds]);

  if (!videoId) return null;

  // رابط المشاهدة المباشرة على YouTube
  const youtubeDirectUrl = `https://youtu.be/${videoId}?t=${startSeconds}`;

  // صورة معاينة الحلقة من YouTube
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  const handlePlay = () => {
    setAutoPlay(true);
    setIframeLoaded(false);
    setIsEnded(false);
    setTimeout(() => {
      if (typeof wrapperRef.current?.scrollIntoView === 'function') {
        wrapperRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const handleReplay = () => {
    setIsEnded(false);
    if (playerRef.current) {
      try {
        if (typeof playerRef.current.seekTo === 'function') {
          playerRef.current.seekTo(startSeconds, true);
        }
        if (typeof playerRef.current.playVideo === 'function') {
          playerRef.current.playVideo();
        }
      } catch {
        // ignore
      }
    }
  };

  return (
    <div
      className="video-card-wrapper custom-card p-3 mb-4 shadow-sm"
      style={{ borderRight: '6px solid var(--primary-color)', borderRadius: '10px' }}
    >
      {/* ✅ زر "اسمع من هنا" */}
      {!autoPlay && startSeconds > 0 && (
        <button
          type="button"
          className="btn w-100 py-2 mb-3 d-flex align-items-center justify-content-center gap-2"
          onClick={handlePlay}
          style={{
            background: 'linear-gradient(135deg, var(--primary-color), #0a7c7a)',
            color: '#fff',
            borderRadius: '10px',
            fontWeight: 'bold',
            border: 'none',
            fontSize: '0.9rem',
          }}
        >
          <FiHeadphones size={18} />
          اسمع شرح هذه المسألة
        </button>
      )}

      {/* ✅ شارة مدة المسألة في الفيديو (بداية ونهاية) */}
      {(hasStart || hasEnd) && (
        <div className="d-flex justify-content-center mb-3">
          <span
            className="d-inline-flex align-items-center gap-2 px-3 py-1 shadow-sm"
            style={{
              backgroundColor: 'var(--badge-bg)',
              color: 'var(--text-main)',
              border: '1px solid var(--border-color)',
              borderRadius: '20px',
              fontSize: '0.82rem',
              fontWeight: 'bold',
            }}
          >
            <FiClock size={15} style={{ color: 'var(--accent-color)' }} />
            {hasStart && hasEnd ? (
              <span>من <bdi>{startLabel}</bdi> إلى <bdi>{endLabel}</bdi></span>
            ) : hasEnd ? (
              <span>ينتهي عند: <bdi>{endLabel}</bdi></span>
            ) : (
              <span>يبدأ عند: <bdi>{startLabel}</bdi></span>
            )}
          </span>
        </div>
      )}

      {/* ✅ Video Player — Thumbnail + Dynamic Player */}
      <div
        ref={wrapperRef}
        className="video-ratio-wrapper"
        style={{ borderRadius: '10px', overflow: 'hidden', position: 'relative', aspectRatio: '16/9', backgroundColor: '#000' }}
      >
        {autoPlay ? (
          <>
            {!iframeLoaded && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#000',
                  zIndex: 1,
                }}
              >
                <div className="spinner-border text-light" style={{ width: '2rem', height: '2rem' }} role="status" />
              </div>
            )}
            <div
              id={playerId}
              title={title ? `فيديو شرح: ${title}` : 'فيديو شرح الدرس'}
              style={{
                width: '100%',
                height: '100%',
                position: 'absolute',
                inset: 0,
                opacity: iframeLoaded ? 1 : 0,
                transition: 'opacity 0.3s ease',
              }}
            />
          </>
        ) : (
          <div
            role="button"
            tabIndex={0}
            aria-label="تشغيل فيديو الشرح"
            style={{ position: 'relative', width: '100%', height: '100%', cursor: 'pointer' }}
            onClick={handlePlay}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handlePlay();
              }
            }}
          >
            <div className="d-flex h-100 flex-column align-items-center justify-content-center gap-2 text-white" style={{ background: '#182321' }}>
              <FiPlay size={28} aria-hidden="true" />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>اضغط لتحميل الفيديو وتشغيله</span>
            </div>
            <img
              src={thumbnailUrl}
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
              onError={(event) => { event.currentTarget.style.display = 'none'; }}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
            {/* Overlay داكن */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.5) 100%)',
              }}
            />
            {/* زر تشغيل وسط */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255,0,0,0.9)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                  transition: 'transform 0.2s',
                }}
              >
                <FiPlay size={28} color="#fff" style={{ marginLeft: '4px' }} />
              </div>
              <span
                style={{
                  color: '#fff',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                  background: 'rgba(0,0,0,0.4)',
                  padding: '4px 12px',
                  borderRadius: '20px',
                }}
              >
                اضغط للتشغيل
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ✅ إشعار انتهاء المسألة مع زر إعادة الاستماع */}
      {isEnded && hasEnd && (
        <div
          className="alert alert-success d-flex align-items-center justify-content-between p-2 mt-2 mb-0 shadow-sm"
          style={{ borderRadius: '8px', fontSize: '0.84rem' }}
        >
          <span className="d-flex align-items-center gap-2">
            <FiCheckCircle size={16} className="text-success flex-shrink-0" />
            <span>انتهى شرح هذه المسألة (عند {endLabel})</span>
          </span>
          <button
            type="button"
            className="btn btn-sm btn-outline-success fw-bold d-flex align-items-center gap-1"
            onClick={handleReplay}
            style={{ borderRadius: '6px', fontSize: '0.78rem' }}
          >
            <FiRotateCcw size={13} />
            <span>إعادة المسألة</span>
          </button>
        </div>
      )}

      {/* ✅ رابط فتح في YouTube مباشرةً */}
      <div className="text-center mt-2">
        <a
          href={youtubeDirectUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="d-inline-flex align-items-center gap-1"
          style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textDecoration: 'none' }}
        >
          <FiExternalLink size={13} />
          <span>فتح في YouTube</span>
        </a>
      </div>
    </div>
  );
};

export default VideoCard;
