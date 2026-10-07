import { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiDownload, FiX, FiImage, FiCheck } from 'react-icons/fi';

// CertificateModal — شهادة إتمام مخطوطة فاخرة (PNG) باسم القارئ والكتاب المُتمم
const CertificateModal = ({ show, bookName, userName, lessonsCount, dateLabel, onClose }) => {
  const cardRef = useRef(null);
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;
    setGenerating(true);
    try {
      const { toPng } = await import('html-to-image');
      const cardWidth = cardRef.current.offsetWidth || 400;
      const pixelRatio = Math.min(3, 900 / cardWidth);
      const dataUrl = await toPng(cardRef.current, { pixelRatio, cacheBust: true, backgroundColor: '#0a1a1c' });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `شهادة-إتمام-${bookName || 'كتاب'}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    } catch (err) {
      console.error('فشل توليد الشهادة:', err);
      alert('تعذّر توليد الشهادة، حاول مجددًا.');
    } finally {
      setGenerating(false);
    }
  }, [bookName]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="position-fixed top-0 start-0 end-0 bottom-0 d-flex align-items-center justify-content-center"
          style={{ zIndex: 10000, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            className="bg-white p-3 rounded-4"
            style={{ maxWidth: 'min(92vw, 440px)', width: '100%', maxHeight: '92dvh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0 fw-bold" style={{ color: '#1a1a1a' }}>شهادة الإتمام</h6>
              <button className="btn btn-sm p-1" onClick={onClose} aria-label="إغلاق">
                <FiX size={18} />
              </button>
            </div>

            {/* الشهادة — تُحوَّل لصورة */}
            <div ref={cardRef} style={cardStyle}>
              {/* زخارف الزوايا */}
              <span style={cornerStyle('top:10px;right:12px')}>✦</span>
              <span style={cornerStyle('top:10px;left:12px')}>✦</span>
              <span style={cornerStyle('bottom:10px;right:12px')}>✦</span>
              <span style={cornerStyle('bottom:10px;left:12px')}>✦</span>

              <div style={innerFrame}>
                <div style={{ fontFamily: "'Amiri Quran', serif", color: '#d8b96c', fontSize: '15px', textAlign: 'center', marginBottom: '6px' }}>
                  بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
                </div>
                <div style={{ textAlign: 'center', color: '#d8b96c', fontSize: '20px', letterSpacing: '2px' }}>۞</div>
                <div style={{
                  fontFamily: "'Amiri', serif", fontWeight: '700', textAlign: 'center',
                  fontSize: '42px', color: '#e9cf8f', lineHeight: '1.4', margin: '4px 0 2px',
                  textShadow: '0 2px 12px rgba(216,185,108,0.3)',
                }}>
                  شهادة إتمام
                </div>
                <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, #d8b96c, transparent)', margin: '10px 30px 14px', opacity: 0.8 }} />
                <div style={{ fontFamily: "'Amiri', serif", textAlign: 'center', fontSize: '15px', color: '#c9d3d0', lineHeight: '2' }}>
                  يتشرف <strong style={{ color: '#e9cf8f' }}>الباحث الفقهي</strong> بأن يمنح هذه الشهادة إلى
                </div>
                <div style={{
                  fontFamily: "'Amiri', serif", fontWeight: '700', textAlign: 'center',
                  fontSize: '30px', color: '#f5ead1', lineHeight: '1.8', margin: '2px 0',
                  borderBottom: '1px solid rgba(216,185,108,0.5)', paddingBottom: '6px',
                  marginLeft: '24px', marginRight: '24px',
                }}>
                  {userName || 'طالب العلم'}
                </div>
                <div style={{ fontFamily: "'Amiri', serif", textAlign: 'center', fontSize: '15px', color: '#c9d3d0', lineHeight: '2', marginTop: '8px' }}>
                  لإتمامه دراسة كتاب
                </div>
                <div style={{
                  fontFamily: "'Amiri', serif", fontWeight: '700', textAlign: 'center',
                  fontSize: '24px', color: '#e9cf8f', lineHeight: '1.8',
                }}>
                  {bookName}
                </div>
                <div style={{ fontFamily: "'Tajawal', 'Segoe UI', sans-serif", textAlign: 'center', fontSize: '12.5px', color: '#9aa5b1', marginTop: '6px' }}>
                  {lessonsCount} مسألة • {dateLabel}
                </div>

                {/* الختم والتوقيع */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '18px', padding: '0 8px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Amiri', serif", fontWeight: '700', fontSize: '15px', color: '#d8b96c' }}>الباحث الفقهي</div>
                    <div style={{ fontSize: '11px', color: '#9aa5b1', fontFamily: "'Tajawal', 'Segoe UI', sans-serif", direction: 'ltr', unicodeBidi: 'embed' }}>fqh.me</div>
                  </div>
                  <div style={{
                    width: '64px', height: '64px', borderRadius: '50%',
                    border: '2px solid #d8b96c', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#d8b96c', fontSize: '26px', opacity: 0.9,
                    boxShadow: 'inset 0 0 0 3px rgba(216,185,108,0.25)',
                  }}>
                    ۞
                  </div>
                </div>
              </div>
            </div>

            <div className="d-flex gap-2 mt-3">
              <button
                className="btn d-flex align-items-center justify-content-center gap-2 flex-fill"
                disabled={generating}
                onClick={handleDownload}
                style={{
                  background: 'linear-gradient(135deg, #c9a84c, #e6c875)',
                  color: '#1a1a1a',
                  fontWeight: 'bold',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px',
                }}
              >
                {done ? <FiCheck size={18} /> : <FiImage size={18} />}
                {done ? 'تم التنزيل' : generating ? 'جارٍ التوليد...' : 'تنزيل الشهادة (PNG)'}
                {!done && !generating && <FiDownload size={16} />}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const cornerStyle = (pos) => {
  const [v, h] = pos.split(';');
  const [vk, vv] = v.split(':');
  const [hk, hv] = h.split(':');
  return {
    position: 'absolute', [vk]: vv, [hk]: hv,
    color: '#d8b96c', fontSize: '13px', opacity: 0.6,
  };
};

// الإطار الخارجي للشهادة — ألوان ثابتة فاخرة لا تتأثر بالثيم
const cardStyle = {
  width: 'min(400px, 100%)',
  margin: '0 auto',
  aspectRatio: '4 / 5',
  borderRadius: '16px',
  padding: '14px',
  boxSizing: 'border-box',
  background:
    'radial-gradient(130% 130% at 50% 0%, #1a4449 0%, #0d2427 45%, #071415 100%)',
  border: '5px double #d8b96c',
  position: 'relative',
  overflow: 'hidden',
  boxShadow: '0 20px 60px rgba(0,0,0,0.55)',
  direction: 'rtl',
};

const innerFrame = {
  border: '1px solid rgba(216,185,108,0.45)',
  borderRadius: '10px',
  padding: '20px 14px 16px',
  height: '100%',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
};

export default CertificateModal;
