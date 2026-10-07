import React, { useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { FiCopy, FiCheck, FiBookOpen, FiLink } from 'react-icons/fi';
import styles from './QuoteCard.module.css';
import { glossaryData as defaultGlossary } from '../../data/glossary';
import { formatBrackets } from '../../utils/textFormatting';

// تطبيع حرفي عربي للتسامح مع التشكيل واختلاف أشكال الحروف (للمطابقة فقط)
function normalizeGlossaryTerm(s) {
  return String(s || '')
    .normalize('NFKC')
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '') // تشكيل + تطويل
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي');
}

// تطبيع مع حفظ خريطة موضع (NormIndex → OrigIndex) كي نُبرز النص الأصلي
function normalizeWithIndex(s) {
  const map = [];
  let norm = '';
  for (let i = 0; i < s.length; i += 1) {
    let c = s[i].normalize('NFKC');
    c = c.replace(/[\u064B-\u0652\u0670\u0640]/g, '');
    if (!c) continue; // حروف التشكيل المحذوفة لا تستهلك موضعًا في الناتج
    c = c.replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
    map.push(i);
    norm += c;
  }
  return { norm, map };
}

const QuoteCard = ({ text, searchQuery, glossary = defaultGlossary }) => {
  const [copied, setCopied] = useState(false);
  const [tooltipInfo, setTooltipInfo] = useState({ show: false, term: '', definition: '', x: 0, y: 0 });
  const [isExpanded, setIsExpanded] = useState(false);

  // حساب طول المسألة (عدد الكلمات تقريباً)
  const wordCount = (text || '').trim().split(/\s+/).length;
  const isLongIssue = wordCount > 150;

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const positionAtPointer = (clientX, clientY) => {
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

  const handleTermHover = (e, term) => {
    const cx = e.clientX;
    const cy = e.clientY;
    setTooltipInfo({ show: true, term, definition: glossary[term], x: cx + 9, y: cy + 9 });
    setTimeout(() => positionAtPointer(cx, cy), 10);
  };

  const handleTermClick = (e, term) => {
    const cx = e.clientX;
    const cy = e.clientY;
    setTooltipInfo({ show: true, term, definition: glossary[term], x: cx + 9, y: cy + 9 });
    setTimeout(() => positionAtPointer(cx, cy), 10);
  };

  // يُحدّث موضع البوب ليلاحق سهم الماوس فوق الكلمة
  const handleTermMove = (e) => positionAtPointer(e.clientX, e.clientY);

  const handleTermLeave = () => {
    setTooltipInfo((p) => ({ ...p, show: false }));
  };

  const tooltipRef = useRef(null);

  const highlightSearch = (plainText, baseKey) => {
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

  const parseCrossLinks = (plainText, baseKey) => {
    // نبحث عن نمط: [نص](lesson:123)
    const regex = /\[([^\]]+)\]\(lesson:(\d+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

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

  // مصطلحات القاموس مُطبَّعة ومرتّبة من الأطول للأقصر (تفضيل أطول تطابق)
  const sortedGlossaryTerms = useMemo(
    () =>
      Object.entries(glossary)
        .map(([term, def]) => ({ term, def, norm: normalizeGlossaryTerm(term) }))
        .filter((e) => e.norm)
        .sort((a, b) => b.norm.length - a.norm.length),
    [glossary],
  );

  // إبراز المصطلحات بتطبيع متسامح مع التشكيل واختلاف أشكال الحروف
  const renderGlossary = (plainText, baseKey) => {
    if (sortedGlossaryTerms.length === 0) {
      return [<React.Fragment key={`${baseKey}-empty`}>{parseCrossLinks(plainText, `${baseKey}-p`)}</React.Fragment>];
    }
    const { norm, map } = normalizeWithIndex(plainText);
    const nodes = [];
    let cur = 0;
    let lastOrig = 0;
    let k = 0;
    while (cur < norm.length) {
      let best = null;
      for (const e of sortedGlossaryTerms) {
        if (norm.startsWith(e.norm, cur) && (!best || e.norm.length > best.norm.length)) {
          best = e;
        }
      }
      if (best) {
        if (lastOrig < map[cur]) {
          nodes.push(parseCrossLinks(plainText.slice(lastOrig, map[cur]), `${baseKey}-t${k}`));
        }
        const end = cur + best.norm.length;
        const origStart = map[cur];
        const origEnd = map[end - 1] + 1;
        nodes.push(
          <span
            key={`${baseKey}-g-${k}`}
            className="glossary-term"
            onMouseEnter={(e) => handleTermHover(e, best.term)}
            onClick={(e) => handleTermClick(e, best.term)}
            onMouseMove={(e) => handleTermMove(e)}
            onMouseLeave={handleTermLeave}
          >
            {plainText.slice(origStart, origEnd)}
          </span>
        );
        lastOrig = origEnd;
        cur = end;
        k += 1;
      } else {
        cur += 1;
      }
    }
    if (lastOrig < plainText.length) {
      nodes.push(parseCrossLinks(plainText.slice(lastOrig), `${baseKey}-t${k}`));
    }
    return nodes;
  };

  const renderParagraph = (paragraph, index) => {
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
    if (/^##\s+/.test(trimmed)) {
      const headingText = trimmed.replace(/^##\s+/, '');
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
        className={`mb-3 ${styles.paragraph} ${typoClass}`}
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
        className={`custom-card p-4 p-md-5 mb-4 position-relative shadow-sm manuscript-frame parchment-texture ${styles.cardContainer}`}
      >
        <div className="position-absolute top-0 start-0 m-3 d-flex gap-2">
          <button
            onClick={handleCopy}
            className={`btn btn-sm d-flex align-items-center justify-content-center ${styles.copyButton}`}
            title="نسخ النص"
          >
            {copied ? <FiCheck color="green" size={20} /> : <FiCopy size={20} />}
          </button>
        </div>
        
        <h5 className="mb-4 d-flex align-items-center justify-content-center fw-bold" style={{ color: 'var(--primary-color)', fontFamily: 'var(--font-heading)' }}>
           متن الكتاب <FiBookOpen className="ms-2" />
        </h5>

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
              zIndex: 9999,
            }}
          >
            <div className="glossary-tooltip-content">
              <strong className="d-block mb-1" style={{ color: 'var(--accent-color)', fontSize: '0.95rem' }}>
                📖 {tooltipInfo.term}
              </strong>
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
