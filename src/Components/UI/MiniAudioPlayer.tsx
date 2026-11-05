// MiniAudioPlayer.tsx — مشغل صوتي عائم مصغر أنيق يرافق المستخدم عبر كافة شاشات التطبيق
import { useSyncExternalStore, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlay, FiPause, FiX, FiExternalLink, FiHeadphones } from 'react-icons/fi';
import { audioPlayerStore, formatAudioTime, type AudioPlayerState } from '../../utils/audioPlayerStore';
import { useApp } from '../Layout/AppContext';
import { triggerHaptic } from '../../utils/haptics';

const INITIAL_STATE: AudioPlayerState = {
  track: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  playbackRate: 1,
};

const RATES = [1, 1.25, 1.5, 2];

const MiniAudioPlayer = memo(() => {
  const { openLessonById, currentView, currentLesson } = useApp();

  const state = useSyncExternalStore(
    audioPlayerStore.subscribe,
    audioPlayerStore.getState,
    () => INITIAL_STATE,
  );

  const { track, isPlaying, currentTime, duration, playbackRate } = state;

  if (!track) return null;

  // إذا كان المستخدم داخل صفحة القراءة لنفس الدرس حالياً، لا نكرر المشغل العائم لوجود بطاقة الصوت الأصلية
  const isViewingCurrentTrackLesson =
    currentView === 'reading' &&
    currentLesson &&
    String(currentLesson.id) === String(track.lessonId);

  if (isViewingCurrentTrackLesson) return null;

  const progress = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  const handleNextRate = () => {
    triggerHaptic('selection');
    const idx = RATES.indexOf(playbackRate);
    const next = RATES[(idx + 1) % RATES.length];
    audioPlayerStore.setRate(next);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPercent = parseFloat(e.target.value);
    const targetSec = (newPercent / 100) * duration;
    audioPlayerStore.seek(targetSec);
  };

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ y: 80, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 80, opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 350, damping: 26 }}
        className="mini-audio-player shadow-lg"
        aria-label="مشغل الصوت العائم"
        role="region"
      >
        {/* شريط التقدم الدقيق العلوي المدمج */}
        <div className="mini-audio-progress-bar">
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={Number.isFinite(progress) ? progress : 0}
            onChange={handleSeek}
            aria-label="موضع الصوت"
            className="mini-audio-slider"
          />
        </div>

        <div className="d-flex align-items-center justify-content-between gap-2 p-2 px-3">
          {/* أيقونة ومعلومات المقطع */}
          <div className="d-flex align-items-center gap-2 overflow-hidden flex-grow-1">
            <div className="mini-audio-icon-wrap" aria-hidden="true">
              <FiHeadphones size={18} />
            </div>
            <div className="overflow-hidden text-truncate" style={{ lineHeight: 1.3 }}>
              <div className="fw-bold small text-truncate mini-audio-title" title={track.title}>
                {track.title}
              </div>
              <div className="mini-audio-meta text-truncate">
                {formatAudioTime(currentTime)} / {formatAudioTime(duration)}
                {track.chapterName && <span> • {track.chapterName}</span>}
              </div>
            </div>
          </div>

          {/* أزرار التحكم */}
          <div className="d-flex align-items-center gap-1 flex-shrink-0">
            {/* زر تغيير السرعة */}
            <button
              type="button"
              className="btn btn-sm mini-audio-rate-btn"
              onClick={handleNextRate}
              title={`السرعة الحالية: ${playbackRate}x`}
              aria-label={`تغيير سرعة الصوت، الحالية: ${playbackRate}x`}
            >
              {playbackRate}x
            </button>

            {/* زر تشغيل / إيقاف مؤقت */}
            <button
              type="button"
              className="btn btn-sm mini-audio-play-btn"
              onClick={() => {
                triggerHaptic('light');
                audioPlayerStore.toggle();
              }}
              title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
              aria-label={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
            >
              {isPlaying ? <FiPause size={17} /> : <FiPlay size={17} style={{ marginRight: '-2px' }} />}
            </button>

            {/* زر الانتقال المباشر للمسألة */}
            <button
              type="button"
              className="btn btn-sm btn-link p-1 text-muted"
              onClick={() => openLessonById(track.lessonId)}
              title="الانتقال إلى المسألة"
              aria-label="الانتقال إلى المسألة"
            >
              <FiExternalLink size={16} />
            </button>

            {/* زر الإغلاق / الإيقاف النهائي */}
            <button
              type="button"
              className="btn btn-sm btn-link p-1 text-muted"
              onClick={() => audioPlayerStore.stop()}
              title="إغلاق المشغل"
              aria-label="إغلاق المشغل الصوتي"
            >
              <FiX size={17} />
            </button>
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
});

export default MiniAudioPlayer;
