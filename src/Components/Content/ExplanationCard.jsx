import { useState } from 'react';
import { FiBookOpen, FiCopy, FiCheck } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { formatBrackets } from '../../utils/textFormatting';

const ExplanationCard = ({ explanation, searchQuery }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(explanation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // دالة لتنسيق فقرات الشرح بذكاء (تمييز ما قبل النقطتين)
  const renderParagraph = (paragraph, index) => {
    if (!paragraph.trim()) return null;

    const colonIndex = paragraph.indexOf(':');
    let titlePart = '';
    let bodyPart = paragraph;

    if (colonIndex !== -1 && colonIndex < 50) {
      titlePart = paragraph.substring(0, colonIndex + 1);
      bodyPart = paragraph.substring(colonIndex + 1);
    }

    return (
      <motion.p
        key={index}
        className="mb-3"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(index * 0.07, 0.6), duration: 0.45, ease: 'easeOut' }}
        style={{
          lineHeight: '1.9',
          fontSize: '1.1rem',
          color: 'var(--text-main)'
        }}
      >
        {titlePart && (
          <strong className="explanation-title" style={{ marginLeft: '6px', fontWeight: '700' }}>
            {titlePart}
          </strong>
        )}
        <span style={{ fontWeight: '500' }}>
          {formatBrackets(bodyPart, searchQuery)}
        </span>
      </motion.p>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="custom-card p-4 p-md-5 mb-4 shadow-sm explanation-card position-relative"
    >
      <div className="position-absolute top-0 start-0 m-3">
        <button
          onClick={handleCopy}
          className="btn btn-sm d-flex align-items-center justify-content-center"
          title="نسخ النص"
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)' }}
        >
          {copied ? <FiCheck color="green" size={22} /> : <FiCopy size={22} />}
        </button>
      </div>
      <h5 className="mb-4 d-flex align-items-center justify-content-center fw-bold explanation-title">
         تعليق الشيخ <FiBookOpen className="ms-2" />
      </h5>

      {/* عرض الشرح منسقاً ومن اليمين لليسار */}
      <div
        className="mt-3"
        style={{
          textAlign: 'right',
          direction: 'rtl',
          wordWrap: 'break-word'
        }}
      >
        {explanation.split('\n').map((paragraph, index) => renderParagraph(paragraph, index))}
      </div>
    </motion.div>
  );
};

export default ExplanationCard;
