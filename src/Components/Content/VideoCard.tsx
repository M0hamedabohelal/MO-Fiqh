// كارد الفيديو — مع زر تشغيل مباشر من الوقت المحدد للمسألة
// على الموبايل: يعرض thumbnail مع زر تشغيل بدلاً من iframe مباشرة
import { useState } from 'react';
import type { SyntheticEvent } from 'react';
import { FiHeadphones, FiPlay, FiExternalLink, FiClock } from 'react-icons/fi';

interface VideoCardProps {
  videoUrl?: string;
  startTime?: string;
  endTime?: string;
}

const VideoCard = ({ videoUrl, startTime, endTime }: VideoCardProps) => {
  // حالة التشغيل المباشر — لما المستخدم يدوس "اسمع من هنا" نشغّل الصوت تلقائيًا
  const [autoPlay, setAutoPlay] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  // Extract the videoId from the YouTube URL
  const extractVideoId = (url: string | undefined): string | null => {
    if (!url) return null;
    const regExp = /(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regExp);
    return match ? match[1] : null;
  };

  // Convert time (mm:ss or seconds) to total seconds
  // أي قيمة غير صالحة (مثل "ab:cd") تُعطي NaN الذي كان يكسر رابط المشاهدة — نعيد 0 بدلًا منه
  const parseTime = (time: string | undefined): number => {
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

  const videoId = extractVideoId(videoUrl);
  const startSeconds = parseTime(startTime);
  const endSeconds = parseTime(endTime);
  // نصوص العرض الأصلية (تُعرض كما أدخلها المشرف) — بشرط صلاحيتها رقميًا
  const startLabel = (startTime || '').trim();
  const endLabel = (endTime || '').trim();
  const hasStart = startLabel !== '' && startSeconds > 0;
  const hasEnd = endLabel !== '' && endSeconds > startSeconds;

  if (!videoId) return null;

  // رابط المشاهدة المباشرة على YouTube (مع الوقت المحدد)
  const youtubeDirectUrl = `https://youtu.be/${videoId}?t=${startSeconds}`;

  // رابط الـ embed
  let embedUrl = `https://www.youtube.com/embed/${videoId}?start=${startSeconds}&rel=0&modestbranding=1`;
  // النهاية تُقبل فقط لو بعد البداية — وإلا يتجمد المشغّل على شاشة فارغة
  if (endSeconds > startSeconds) embedUrl += `&end=${endSeconds}`;
  if (autoPlay) embedUrl += `&autoplay=1`;

  // thumbnail عالية الجودة من YouTube
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  const handlePlay = () => {
    setAutoPlay(true);
    setIframeLoaded(false);
    setTimeout(() => {
      const el = document.querySelector('.video-ratio-wrapper');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  return (
    <div
      className="video-card-wrapper custom-card p-3 mb-4 shadow-sm"
      style={{ borderRight: '6px solid var(--primary-color)', borderRadius: '10px' }}
    >
      {/* ✅ زر "اسمع من هنا" */}
      {!autoPlay && startSeconds > 0 && (
        <button
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

      {/* ✅ Video Player — Thumbnail + Lazy iframe لتجنب مشكلة الأيقونة الكسيرة على الموبايل */}
      <div
        className="video-ratio-wrapper"
        style={{ borderRadius: '10px', overflow: 'hidden', position: 'relative', aspectRatio: '16/9', backgroundColor: '#000' }}
      >
        {autoPlay ? (
          // بعد الضغط نحمّل iframe
          <>
            {!iframeLoaded && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                justifyContent: 'center', backgroundColor: '#000', zIndex: 1,
              }}>
                <div className="spinner-border text-light" style={{ width: '2rem', height: '2rem' }} role="status" />
              </div>
            )}
            <iframe
              key="playing"
              src={embedUrl}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              onLoad={() => setIframeLoaded(true)}
              style={{
                width: '100%',
                height: '100%',
                position: 'absolute',
                inset: 0,
                border: 'none',
                opacity: iframeLoaded ? 1 : 0,
                transition: 'opacity 0.3s ease',
              }}
            />
          </>
        ) : (
          // قبل الضغط: Thumbnail مع زر تشغيل جميل
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
            {/* Thumbnail */}
            <img
              src={thumbnailUrl}
              alt="video thumbnail"
              loading="lazy"
              decoding="async"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
              onError={(e: SyntheticEvent<HTMLImageElement>) => {
                // fallback لو الصورة فشلت
                e.currentTarget.style.display = 'none';
              }}
            />
            {/* Overlay داكن */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.5) 100%)',
            }} />
            {/* زر تشغيل وسط */}
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: '10px',
            }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                backgroundColor: 'rgba(255,0,0,0.9)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                transition: 'transform 0.2s',
              }}>
                <FiPlay size={28} color="#fff" style={{ marginLeft: '4px' }} />
              </div>
              <span style={{
                color: '#fff', fontSize: '0.82rem', fontWeight: 600,
                textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                background: 'rgba(0,0,0,0.4)', padding: '4px 12px', borderRadius: '20px',
              }}>
                اضغط للتشغيل
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ✅ رابط فتح في YouTube مباشرةً — مهم للموبايل */}
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
