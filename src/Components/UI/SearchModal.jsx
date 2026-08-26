import { useState, useEffect, useMemo } from 'react';
import { FiSearch, FiX, FiFileText, FiFilter, FiList } from 'react-icons/fi';
import Fuse from 'fuse.js';

const SearchModal = ({ isOpen, onClose, data, onSelect }) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  // فلاتر النتائج — حصر النتائج في كتاب معين ثم باب معين
  const [filterBook, setFilterBook] = useState('');
  const [filterChapter, setFilterChapter] = useState('');

  // إعدادات خوارزمية البحث الذكي (Fuse.js)
  const fuse = useMemo(
    () =>
      new Fuse(data, {
        keys: [
          { name: 'title', weight: 0.7 }, // الوزن الأكبر للعنوان
          { name: 'mainText', weight: 0.2 }, // ثم متن الكتاب
          { name: 'sheikhExplanation', weight: 0.1 } // ثم الشرح
        ],
        threshold: 0.3, // يسمح ببعض الأخطاء الإملائية البسيطة
        includeMatches: true
      }),
    [data]
  );

  const results = useMemo(() => {
    if (query.trim() === '') return [];
    return fuse.search(query).map((result) => result.item);
  }, [query, fuse]);

  // تصفير الفلاتر عند تغيير كلمة البحث
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFilterBook('');
    setFilterChapter('');
    setActiveIndex(0);
  }, [query]);

  // الكتب والأبواب الموجودة فعليًا في النتائج الحالية
  const availableBooks = useMemo(
    () => [...new Set(results.map((r) => r.bookName).filter(Boolean))],
    [results]
  );

  const availableChapters = useMemo(
    () => [
      ...new Set(
        results
          .filter((r) => !filterBook || r.bookName === filterBook)
          .map((r) => r.chapterName)
          .filter(Boolean)
      ),
    ],
    [results, filterBook]
  );

  // النتائج بعد تطبيق الفلاتر
  const visibleResults = useMemo(
    () =>
      results.filter(
        (r) =>
          (!filterBook || r.bookName === filterBook) &&
          (!filterChapter || r.chapterName === filterChapter)
      ),
    [results, filterBook, filterChapter]
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
    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-start" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050, paddingTop: '10vh' }}>
      
      {/* جسم النافذة */}
      <div className="custom-card w-100 p-4" style={{ maxWidth: '600px', margin: '0 20px', zIndex: 1051 }}>
        
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
        {query.trim() !== '' && results.length > 0 && (
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
            </div>
          </div>
        )}

        {/* عرض النتائج */}
        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {query && results.length === 0 && (
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
                <h6 className="fw-bold mb-1" style={{ color: 'var(--text-main)' }}>{lesson.title}</h6>
                <small className="text-muted">{lesson.bookName} - {lesson.chapterName}</small>
              </div>
            </button>
          ))}

          {query.trim() !== '' && results.length > 0 && visibleResults.length === 0 && (
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
