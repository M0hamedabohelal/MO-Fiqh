import { useState, useCallback } from 'react';
import { FiDownload, FiCheck, FiLink, FiShare2, FiX, FiCopy } from 'react-icons/fi';
import { FaWhatsapp, FaTelegram, FaXTwitter } from 'react-icons/fa6';
import { motion, AnimatePresence } from 'framer-motion';
import { canonicalPathFor } from '../../hooks/useHashRoute';
import { copyText } from '../../utils/clipboard';

interface ShareButtonProps {
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
  const [textCopied, setTextCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // دالة لف النص مع دعم RTL
  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach(word => {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  // رسم خط فاصل مزخرف
  const drawDivider = (ctx: CanvasRenderingContext2D, y: number, width: number, padding: number): void => {
    const lineY = y;
    const centerX = width / 2;
    
    // الخط الأيمن
    ctx.strokeStyle = 'rgba(251, 220, 153, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX + 20, lineY);
    ctx.lineTo(width - padding, lineY);
    ctx.stroke();
    
    // الخط الأيسر
    ctx.beginPath();
    ctx.moveTo(padding, lineY);
    ctx.lineTo(centerX - 20, lineY);
    ctx.stroke();
    
    // الماسة في المنتصف
    ctx.fillStyle = '#fbdc99';
    ctx.beginPath();
    ctx.moveTo(centerX, lineY - 6);
    ctx.lineTo(centerX + 6, lineY);
    ctx.lineTo(centerX, lineY + 6);
    ctx.lineTo(centerX - 6, lineY);
    ctx.closePath();
    ctx.fill();
  };

  // رسم مستطيل مدور
  const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  const generateImage = (): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    
    const width = 1080;
    const padding = 70;
    const mainFontSize = 26;
    const sheikhFontSize = 24;
    const lineHeight = 44;
    const sheikhLineHeight = 42;
    const maxTextWidth = width - padding * 2;

    // تجهيز النص الرئيسي - كل فقرة على حدة
    const cleanMainText = text.replace(/[﴿﴾]/g, '❝').replace(/[{}]/g, '❝').replace(/[«»]/g, '❝');
    const paragraphs = cleanMainText.split('\n').filter(p => p.trim());
    
    // قياس ارتفاع النص الرئيسي
    ctx.font = `${mainFontSize}px 'Amiri', serif`;
    const mainLines: string[] = [];
    paragraphs.forEach((para, idx) => {
      const wrapped = wrapText(ctx, para.trim(), maxTextWidth);
      mainLines.push(...wrapped);
      if (idx < paragraphs.length - 1) mainLines.push(''); // فراغ بين الفقرات
    });

    // تجهيز تعليق الشيخ
    ctx.font = `${sheikhFontSize}px 'Amiri', serif`;
    const sheikhLines: string[] = [];
    if (sheikhComment) {
      const sheikhParagraphs = sheikhComment.split('\n').filter(p => p.trim());
      sheikhParagraphs.forEach((para, idx) => {
        const wrapped = wrapText(ctx, para.trim(), maxTextWidth - 40);
        sheikhLines.push(...wrapped);
        if (idx < sheikhParagraphs.length - 1) sheikhLines.push('');
      });
    }

    // سقف عدد الأسطر حتى لا تتجاوز الصورة حدود ذاكرة الكانفس على الفون
    const MAX_LINES = 180;
    if (mainLines.length > MAX_LINES) {
      mainLines.length = MAX_LINES;
      mainLines.push('…');
    }
    if (sheikhLines.length > MAX_LINES) {
      sheikhLines.length = MAX_LINES;
      sheikhLines.push('…');
    }

    // حساب الارتفاع الكلي
    const titleAreaHeight = 180;
    const mainTextHeight = mainLines.length * lineHeight + 40;
    const dividerHeight = 50;
    const sheikhHeaderHeight = sheikhComment ? 60 : 0;
    const sheikhTextHeight = sheikhComment ? sheikhLines.length * sheikhLineHeight + 40 : 0;
    const footerHeight = 80;
    
    const height = titleAreaHeight + mainTextHeight + dividerHeight + sheikhHeaderHeight + sheikhTextHeight + footerHeight + 40;
    
    canvas.width = width;
    canvas.height = height;

    // ====== رسم الخلفية ======
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#0a2e2f');
    gradient.addColorStop(0.5, '#0f3d3e');
    gradient.addColorStop(1, '#0a2e2f');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // نقاط زخرفية خفيفة
    ctx.fillStyle = 'rgba(251, 220, 153, 0.04)';
    for (let x = 0; x < width; x += 30) {
      for (let y = 0; y < height; y += 30) {
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // الإطار الخارجي الذهبي
    ctx.strokeStyle = '#fbdc99';
    ctx.lineWidth = 3;
    roundRect(ctx, 15, 15, width - 30, height - 30, 20);
    ctx.stroke();

    // إطار داخلي خفيف
    ctx.strokeStyle = 'rgba(251, 220, 153, 0.2)';
    ctx.lineWidth = 1;
    roundRect(ctx, 25, 25, width - 50, height - 50, 15);
    ctx.stroke();

    // ====== البسملة ======
    ctx.textAlign = 'center';
    ctx.fillStyle = '#c9a84c';
    ctx.font = `bold 32px Amiri Quran, serif`;
    ctx.fillText('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', width / 2, 70);

    // ====== العنوان ======
    // خلفية العنوان
    ctx.fillStyle = 'rgba(251, 220, 153, 0.12)';
    roundRect(ctx, padding - 10, 100, width - (padding - 10) * 2, 70, 12);
    ctx.fill();

    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fbdc99';
    ctx.font = `bold 34px 'Amiri', serif`;
    ctx.fillText(title, width / 2, 147);
    
    // فاصل تحت العنوان
    drawDivider(ctx, titleAreaHeight + 60, width, padding);

    // ====== النص الرئيسي ======
    ctx.textAlign = 'right';
    ctx.fillStyle = '#e8e8e8';
    ctx.font = `${mainFontSize}px 'Amiri', serif`;
    
    let currentY = titleAreaHeight + 105;
    mainLines.forEach((line) => {
      if (line === '') {
        currentY += lineHeight * 0.4; // مسافة أصغر للفقرات الفارغة
      } else {
        ctx.fillText(line, width - padding, currentY);
        currentY += lineHeight;
      }
    });

    // ====== تعليق الشيخ ======
    if (sheikhComment && sheikhLines.length > 0) {
      currentY += 15;
      
      // فاصل قبل تعليق الشيخ
      drawDivider(ctx, currentY, width, padding);
      currentY += 35;

      // خلفية عنوان تعليق الشيخ
      ctx.fillStyle = 'rgba(251, 220, 153, 0.1)';
      roundRect(ctx, padding + 50, currentY - 25, width - (padding + 50) * 2, 40, 8);
      ctx.fill();

      // عنوان تعليق الشيخ
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fbdc99';
      ctx.font = `bold 26px 'Amiri', serif`;
      ctx.fillText('📖 تعليق الشيخ', width / 2, currentY + 2);
      currentY += 50;

      // خلفية النص
      const sheikhBoxHeight = sheikhLines.length * sheikhLineHeight + 30;
      ctx.fillStyle = 'rgba(251, 220, 153, 0.06)';
      roundRect(ctx, padding - 5, currentY - 20, width - (padding - 5) * 2, sheikhBoxHeight, 10);
      ctx.fill();
      
      // خط جانبي ذهبي على اليمين
      ctx.fillStyle = 'rgba(251, 220, 153, 0.5)';
      roundRect(ctx, width - padding + 2, currentY - 15, 5, sheikhBoxHeight - 10, 3);
      ctx.fill();

      // نص تعليق الشيخ
      ctx.textAlign = 'right';
      ctx.fillStyle = '#d4c9a8';
      ctx.font = `${sheikhFontSize}px 'Amiri', serif`;

      sheikhLines.forEach((line) => {
        if (line === '') {
          currentY += sheikhLineHeight * 0.4;
        } else {
          ctx.fillText(line, width - padding - 15, currentY);
          currentY += sheikhLineHeight;
        }
      });
    }

    // ====== الفوتر ======
    const footerY = height - 50;
    
    // خط فوق الفوتر مزخرف
    drawDivider(ctx, footerY - 20, width, padding + 100);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fbdc99';
    ctx.font = "bold 22px 'Amiri', serif";
    ctx.fillText('يَسِّر — دراسة وتدبر', width / 2, footerY + 10);

    // نجوم
    ctx.font = '18px Arial';
    ctx.fillText('✦', width / 2 - 180, footerY + 12);
    ctx.fillText('✦', width / 2 + 180, footerY + 12);

    return canvas;
  };

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
    // التأجيل يتيح للزر إظهار حالة التحميل قبل العملية الثقيلة (حتى لا تتجمد الواجهة)
    setTimeout(() => {
      try {
        const canvas = generateImage();
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

  // مشاركة عبر واتساب
  const handleWhatsAppShare = () => {
    const cleanUrl = getCleanUrl();
    const shareText = getShareText();
    const msg = encodeURIComponent(`${shareText}\n\n🔗 ${cleanUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank', 'noopener,noreferrer');
  };

  // مشاركة عبر تليجرام
  const handleTelegramShare = () => {
    const cleanUrl = getCleanUrl();
    const shareText = getShareText();
    const urlParam = encodeURIComponent(cleanUrl);
    const textParam = encodeURIComponent(shareText);
    window.open(`https://t.me/share/url?url=${urlParam}&text=${textParam}`, '_blank', 'noopener,noreferrer');
  };

  // مشاركة عبر إكس (تويتر)
  const handleXShare = () => {
    const cleanUrl = getCleanUrl();
    const shareText = getShareText();
    const shortText = shareText.length > 200 ? `${shareText.slice(0, 190)}...` : shareText;
    const urlParam = encodeURIComponent(cleanUrl);
    const textParam = encodeURIComponent(shortText);
    window.open(`https://twitter.com/intent/tweet?text=${textParam}&url=${urlParam}`, '_blank', 'noopener,noreferrer');
  };

  // نسخ النص مع الرابط
  const handleCopyFull = async () => {
    const cleanUrl = getCleanUrl();
    const shareText = getShareText();
    const fullContent = `${shareText}\n\n🔗 ${cleanUrl}`;
    const ok = await copyText(fullContent);
    setTextCopied(ok);
    setTimeout(() => setTextCopied(false), 2200);
  };

  // مشاركة عبر نافذة النظام
  const handleNativeShareDirect = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title,
          text: getShareText(),
          url: getCleanUrl(),
        });
        setShowShareModal(false);
      } catch (err) {
        if ((err as Error)?.name !== 'AbortError') {
          console.warn('تعذر مشاركة النظام:', err);
        }
      }
    }
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
            transition: 'all 0.3s ease'
          }}
          title="تنزيل الصورة مباشرة إلى جهازك"
        >
          {downloaded ? <><FiCheck size={isSmall ? 14 : 16} /> {isSmall ? 'تم التنزيل' : 'تم التحميل'}</>
            : generating ? (isSmall ? 'جارٍ...' : 'جارٍ التوليد...')
            : failed ? (isSmall ? 'فشل' : 'فشل التوليد')
            : <><FiDownload size={isSmall ? 14 : 16} /> {isSmall ? 'تنزيل' : 'حفظ كصورة'}</>}
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
          {linkCopied
            ? <><FiCheck size={isSmall ? 14 : 16} /> نسخ</>
            : <><FiLink size={isSmall ? 14 : 16} /> نسخ الرابط</>}
        </button>
      </motion.div>

      {/* نافذة خيارات المشاركة الفاخرة */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="position-fixed top-0 start-0 end-0 bottom-0 d-flex align-items-center justify-content-center p-3"
            style={{ zIndex: 1060, backgroundColor: 'rgba(0, 0, 0, 0.72)', backdropFilter: 'blur(6px)' }}
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="custom-card p-4 shadow-lg text-end parchment-texture"
              style={{
                width: '100%',
                maxWidth: '430px',
                borderRadius: '20px',
                border: '1.5px solid var(--accent-color, #c9a84c)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom border-secondary border-opacity-25">
                <div className="d-flex align-items-center gap-2">
                  <span className="badge badge-custom px-2 py-1" style={{ fontSize: '0.85rem' }}>
                    <FiShare2 className="ms-1" size={13} /> مشاركة
                  </span>
                  <span className="fw-bold text-truncate" style={{ color: 'var(--primary-color)', maxWidth: '240px' }}>
                    {title}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary rounded-circle d-flex align-items-center justify-content-center"
                  style={{ width: '30px', height: '30px' }}
                  onClick={() => setShowShareModal(false)}
                  title="إغلاق"
                  aria-label="إغلاق"
                >
                  <FiX size={16} />
                </button>
              </div>

              <p className="text-muted small mb-3 text-center" style={{ lineHeight: '1.7' }}>
                اختر الوسيلة المفضلة لمشاركة المسألة أو نسخ الرابط والنص مباشرة:
              </p>

              {/* شبكة خيارات المشاركة */}
              <div className="d-flex flex-column gap-2 mb-3">
                {/* واتساب */}
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="btn d-flex align-items-center justify-content-between p-2 px-3 shadow-sm"
                  style={{
                    backgroundColor: '#25D366',
                    color: '#fff',
                    borderRadius: '12px',
                    fontWeight: 600,
                    border: 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span className="d-flex align-items-center gap-2">
                    <FaWhatsapp size={20} />
                    <span>مشاركة عبر واتساب (WhatsApp)</span>
                  </span>
                  <span className="badge bg-white bg-opacity-25 small">إرسال ↗</span>
                </button>

                {/* تليجرام */}
                <button
                  type="button"
                  onClick={handleTelegramShare}
                  className="btn d-flex align-items-center justify-content-between p-2 px-3 shadow-sm"
                  style={{
                    backgroundColor: '#229ED9',
                    color: '#fff',
                    borderRadius: '12px',
                    fontWeight: 600,
                    border: 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span className="d-flex align-items-center gap-2">
                    <FaTelegram size={20} />
                    <span>مشاركة عبر تليجرام (Telegram)</span>
                  </span>
                  <span className="badge bg-white bg-opacity-25 small">إرسال ↗</span>
                </button>

                {/* إكس / تويتر */}
                <button
                  type="button"
                  onClick={handleXShare}
                  className="btn d-flex align-items-center justify-content-between p-2 px-3 shadow-sm"
                  style={{
                    backgroundColor: '#000',
                    color: '#fff',
                    borderRadius: '12px',
                    fontWeight: 600,
                    border: '1px solid rgba(255,255,255,0.2)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span className="d-flex align-items-center gap-2">
                    <FaXTwitter size={18} />
                    <span>نشر على منصة إكس (X)</span>
                  </span>
                  <span className="badge bg-white bg-opacity-25 small">نشر ↗</span>
                </button>

                {/* نسخ النص والرابط معاً */}
                <button
                  type="button"
                  onClick={handleCopyFull}
                  className="btn d-flex align-items-center justify-content-between p-2 px-3 shadow-sm"
                  style={{
                    backgroundColor: textCopied ? '#27ae60' : 'var(--badge-bg)',
                    color: textCopied ? '#fff' : 'var(--text-main)',
                    borderRadius: '12px',
                    fontWeight: 600,
                    border: '1px solid var(--border-color)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span className="d-flex align-items-center gap-2">
                    {textCopied ? <FiCheck size={18} /> : <FiCopy size={18} />}
                    <span>{textCopied ? 'تم نسخ النص والرابط!' : 'نسخ نص المسألة مع الرابط'}</span>
                  </span>
                  <span className="badge bg-secondary bg-opacity-25 small">{textCopied ? '✓ تم' : 'نسخ'}</span>
                </button>

                {/* مشاركة عبر النظام إن كانت مدعومة */}
                {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                  <button
                    type="button"
                    onClick={handleNativeShareDirect}
                    className="btn d-flex align-items-center justify-content-between p-2 px-3 shadow-sm"
                    style={{
                      backgroundColor: 'transparent',
                      color: 'var(--primary-color)',
                      borderRadius: '12px',
                      fontWeight: 600,
                      border: '1px dashed var(--primary-color)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <span className="d-flex align-items-center gap-2">
                      <FiShare2 size={18} />
                      <span>نافذة مشاركة النظام الأصلية</span>
                    </span>
                    <span className="badge bg-secondary bg-opacity-25 small">النظام</span>
                  </button>
                )}
              </div>

              {/* زر تنزيل الصورة كخيار إضافي */}
              <div className="pt-2 border-top border-secondary border-opacity-10 d-flex justify-content-between align-items-center">
                <span className="text-muted small">تريد حفظها كبطاقة؟</span>
                <button
                  type="button"
                  onClick={() => {
                    handleDownload();
                    setShowShareModal(false);
                  }}
                  className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                  style={{ borderRadius: '20px' }}
                >
                  <FiDownload size={14} /> حفظ كصورة
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ShareButton;
