import { useRef, useState, useCallback, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiDownload, FiX, FiImage, FiCheck, FiShare2, FiEdit2 } from 'react-icons/fi';
import { useFocusTrap } from '../../hooks/useFocusTrap';

// CertificateModal — شهادة إتمام مخطوطة فاخرة بإطار أندلسي واسم مخصص وقابلة للتنزيل والمشاركة
interface CertificateModalProps {
  show: boolean;
  bookName?: string;
  userName?: string;
  lessonsCount?: number;
  dateLabel?: string;
  onClose: () => void;
}

const CertificateModal = ({ show, bookName, userName, lessonsCount, dateLabel, onClose }: CertificateModalProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(dialogRef, show, onClose);

  const [customName, setCustomName] = useState(userName || '');
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);
  const [shareNotice, setShareNotice] = useState('');

  useEffect(() => {
    if (userName && !customName) {
      setCustomName(userName);
    }
  }, [userName, customName]);

  const displayName = customName.trim() || userName || 'طالب العلم';

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;
    setGenerating(true);
    try {
      const { toPng } = await import('html-to-image');
      const cardWidth = cardRef.current.offsetWidth || 400;
      const pixelRatio = Math.min(3, 1200 / cardWidth);
      const dataUrl = await toPng(cardRef.current, { pixelRatio, cacheBust: true, backgroundColor: '#071415' });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `شهادة-إتمام-${bookName || 'كتاب'}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch (err) {
      console.error('فشل توليد الشهادة:', err);
      alert('تعذّر توليد الشهادة، حاول مجددًا.');
    } finally {
      setGenerating(false);
    }
  }, [bookName]);

  const handleShare = useCallback(async () => {
    if (!cardRef.current) return;
    setGenerating(true);
    try {
      const { toPng } = await import('html-to-image');
      const cardWidth = cardRef.current.offsetWidth || 400;
      const pixelRatio = Math.min(3, 1200 / cardWidth);
      const dataUrl = await toPng(cardRef.current, { pixelRatio, cacheBust: true, backgroundColor: '#071415' });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `شهادة-إتمام-${bookName || 'كتاب'}.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `شهادة إتمام ${bookName || ''}`,
          text: `بفضل الله أتممت دراسة ${bookName || ''} في تطبيق الفقه الميسر! 🎓✨`,
          files: [file],
        });
        setDone(true);
        setTimeout(() => setDone(false), 2000);
        return;
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.warn('المشاركة المباشرة غير مدعومة للملفات، جاري التنزيل:', err);
      } else {
        return;
      }
    } finally {
      setGenerating(false);
    }

    // بديل في حال تعذر مشاركة الملف مباشرة
    await handleDownload();
    setShareNotice('تم تنزيل الشهادة لمشاركتها.');
    setTimeout(() => setShareNotice(''), 3000);
  }, [bookName, handleDownload]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="position-fixed top-0 start-0 end-0 bottom-0 d-flex align-items-center justify-content-center p-2"
          style={{ zIndex: 'var(--z-overlay)', background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(5px)' }}
          onClick={onClose}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="شهادة الإتمام الأندلسية"
            tabIndex={-1}
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            className="bg-white p-3 p-md-4 rounded-4"
            style={{ maxWidth: 'min(94vw, 460px)', width: '100%', maxHeight: '94dvh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="d-flex align-items-center gap-2">
                <span style={{ color: '#c9a84c', fontSize: '18px' }}>۞</span>
                <h6 className="mb-0 fw-bold" style={{ color: '#1a1a1a', fontSize: '1.05rem' }}>
                  شهادة الإتمام الأندلسية
                </h6>
              </div>
              <button className="btn btn-sm p-1 rounded-circle" onClick={onClose} aria-label="إغلاق">
                <FiX size={20} />
              </button>
            </div>

            {/* تخصيص الاسم على الشهادة */}
            <div className="mb-3 p-2 rounded-3" style={{ background: '#f8faf9', border: '1px solid #e2e8f0' }}>
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label htmlFor="cert-name-input" className="form-label small fw-bold mb-0 text-muted d-flex align-items-center gap-1">
                  <FiEdit2 size={12} /> الاسم على الشهادة:
                </label>
                {userName && customName !== userName && (
                  <button
                    type="button"
                    className="btn btn-link p-0 text-decoration-none small text-primary"
                    style={{ fontSize: '0.75rem' }}
                    onClick={() => setCustomName(userName)}
                  >
                    استعادة اسم الحساب
                  </button>
                )}
              </div>
              <input
                id="cert-name-input"
                type="text"
                className="form-control form-control-sm"
                style={{ borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem', borderColor: '#cbd5e1' }}
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="اكتب اسمك الذي تحب أن يظهر على الشهادة"
                maxLength={40}
              />
            </div>

            {/* بطاقة الشهادة الأندلسية — تتحول لصورة فائقة الجودة */}
            <div ref={cardRef} style={cardStyle}>
              {/* نقوش وزخارف الأركان الأندلسية */}
              <span style={cornerStyle('top:8px;right:10px')}>⚜</span>
              <span style={cornerStyle('top:8px;left:10px')}>⚜</span>
              <span style={cornerStyle('bottom:8px;right:10px')}>⚜</span>
              <span style={cornerStyle('bottom:8px;left:10px')}>⚜</span>

              <div style={innerFrame}>
                {/* البسملة */}
                <div style={{ fontFamily: "'Amiri Quran', 'Amiri', serif", color: '#d8b96c', fontSize: '15px', textAlign: 'center', marginBottom: '4px' }}>
                  بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
                </div>
                
                {/* الشارة والترويسة */}
                <div style={{ textAlign: 'center', color: '#e9cf8f', fontSize: '18px', letterSpacing: '3px' }}>
                  ✦ ۞ ✦
                </div>
                
                <div style={{
                  fontFamily: "'Amiri', 'Traditional Arabic', serif",
                  fontWeight: '700',
                  textAlign: 'center',
                  fontSize: '38px',
                  color: '#f5ead1',
                  lineHeight: '1.3',
                  margin: '4px 0 2px',
                  textShadow: '0 2px 14px rgba(216,185,108,0.35)',
                }}>
                  شهادة إتمام
                </div>

                <div style={{
                  height: '1px',
                  background: 'linear-gradient(90deg, transparent, #d8b96c, transparent)',
                  margin: '8px 25px 12px',
                  opacity: 0.85,
                }} />

                <div style={{ fontFamily: "'Amiri', serif", textAlign: 'center', fontSize: '14.5px', color: '#c9d3d0', lineHeight: '1.9' }}>
                  يتشرف تطبيق <strong style={{ color: '#e9cf8f' }}>الفقه الميسر</strong> بأن يشهد بأنّ
                </div>

                {/* اسم الطالب المُخصّص */}
                <div style={{
                  fontFamily: "'Amiri', 'Traditional Arabic', serif",
                  fontWeight: '700',
                  textAlign: 'center',
                  fontSize: '28px',
                  color: '#ffffff',
                  lineHeight: '1.7',
                  margin: '3px 0',
                  borderBottom: '1px solid rgba(216,185,108,0.55)',
                  paddingBottom: '4px',
                  marginLeft: '20px',
                  marginRight: '20px',
                  textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                }}>
                  {displayName}
                </div>

                <div style={{ fontFamily: "'Amiri', serif", textAlign: 'center', fontSize: '14.5px', color: '#c9d3d0', lineHeight: '1.9', marginTop: '6px' }}>
                  قد أتمّ بحمد الله وتوفيقه مدارسة
                </div>

                {/* اسم الكتاب */}
                <div style={{
                  fontFamily: "'Amiri', 'Traditional Arabic', serif",
                  fontWeight: '700',
                  textAlign: 'center',
                  fontSize: '24px',
                  color: '#e9cf8f',
                  lineHeight: '1.6',
                  textShadow: '0 1px 6px rgba(216,185,108,0.25)',
                }}>
                  {bookName}
                </div>

                <div style={{ fontFamily: "'Tajawal', 'Segoe UI', sans-serif", textAlign: 'center', fontSize: '12px', color: '#9aa5b1', marginTop: '4px' }}>
                  {lessonsCount ? `${lessonsCount} مسألة فقهية` : 'المسائل كاملة'} • {dateLabel || new Date().toLocaleDateString('ar-EG')}
                </div>

                {/* الختم الأندلسي المذهب والتوقيع */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', padding: '0 6px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: "'Amiri', serif", fontWeight: '700', fontSize: '15px', color: '#d8b96c' }}>
                      الفقه الميسر
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#8898aa', fontFamily: "'Tajawal', 'Segoe UI', sans-serif", direction: 'ltr', unicodeBidi: 'embed' }}>
                      fqh.me
                    </div>
                  </div>

                  {/* الختم الأندلسي الدائري المذهّب */}
                  <div style={{
                    width: '66px',
                    height: '66px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, #fcebbd 0%, #d8b96c 60%, #997825 100%)',
                    border: '2px solid #fff5db',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.5), inset 0 0 0 3px rgba(115, 85, 20, 0.45)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#3d2b06',
                    flexShrink: 0,
                  }}>
                    <span style={{ fontSize: '18px', lineHeight: 1 }}>۞</span>
                    <span style={{ fontSize: '9px', fontFamily: "'Amiri', serif", fontWeight: 'bold', marginTop: '1px' }}>
                      خَتْمُ الإِتْمَام
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {shareNotice && (
              <div className="alert alert-success py-1 px-2 small mt-2 mb-0 text-center" role="status">
                {shareNotice}
              </div>
            )}

            {/* أزرار التنزيل والمشاركة */}
            <div className="d-flex gap-2 mt-3">
              <button
                className="btn d-flex align-items-center justify-content-center gap-2 flex-fill shadow-sm"
                disabled={generating}
                onClick={handleDownload}
                style={{
                  background: 'linear-gradient(135deg, #c9a84c, #e6c875)',
                  color: '#1a1a1a',
                  fontWeight: 'bold',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  fontSize: '0.9rem',
                }}
              >
                {done ? <FiCheck size={18} /> : <FiImage size={18} />}
                <span>{done ? 'تم التنزيل' : generating ? 'جارٍ التوليد...' : 'تنزيل الشهادة (PNG)'}</span>
                {!done && !generating && <FiDownload size={15} />}
              </button>

              <button
                className="btn d-flex align-items-center justify-content-center gap-2 shadow-sm"
                disabled={generating}
                onClick={handleShare}
                style={{
                  background: '#f1f5f9',
                  color: '#0f172a',
                  fontWeight: 'bold',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '10px 16px',
                  fontSize: '0.9rem',
                }}
                title="مشاركة الشهادة عبر التطبيقات"
              >
                <FiShare2 size={16} />
                <span>مشاركة</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const cornerStyle = (pos: string): CSSProperties => {
  const [v, h] = pos.split(';');
  const [vk, vv] = v.split(':');
  const [hk, hv] = h.split(':');
  return {
    position: 'absolute',
    [vk]: vv,
    [hk]: hv,
    color: '#d8b96c',
    fontSize: '15px',
    opacity: 0.75,
    userSelect: 'none',
  } as CSSProperties;
};

// الإطار الخارجي للشهادة بنمط أندلسي فاخر
const cardStyle: CSSProperties = {
  width: 'min(410px, 100%)',
  margin: '0 auto',
  aspectRatio: '4 / 5',
  borderRadius: '16px',
  padding: '12px',
  boxSizing: 'border-box',
  background:
    'radial-gradient(135% 135% at 50% 0%, #153e42 0%, #0c2528 45%, #051214 100%)',
  border: '5px double #d8b96c',
  position: 'relative',
  overflow: 'hidden',
  boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
  direction: 'rtl',
};

const innerFrame: CSSProperties = {
  border: '2px solid rgba(216,185,108,0.65)',
  outline: '1px dashed rgba(216,185,108,0.3)',
  outlineOffset: '-5px',
  borderRadius: '10px',
  padding: '18px 14px 14px',
  height: '100%',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
};

export default CertificateModal;
