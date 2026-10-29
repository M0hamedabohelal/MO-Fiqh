import React, { useState, useRef, useMemo, useEffect } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { FiCopy, FiCheck, FiBookOpen, FiLink } from 'react-icons/fi';
import styles from './QuoteCard.module.css';
import { glossaryData as defaultGlossary } from '../../data/glossary';
import { formatBrackets } from '../../utils/textFormatting';
import { copyText } from '../../utils/clipboard';
import { sortedGlossaryTerms, createGlossaryRenderer } from '../../utils/glossaryUtil';
import type { GlossaryMap } from '../../types';

interface QuoteCardProps {
  text: string;
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

interface CrossLinkTextPart {
  type: 'text';
  content: string;
}

interface CrossLinkAnchorPart {
  type: 'link';
  text: string;
  lessonId: string;
}

type CrossLinkPart = CrossLinkTextPart | CrossLinkAnchorPart;

const QuoteCard = ({ text, searchQuery, glossary = defaultGlossary }: QuoteCardProps) => {
  const [copied, setCopied] = useState(false);
  const [tooltipInfo, setTooltipInfo] = useState<TooltipInfo>({ show: false, term: '', definition: '', x: 0, y: 0 });
  const [isExpanded, setIsExpanded] = useState(false);

  // حساب طول المسألة (عدد الكلمات تقريباً)
  const wordCount = (text || '').trim().split(/\s+/).length;
  const isLongIssue = wordCount > 150;

  const handleCopy = async (): Promise<void> => {
    const ok = await copyText(text);
    if (!ok) {
      alert('تعذّر النسخ التلقائي — حدّد النص يدويًا وانسخه.');
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const positionAtPointer = (clientX: number, clientY: number): void => {
    const el = tooltipRef.current;
    if (!el) return;
    const H = el.offsetHeight;
    const W = el.offsetWidth;
    const margin = 10;
    // يظهر قريبًا جدًا من المؤشر، مع هامش صغير حتى لا يحجبه السهم نفسه
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
    setTooltipInfo({ show: true, term, definition: glossary[term] || 'لا يوجد تعريف', x: cx + 9, y: cy + 9 });
    if (posTimer.current) clearTimeout(posTimer.current);
    posTimer.current = setTimeout(() => positionAtPointer(cx, cy), 10);
  };

  const handleTermClick = (e: MouseEvent, term: string): void => {
    const cx = e.clientX;
    const cy = e.clientY;
    setTooltipInfo({ show: true, term, definition: glossary[term] || 'لا يوجد تعريف', x: cx + 9, y: cy + 9 });
    if (posTimer.current) clearTimeout(posTimer.current);
    posTimer.current = setTimeout(() => positionAtPointer(cx, cy), 10);
  };

  // يُحدّث موضع البوب ليلاحق سهم الماوس فوق الكلمة — مخنوق بإطار واحد لتجنب قراءات التخطيط المتكررة
  const handleTermMove = (e: MouseEvent): void => {
    const { clientX, clientY } = e;
    if (moveRaf.current) return;
    moveRaf.current = requestAnimationFrame(() => {
      moveRaf.current = 0;
      positionAtPointer(clientX, clientY);
    });
  };

  const handleTermLeave = () => {
    setTooltipInfo((p) => ({ ...p, show: false }));
  };

  const tooltipRef = useRef<HTMLDivElement>(null);
  const moveRaf = useRef<number>(0);
  const posTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // تنظيف مؤقتات الموضع وإطار الرسم عند الإزالة (منع عمل بعد unmount)
  useEffect(() => () => {
    if (posTimer.current) clearTimeout(posTimer.current);
    if (moveRaf.current) cancelAnimationFrame(moveRaf.current);
  }, []);

  const highlightSearch = (plainText: string, baseKey: string): ReactNode => {
    if (!searchQuery || !searchQuery.trim()) {
      return <span key={baseKey}>{plainText}</span>;
    }
    const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = plainText.split(new RegExp(`(${escapedQuery})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase()
        ? (
          <mark
            key={`${baseKey}-hl-${i}`}
            style={{
              backgroundColor: 'rgba(251, 220, 153, 0.75)',
              color: 'inherit',
              borderRadius: '3px',
              padding: '0 2px',
            }}
          >
            {part}
          </mark>
        )
        : <span key={`${baseKey}-s-${i}`}>{part}</span>
    );
  };

  const parseCrossLinks = (plainText: string, baseKey: string): ReactNode => {
    // نبحث عن نمط: [نص](lesson:123) — نفس صيغة textFormatting (تدعم المعرفات النصية أيضًا)
    const regex = /\[([^\]]+)\]\(lesson:([\w-]+)\)/g;
    const parts: CrossLinkPart[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(plainText)) !== null) {
      const textBefore = plainText.substring(lastIndex, match.index);
      if (textBefore) {
        parts.push({ type: 'text', content: textBefore });
      }
      parts.push({
        type: 'link',
        text: match[1],
        lessonId: match[2]
      });
      lastIndex = regex.lastIndex;
    }
    const textAfter = plainText.substring(lastIndex);
    if (textAfter) {
      parts.push({ type: 'text', content: textAfter });
    }

    return parts.map((part, i) => {
      if (part.type === 'link') {
        return (
          <a
            key={`${baseKey}-link-${i}`}
            href={`#/lesson/${part.lessonId}`}
            className="cross-link"
            title="انتقل إلى هذه المسألة"
          >
            <FiLink className="cross-link-icon" /> {part.text}
          </a>
        );
      }
      // تمرير النص العادي إلى دالة البحث (ويمكن إضافة قاموس لاحقاً لو أردنا)
      return <React.Fragment key={`${baseKey}-txt-${i}`}>{highlightSearch(part.content, `${baseKey}-txt-${i}`)}</React.Fragment>;
    });
  };

  // مصطلحات القاموس مُطبَّعة ومرتّبة من الأطول للأقصر — من الأداة المشتركة
  const glossaryTerms = useMemo(() => sortedGlossaryTerms(glossary), [glossary]);

  // النصوص تُعرض عبر renderer يمرر معالجات القاموس الموحدة مع ربط الإحالات التبادلية
  // eslint-disable-next-line react-hooks/refs
  const renderGlossaryBase = createGlossaryRenderer(glossaryTerms, {
    onHover: handleTermHover,
    onClick: handleTermClick,
    onMove: handleTermMove,
    onLeave: handleTermLeave,
  });

  const renderGlossary = (plainText: string, baseKey: string | number): ReactNode[] =>
    renderGlossaryBase(plainText, baseKey, parseCrossLinks);

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
          <span className="mid-heading-text">{formatBrackets(midMatch[1], searchQuery, renderGlossary)}</span>
        </div>
      );
    }
    if (/^##(?!#)\s*\S/.test(trimmed)) {
      const headingText = trimmed.replace(/^##\s*/, '');
      return (
        <div key={index} className="mid-heading">
          <span className="mid-heading-text">{formatBrackets(headingText, searchQuery, renderGlossary)}</span>
        </div>
      );
    }

    // اقتباس العلماء: > نص الاقتباس
    if (trimmed.startsWith('>')) {
      const quoteText = trimmed.replace(/^>\s?/, '');
      return (
        <blockquote key={index} className="scholar-quote">
          {formatBrackets(quoteText, searchQuery, renderGlossary)}
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

    // إذا كانت المسألة طويلة، نطبق فئة CSS إضافية لتوضيح التنسيق (Typography)
    const typoClass = isLongIssue ? 'typography-enhanced' : '';

    return (
      <motion.p
        key={index}
        className={`${styles.paragraph} ${typoClass}`}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(index * 0.05, 0.4), duration: 0.4, ease: 'easeOut' }}
        style={{
          paddingRight: isListItem ? '1.5rem' : '0',
          textIndent: isListItem ? '-1.5rem' : '0',
          textAlign: 'right'
        }}
      >
        {titlePart && (
          <strong 
            className={`${styles.titlePart} ${isLongIssue ? 'highlighted-title' : ''}`}
            style={{ color: 'var(--primary-color)' }}
          >
            {renderGlossary(titlePart.replace(/:$/, ''), `${index}-title`)}{titlePart.endsWith(':') ? ':' : ''}
          </strong>
        )}
        <span className={isLongIssue ? 'enhanced-body' : ''} style={{ fontWeight: '500' }}>
          {formatBrackets(bodyPart, searchQuery, renderGlossary)}
        </span>
      </motion.p>
    );
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        data-selectable="body-text"
        className={`custom-card p-4 p-md-5 mb-4 position-relative shadow-sm manuscript-frame parchment-texture ${styles.cardContainer}`}
      >
        <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom" style={{ borderColor: 'var(--border-color)' }}>
          <span
            className="badge d-inline-flex align-items-center gap-2 py-1 px-3 shadow-sm"
            style={{
              backgroundColor: 'var(--badge-bg)',
              color: 'var(--accent-color)',
              border: '1px solid var(--border-color)',
              borderRadius: '50px',
              fontWeight: 700,
              fontSize: '0.88rem',
            }}
          >
            <FiBookOpen size={16} /> متن المسألة
          </span>
          <button
            onClick={handleCopy}
            className={`btn btn-sm d-flex align-items-center justify-content-center ${styles.copyButton}`}
            title="نسخ النص"
            aria-label="نسخ نص المسألة"
          >
            {copied ? <FiCheck color="green" size={20} /> : <FiCopy size={20} />}
          </button>
        </div>

        <div 
          className={`mt-3 ${styles.textContent} ${isLongIssue ? 'is-long-issue' : ''}`}
          style={{
            maxHeight: isLongIssue && !isExpanded ? '250px' : 'none',
            overflow: 'hidden',
            position: 'relative',
            transition: 'max-height 0.3s ease'
          }}
        >
          {text.split('\n').map((paragraph, index) => renderParagraph(paragraph, index))}
          {isLongIssue && !isExpanded && (
            <div 
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '100px',
                background: 'linear-gradient(transparent, var(--card-bg))',
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

        {/* Glossary Tooltip */}
        {tooltipInfo.show && createPortal(
          <div
            ref={tooltipRef}
            className="glossary-tooltip-popup"
            style={{
              position: 'fixed',
              top: tooltipInfo.y,
              left: tooltipInfo.x,
              zIndex: 'var(--z-tooltip)',
            }}
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
                {tooltipInfo.definition}
              </span>
            </div>
          </div>,
          document.body
        )}
      </motion.div>
    </>
  );
};

export default QuoteCard;
