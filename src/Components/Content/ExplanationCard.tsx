import { useState, useMemo, useRef } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { FiCopy, FiCheck, FiMessageSquare, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { formatBrackets } from '../../utils/textFormatting';
import { glossaryData as defaultGlossary } from '../../data/glossary';
import { sortedGlossaryTerms, createGlossaryRenderer } from '../../utils/glossaryUtil';
import { copyText } from '../../utils/clipboard';
import { triggerHaptic } from '../../utils/haptics';
import type { GlossaryMap } from '../../types';

interface ExplanationCardProps {
  explanation: string;
  searchQuery: string;
  glossary?: GlossaryMap;
}

interface TooltipInfo {
  show: boolean;
  term: string;
  definition: string;
  x: number;
  y: number;
}

const ExplanationCard = ({ explanation, searchQuery, glossary = defaultGlossary }: ExplanationCardProps) => {
  const [copied, setCopied] = useState(false);

  // إحصائيات القراءة والتحكم بالطي والتوسيع
  const readingStats = useMemo(() => {
    const trimmed = (explanation || '').trim();
    if (!trimmed) return { isCollapsible: false, estimatedMinutes: 0, wordsCount: 0 };
    const words = trimmed.split(/\s+/).filter(Boolean);
    const wordsCount = words.length;
    // الشرح الطويل (أكثر من 70 كلمة أو أكثر من 360 حرفاً) يكون قابلاً للطي
    const isCollapsible = wordsCount > 70 || trimmed.length > 360;
    const estimatedMinutes = Math.max(1, Math.round(wordsCount / 140));
    return { isCollapsible, estimatedMinutes, wordsCount };
  }, [explanation]);

  // التحقق إن كان استعلام البحث موجوداً داخل نص الشرح
  const hasSearchMatch = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) return false;
    return (explanation || '').toLowerCase().includes(searchQuery.trim().toLowerCase());
  }, [explanation, searchQuery]);

  // تفاعل المستخدم اليدوي مع الطي والتوسيع
  const [userExpanded, setUserExpanded] = useState<boolean | null>(null);

  // الحالة الفعلية المحسوبة:
  // 1. اختيار المستخدم اليدوي له الأولوية إذا وُجد
  // 2. إذا تطابق استعلام البحث مع نص الشرح يفتح تلقائياً
  // 3. الشروحات القصيرة مفتوحة دائماً
  // 4. الشروحات الطويلة تبدأ مطوية افتراضياً لتسهيل قراءة المتن
  const isExpanded = userExpanded !== null
    ? userExpanded
    : (hasSearchMatch || !readingStats.isCollapsible);

  const handleToggleExpand = () => {
    triggerHaptic('selection');
    setUserExpanded(!isExpanded);
  };

  // نافذة توضيح المصطلح
  const [tooltipInfo, setTooltipInfo] = useState<TooltipInfo>({ show: false, term: '', definition: '', x: 0, y: 0 });
  const sortedTerms = useMemo(() => sortedGlossaryTerms(glossary), [glossary]);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const moveRaf = useRef<number>(0);

  const positionAtPointer = (clientX: number, clientY: number): void => {
    const el = tooltipRef.current;
    if (!el) return;
    const H = el.offsetHeight;
    const W = el.offsetWidth;
    const margin = 10;
    let left = clientX + 9;
    let top = clientY + 9;
    if (top + H > window.innerHeight - margin) top = clientY - H - margin;
    if (left + W > window.innerWidth - margin) left = clientX - W - margin;
    left = Math.max(margin, left);
    top = Math.max(margin, top);
    el.style.top = `${top}px`;
    el.style.left = `${left}px`;
    el.style.transform = 'none';
  };

  const handleTermHover = (e: MouseEvent, term: string): void => {
    const cx = e.clientX;
    const cy = e.clientY;
    setTooltipInfo({ show: true, term, definition: glossary[term], x: cx + 9, y: cy + 9 });
    setTimeout(() => positionAtPointer(cx, cy), 10);
  };
  const handleTermClick = (e: MouseEvent, term: string): void => {
    const cx = e.clientX;
    const cy = e.clientY;
    setTooltipInfo({ show: true, term, definition: glossary[term], x: cx + 9, y: cy + 9 });
    setTimeout(() => positionAtPointer(cx, cy), 10);
  };
  const handleTermMove = (e: MouseEvent): void => {
    // خنق بإطار واحد: قراءة أبعاد العنصر في كل حدث حركة مكلفة
    const { clientX, clientY } = e;
    if (moveRaf.current) return;
    moveRaf.current = requestAnimationFrame(() => {
      moveRaf.current = 0;
      positionAtPointer(clientX, clientY);
    });
  };
  const handleTermLeave = () => setTooltipInfo((p) => ({ ...p, show: false }));

  // النصوص تُعرض عبر renderer يمرر معالجات (لا يقرأ refs أثناء الرسم)
  // eslint-disable-next-line react-hooks/refs
  const renderGlossary = createGlossaryRenderer(sortedTerms, {
    onHover: handleTermHover,
    onClick: handleTermClick,
    onMove: handleTermMove,
    onLeave: handleTermLeave,
  });

  const handleCopy = async (): Promise<void> => {
    const ok = await copyText(explanation);
    if (!ok) {
      alert('تعذّر النسخ التلقائي — حدّد النص يدويًا وانسخه.');
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderParagraph = (paragraph: string, index: number): ReactNode => {
    if (!paragraph.trim()) return null;

    // فاصل زخرفي إسلامي
    if (paragraph.trim() === '***') {
      return (
        <div key={index} className="islamic-divider">
          <span className="islamic-divider-icon">۞</span>
        </div>
      );
    }

    const trimmed = paragraph.trim();

    // عنوان وسطي: ## عنوان ## أو ## عنوان
    const midMatch = trimmed.match(/^##\s*(.+?)\s*##$/);
    if (midMatch) {
      return (
        <div key={index} className="mid-heading">
          <span className="mid-heading-text">{formatBrackets(midMatch[1], searchQuery, (text: string, key: string | number) => renderGlossary(text, String(key)))}</span>
        </div>
      );
    }
    if (/^##(?!#)\s*\S/.test(trimmed)) {
      const headingText = trimmed.replace(/^##\s*/, '');
      return (
        <div key={index} className="mid-heading">
          <span className="mid-heading-text">{formatBrackets(headingText, searchQuery, (text: string, key: string | number) => renderGlossary(text, String(key)))}</span>
        </div>
      );
    }

    // اقتباس العلماء: > نص الاقتباس
    if (trimmed.startsWith('>')) {
      const quoteText = trimmed.replace(/^>\s?/, '');
      return (
        <blockquote key={index} className="scholar-quote">
          {formatBrackets(quoteText, searchQuery, (text: string, key: string | number) => renderGlossary(text, String(key)))}
        </blockquote>
      );
    }

    const colonIndex = paragraph.indexOf(':');
    let titlePart = '';
    let bodyPart = paragraph;

    // تمييز العناوين الفرعية (الكلمات التي تسبق النقطتين الرأسيتين في بداية الفقرة)
    if (colonIndex !== -1 && colonIndex < 80) {
      titlePart = paragraph.substring(0, colonIndex + 1);
      bodyPart = paragraph.substring(colonIndex + 1);
    }

    return (
      <motion.p
        key={index}
        className="explanation-paragraph mb-3"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(index * 0.04, 0.3), duration: 0.3, ease: 'easeOut' }}
        style={{
          lineHeight: '2.1',
          fontSize: 'calc(var(--reading-font-size, var(--base-font-size, 16px)) * 1.15)',
          color: 'var(--text-main)',
          textAlign: 'right',
        }}
      >
        {titlePart && (
          <strong
            className="explanation-title"
            style={{ marginLeft: '6px', fontWeight: '700', color: 'var(--primary-color)' }}
          >
            {renderGlossary(titlePart.replace(/:$/, ''), `${index}-title`)}{titlePart.endsWith(':') ? ':' : ''}
          </strong>
        )}
        <span style={{ fontWeight: '500', fontSize: 'inherit' }}>
          {formatBrackets(bodyPart, searchQuery, (text: string, key: string | number) => renderGlossary(text, String(key)))}
        </span>
      </motion.p>
    );
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        data-selectable="body-text"
        className="custom-card p-3 p-sm-4 p-md-4 mb-4 shadow-sm explanation-card position-relative parchment-texture"
      >
        <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom" style={{ borderColor: 'var(--border-color)' }}>
          <span
            className="badge d-inline-flex align-items-center gap-2 py-1 px-3 shadow-sm"
            style={{
              backgroundColor: 'var(--badge-bg)',
              color: 'var(--primary-color)',
              border: '1px solid var(--border-color)',
              borderRadius: '50px',
              fontWeight: 700,
              fontSize: '0.88rem',
            }}
          >
            <FiMessageSquare size={16} /> شرح وتعليق الشيخ
          </span>
          <div className="d-flex align-items-center gap-1">
            {readingStats.isCollapsible && (
              <button
                type="button"
                onClick={handleToggleExpand}
                className="btn btn-sm d-inline-flex align-items-center gap-1 px-2 py-1"
                title={isExpanded ? 'طي الشرح' : 'توسيع الشرح'}
                aria-label={isExpanded ? 'طي الشرح (الترويسة)' : 'توسيع الشرح (الترويسة)'}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--primary-color)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                }}
              >
                {isExpanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                <span className="d-none d-sm-inline">{isExpanded ? 'طي' : 'توسيع'}</span>
              </button>
            )}
            <button
              onClick={handleCopy}
              className="btn btn-sm d-flex align-items-center justify-content-center"
              title="نسخ النص"
              aria-label="نسخ شرح الشيخ"
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)' }}
            >
              {copied ? <FiCheck color="green" size={20} /> : <FiCopy size={20} />}
            </button>
          </div>
        </div>

        {/* حاوية الشرح مع دعم الطي والتوسيع لتقليل التمرير */}
        <div
          className="position-relative"
          style={{
            maxHeight: isExpanded || !readingStats.isCollapsible ? 'none' : '260px',
            overflow: 'hidden',
            transition: 'max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div
            className="mt-3"
            style={{
              textAlign: 'right',
              direction: 'rtl',
              wordWrap: 'break-word',
              fontSize: 'var(--reading-font-size, var(--base-font-size, 16px))',
            }}
          >
            {explanation.split('\n').map((paragraph, index) => renderParagraph(paragraph, index))}
          </div>

          {/* تدرج التلاشي الأنيق عند الطي */}
          {!isExpanded && readingStats.isCollapsible && (
            <div
              className="explanation-fade-overlay"
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '110px',
                background: 'linear-gradient(to bottom, transparent, var(--card-bg) 92%)',
                pointerEvents: 'none',
              }}
            />
          )}
        </div>

        {/* زر التوسيع والطي التفاعلي أسفل الشرح */}
        {readingStats.isCollapsible && (
          <div className="d-flex justify-content-center mt-3 pt-1 position-relative" style={{ zIndex: 2 }}>
            <button
              type="button"
              className="btn btn-sm d-inline-flex align-items-center gap-2 px-3 py-2 shadow-sm rounded-pill explanation-toggle-btn"
              onClick={handleToggleExpand}
              aria-expanded={isExpanded}
              style={{
                backgroundColor: 'var(--badge-bg)',
                borderColor: 'var(--border-color)',
                color: 'var(--primary-color)',
                fontWeight: 700,
                fontSize: '0.86rem',
                border: '1px solid',
                transition: 'all 0.2s ease',
              }}
            >
              {isExpanded ? (
                <>
                  <FiChevronUp size={16} />
                  <span>طي شرح الشيخ</span>
                </>
              ) : (
                <>
                  <FiChevronDown size={16} />
                  <span>
                    عرض الشرح كاملاً
                    {readingStats.estimatedMinutes > 1
                      ? ` (${readingStats.estimatedMinutes === 2 ? 'دقيقتان قراءة' : `${readingStats.estimatedMinutes} دقائق قراءة`})`
                      : ' (نحو دقيقة قراءة)'}
                  </span>
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>

      {/* Glossary Tooltip — تعريف المصطلح في شرح الشيخ */}
      {tooltipInfo.show && createPortal(
        <div
          ref={tooltipRef}
          className="glossary-tooltip-popup"
          style={{ position: 'fixed', top: tooltipInfo.y, left: tooltipInfo.x, zIndex: 'var(--z-tooltip)' }}
        >
          <div className="glossary-tooltip-content">
            <div className="d-flex align-items-center justify-content-between mb-1 gap-2">
              <strong style={{ color: 'var(--accent-color)', fontSize: '0.95rem' }}>
                📖 {tooltipInfo.term}
              </strong>
              <span className="badge rounded-pill" style={{ backgroundColor: 'var(--badge-bg)', color: 'var(--text-muted)', fontSize: '0.72rem', border: '1px solid var(--border-color)' }}>
                مصطلح فقهي
              </span>
            </div>
            <span style={{ fontSize: '0.9rem', lineHeight: '1.7' }}>
              {tooltipInfo.definition || 'لا يوجد تعريف'}
            </span>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default ExplanationCard;
