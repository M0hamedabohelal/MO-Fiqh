import { useState, useCallback } from 'react';
import { FiDownload, FiCheck, FiLink, FiShare2 } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { canonicalPathFor } from '../../hooks/useHashRoute';
import { copyText } from '../../utils/clipboard';
import { generateShareCanvas } from '../../utils/shareCardCanvas';
import ShareModal from './ShareModal';

export interface ShareButtonProps {
  title: string;
  text: string;
  sheikhComment?: string;
  isSmall?: boolean;
  /** معرّف المسألة — لبناء رابط المشاركة النظيف (/lessons/{id}/) */
  lessonId?: string | number;
}

const isMobileDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
};

const ShareButton = ({ title, text, sheikhComment, isSmall, lessonId }: ShareButtonProps) => {
  const [downloaded, setDownloaded] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [failed, setFailed] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // الرابط النظيف للمسألة
  const getCleanUrl = useCallback((): string => {
    const path = canonicalPathFor('reading', lessonId != null ? String(lessonId) : null);
    return path ? `${window.location.origin}${path}` : window.location.href;
  }, [lessonId]);

  // نص المشاركة المنسق
  const getShareText = useCallback((): string => {
    const parts: string[] = [];
    if (title) parts.push(`«${title}»`);
    if (text) parts.push(text);
    if (sheikhComment && sheikhComment.trim()) {
      parts.push(`📖 تعليق الشيخ:\n${sheikhComment.trim()}`);
    }
    parts.push('— منصة يَسِّر للفقه الإسلامي');
    return parts.join('\n\n');
  }, [title, text, sheikhComment]);

  // رابط المشاركة = المسار النظيف (canonical)
  const handleCopyLink = async () => {
    const ok = await copyText(getCleanUrl());
    setLinkCopied(ok);
    setTimeout(() => setLinkCopied(false), 2200);
  };

  // تنزيل مباشر للصورة إلى جهاز المستخدم دون فتح أي نافذة مشاركة
  const handleDownload = () => {
    if (generating) return;
    setGenerating(true);
    setFailed(false);
    setTimeout(() => {
      try {
        const canvas = generateShareCanvas(title, text, sheikhComment);
        const link = document.createElement('a');
        link.download = `${title}.png`;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        link.remove();
        setDownloaded(true);
        setTimeout(() => setDownloaded(false), 2500);
      } catch (err) {
        console.error('فشل تنزيل الصورة:', err);
        setFailed(true);
        setTimeout(() => setFailed(false), 2500);
      } finally {
        setGenerating(false);
      }
    }, 60);
  };

  // عند الضغط على زر المشاركة: الجوال يفتح المشاركة فوراً دون تأخير، والكمبيوتر يفتح نافذة الخيارات
  const handleShareClick = async () => {
    const cleanUrl = getCleanUrl();
    const shareText = getShareText();

    // 1. أجهزة الجوال: استدعاء navigator.share فوراً متزامناً مع النقر
    if (isMobileDevice() && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title,
          text: shareText,
          url: cleanUrl,
        });
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') {
          return;
        }
      }
    }

    // 2. أجهزة الكمبيوتر أو المتصفحات الأخرى: فتح نافذة خيارات المشاركة الأنيقة
    setShowShareModal(true);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="d-flex gap-2 justify-content-center mb-4 flex-wrap"
      >
        {/* زر التنزيل المباشر كملف */}
        <button
          type="button"
          onClick={handleDownload}
          disabled={generating}
          className={`btn d-flex align-items-center gap-2 shadow-sm ${isSmall ? 'btn-sm px-2 py-1' : 'px-3 py-2'}`}
          style={{
            backgroundColor: downloaded ? '#27ae60' : failed ? '#e74c3c' : 'var(--primary-color)',
            color: '#fff',
            borderRadius: '20px',
            border: 'none',
            fontSize: isSmall ? '0.8rem' : '0.9rem',
            transition: 'all 0.3s ease',
          }}
          title="تنزيل الصورة مباشرة إلى جهازك"
        >
          {downloaded ? (
            <>
              <FiCheck size={isSmall ? 14 : 16} /> {isSmall ? 'تم التنزيل' : 'تم التحميل'}
            </>
          ) : generating ? (
            isSmall ? 'جارٍ...' : 'جارٍ التوليد...'
          ) : failed ? (
            isSmall ? 'فشل' : 'فشل التوليد'
          ) : (
            <>
              <FiDownload size={isSmall ? 14 : 16} /> {isSmall ? 'تنزيل' : 'حفظ كصورة'}
            </>
          )}
        </button>

        {/* زر المشاركة (يفتح خيارات المشاركة: واتساب، تليجرام، إكس، نسخ) */}
        <button
          type="button"
          onClick={handleShareClick}
          disabled={generating}
          className={`btn d-flex align-items-center gap-2 shadow-sm ${isSmall ? 'btn-sm px-2 py-1' : 'px-3 py-2'}`}
          style={{
            backgroundColor: 'rgba(201, 168, 76, 0.15)',
            color: 'var(--accent-color, #c9a84c)',
            borderRadius: '20px',
            border: '1px solid var(--accent-color, #c9a84c)',
            fontSize: isSmall ? '0.8rem' : '0.9rem',
            transition: 'all 0.3s ease',
          }}
          title="مشاركة المسألة عبر واتساب وتليجرام وتطبيقات التواصل"
        >
          <FiShare2 size={isSmall ? 14 : 16} />
          <span>{isSmall ? 'مشاركة' : 'مشاركة المسألة'}</span>
        </button>

        {/* نسخ الرابط النظيف (/lessons/{id}/) */}
        <button
          type="button"
          onClick={handleCopyLink}
          className={`btn d-flex align-items-center gap-2 shadow-sm ${isSmall ? 'btn-sm px-2 py-1' : 'px-3 py-2'}`}
          style={{
            backgroundColor: linkCopied ? '#27ae60' : 'transparent',
            color: linkCopied ? '#fff' : 'var(--text-main)',
            borderRadius: '20px',
            border: '1px solid var(--border-color, rgba(255,255,255,0.18))',
            fontSize: isSmall ? '0.8rem' : '0.9rem',
            transition: 'all 0.3s ease',
          }}
          title="نسخ رابط المسألة"
        >
          {linkCopied ? (
            <>
              <FiCheck size={isSmall ? 14 : 16} /> نسخ
            </>
          ) : (
            <>
              <FiLink size={isSmall ? 14 : 16} /> نسخ الرابط
            </>
          )}
        </button>
      </motion.div>

      {/* نافذة خيارات المشاركة المنفصلة */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title={title}
        cleanUrl={getCleanUrl()}
        shareText={getShareText()}
        onDownloadImage={handleDownload}
      />
    </>
  );
};

export default ShareButton;
