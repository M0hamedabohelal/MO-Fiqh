import React, { useState, useRef, useMemo, useEffect } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { FiCopy, FiCheck, FiBookOpen, FiLink, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import styles from './QuoteCard.module.css';
import { glossaryData as defaultGlossary } from '../../data/glossary';
import { formatBrackets } from '../../utils/textFormatting';
import { copyText } from '../../utils/clipboard';
import { triggerHaptic } from '../../utils/haptics';
import { useToast } from '../../errors/useToast';
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
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [tooltipInfo, setTooltipInfo] = useState<TooltipInfo>({ show: false, term: '', definition: '', x: 0, y: 0 });

  // إحصائيات القراءة والتحكم بالطي والتوسيع
  const readingStats = useMemo(() => {
    const trimmed = (text || '').trim();
    if (!trimmed) return { isCollapsible: false, estimatedMinutes: 0, wordsCount: 0 };
    const words = trimmed.split(/\s+/).filter(Boolean);
    const wordsCount = words.length;
    // المتن الطويل (أكثر من 70 كلمة أو أكثر من 360 حرفاً) يكون قابلاً للطي
    const isCollapsible = wordsCount > 70 || trimmed.length > 360;
    const estimatedMinutes = Math.max(1, Math.round(wordsCount / 140));
    return { isCollapsible, estimatedMinutes, wordsCount };
  }, [text]);

  // التحقق إن كان استعلام البحث موجوداً داخل نص المتن
  const hasSearchMatch = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) return false;
    return (text || '').toLowerCase().includes(searchQuery.trim().toLowerCase());
  }, [text, searchQuery]);

  // تفاعل المستخدم اليدوي مع الطي والتوسيع
  const [userExpanded, setUserExpanded] = useState<boolean | null>(null);

  // إعادة تعيين حالة التوسيع عند تغيير نص المسألة
  useEffect(() => {
    setUserExpanded(null);
  }, [text]);

  // الحالة الفعلية المحسوبة:
  // 1. اختيار المستخدم اليدوي له الأولوية إذا وُجد
  // 2. إذا تطابق استعلام البحث مع نص المتن يفتح تلقائياً
  // 3. المتون القصيرة مفتوحة دائماً
  // 4. المتون الطويلة تبدأ مطوية افتراضياً لتسهيل التصفح وتقليل التمرير
  const isExpanded = userExpanded !== null
    ? userExpanded
    : (hasSearchMatch || !readingStats.isCollapsible);

  const handleToggleExpand = () => {
    triggerHaptic('selection');
    setUserExpanded(!isExpanded);
  };

  const handleCopy = async (): Promise<void> => {
    const ok = await copyText(text);
    if (!ok) {
      toast.error('لم يتم النسخ — حدّد النص يدويًا وانسخه.');
      return;
    }
    setCopied(true);
    toast.success('تم نسخ الاقتباس.');
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

    return (
      <motion.p
        key={index}
        className={styles.paragraph}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(index * 0.04, 0.3), duration: 0.3, ease: 'easeOut' }}
      >
        {titlePart && (
          <strong 
            className={styles.titlePart}
            style={{ color: 'var(--primary-color)' }}
          >
            {renderGlossary(titlePart.replace(/:$/, ''), `${index}-title`)}{titlePart.endsWith(':') ? ':' : ''}
          </strong>
        )}
        <span style={{ fontWeight: '500' }}>
          {formatBrackets(bodyPart, searchQuery, renderGlossary)}
        </span>
      </motion.p>
    );
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        data-selectable="body-text"
        className={`custom-card p-3 p-sm-4 p-md-4 mb-4 position-relative shadow-sm manuscript-frame parchment-texture ${styles.cardContainer}`}
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
          <div className="d-flex align-items-center gap-1">
            {readingStats.isCollapsible && (
              <button
                type="button"
                onClick={handleToggleExpand}
                className="btn btn-sm d-inline-flex align-items-center gap-1 px-2 py-1"
                title={isExpanded ? 'طي المتن' : 'توسيع المتن'}
                aria-label={isExpanded ? 'طي المتن (الترويسة)' : 'توسيع المتن (الترويسة)'}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent-color)',
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
              className={`btn btn-sm d-flex align-items-center justify-content-center ${styles.copyButton}`}
              title="نسخ النص"
              aria-label="نسخ نص المسألة"
            >
              {copied ? <FiCheck color="green" size={20} /> : <FiCopy size={20} />}
            </button>
          </div>
        </div>

        {/* حاوية المتن مع دعم الطي والتوسيع لتقليل التمرير */}
        <div
          className="position-relative"
          style={{
            maxHeight: isExpanded || !readingStats.isCollapsible ? 'none' : '260px',
            overflow: 'hidden',
            transition: 'max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div className={`mt-3 ${styles.textContent}`}>
            {text.split('\n').map((paragraph, index) => renderParagraph(paragraph, index))}
          </div>

          {/* تدرج التلاشي الأنيق عند الطي */}
          {!isExpanded && readingStats.isCollapsible && (
            <div
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

        {/* زر التوسيع والطي التفاعلي أسفل المتن */}
        {readingStats.isCollapsible && (
          <div className="d-flex justify-content-center mt-3 pt-1 position-relative" style={{ zIndex: 2 }}>
            <button
              type="button"
              className="btn btn-sm d-inline-flex align-items-center gap-2 px-3 py-2 shadow-sm rounded-pill"
              onClick={handleToggleExpand}
              aria-expanded={isExpanded}
              style={{
                backgroundColor: 'var(--badge-bg)',
                borderColor: 'var(--border-color)',
                color: 'var(--accent-color)',
                fontWeight: 700,
                fontSize: '0.86rem',
                border: '1px solid',
                transition: 'all 0.2s ease',
              }}
            >
              {isExpanded ? (
                <>
                  <FiChevronUp size={16} />
                  <span>طي متن المسألة</span>
                </>
              ) : (
                <>
                  <FiChevronDown size={16} />
                  <span>
                    عرض المتن كاملاً
                    {readingStats.estimatedMinutes > 1
                      ? ` (${readingStats.estimatedMinutes === 2 ? 'دقيقتان قراءة' : `${readingStats.estimatedMinutes} دقائق قراءة`})`
                      : ' (نحو دقيقة قراءة)'}
                  </span>
                </>
              )}
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
