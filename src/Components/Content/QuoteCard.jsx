import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiCopy, FiCheck } from 'react-icons/fi';
import styles from './QuoteCard.module.css';
import { glossaryData } from '../../data/glossary';

const QuoteCard = ({ text, searchQuery }) => {
  const [copied, setCopied] = useState(false);
  const [tooltipInfo, setTooltipInfo] = useState({ show: false, term: '', definition: '', x: 0, y: 0 });

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTermHover = (e, term) => {
    const rect = e.target.getBoundingClientRect();
    setTooltipInfo({
      show: true,
      term,
      definition: glossaryData[term],
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    });
  };

  const handleTermLeave = () => {
    setTooltipInfo({ ...tooltipInfo, show: false });
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

  // دالة لتظليل المصطلحات الفقهية في النص العادي
  const highlightGlossaryTerms = (plainText, baseKey) => {
    const terms = Object.keys(glossaryData);
    const sortedTerms = terms.sort((a, b) => b.length - a.length);
    const pattern = new RegExp(`(${sortedTerms.join('|')})`, 'g');
    const segments = plainText.split(pattern);

    return segments.map((segment, i) => {
      if (glossaryData[segment]) {
        return (
          <span
            key={`${baseKey}-g-${i}`}
            className="glossary-term"
            onMouseEnter={(e) => handleTermHover(e, segment)}
            onMouseLeave={handleTermLeave}
          >
            {segment}
          </span>
        );
      }
      // تطبيق تظليل البحث على النصوص العادية
      return <React.Fragment key={`${baseKey}-t-${i}`}>{highlightSearch(segment, `${baseKey}-t-${i}`)}</React.Fragment>;
    });
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
      // تظليل المصطلحات الفقهية ثم كلمة البحث في النص العادي
      return <span key={index}>{highlightGlossaryTerms(part, index)}</span>;
    });
  };

  const renderParagraph = (paragraph, index) => {
    if (!paragraph.trim()) return null;

    const colonIndex = paragraph.indexOf(':');
    let titlePart = '';
    let bodyPart = paragraph;

    if (colonIndex !== -1 && colonIndex < 60) {
      titlePart = paragraph.substring(0, colonIndex + 1);
      bodyPart = paragraph.substring(colonIndex + 1);
    }

    return (
      <p key={index} className={`mb-3 ${styles.paragraph}`}>
        {titlePart && (
          <strong className={styles.titlePart}>
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
      className={`custom-card p-4 p-md-5 mb-4 position-relative shadow-sm ${styles.cardContainer}`}
    >
      <div className="position-absolute top-0 start-0 m-3">
        <button
          onClick={handleCopy}
          className={`btn btn-sm d-flex align-items-center justify-content-center ${styles.copyButton}`}
          title="نسخ النص"
        >
          {copied ? <FiCheck color="green" size={22} /> : <FiCopy size={22} />}
        </button>
      </div>

      <div className={`mt-3 ${styles.textContent}`}>
        {text.split('\n').map((paragraph, index) => renderParagraph(paragraph, index))}
      </div>

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
  );
};

export default QuoteCard;