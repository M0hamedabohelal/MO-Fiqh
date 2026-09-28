import { useState } from 'react';
import { FiBookOpen, FiCopy, FiCheck } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { formatBrackets } from '../../utils/textFormatting';

const ExplanationCard = ({ explanation, searchQuery }) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // حساب طول الشرح (عدد الكلمات تقريباً)
  const wordCount = (explanation || '').trim().split(/\s+/).length;
  const isLongIssue = wordCount > 100;

  const handleCopy = () => {
    navigator.clipboard.writeText(explanation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            {titlePart}
          </strong>
        )}
        <span className={isLongIssue ? 'enhanced-body' : ''} style={{ fontWeight: '500' }}>
          {formatBrackets(bodyPart, searchQuery)}
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
    </>
  );
};

export default ExplanationCard;
