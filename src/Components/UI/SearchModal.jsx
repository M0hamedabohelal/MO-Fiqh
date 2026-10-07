import { useState, useEffect, useMemo } from 'react';
import { FiSearch, FiX, FiFileText, FiFilter, FiList } from 'react-icons/fi';
import Fuse from 'fuse.js';

// تطبيع الحروف العربية لتحسين المطابقة: توحيد الألفات والهاء/التاء والياء
// وإزالة التشكيل والتطويل والترقيم حتى يتسامح البحث مع الاختلافات الإملائية
function normalizeArabic(s) {
  return String(s || '')
    .replace(/ﷲ/g, ' الله ') // رابطة "اللّٰه" → حروف
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '') // تشكيل + تطويل
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[،؛؟!.,()\-:]/g, ' ') // ترقيم → مسافة
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// بناء تعبير يطابق الحروف مع احتمال وجود تشكيل بينها ومعاملة أصل إملائي متسامح
function buildTolerantRegex(norm) {
  const map = {
    'ا': '[اأإآٱ]', 'أ': '[اأإآٱ]', 'إ': '[اأإآٱ]', 'آ': '[اأإآٱ]',
    'ه': '[هة]', 'ة': '[هة]',
    'ي': '[يى]', 'ى': '[يى]',
  };
  const diac = '[\\u064B-\\u0652\\u0670\\u0640]*';
  const parts = norm.split('').map((c) => {
    if (c === ' ') return '\\s+';
    const cls = map[c] || c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return `${diac}${cls}${diac}`;
  });
  return parts.join('[\\u064B-\\u0652\\u0670\\u0640]*');
}

// إبراز نص الاستعلام داخل النص الأصلي مع التسامح الإملائي والتشكيل
function highlightQuery(text, query, key) {
  const orig = String(text || '');
  const nq = normalizeArabic(query);
  if (!nq) return <span key={key}>{orig}</span>;
  try {
    const rgx = new RegExp(buildTolerantRegex(nq), 'g');
    const out = [];
    let last = 0;
    let i = 0;
    let m;
    while ((m = rgx.exec(orig)) !== null) {
      if (m[0]) {
        out.push(orig.slice(last, m.index));
        out.push(
          <mark key={`${key}-hl-${i}`} style={{ backgroundColor: 'rgba(251,220,153,0.45)', borderRadius: '3px', paddingInline: '2px' }}>
            {m[0]}
          </mark>,
        );
        last = m.index + m[0].length;
        i += 1;
      }
      if (m.index === rgx.lastIndex) rgx.lastIndex += 1;
    }
    if (out.length > 0) out.push(orig.slice(last));
    return out.length > 0 ? out : orig;
  } catch {
    return orig;
  }
}

const SearchModal = ({ isOpen, onClose, data, onSelect }) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  // فلاتر النتائج — حصر النتائج في كتاب معين ثم باب معين
  const [filterBook, setFilterBook] = useState('');
  const [filterChapter, setFilterChapter] = useState('');

  // نسخة للبحث تحمل حقولاً مُطبعَة عربيًا (تُستخدم للمطابقة فقط، والعرض من الحقول الأصلية)
  const searchDocs = useMemo(
    () =>
      data.map((item) => ({
        ...item,
        nTitle: normalizeArabic(item.title),
        nBook: normalizeArabic(item.bookName),
        nChapter: normalizeArabic(item.chapterName),
        nText: normalizeArabic(item.mainText),
        nExpl: normalizeArabic(item.sheikhExplanation),
      })),
    [data]
  );

  // إعدادات خوارزمية البحث الذكي (Fuse.js) — بحقول مطبّعة + تسامح تلقائي
  const fuse = useMemo(
    () =>
      new Fuse(searchDocs, {
        keys: [
          { name: 'nTitle', weight: 0.5 }, // العنوان المطبَّع هو الأقوى
          { name: 'title', weight: 0.25 }, // مع الحفاظ على النص الأصلي
          { name: 'nText', weight: 0.12 }, // متن الكتاب مطبَّع
          { name: 'nExpl', weight: 0.06 },
          { name: 'nBook', weight: 0.04 },
          { name: 'nChapter', weight: 0.03 },
        ],
        threshold: 0.35, // تسامح معقول مع الأخطاء الإملائية
        ignoreLocation: true, // المطابقة في أي موضع وليس بالبداية فقط
        ignoreFieldNorm: true,
        minMatchCharLength: 2, // تجاهل النتائج العشوائية بحرف واحد
        includeMatches: true,
      }),
    [searchDocs]
  );

  // نتائج البحث + علم "نتائج تقريبية" عند تحمّل الأخطاء الإملائية
  const { results: searchResults, isFuzzy } = useMemo(() => {
    if (query.trim() === '') return { results: [], isFuzzy: false };
    const q = normalizeArabic(query);
    let found = fuse.search(q);
    let fuzzy = false;
    // ارتقاء التسامح عند عدم وجود نتائج حتى يستوعب الأخطاء الإملائية في العربية
    if (found.length === 0) {
      found = fuse.search(q, { threshold: 0.6 });
      if (found.length === 0) found = fuse.search(q, { threshold: 0.75 });
      fuzzy = found.length > 0;
    }
    return { results: found.slice(0, 100).map((r) => r.item), isFuzzy: fuzzy };
  }, [query, fuse]);

  // تصفير الفلاتر عند تغيير كلمة البحث
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFilterBook('');
    setFilterChapter('');
    setActiveIndex(0);
  }, [query]);

  // عند فتح البحث من جديد — تصفير الفلاتر ومؤشر التحديد
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveIndex(0);
      setFilterBook('');
      setFilterChapter('');
    }
  }, [isOpen]);

  // الكتب والأبواب الموجودة فعليًا في النتائج الحالية
  const availableBooks = useMemo(
    () => [...new Set(searchResults.map((r) => r.bookName).filter(Boolean))],
    [searchResults]
  );

  const availableChapters = useMemo(
    () => [
      ...new Set(
        searchResults
          .filter((r) => !filterBook || r.bookName === filterBook)
          .map((r) => r.chapterName)
          .filter(Boolean)
      ),
    ],
    [searchResults, filterBook]
  );

  // النتائج بعد تطبيق الفلاتر
  const visibleResults = useMemo(
    () =>
      searchResults.filter(
        (r) =>
          (!filterBook || r.bookName === filterBook) &&
          (!filterChapter || r.chapterName === filterChapter)
      ),
    [searchResults, filterBook, filterChapter]
  );

  // حماية من تجاوز المؤشر لعدد النتائج بعد تغيير الفلاتر
  const safeActiveIndex = Math.min(activeIndex, Math.max(visibleResults.length - 1, 0));

  const handleSelectLesson = (lesson) => {
    onSelect(lesson, query);
    setQuery('');
    setActiveIndex(0);
    onClose();
  };

  const handleInputKeyDown = (e) => {
    if (visibleResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => {
        const safe = Math.min(prev, visibleResults.length - 1);
        return (safe + 1) % visibleResults.length;
      });
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => {
        const safe = Math.min(prev, visibleResults.length - 1);
        return (safe - 1 + visibleResults.length) % visibleResults.length;
      });
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const lesson = visibleResults[Math.min(safeActiveIndex, visibleResults.length - 1)];
      if (lesson) handleSelectLesson(lesson);
    }
  };

  // إغلاق النافذة إذا ضغطت Escape
  useEffect(() => {
    if (!isOpen) return;
    const onEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-start"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050, paddingTop: '10vh' }}
      onClick={onClose}
    >

      {/* جسم النافذة */}
      <div
        className="custom-card w-100 p-4"
        style={{ maxWidth: '600px', margin: '0 20px', zIndex: 1051 }}
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* مربع البحث وزر الإغلاق */}
        <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-3">
          <div className="d-flex align-items-center w-100 position-relative">
            
            <FiSearch className="position-absolute end-0 me-3" size={22} style={{ color: 'var(--primary-color)' }} />
            
            <input 
              type="text" 
              className="form-control form-control-lg border-0 search-input pe-5" 
              placeholder="ابحث عن مسألة..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleInputKeyDown}
              autoFocus
            />
            
          </div>
          <button className="btn text-muted ms-3" onClick={onClose} title="إغلاق">
            <FiX size={26} />
          </button>
        </div>

        {/* فلاتر النتائج — الكتاب ثم الباب */}
        {query.trim() !== '' && searchResults.length > 0 && (
          <div className="search-filters mb-2">
            <div className="d-flex gap-2 flex-wrap align-items-center">
              <FiFilter size={14} style={{ color: 'var(--primary-color)', flexShrink: 0 }} />
              {availableBooks.map((book) => (
                <button
                  key={book}
                  type="button"
                  className={`chip-btn ${filterBook === book ? 'chip-active' : ''}`}
                  onClick={() => {
                    setFilterBook((prev) => (prev === book ? '' : book));
                    setFilterChapter('');
                    setActiveIndex(0);
                  }}
                >
                  {book}
                </button>
              ))}
            </div>

            {filterBook && availableChapters.length > 1 && (
              <div className="d-flex gap-2 flex-wrap align-items-center mt-2 pe-4">
                <FiList size={14} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
                <button
                  type="button"
                  className={`chip-btn ${filterChapter === '' ? 'chip-active' : ''}`}
                  onClick={() => { setFilterChapter(''); setActiveIndex(0); }}
                >
                  كل الأبواب
                </button>
                {availableChapters.map((chapter) => (
                  <button
                    key={chapter}
                    type="button"
                    className={`chip-btn ${filterChapter === chapter ? 'chip-active' : ''}`}
                    onClick={() => { setFilterChapter(chapter); setActiveIndex(0); }}
                  >
                    {chapter}
                  </button>
                ))}
              </div>
            )}

            <div className="text-muted search-result-count mt-2">
              {visibleResults.length} نتيجة{filterBook ? ` في ${filterBook}` : ''}
              {isFuzzy && visibleResults.length > 0 && (
                <span style={{ color: 'var(--accent-color)' }}> — نتائج تقريبية (رُعيت الأخطاء الإملائية)</span>
              )}
            </div>
          </div>
        )}

        {/* عرض النتائج */}
        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {query && searchResults.length === 0 && (
            <div className="text-center text-muted p-4">لا توجد نتائج مطابقة لبحثك.</div>
          )}
          
          {visibleResults.map((lesson, index) => (
            <button 
              key={lesson.id} 
              className={`btn w-100 text-end d-flex align-items-start p-3 mb-2 shadow-sm list-btn ${safeActiveIndex === index ? 'active-result' : ''}`}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => handleSelectLesson(lesson)}
            >
              <div className="ms-3 mt-1" style={{ color: 'var(--accent-color)' }}>
                <FiFileText size={20} />
              </div>
              <div>
                <h6 className="fw-bold mb-1" style={{ color: 'var(--text-main)' }}>{highlightQuery(lesson.title, query, lesson.id)}</h6>
                <small className="text-muted">{lesson.bookName} - {lesson.chapterName}</small>
              </div>
            </button>
          ))}

          {query.trim() !== '' && searchResults.length > 0 && visibleResults.length === 0 && (
            <div className="text-center text-muted p-4">لا توجد نتائج ضمن هذا الفلتر — جرّب كتابًا آخر.</div>
          )}
        </div>
        <div className="text-muted small mt-3 border-top pt-2">
          Enter لاختيار النتيجة - الأسهم للتنقل - Esc للإغلاق
        </div>

      </div>
    </div>
  );
};

export default SearchModal;
