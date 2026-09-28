import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiCopy, FiCheck, FiBookOpen, FiLink } from 'react-icons/fi';
import styles from './QuoteCard.module.css';
import { glossaryData as defaultGlossary } from '../../data/glossary';
import { formatBrackets } from '../../utils/textFormatting';

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

  const handleTermHover = (e, term) => {
    let xPos = e.clientX;
    const padding = 20;
    const halfWidth = 160; // max-width is 320px, so half is 160px
    if (xPos < halfWidth + padding) xPos = halfWidth + padding;
    if (xPos > window.innerWidth - halfWidth - padding) xPos = window.innerWidth - halfWidth - padding;

    setTooltipInfo({
      show: true,
      term,
      definition: glossary[term],
      x: xPos,
      y: e.clientY - 15
    });
  };

  const handleTermClick = (e, term) => {
    const rect = e.target.getBoundingClientRect();
    let xPos = rect.left + rect.width / 2;
    const padding = 20;
    const halfWidth = 160;
    if (xPos < halfWidth + padding) xPos = halfWidth + padding;
    if (xPos > window.innerWidth - halfWidth - padding) xPos = window.innerWidth - halfWidth - padding;

    setTooltipInfo({
      show: true,
      term,
      definition: glossary[term],
      x: xPos,
      y: rect.top - 10
    });
  };

  const handleTermLeave = () => {
    setTooltipInfo({ ...tooltipInfo, show: false });
  };

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

  const highlightGlossaryTerms = (plainText, baseKey) => {
    const terms = Object.keys(glossary);
    const sortedTerms = terms.sort((a, b) => b.length - a.length);
    if (sortedTerms.length === 0) {
      return [<React.Fragment key={`${baseKey}-empty`}>{parseCrossLinks(plainText, `${baseKey}-p`)}</React.Fragment>];
    }
    const pattern = new RegExp(`(${sortedTerms.join('|')})`, 'g');
    const segments = plainText.split(pattern);

    return segments.map((segment, i) => {
      if (glossary[segment]) {
        return (
          <span
            key={`${baseKey}-g-${i}`}
            className="glossary-term"
            onMouseEnter={(e) => handleTermHover(e, segment)}
            onClick={(e) => handleTermClick(e, segment)}
            onMouseLeave={handleTermLeave}
          >
            {segment}
          </span>
        );
      }
      return <React.Fragment key={`${baseKey}-t-${i}`}>{parseCrossLinks(segment, `${baseKey}-t-${i}`)}</React.Fragment>;
    });
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
            {titlePart}
          </strong>
        )}
        <span className={isLongIssue ? 'enhanced-body' : ''} style={{ fontWeight: '500' }}>
          {formatBrackets(bodyPart, searchQuery, highlightGlossaryTerms)}
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
        {tooltipInfo.show && (
          <div
            className="glossary-tooltip-popup"
            style={{
              position: 'fixed',
              top: tooltipInfo.y,
              left: tooltipInfo.x,
              transform: 'translate(-50%, -100%)',
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
          </div>
        )}
      </motion.div>
    </>
  );
};

export default QuoteCard;
