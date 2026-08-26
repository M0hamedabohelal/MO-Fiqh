import React from 'react';

// كلمات دالة على النص الحديثي داخل الأقواس العادية ( ... )
const HADITH_KEYWORDS = /(ﷺ|رسول الله|النبي|قال|طهور|نجس|الطوافين|الطوافات|قلتين|الخبث|إذا بلغ الماء|لا تشربوا|آنية الذهب|آنية الفضة|صحافها|الدنيا ولكم في الآخرة|الذي يشرب|يجرجر|نار جهنم|لا تأكلوا فيها|فاغسلوها|ثم كلوا فيها|قدح رسول الله|سلسلة من فضة|أيما إهاب|دبغ فقد|هلا أخذوا إهابها|فدبغوه|فانتفعوا به|إنما حرم أكلها|إنما حُرِّم أكلها|بني الإسلام|العمرة إلى العمرة|الحج المبرور|من حج لله|لم يرفث|قد فرض الله عليكم الحج|لو قلت|تعجلوا إلى الحج|من استطاع الحج|فليمت إن شاء|رفع القلم|نعم ولك أجر|أيما صبي حج|أيما عبد حج|لا يحل لامرأة|انطلق فحج|حج عن نفسك|حج عن شبرمة|عليهن جهاد|الحج والعمرة|حج عن أبيك|واعتمر|وقّت رسول الله|ذا الحليفة|الجحفة|قرن المنازل|يلملم|هن لهن|من حيث أنشأ)/;

// كاشف النص الحديثي: يبدأ بـ « أو قوس يحوي كلمة دالة
export const isHadithText = (part) => {
  const trimmed = part.trim();
  if (trimmed.startsWith('«')) return true;
  if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
    return HADITH_KEYWORDS.test(trimmed);
  }
  return false;
};

// تظليل كلمة البحث بخلفية ذهبية
export const highlightSearch = (plainText, searchQuery, baseKey) => {
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

// تقسيم النص إلى آيات { } / ﴿ ﴾ وأحاديث « » وأقواس ( ) مع تنسيق كل نوع
// renderPlainText: دالة اختيارية لتخصيص عرض النص العادي (مثل تظليل مصطلحات المعجم)
export const formatBrackets = (textChunk, searchQuery, renderPlainText) => {
  const parts = textChunk.split(/(\{[^}]+\}|﴿[^﴾]+﴾|«[^»]*(?:»|$)|\([^)]*\))/g);
  return parts.map((part, index) => {
    if ((part.startsWith('﴿') && part.endsWith('﴾')) || (part.startsWith('{') && part.endsWith('}'))) {
      const formattedPart = part.replace(/\{/g, '﴿').replace(/\}/g, '﴾');
      return <span key={index} className="quran-text">{formattedPart}</span>;
    }
    if (isHadithText(part)) {
      return <span key={index} className="hadith-text">{part}</span>;
    }
    if (renderPlainText) {
      return <span key={index}>{renderPlainText(part, index)}</span>;
    }
    return <React.Fragment key={index}>{highlightSearch(part, searchQuery, index)}</React.Fragment>;
  });
};
