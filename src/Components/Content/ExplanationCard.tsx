import { useState, useMemo, useRef } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { FiBookOpen, FiCopy, FiCheck } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { formatBrackets } from '../../utils/textFormatting';
import { glossaryData as defaultGlossary } from '../../data/glossary';
import { sortedGlossaryTerms, createGlossaryRenderer } from '../../utils/glossaryUtil';
import { copyText } from '../../utils/clipboard';
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
  const [isExpanded, setIsExpanded] = useState(false);

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
  // حساب طول الشرح (عدد الكلمات تقريباً)
  const wordCount = (explanation || '').trim().split(/\s+/).length;
  const isLongIssue = wordCount > 100;

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
    if (/^##\s+/.test(trimmed)) {
      const headingText = trimmed.replace(/^##\s+/, '');
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

    // التعرف على القوائم الرقمية (مثل 1- أو ٢- أو 1. أو ٢.)
    const isListItem = /^[0-9١-٩]+[.\-)]\s*/.test(paragraph.trim());

    // تطبيق فئة CSS إضافية للمسائل الطويلة
    const typoClass = isLongIssue ? 'typography-enhanced' : '';

    return (
      <motion.p
        key={index}
        className={`mb-3 ${typoClass}`}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(index * 0.05, 0.4), duration: 0.4, ease: 'easeOut' }}
        style={{
          lineHeight: isLongIssue ? '2.2' : '1.9',
          fontSize: isLongIssue ? '1.25rem' : '1.1rem',
          color: 'var(--text-main)',
          paddingRight: isListItem ? '1.5rem' : '0',
          textIndent: isListItem ? '-1.5rem' : '0',
          textAlign: 'right'
        }}
      >
            {titlePart && (
              <strong
                className={`explanation-title ${isLongIssue ? 'highlighted-title' : ''}`}
                style={!isLongIssue ? { marginLeft: '6px', fontWeight: '700', color: 'var(--primary-color)' } : {}}
              >
                {renderGlossary(titlePart.replace(/:$/, ''), `${index}-title`)}{titlePart.endsWith(':') ? ':' : ''}
              </strong>
            )}
        <span className={isLongIssue ? 'enhanced-body' : ''} style={{ fontWeight: '500' }}>
          {formatBrackets(bodyPart, searchQuery, (text: string, key: string | number) => renderGlossary(text, String(key)))}
        </span>
      </motion.p>
    );
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="custom-card p-4 p-md-5 mb-4 shadow-sm explanation-card position-relative parchment-texture"
      >
        <div className="position-absolute top-0 start-0 m-3 d-flex gap-2">
          <button
            onClick={handleCopy}
            className="btn btn-sm d-flex align-items-center justify-content-center"
            title="نسخ النص"
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)' }}
          >
            {copied ? <FiCheck color="green" size={20} /> : <FiCopy size={20} />}
          </button>
        </div>
        <h5 className="mb-4 d-flex align-items-center justify-content-center fw-bold explanation-title">
           تعليق الشيخ <FiBookOpen className="ms-2" />
        </h5>

        {/* عرض الشرح منسقاً ومن اليمين لليسار */}
        <div
          className={`mt-3 ${isLongIssue ? 'is-long-issue' : ''}`}
          style={{
            textAlign: 'right',
            direction: 'rtl',
            wordWrap: 'break-word',
            maxHeight: isLongIssue && !isExpanded ? '250px' : 'none',
            overflow: 'hidden',
            position: 'relative',
            transition: 'max-height 0.3s ease'
          }}
        >
          {explanation.split('\n').map((paragraph, index) => renderParagraph(paragraph, index))}
          {isLongIssue && !isExpanded && (
            <div 
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '80px',
                background: 'linear-gradient(transparent, var(--bg-color))',
                pointerEvents: 'none'
              }}
            />
          )}
        </div>

        {isLongIssue && (
          <div className="text-center mt-2">
            <button 
              className="btn btn-sm"
              onClick={() => setIsExpanded(!isExpanded)}
              style={{ 
                backgroundColor: 'var(--badge-bg)', 
                color: 'var(--primary-color)', 
                border: '1px solid var(--border-color)', 
                borderRadius: '20px', 
                padding: '5px 20px', 
                fontWeight: 'bold', 
                position: 'relative', 
                zIndex: 2,
                transition: 'all 0.2s ease'
              }}
            >
              {isExpanded ? 'عرض أقل' : 'قراءة المزيد'}
            </button>
          </div>
        )}
      </motion.div>

      {/* Glossary Tooltip — تعريف المصطلح في شرح الشيخ */}
      {tooltipInfo.show && createPortal(
        <div
          ref={tooltipRef}
          className="glossary-tooltip-popup"
          style={{ position: 'fixed', top: tooltipInfo.y, left: tooltipInfo.x, zIndex: 9999 }}
        >
          <div className="glossary-tooltip-content">
            <strong className="d-block mb-1" style={{ color: 'var(--accent-color)', fontSize: '0.95rem' }}>
              📖 {tooltipInfo.term}
            </strong>
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
