// QuoteImageModal — تحويل نص مُختار إلى بطاقة مصوّرة جميلة (PNG) قابلة للتشارك
// يعرض معاينة بحجم ثابت (مثالي للواتساب/التليجرام/تويتر) مع زر تنزيل الصورة.
import { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiDownload, FiX, FiImage, FiCheck } from 'react-icons/fi';

const QuoteImageModal = ({ show, text, source, onClose }) => {
  const cardRef = useRef(null);
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);
  // النصوص الطويلة جدًا تُقص حتى لا تخرج عن البطاقة (4:5)
  const rawText = (text || '').trim();
  const cleanText = rawText.length > 600 ? `${rawText.slice(0, 600).trim()}…` : rawText;
  // خط أصغر على شاشات الفون الضيقة حتى لا يتزاحم النص
  const isNarrow = typeof window !== 'undefined' && window.innerWidth < 420;
  // حجم نص الاقتباس داخل البطاقة (مثالي لكارت 4:5)
  const quoteFontSize = cleanText.length > 220 ? (isNarrow ? 19 : 22) : (isNarrow ? 24 : 28);

  const handleDownload = useCallback(async () => {
    if (!cardRef.current || !cleanText) return;
    setGenerating(true);
    try {
      const { toPng } = await import('html-to-image');
      // دقة أعلى من الكرت حتى تظهر حادة على الشاشات العادية
      // عرض ثابت ~800px مهما كان حجم الشاشة (مهم للفون حيث البطاقة أصغر)
      const cardWidth = cardRef.current.offsetWidth || 400;
      const pixelRatio = Math.min(3, 800 / cardWidth);
      const dataUrl = await toPng(cardRef.current, { pixelRatio, cacheBust: true, backgroundColor: '#0b0f0f' });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `فقهي-اقتباس-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    } catch (err) {
      console.error('فشل توليد الصورة:', err);
      alert('تعذّر توليد الصورة، حاول مجددًا.');
    } finally {
      setGenerating(false);
    }
  }, [cleanText]);

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
              <h6 className="mb-0 fw-bold" style={{ color: '#1a1a1a' }}>بطاقة مصوّرة</h6>
              <button className="btn btn-sm p-1" onClick={onClose} aria-label="إغلاق">
                <FiX size={18} />
              </button>
            </div>

            {/* المعاينة — البطاقة التي تُحوَّل لصورة */}
            <div ref={cardRef} style={cardStyle}>
              <div style={{ fontFamily: "'Amiri', serif", color: '#d8b96c', fontSize: '22px', marginBottom: '10px', textAlign: 'center' }}>۞</div>
              <div
                className="quote-text"
                style={{
                  fontFamily: "'Amiri', serif",
                  fontSize: `${quoteFontSize}px`,
                  lineHeight: '2',
                  color: '#f5ead1',
                  textAlign: 'center',
                  direction: 'rtl',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {cleanText}
              </div>
              <div
                style={{
                  height: '1px',
                  background: 'linear-gradient(90deg, transparent, #d8b96c, transparent)',
                  margin: '18px 0 14px',
                  opacity: 0.7,
                }}
              />
              <div style={{ textAlign: 'center' }}>
                {source ? (
                  <div style={{ fontFamily: "'Amiri', serif", fontSize: '14px', color: '#c9d3d0', marginBottom: '8px', lineHeight: '1.6' }}>
                    {source}
                  </div>
                ) : null}
                <span style={{ fontFamily: "'Amiri', serif", fontWeight: '700', fontSize: '16px', color: '#d8b96c' }}>الباحث الفقهي</span>
                <span style={{ color: '#9aa5b1', fontSize: '12px', margin: '0 8px', fontFamily: "'Tajawal', 'Segoe UI', sans-serif" }}>•</span>
                <span style={{ color: '#9aa5b1', fontSize: '13px', fontFamily: "'Tajawal', 'Segoe UI', sans-serif", direction: 'ltr', unicodeBidi: 'embed' }}>fqh.me</span>
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
                {done ? 'تم التنزيل' : generating ? 'جارٍ التوليد...' : 'تنزيل الصورة (PNG)'}
                {!done && !generating && <FiDownload size={16} />}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// أسلوب كارت ثابت (ألوان مخطوطات) — لا يتأثر بثيم التطبيق حتى تخرج الصورة موحّدة/جميلة
// العرض مرن: 400px على الشاشات الكبيرة، وبعرض الشاشة على الفون
const cardStyle = {
  width: 'min(400px, 100%)',
  margin: '0 auto',
  aspectRatio: '4 / 5',
  borderRadius: '16px',
  padding: '30px 26px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  boxSizing: 'border-box',
  background:
    'radial-gradient(120% 120% at 50% 0%, #16343a 0%, #0b1f24 45%, #071419 100%)',
  border: '6px double #d8b96c',
  position: 'relative',
  overflow: 'hidden',
  boxShadow: '0 20px 60px rgba(0,0,0,0.55)',
};

export default QuoteImageModal;