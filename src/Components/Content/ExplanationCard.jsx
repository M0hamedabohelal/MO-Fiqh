import React, { useState } from 'react';
import { FiBookOpen, FiCopy, FiCheck } from 'react-icons/fi';
import { motion } from 'framer-motion';

const ExplanationCard = ({ explanation, searchQuery }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(explanation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isHadithText = (part) => {
    const trimmed = part.trim();
    if (trimmed.startsWith('«')) return true;
    if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
      return /(ﷺ|رسول الله|النبي|قال|طهور|نجس|الطوافين|الطوافات|قلتين|الخبث|إذا بلغ الماء|لا تشربوا|آنية الذهب|آنية الفضة|صحافها|الدنيا ولكم في الآخرة|الذي يشرب|يجرجر|نار جهنم|لا تأكلوا فيها|فاغسلوها|ثم كلوا فيها|قدح رسول الله|سلسلة من فضة|أيما إهاب|دبغ فقد|هلا أخذوا إهابها|فدبغوه|فانتفعوا به|إنما حرم أكلها|إنما حُرِّم أكلها|بني الإسلام|العمرة إلى العمرة|الحج المبرور|من حج لله|لم يرفث|قد فرض الله عليكم الحج|لو قلت|تعجلوا إلى الحج|من استطاع الحج|فليمت إن شاء|رفع القلم|نعم ولك أجر|أيما صبي حج|أيما عبد حج|لا يحل لامرأة|انطلق فحج|حج عن نفسك|حج عن شبرمة|عليهن جهاد|الحج والعمرة|حج عن أبيك|واعتمر|وقّت رسول الله|ذا الحليفة|الجحفة|قرن المنازل|يلملم|هن لهن|من حيث أنشأ)/.test(trimmed);
    }
    return false;
  };

  // دالة تظليل كلمة البحث بخلفية ذهبية
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

  const formatBrackets = (textChunk) => {
    const parts = textChunk.split(/(\\{[^}]+\\}|﴿[^﴾]+﴾|«[^»]*(?:»|$)|\([^)]*\))/g);
    return parts.map((part, index) => {
      if ((part.startsWith('﴿') && part.endsWith('﴾')) || (part.startsWith('{') && part.endsWith('}'))) {
        const formattedPart = part.replace(/\{/g, '﴿').replace(/\}/g, '﴾');
        return <span key={index} className="quran-text">{formattedPart}</span>;
      } else if (isHadithText(part)) {
        return <span key={index} className="hadith-text">{part}</span>;
      }
      // تطبيق تظليل البحث على النص العادي
      return <React.Fragment key={index}>{highlightSearch(part, index)}</React.Fragment>;
    });
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
      <p
        key={index}
        className="mb-3"
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
          {formatBrackets(bodyPart)}
        </span>
      </p>
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