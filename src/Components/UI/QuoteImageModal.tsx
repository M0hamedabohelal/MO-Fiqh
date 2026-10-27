// QuoteImageModal — تحويل نص مُختار إلى بطاقة مصوّرة جميلة (PNG) قابلة للتشارك
// يدعم 3 قوالب جمالية (كلاسيكي ذهبي، داكن عصري، ورقي تراثي)
// و3 مقاسات (مربع 1:1، ستوري 9:16، أفقي 16:9) مع علامة مائية ومشاركة مباشرة عبر Web Share API.
import { useRef, useState, useCallback, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiDownload, FiX, FiImage, FiCheck, FiShare2 } from 'react-icons/fi';
import { useFocusTrap } from '../../hooks/useFocusTrap';

export interface QuoteImageModalProps {
  show: boolean;
  text?: string;
  source?: string;
  onClose: () => void;
}

export type QuoteTemplate = 'classic' | 'modern' | 'parchment';
export type QuoteRatio = 'square' | 'story' | 'landscape';

const QuoteImageModal = ({ show, text, source, onClose }: QuoteImageModalProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(dialogRef, show, onClose);

  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);
  const [template, setTemplate] = useState<QuoteTemplate>('classic');
  const [ratio, setRatio] = useState<QuoteRatio>('square');

  // سعة النص بحسب النسبة
  const maxChars = useMemo(() => {
    switch (ratio) {
      case 'story':
        return 850;
      case 'landscape':
        return 450;
      case 'square':
      default:
        return 600;
    }
  }, [ratio]);

  const rawText = (text || '').trim();
  const cleanText = rawText.length > maxChars ? `${rawText.slice(0, maxChars).trim()}…` : rawText;

  // حجم الخط داخل البطاقة بحسب القالب والنسبة وطول النص
  const quoteFontSize = useMemo(() => {
    const len = cleanText.length;
    if (ratio === 'landscape') {
      return len > 180 ? 17 : 21;
    }
    if (ratio === 'story') {
      return len > 280 ? 18 : len > 140 ? 21 : 25;
    }
    // square
    return len > 220 ? 19 : len > 100 ? 23 : 27;
  }, [cleanText.length, ratio]);

  // تجهيز مظهر البطاقة بحسب القالب والنسبة
  const { cardStyles, textColor, accentColor, watermarkColor, dividerBg, bgHex } = useMemo(() => {
    const isParchment = template === 'parchment';
    const isModern = template === 'modern';

    const bgHexColor = isParchment ? '#fbf4e2' : isModern ? '#101414' : '#071419';
    const txtColor = isParchment ? '#261b0f' : isModern ? '#f0f3f2' : '#f5ead1';
    const accColor = isParchment ? '#8c6d3b' : isModern ? '#c9a84c' : '#d8b96c';
    const wmkColor = isParchment ? '#5c4625' : isModern ? '#889895' : '#9aa5b1';
    const divBg = isParchment
      ? 'linear-gradient(90deg, transparent, rgba(140, 109, 59, 0.6), transparent)'
      : isModern
      ? 'linear-gradient(90deg, transparent, rgba(201, 168, 76, 0.5), transparent)'
      : 'linear-gradient(90deg, transparent, #d8b96c, transparent)';

    const base: CSSProperties = {
      width: ratio === 'story' ? 'min(300px, 100%)' : ratio === 'landscape' ? 'min(420px, 100%)' : 'min(360px, 100%)',
      aspectRatio: ratio === 'story' ? '9 / 16' : ratio === 'landscape' ? '16 / 9' : '1 / 1',
      margin: '0 auto',
      borderRadius: isModern ? '14px' : '18px',
      padding: ratio === 'landscape' ? '20px 24px' : ratio === 'story' ? '32px 22px' : '28px 24px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      boxSizing: 'border-box',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 16px 50px rgba(0,0,0,0.4)',
    };

    if (isParchment) {
      base.background = 'radial-gradient(ellipse at 50% 40%, #fffbf0 0%, #f7ecd2 65%, #ebd7b2 100%)';
      base.border = '5px double #8c6d3b';
      base.outline = '1px solid rgba(140, 109, 59, 0.4)';
      base.outlineOffset = '-10px';
    } else if (isModern) {
      base.background = 'linear-gradient(150deg, #1a2222 0%, #101515 55%, #0a0d0d 100%)';
      base.border = '1px solid rgba(201, 168, 76, 0.4)';
    } else {
      // classic gold
      base.background = 'radial-gradient(120% 120% at 50% 0%, #16343a 0%, #0b1f24 45%, #071419 100%)';
      base.border = '5px double #d8b96c';
    }

    return {
      cardStyles: base,
      textColor: txtColor,
      accentColor: accColor,
      watermarkColor: wmkColor,
      dividerBg: divBg,
      bgHex: bgHexColor,
    };
  }, [template, ratio]);

  // دالة تصيير الصورة
  const renderCardToPng = useCallback(async (): Promise<string | null> => {
    if (!cardRef.current || !cleanText) return null;
    const { toPng } = await import('html-to-image');
    const targetWidth = ratio === 'story' ? 1080 : ratio === 'landscape' ? 1200 : 1080;
    const cardWidth = cardRef.current.offsetWidth || 360;
    const pixelRatio = Math.min(3, targetWidth / cardWidth);

    return toPng(cardRef.current, {
      pixelRatio,
      cacheBust: true,
      backgroundColor: bgHex,
    });
  }, [cleanText, ratio, bgHex]);

  // تنزيل الصورة
  const handleDownload = useCallback(async () => {
    if (generating || !cleanText) return;
    setGenerating(true);
    try {
      const dataUrl = await renderCardToPng();
      if (!dataUrl) return;

      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `fqh-quote-${template}-${ratio}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch (err) {
      console.error('فشل تنزيل الصورة:', err);
      alert('تعذّر توليد الصورة، حاول مجددًا.');
    } finally {
      setGenerating(false);
    }
  }, [generating, cleanText, renderCardToPng, template, ratio]);

  // مشاركة مباشرة عبر Web Share API
  const handleDirectShare = useCallback(async () => {
    if (generating || !cleanText) return;
    setGenerating(true);
    try {
      const dataUrl = await renderCardToPng();
      if (!dataUrl) return;

      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `fqh-quote-${template}-${Date.now()}.png`, { type: 'image/png' });

      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'فائدة فقهية من منصة يَسِّر',
          text: source ? `${cleanText}\n\n— ${source}` : cleanText,
          files: [file],
        });
        setDone(true);
        setTimeout(() => setDone(false), 2000);
      } else {
        // Fallback تنزيل تلقائي إن كانت المشاركة المباشرة غير مدعومة
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `fqh-quote-${template}-${ratio}-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setDone(true);
        setTimeout(() => setDone(false), 2000);
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        console.error('فشل مشاركة الصورة:', err);
      }
    } finally {
      setGenerating(false);
    }
  }, [generating, cleanText, renderCardToPng, template, ratio, source]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="position-fixed top-0 start-0 end-0 bottom-0 d-flex align-items-center justify-content-center"
          style={{ zIndex: 'var(--z-overlay)', background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(5px)' }}
          onClick={onClose}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="بطاقة مقتبسة مصوّرة"
            tabIndex={-1}
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            className="bg-white p-3 rounded-4"
            style={{ maxWidth: 'min(94vw, 480px)', width: '100%', maxHeight: '94dvh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* الترويسة والإغلاق */}
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0 fw-bold" style={{ color: '#1a1a1a' }}>مشاركة الفائدة كصورة</h6>
              <button className="btn btn-sm p-1" onClick={onClose} aria-label="إغلاق">
                <FiX size={18} />
              </button>
            </div>

            {/* اختيار القالب (3 قوالب) */}
            <div className="mb-2">
              <label className="form-label small fw-bold mb-1" style={{ color: '#555' }}>القالب الفني:</label>
              <div className="d-flex gap-2" role="group" aria-label="قالب البطاقة">
                {(
                  [
                    { key: 'classic', label: 'كلاسيكي ذهبي' },
                    { key: 'modern', label: 'داكن عصري' },
                    { key: 'parchment', label: 'ورقي تراثي' },
                  ] as const
                ).map(({ key, label }) => {
                  const active = template === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTemplate(key)}
                      className="btn btn-sm flex-fill"
                      style={{
                        background: active ? 'linear-gradient(135deg, #c9a84c, #e6c875)' : '#f1f3f4',
                        color: active ? '#1a1a1a' : '#444',
                        border: '1px solid ' + (active ? '#b8933b' : '#ddd'),
                        borderRadius: '8px',
                        fontWeight: active ? 'bold' : 'normal',
                        fontSize: '0.82rem',
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* اختيار المقاس والنسبة (3 نسب) */}
            <div className="mb-3">
              <label className="form-label small fw-bold mb-1" style={{ color: '#555' }}>المقاس:</label>
              <div className="d-flex gap-2" role="group" aria-label="مقاس البطاقة">
                {(
                  [
                    { key: 'square', label: 'مربع 1:1' },
                    { key: 'story', label: 'ستوري 9:16' },
                    { key: 'landscape', label: 'أفقي 16:9' },
                  ] as const
                ).map(({ key, label }) => {
                  const active = ratio === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setRatio(key)}
                      className="btn btn-sm flex-fill"
                      style={{
                        background: active ? '#2c3e50' : '#f1f3f4',
                        color: active ? '#fff' : '#444',
                        border: '1px solid ' + (active ? '#2c3e50' : '#ddd'),
                        borderRadius: '8px',
                        fontWeight: active ? 'bold' : 'normal',
                        fontSize: '0.82rem',
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* معاينة البطاقة */}
            <div className="d-flex justify-content-center align-items-center p-2 mb-3 bg-light rounded-3 overflow-hidden">
              <div ref={cardRef} style={cardStyles}>
                {/* علامة التصدير العلوية */}
                <div style={{ fontFamily: "'Amiri', serif", color: accentColor, fontSize: '20px', textAlign: 'center' }}>
                  ۞
                </div>

                {/* نص الفائدة */}
                <div
                  className="quote-text my-auto"
                  style={{
                    fontFamily: "'Amiri', serif",
                    fontSize: `${quoteFontSize}px`,
                    lineHeight: ratio === 'landscape' ? '1.75' : '1.9',
                    color: textColor,
                    textAlign: 'center',
                    direction: 'rtl',
                    whiteSpace: 'pre-wrap',
                    padding: '6px 4px',
                  }}
                >
                  {cleanText}
                </div>

                {/* الفاصل الزخرفي والعلامة المائية */}
                <div>
                  <div
                    style={{
                      height: '1px',
                      background: dividerBg,
                      margin: ratio === 'landscape' ? '8px 0 6px' : '12px 0 10px',
                      opacity: 0.75,
                    }}
                  />
                  <div style={{ textAlign: 'center' }}>
                    {source ? (
                      <div
                        style={{
                          fontFamily: "'Amiri', serif",
                          fontSize: '13px',
                          color: textColor,
                          opacity: 0.85,
                          marginBottom: '4px',
                          lineHeight: '1.4',
                        }}
                      >
                        {source}
                      </div>
                    ) : null}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', opacity: 0.88 }}>
                      <span style={{ fontFamily: "'Amiri', serif", fontWeight: '700', fontSize: '15px', color: accentColor }}>
                        يَسِّر
                      </span>
                      <span style={{ color: watermarkColor, fontSize: '11px' }}>•</span>
                      <span
                        style={{
                          color: watermarkColor,
                          fontSize: '12px',
                          fontFamily: "'Tajawal', 'Segoe UI', sans-serif",
                          direction: 'ltr',
                          unicodeBidi: 'embed',
                          letterSpacing: '0.5px',
                        }}
                      >
                        fqh.me
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* أزرار الحفظ والمشاركة */}
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn d-flex align-items-center justify-content-center gap-2 flex-fill shadow-sm"
                disabled={generating}
                onClick={handleDirectShare}
                style={{
                  background: 'linear-gradient(135deg, #0f3d3e, #1a5658)',
                  color: '#fff',
                  fontWeight: 'bold',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '9px',
                  fontSize: '0.9rem',
                }}
              >
                <FiShare2 size={16} />
                مشاركة مباشرة
              </button>

              <button
                type="button"
                className="btn d-flex align-items-center justify-content-center gap-2 flex-fill shadow-sm"
                disabled={generating}
                onClick={handleDownload}
                style={{
                  background: 'linear-gradient(135deg, #c9a84c, #e6c875)',
                  color: '#1a1a1a',
                  fontWeight: 'bold',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '9px',
                  fontSize: '0.9rem',
                }}
              >
                {done ? <FiCheck size={17} /> : <FiImage size={17} />}
                {done ? 'تم التنزيل' : generating ? 'جارٍ التوليد...' : 'تنزيل (PNG)'}
                {!done && !generating && <FiDownload size={15} />}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default QuoteImageModal;
