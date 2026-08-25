// كارد الفيديو — مع زر تشغيل مباشر من الوقت المحدد للمسألة
import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiHeadphones } from 'react-icons/fi';

const VideoCard = ({ videoUrl, startTime }) => {
  // حالة التشغيل المباشر — لما المستخدم يدوس "اسمع من هنا" نشغّل الصوت تلقائيًا
  const [autoPlay, setAutoPlay] = useState(false);

  // Extract the videoId from the YouTube URL
  const extractVideoId = (url) => {
    if (!url) return null;
    const regExp = /(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regExp);
    return match ? match[1] : null;
  };

  // Convert startTime (mm:ss or seconds) to total seconds
  const parseStartTime = (time) => {
    if (!time) return 0;
    const timeStr = time.toString();
    if (timeStr.includes(':')) {
      const parts = timeStr.split(':').map(Number);
      if (parts.length === 2) {
        return parts[0] * 60 + parts[1]; // mm:ss
      } else if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2]; // hh:mm:ss
      }
    }
    return parseInt(timeStr, 10) || 0;
  };

  const videoId = extractVideoId(videoUrl);
  const startSeconds = parseStartTime(startTime);

  if (!videoId) return null;

  // autoplay=1 يُضاف فقط بعد ضغط الزر — حتى ما يبدأ الصوت فجأة بدون إذن المستخدم
  const embedUrl = `https://www.youtube.com/embed/${videoId}?start=${startSeconds}&rel=0${autoPlay ? '&autoplay=1' : ''}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="custom-card p-3 mb-4 shadow-sm"
      style={{ borderRight: '6px solid var(--primary-color)', borderRadius: '10px' }}
    >
      <div className="d-flex justify-content-between mb-3">
        <small className="fw-bold" style={{ color: 'var(--primary-color)' }}>شاهد شرح المسالة من الشيخ (فيديو)</small>
        <small className="text-muted" dir="ltr">⏱ {startTime}</small>
      </div>

      {/* زر التشغيل المباشر من الوقت المحدد */}
      {!autoPlay && startSeconds > 0 && (
        <button
          className="btn w-100 py-2 mb-3 d-flex align-items-center justify-content-center gap-2 listen-from-here-btn"
          onClick={() => {
            setAutoPlay(true);
            // نمرّر المستخدم لموضع الفيديو لو كان بعيدًا تحت
            const el = document.querySelector('.ratio-16x9');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
        >
          <FiHeadphones size={18} /> اسمع شرح هذه المسألة من هنا ({startTime})
        </button>
      )}

      <div className="ratio ratio-16x9" style={{ borderRadius: '8px', overflow: 'hidden' }}>
        <iframe
          key={autoPlay ? 'playing' : 'idle'}
          src={embedUrl}
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
    </motion.div>
  );
};

export default VideoCard;
