// AudioCard.tsx — كارد الصوت المطور مع مشغل إسلامي حديث ودعم الاستماع المستمر أوفلاين وسحابياً
import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  FiHeadphones,
  FiDownload,
  FiCheck,
  FiLoader,
  FiTrash2,
  FiPlay,
  FiPause,
} from 'react-icons/fi';
import { saveAudio, loadAudio, removeAudio, cleanupLegacyAudioCache } from '../../utils/audioOffline';
import {
  audioPlayerStore,
  formatAudioTime,
  parseAudioSeconds,
  type AudioPlayerState,
} from '../../utils/audioPlayerStore';

interface AudioCardProps {
  audioUrl?: string;
  title?: string;
  startTime?: string;
  endTime?: string;
  lessonId?: string | number;
  bookName?: string;
  chapterName?: string;
}

const RATES = [1, 1.25, 1.5, 2];

const INITIAL_STATE: AudioPlayerState = {
  track: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  playbackRate: 1,
};

const AudioCard = ({
  audioUrl,
  title,
  startTime,
  endTime,
  lessonId,
  bookName,
  chapterName,
}: AudioCardProps) => {
  const [rate, setRate] = useState(1);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [savedMb, setSavedMb] = useState<number | null>(null);
  const cached = localUrl !== null;
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const startSeconds = parseAudioSeconds(startTime);
  const endSeconds = parseAudioSeconds(endTime);

  const playerState = useSyncExternalStore(
    audioPlayerStore.subscribe,
    audioPlayerStore.getState,
    () => INITIAL_STATE,
  );

  const isCurrentTrack = Boolean(
    playerState.track &&
      (playerState.track.url === (localUrl || audioUrl) ||
        (lessonId && String(playerState.track.lessonId) === String(lessonId))),
  );

  const isPlaying = isCurrentTrack && playerState.isPlaying;
  const currentTime = isCurrentTrack ? playerState.currentTime : startSeconds;
  const duration = isCurrentTrack ? playerState.duration : 0;

  const effectiveEnd = endSeconds > startSeconds ? endSeconds : duration;
  const progressPercent =
    effectiveEnd > startSeconds
      ? Math.min(100, Math.max(0, ((currentTime - startSeconds) / (effectiveEnd - startSeconds)) * 100))
      : 0;

  // عند الفتح: حمّل النسخة المحلية إن وُجدت من IndexedDB
  useEffect(() => {
    let alive = true;
    let objectUrl: string | null = null;
    void cleanupLegacyAudioCache();
    if (!audioUrl) return undefined;

    void loadAudio(audioUrl).then((blob) => {
      if (!alive || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setLocalUrl(objectUrl);
      setSavedMb(Math.round((blob.size / 1048576) * 10) / 10);
    });

    return () => {
      alive = false;
      const currentTrackUrl = audioPlayerStore.getState().track?.url;
      if (objectUrl && objectUrl !== currentTrackUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [audioUrl]);

  if (!audioUrl) return null;

  const handleTogglePlay = () => {
    if (isCurrentTrack) {
      audioPlayerStore.toggle();
    } else {
      const activeSrc = localUrl || audioUrl;
      audioPlayerStore.play(
        {
          url: activeSrc,
          title: title || 'درس صوتي',
          lessonId: lessonId || '',
          bookName,
          chapterName,
          startTime,
          endTime,
        },
        rate,
      );
    }
  };

  const handleRateChange = (newRate: number) => {
    setRate(newRate);
    if (isCurrentTrack) {
      audioPlayerStore.setRate(newRate);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const percent = parseFloat(e.target.value);
    const target = startSeconds + (percent / 100) * (effectiveEnd - startSeconds);
    if (isCurrentTrack) {
      audioPlayerStore.seek(target);
    } else {
      audioPlayerStore.play(
        {
          url: localUrl || audioUrl,
          title: title || 'درس صوتي',
          lessonId: lessonId || '',
          bookName,
          chapterName,
          startTime,
          endTime,
        },
        rate,
      );
      audioPlayerStore.seek(target);
    }
  };

  // تنزيل للاستماع أوفلاين في IndexedDB
  const handleDownload = async (): Promise<void> => {
    if (!audioUrl || downloading || cached) return;
    setDownloading(true);
    setDownloadError('');
    try {
      const res = await fetch(audioUrl, { mode: 'cors' });
      if (!res.ok) throw new Error('تعذّر تنزيل الملف.');
      const blob = await res.blob();
      await saveAudio(audioUrl, blob);
      setLocalUrl(URL.createObjectURL(blob));
      setSavedMb(Math.round((blob.size / 1048576) * 10) / 10);
    } catch (err) {
      const msg = (err as Error).message || '';
      setDownloadError(
        msg.includes('quota') || msg.includes('Quota')
          ? 'مساحة التخزين ممتلئة — احذف تنزيلات قديمة وحاول مجددًا.'
          : 'تعذّر التنزيل — تحقق من الاتصال وحاول مجددًا.',
      );
    } finally {
      setDownloading(false);
    }
  };

  const handleRemoveDownload = async (): Promise<void> => {
    if (!audioUrl) return;
    await removeAudio(audioUrl);
    if (localUrl) URL.revokeObjectURL(localUrl);
    setLocalUrl(null);
    setSavedMb(null);
  };

  return (
    <div
      className="custom-card p-3 p-md-4 mb-4 shadow-sm audio-card-custom"
      style={{ borderRight: '4px solid var(--accent-color)' }}
    >
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
        <div className="d-flex align-items-center gap-2">
          <div className="audio-card-icon-pill" aria-hidden="true">
            <FiHeadphones size={20} />
          </div>
          <div>
            <h6 className="fw-bold mb-0" style={{ color: 'var(--primary-color)' }}>
              استمع للشرح الصوتي
            </h6>
            {title && (
              <small className="text-muted text-truncate d-block" style={{ maxWidth: '280px' }}>
                {title}
              </small>
            )}
          </div>
        </div>

        {/* مؤشر الاستماع المستمر في الخلفية */}
        {isPlaying && (
          <span className="badge rounded-pill bg-success-subtle text-success px-2 py-1 small d-flex align-items-center gap-1">
            <span className="spinner-grow spinner-grow-sm text-success" style={{ width: '8px', height: '8px' }} />
            جارٍ الاستماع
          </span>
        )}
      </div>

      {/* مشغل الصوت المخصص */}
      <div className="audio-card-player-box p-3 rounded-3 mb-2">
        <div className="d-flex align-items-center gap-3">
          {/* زر التشغيل والإيقاف الرئيسي */}
          <button
            type="button"
            className="btn audio-card-main-play-btn shadow-sm"
            onClick={handleTogglePlay}
            aria-label={isPlaying ? 'إيقاف مؤقت' : 'تشغيل الصوت'}
            title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل الصوت'}
          >
            {isPlaying ? (
              <FiPause size={22} />
            ) : (
              <FiPlay size={22} style={{ marginRight: '-2px' }} />
            )}
          </button>

          {/* شريط التقدم والوقت */}
          <div className="flex-grow-1">
            <div className="d-flex justify-content-between align-items-center mb-1 small text-muted font-monospace">
              <span>{formatAudioTime(currentTime)}</span>
              <span>
                {effectiveEnd > 0 ? formatAudioTime(effectiveEnd) : duration > 0 ? formatAudioTime(duration) : '00:00'}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={Number.isFinite(progressPercent) ? progressPercent : 0}
              onChange={handleSeek}
              aria-label="شريط تقدم المسألة"
              className="audio-card-seek-slider w-100"
            />
          </div>
        </div>

        {startSeconds > 0 && (
          <small className="d-block mt-2 fw-bold text-muted" style={{ fontSize: '0.78rem' }}>
            ▶ يبدأ من {formatAudioTime(startSeconds)}
            {endSeconds > startSeconds ? ` ويتوقف تلقائياً عند ${formatAudioTime(endSeconds)}` : ''}
          </small>
        )}
      </div>

      {/* خيارات السرعة والتنزيل أوفلاين */}
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-3 pt-2 border-top border-light-subtle">
        <div className="d-flex align-items-center gap-1">
          <small className="text-muted fw-bold me-1">السرعة:</small>
          {RATES.map((r) => (
            <button
              key={r}
              type="button"
              className={`btn btn-sm ${rate === r ? 'btn-primary' : 'btn-outline-secondary'}`}
              style={{ borderRadius: '8px', minWidth: '46px', fontWeight: 'bold', fontSize: '0.78rem' }}
              onClick={() => handleRateChange(r)}
              aria-pressed={rate === r}
            >
              {r}x
            </button>
          ))}
        </div>

        <div>
          {cached ? (
            <span className="d-flex align-items-center gap-2">
              <small className="d-flex align-items-center gap-1 text-success fw-bold">
                <FiCheck size={16} /> محفوظ أوفلاين{savedMb != null ? ` (≈ ${savedMb}MB)` : ''}
              </small>
              <button
                type="button"
                className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1"
                style={{ borderRadius: '8px' }}
                onClick={handleRemoveDownload}
                title="حذف التنزيل لتحرير المساحة"
                aria-label="حذف الصوت المحمّل"
              >
                <FiTrash2 size={14} />
              </button>
            </span>
          ) : (
            <button
              type="button"
              className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
              style={{ borderRadius: '8px', fontWeight: 'bold' }}
              onClick={handleDownload}
              disabled={downloading}
              title="حفظ الصوت في المتصفح للاستماع بدون إنترنت"
            >
              {downloading ? <FiLoader size={14} className="spinner-border spinner-border-sm" /> : <FiDownload size={14} />}
              {downloading ? 'جارٍ التنزيل...' : 'حمّل أوفلاين'}
            </button>
          )}
        </div>
      </div>

      {downloadError && (
        <small className="text-danger d-block mt-2">{downloadError}</small>
      )}
    </div>
  );
};

export default AudioCard;
