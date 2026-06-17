import { useState, useEffect, useMemo } from 'react';
import { FiSearch, FiX, FiFileText } from 'react-icons/fi';
import Fuse from 'fuse.js';

const SearchModal = ({ isOpen, onClose, data, onSelect }) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

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

  const handleSelectLesson = (lesson) => {
    onSelect(lesson, query);
    setQuery('');
    setActiveIndex(0);
    onClose();
  };

  const handleInputKeyDown = (e) => {
    if (results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % results.length);
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + results.length) % results.length);
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const safeIndex = Math.min(activeIndex, results.length - 1);
      handleSelectLesson(results[safeIndex]);
    }
  };

  // إغلاق النافذة إذا ضغطت خارجها
  useEffect(() => {
    if (!isOpen) return;
    const onEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [isOpen, onClose]);

  // إغلاق النافذة إذا ضغطت خارجها
  if (!isOpen) return null;

  return (
    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-start" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050, paddingTop: '10vh' }}>
      
      {/* جسم النافذة */}
      <div className="custom-card w-100 p-4" style={{ maxWidth: '600px', margin: '0 20px', zIndex: 1051 }}>
        
        {/* مربع البحث وزر الإغلاق */}
               {/* مربع البحث وزر الإغلاق */}
        <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-3">
          <div className="d-flex align-items-center w-100 position-relative">
            
            {/* 1. تثبيت الأيقونة في اليمين باستخدام end-0 و me-3 */}
            <FiSearch className="position-absolute end-0 me-3" size={22} style={{ color: 'var(--primary-color)' }} />
            
            {/* 2. إضافة pe-5 لعمل مسافة داخلية للنص عشان ما يغطيش على الأيقونة */}
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

        {/* عرض النتائج */}
        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {query && results.length === 0 && (
            <div className="text-center text-muted p-4">لا توجد نتائج مطابقة لبحثك.</div>
          )}
          
          {results.map((lesson, index) => (
            <button 
              key={lesson.id} 
              className={`btn w-100 text-end d-flex align-items-start p-3 mb-2 shadow-sm list-btn ${activeIndex === index ? 'active-result' : ''}`}
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
        </div>
        <div className="text-muted small mt-3 border-top pt-2">
          Enter لاختيار النتيجة - الأسهم للتنقل - Esc للإغلاق
        </div>

      </div>
    </div>
  );
};

export default SearchModal;