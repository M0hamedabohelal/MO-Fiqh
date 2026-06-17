import { useState, useEffect, useMemo } from 'react';
// استدعاء الأيقونات مرة واحدة فقط
import { FiBook, FiVideo, FiClock, FiChevronLeft, FiList, FiFileText, FiFacebook, FiLinkedin, FiPhone, FiHeart, FiArrowUp, FiChevronRight, FiBookmark, FiHome, FiEdit3, FiTrash2, FiFlag } from 'react-icons/fi';
import { motion, useScroll, AnimatePresence } from 'framer-motion';

import HeroSection from './Components/Header/HeroSection';
import Slider from './Components/Sidebar/Slider';
import Topbar from './Components/Header/Topbar';
import Breadcrumb from './Components/Header/Breadcrumb';
import QuoteCard from './Components/Content/QuoteCard';
import VideoCard from './Components/Content/VideoCard'; 
import ExplanationCard from './Components/Content/ExplanationCard';
import NotesCard from './Components/Content/NotesCard';
import ShareButton from './Components/UI/ShareButton';

// استدعاء نافذة البحث
import SearchModal from './Components/UI/SearchModal';

import { lessonsData } from './data/lessons';

function App() {
  const [fontSize, setFontSize] = useState(16);
  const [currentView, setCurrentView] = useState('hero'); 
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [currentSearchQuery, setCurrentSearchQuery] = useState('');
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [selectedBookName, setSelectedBookName] = useState('كتاب الطهارة');
  const [openChapterName, setOpenChapterName] = useState(null);

  // Data States
  const [bookmarks, setBookmarks] = useState(() => JSON.parse(localStorage.getItem('bookmarks')) || []);
  const [highlights, setHighlights] = useState(() => JSON.parse(localStorage.getItem('highlights')) || []);
  const [lastReadLessonId, setLastReadLessonId] = useState(() => localStorage.getItem('lastReadLessonId') || null);
  
  // UI States
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [highlightSelection, setHighlightSelection] = useState({ show: false, text: '', x: 0, y: 0 });

  // Scroll Progress
  const { scrollYProgress } = useScroll();

  // Dark mode state
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
    localStorage.setItem('highlights', JSON.stringify(highlights));
  }, [bookmarks, highlights]);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleTheme = (newTheme) => {
    setTheme(newTheme);
  };

  useEffect(() => {
    document.documentElement.style.setProperty('--base-font-size', `${fontSize}px`);
  }, [fontSize]);

  const toggleBookmark = (lessonId) => {
    setBookmarks(prev => 
      prev.includes(lessonId) 
        ? prev.filter(id => id !== lessonId)
        : [...prev, lessonId]
    );
  };

  const deleteHighlight = (highlightId) => {
    setHighlights(prev => prev.filter(h => h.id !== highlightId));
  };

  const goToNextLesson = () => {
    if (currentIndex < lessonsData.length - 1) {
      setCurrentIndex(currentIndex + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToPrevLesson = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const currentLesson = lessonsData[currentIndex];

  const booksList = [
    "كتاب الطهارة",
    "كتاب الصلاة",
    "كتاب الزكاة",
    "كتاب الصيام",
    "كتاب الحج",
    "كتاب الجهاد",
    "كتاب المعاملات",
    "كتاب المواريث والوصايا والعتق",
    "كتاب النكاح والطلاق",
    "كتاب الجنايات",
    "كتاب الحدود",
    "كتاب الايمان والنذور",
    "كتاب الأطعمه والذبائح والصيد",
    "كتاب القضاء والشهادات",
  ];
  const chaptersWithIssues = useMemo(() => {
    const chaptersMap = new Map();

    lessonsData.forEach((lesson, index) => {
      if (!lesson.bookName || !lesson.chapterName) return;

      const chapterKey = `${lesson.bookName}__${lesson.chapterName}`;

      if (!chaptersMap.has(chapterKey)) {
        chaptersMap.set(chapterKey, {
          bookName: lesson.bookName,
          chapterName: lesson.chapterName,
          issues: [],
        });
      }

      chaptersMap.get(chapterKey).issues.push({ ...lesson, lessonIndex: index });
    });

    return Array.from(chaptersMap.values());
  }, []);

  const booksWithStats = useMemo(() => (
    booksList.map((bookName) => {
      const chapters = chaptersWithIssues.filter(chapter => chapter.bookName === bookName);
      const issuesCount = chapters.reduce((total, chapter) => total + chapter.issues.length, 0);

      return {
        bookName,
        chaptersCount: chapters.length,
        issuesCount,
      };
    })
  ), [chaptersWithIssues]);

  const selectedBookChapters = useMemo(
    () => chaptersWithIssues.filter(chapter => chapter.bookName === selectedBookName),
    [chaptersWithIssues, selectedBookName]
  );

  const openBookChapters = (bookName) => {
    setSelectedBookName(bookName);
    setOpenChapterName(null);
    setCurrentView('chapters');
  };

  const toggleChapter = (chapterName) => {
    setOpenChapterName(prev => prev === chapterName ? null : chapterName);
  };

  const handleSearchResultSelect = (selectedLesson, query) => {
    const index = lessonsData.findIndex(lesson => lesson.id === selectedLesson.id);
    if (index !== -1) {
      setCurrentIndex(index);
      setCurrentSearchQuery(query || '');
      setCurrentView('reading');
    }
  };

  const saveCurrentSelectionAsHighlight = () => {
    if (!highlightSelection.text) return;
    const newHighlight = {
      id: Date.now(),
      lessonId: currentLesson.id,
      bookName: currentLesson.bookName,
      chapterName: currentLesson.chapterName,
      title: currentLesson.title,
      text: highlightSelection.text
    };
    setHighlights(prev => [...prev, newHighlight]);
    window.getSelection().removeAllRanges();
    setHighlightSelection({ show: false, text: '', x: 0, y: 0 });
  };

  const handleKeyboardShortcut = (event) => {
    const activeElement = document.activeElement;
    const isTyping =
      activeElement?.tagName === 'INPUT' ||
      activeElement?.tagName === 'TEXTAREA' ||
      activeElement?.isContentEditable;
    const key = event.key.toLowerCase();

    if ((event.ctrlKey || event.metaKey) && key === 'k') {
      event.preventDefault();
      setIsSearchOpen(true);
      return;
    }

    if (key === '/' && !isTyping) {
      event.preventDefault();
      setIsSearchOpen(true);
      return;
    }

    if (key === '?' && !isTyping) {
      event.preventDefault();
      setShowShortcutsHelp(prev => !prev);
      return;
    }

    if (isTyping) return;

    if (key === 'm') setCurrentView('bookmarks');
    if (key === 'h') setCurrentView('highlights');
    if (key === 'l') setCurrentView('lessons');

    if (currentView === 'reading') {
      if (event.key === 'ArrowRight') goToPrevLesson();
      if (event.key === 'ArrowLeft') goToNextLesson();
      if (key === 'b') toggleBookmark(currentLesson.id);
      if (key === 's') setIsSearchOpen(true);
      if (key === 'f') saveCurrentSelectionAsHighlight();
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    window.addEventListener('keydown', handleKeyboardShortcut);
    return () => window.removeEventListener('keydown', handleKeyboardShortcut);
  }, [currentView, currentIndex, highlightSelection.text]);

  return (
    <div className="container-fluid p-0 position-relative">
      {/* نافذة البحث المنبثقة */}
      <SearchModal 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
        data={lessonsData} 
        onSelect={handleSearchResultSelect} 
      />

      <AnimatePresence>
        {showShortcutsHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)', zIndex: 1200, padding: '20px' }}
            onClick={() => setShowShortcutsHelp(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="custom-card p-4 w-100"
              style={{ maxWidth: '560px' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0 fw-bold" style={{ color: 'var(--primary-color)' }}>اختصارات الإنتاجية</h5>
                <button className="btn btn-sm btn-outline-secondary" onClick={() => setShowShortcutsHelp(false)}>إغلاق</button>
              </div>
              <div className="d-grid gap-2">
                <div><strong>/</strong> أو <strong>Ctrl+K</strong> = فتح البحث</div>
                <div><strong>Arrow Left / Arrow Right</strong> = التالي / السابق أثناء القراءة</div>
                <div><strong>B</strong> = حفظ/إلغاء المفضلة للمسألة الحالية</div>
                <div><strong>M</strong> = صفحة المفضلة</div>
                <div><strong>H</strong> = صفحة الفوائد المقتبسة</div>
                <div><strong>L</strong> = فهرس المسائل</div>
                <div><strong>S</strong> = فتح البحث أثناء القراءة</div>
                <div><strong>F</strong> = حفظ التحديد الحالي كفائدة (بعد تحديد النص)</div>
                <div><strong>?</strong> = إظهار/إخفاء هذا الدليل</div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section — الشاشة الرئيسية */}
      {currentView === 'hero' ? (
        <HeroSection 
          onStartBrowsing={() => setCurrentView('books')} 
          lastReadTitle={lessonsData.find(l => l.id.toString() === lastReadLessonId)?.title}
          onContinueReading={() => {
            const index = lessonsData.findIndex(l => l.id.toString() === lastReadLessonId);
            if(index !== -1) {
              setCurrentIndex(index);
              setCurrentView('reading');
            }
          }}
        />
      ) : (
        <div className="row g-0">
          
          {/* الشريط الجانبي */}
          <div className="col-lg-2 col-md-3 d-none d-md-block sidebar-container">
            <Slider 
              activeView={currentView} 
              setActiveView={setCurrentView} 
              onOpenSearch={() => setIsSearchOpen(true)} 
            />
          </div>
          
          <div className="col-lg-10 col-md-9 px-4 py-3 pb-5 pb-md-3">
            <Topbar
              fontSize={fontSize}
              setFontSize={setFontSize}
              theme={theme}
              toggleTheme={toggleTheme}
            />
            
            <div className="container mt-4" style={{ maxWidth: '850px' }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${currentView}-${currentIndex}`}
                  initial={{ opacity: 0, x: -20, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, x: 20, filter: 'blur(4px)' }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                >
              {/* 1. شاشة الكتب */}
              {currentView === 'books' && (
                <div className="mt-4">
                  <h3 className="mb-4 fw-bold" style={{ color: 'var(--primary-color)' }}><FiBook className="ms-2"/> فهرس الكتب</h3>
                  <div className="row">
                    {booksWithStats.map(({ bookName, chaptersCount, issuesCount }) => (
                      <div className="col-md-6 mb-3" key={bookName}>
                        <button 
                          className="btn w-100 text-end p-4 shadow-sm d-flex justify-content-between align-items-center list-btn"
                          onClick={() => openBookChapters(bookName)}
                        >
                          <span>{bookName}</span>
                          <div className="d-flex align-items-center gap-3">
                            <span className="text-muted small">
                              {chaptersCount > 0 ? `${chaptersCount} أبواب - ${issuesCount} مسائل` : 'فارغ'}
                            </span>
                            <FiChevronLeft style={{ color: 'var(--accent-color)' }} />
                          </div>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. شاشة الفصول */}
              {currentView === 'chapters' && (
                <div className="mt-4">
                  <h3 className="mb-4 fw-bold" style={{ color: 'var(--primary-color)' }}>
                    <FiList className="ms-2"/> {selectedBookName} - الفصول
                  </h3>

                  {selectedBookChapters.length === 0 ? (
                    <div className="custom-card p-5 text-center shadow-sm">
                      <FiBook size={48} className="mb-3 text-muted" style={{ opacity: 0.35 }} />
                      <h5 className="fw-bold mb-2" style={{ color: 'var(--text-main)' }}>هذا الكتاب فارغ حالياً</h5>
                      <p className="text-muted mb-0">لم تتم إضافة فصول أو مسائل لهذا الكتاب بعد.</p>
                    </div>
                  ) : (
                    <div className="d-flex flex-column gap-3">
                    {selectedBookChapters.map(({ chapterName, issues }) => {
                      const isOpen = openChapterName === chapterName;

                      return (
                        <div key={chapterName} className="custom-card shadow-sm overflow-hidden">
                          <button
                            className="btn w-100 text-end p-4 d-flex justify-content-between align-items-center list-btn border-0"
                            onClick={() => toggleChapter(chapterName)}
                            aria-expanded={isOpen}
                          >
                            <span>{chapterName}</span>
                            <div className="d-flex align-items-center gap-3">
                              <span className="text-muted small">{issues.length} مسائل</span>
                              {isOpen ? (
                                <FiChevronRight style={{ color: 'var(--accent-color)' }} />
                              ) : (
                                <FiChevronLeft style={{ color: 'var(--accent-color)' }} />
                              )}
                            </div>
                          </button>

                          {isOpen && (
                            <div className="px-3 pb-3">
                              {issues.map((lesson) => (
                                <button
                                  key={lesson.id}
                                  className="btn w-100 text-end p-3 mb-2 d-flex justify-content-between align-items-center"
                                  style={{
                                    backgroundColor: 'var(--badge-bg)',
                                    color: 'var(--text-main)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                  }}
                                  onClick={() => {
                                    setCurrentIndex(lesson.lessonIndex);
                                    setCurrentView('reading');
                                  }}
                                >
                                  <span>{lesson.title}</span>
                                  <div className="d-flex align-items-center gap-3">
                                    <span className="text-muted small">ص {lesson.pageNumber}</span>
                                    <FiChevronLeft style={{ color: 'var(--accent-color)' }} />
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    </div>
                  )}
                </div>
              )}

              {/* 3. شاشة المسائل */}
              {currentView === 'lessons' && (
                <div className="mt-4">
                  <h3 className="mb-3 fw-bold" style={{ color: 'var(--primary-color)' }}>
                    <FiFileText className="ms-2"/> فهرس المسائل
                  </h3>
                  <div className="text-muted fw-bold mb-4">
                    {selectedBookName}
                  </div>
                  <div className="d-flex flex-column gap-4">
                    {selectedBookChapters.length === 0 && (
                      <div className="custom-card p-5 text-center shadow-sm">
                        <FiBook size={48} className="mb-3 text-muted" style={{ opacity: 0.35 }} />
                        <h5 className="fw-bold mb-2" style={{ color: 'var(--text-main)' }}>لا توجد مسائل حالياً</h5>
                        <p className="text-muted mb-0">لم تتم إضافة فصول أو مسائل لهذا الكتاب بعد.</p>
                      </div>
                    )}

                    {selectedBookChapters.map(({ chapterName, issues }) => (
                      <section key={chapterName}>
                        <h5
                          className="fw-bold mb-3 d-flex align-items-center"
                          style={{ color: 'var(--primary-color)' }}
                        >
                          <FiList className="ms-2" /> {chapterName}
                        </h5>

                        <div className="d-flex flex-column gap-3">
                          {issues.map((lesson) => (
                            <button
                              key={lesson.id}
                              className="btn w-100 text-end p-4 shadow-sm d-flex justify-content-between align-items-center list-btn mb-2"
                              onClick={() => {
                                setCurrentIndex(lesson.lessonIndex);
                                setCurrentView('reading');
                              }}
                            >
                              <span>{lesson.title}</span>
                              <div className="d-flex align-items-center gap-3">
                                <span className="text-muted small">ص {lesson.pageNumber}</span>
                                <FiChevronLeft style={{ color: 'var(--accent-color)' }} />
                              </div>
                            </button>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                </div>
              )}

              {/* شاشة المفضلة */}
              {currentView === 'bookmarks' && (
                <div className="mt-4 mb-5">
                  <h3 className="mb-4 fw-bold" style={{ color: 'var(--primary-color)' }}>
                    <FiBookmark className="ms-2" /> المفضلة
                  </h3>
                  {bookmarks.length === 0 ? (
                    <div className="text-center p-5 custom-card">
                      <FiBookmark size={50} className="mb-3 text-muted" style={{opacity: 0.3}} />
                      <p className="text-muted">لا توجد مسائل في المفضلة حالياً.</p>
                      <button className="btn btn-primary mt-3" onClick={() => setCurrentView('books')}>
                        تصفح الكتب
                      </button>
                    </div>
                  ) : (
                    <div className="d-flex flex-column gap-3">
                      {lessonsData.filter(l => bookmarks.includes(l.id)).map((lesson) => (
                        <button 
                          key={lesson.id}
                          className="btn w-100 text-end p-4 shadow-sm d-flex justify-content-between align-items-center list-btn mb-3"
                          onClick={() => {
                            const idx = lessonsData.findIndex(l => l.id === lesson.id);
                            setCurrentIndex(idx);
                            setCurrentView('reading');
                          }}
                        >
                          <span className="d-flex flex-column gap-1">
                            <span>{lesson.title}</span>
                            <small className="text-muted">
                              {lesson.bookName} &gt; {lesson.chapterName}
                            </small>
                          </span>
                          <FiChevronLeft style={{ color: 'var(--accent-color)' }} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* شاشة الفوائد المقتبسة */}
              {currentView === 'highlights' && (
                <div className="mt-4 mb-5">
                  <h3 className="mb-4 fw-bold" style={{ color: 'var(--primary-color)' }}>
                    <FiEdit3 className="ms-2" /> الفوائد المقتبسة
                  </h3>
                  {highlights.length === 0 ? (
                    <div className="text-center p-5 custom-card">
                      <FiEdit3 size={50} className="mb-3 text-muted" style={{opacity: 0.3}} />
                      <p className="text-muted">لا توجد فوائد مقتبسة حالياً.<br/>حدد أي نص في المسائل لحفظه هنا.</p>
                    </div>
                  ) : (
                    <div className="d-flex flex-column gap-3">
                      {highlights.slice().reverse().map((highlight) => {
                        const sourceLesson = lessonsData.find(l => l.id === highlight.lessonId);
                        const highlightBookName = highlight.bookName || sourceLesson?.bookName || 'كتاب غير محدد';
                        const highlightChapterName = highlight.chapterName || sourceLesson?.chapterName || 'باب غير محدد';
                        const highlightTitle = highlight.title || sourceLesson?.title || 'مسألة غير محددة';

                        return (
                          <div key={highlight.id} className="custom-card p-3 p-md-4 shadow-sm">
                            {/* صف العنوان: النص + زر الحذف */}
                            <div className="d-flex align-items-start gap-2 mb-3">
                              <p className="mb-0 flex-grow-1" style={{ fontSize: '1.1rem', lineHeight: '1.85' }}>
                                "{highlight.text}"
                              </p>
                              <button 
                                className="btn btn-outline-danger btn-sm rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                                style={{ width: '34px', height: '34px', minWidth: '34px', marginTop: '2px' }}
                                onClick={() => deleteHighlight(highlight.id)}
                                title="حذف الفائدة"
                              >
                                <FiTrash2 size={15} />
                              </button>
                            </div>

                            <ShareButton title={"فائدة مقتبسة"} text={highlight.text} sheikhComment={""} isSmall={true} />
                            <hr style={{ opacity: 0.1 }} />
                            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                              <span className="badge badge-custom text-muted d-flex flex-column align-items-start py-2 px-3" style={{ maxWidth: '65%' }}>
                                <span className="text-truncate w-100"><FiBook className="ms-2" /> {highlightTitle}</span>
                                <small className="mt-1 text-truncate w-100">
                                  {highlightBookName} &gt; {highlightChapterName}
                                </small>
                              </span>
                              <button 
                                className="btn btn-sm btn-light text-primary d-flex align-items-center"
                                style={{ fontWeight: 'bold', flexShrink: 0 }}
                                onClick={() => {
                                  const idx = lessonsData.findIndex(l => l.id === highlight.lessonId);
                                  if(idx !== -1) {
                                    setCurrentIndex(idx);
                                    setCurrentView('reading');
                                  }
                                }}
                              >
                                الذهاب للمسألة <FiChevronLeft className="me-1" />
                              </button>
                            </div>
                          </div>

                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* 4. شاشة القراءة */}
              {currentView === 'reading' && (
                <div
                  onMouseUp={(e) => {
                    // لا نفعل التحديد إذا كنا نضغط على زر
                    if(e.target.closest('button')) return;
                    
                    const selection = window.getSelection();
                    const text = selection.toString().trim();
                    if (text.length > 5) {
                      const range = selection.getRangeAt(0);
                      const rect = range.getBoundingClientRect();
                      setHighlightSelection({
                        show: true,
                        text,
                        x: rect.left + rect.width / 2,
                        y: rect.top - 10
                      });
                    } else {
                      setHighlightSelection({ show: false, text: '', x: 0, y: 0 });
                    }
                  }}
                  onTouchEnd={() => {
                    // Similar logic for mobile
                    setTimeout(() => {
                      const selection = window.getSelection();
                      const text = selection.toString().trim();
                      if (text.length > 5) {
                        const range = selection.getRangeAt(0);
                        const rect = range.getBoundingClientRect();
                        setHighlightSelection({
                          show: true,
                          text,
                          x: rect.left + rect.width / 2,
                          y: rect.top - 10
                        });
                      } else {
                        setHighlightSelection({ show: false, text: '', x: 0, y: 0 });
                      }
                    }, 100);
                  }}
                >
                  {/* Floating Highlight Button */}
                  <AnimatePresence>
                    {highlightSelection.show && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        style={{
                          position: 'fixed',
                          top: highlightSelection.y,
                          left: highlightSelection.x,
                          transform: 'translate(-50%, -100%)',
                          zIndex: 9999,
                          backgroundColor: 'var(--primary-color)',
                          color: 'var(--accent-color)',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontWeight: 'bold',
                          whiteSpace: 'nowrap'
                        }}
                        onClick={saveCurrentSelectionAsHighlight}
                      >
                        <FiEdit3 size={18} /> حفظ كفائدة
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <button 
                      className="btn btn-sm text-muted d-flex align-items-center"
                      onClick={() => setCurrentView('lessons')}
                    >
                      <FiList className="ms-2"/> العودة لفهرس المسائل
                    </button>
                    <button 
                      className={`bookmark-btn ${bookmarks.includes(currentLesson.id) ? 'active' : ''}`}
                      onClick={() => toggleBookmark(currentLesson.id)}
                      title="حفظ في المفضلة"
                    >
                      <FiBookmark size={24} fill={bookmarks.includes(currentLesson.id) ? 'currentColor' : 'none'} />
                    </button>
                  </div>

                  <div className="d-flex justify-content-between mb-4">
                    <button 
                      className="btn btn-outline-primary btn-sm d-flex align-items-center"
                      onClick={goToPrevLesson}
                      disabled={currentIndex === 0}
                    >
                      <FiChevronRight className="ms-1" /> السابقة
                    </button>
                    <button 
                      className="btn btn-outline-primary btn-sm d-flex align-items-center"
                      onClick={goToNextLesson}
                      disabled={currentIndex === lessonsData.length - 1}
                    >
                      التالية <FiChevronLeft className="me-1" />
                    </button>
                  </div>

                  <Breadcrumb book={currentLesson.bookName} chapter={currentLesson.chapterName} />
                  
                  <h3 className="mb-3 fw-bold mt-4 text-center" style={{ color: 'var(--primary-color)' }}>
                    {currentLesson.title}
                  </h3>
                  
                  <div className="d-flex justify-content-center flex-wrap gap-3 mb-4">
                    <span className="badge badge-custom d-flex align-items-center py-2 px-3 shadow-sm">
                      <FiBook className="ms-2" style={{ color: 'var(--accent-color)' }} /> ص {currentLesson.pageNumber}
                    </span>
                    <span className="badge badge-custom d-flex align-items-center py-2 px-3 shadow-sm">
                      <FiVideo className="ms-2" style={{ color: 'var(--accent-color)' }} /> {currentLesson.videoNumber}
                    </span>
                    <span className="badge badge-custom d-flex align-items-center py-2 px-3 shadow-sm">
                      <FiClock className="ms-2" style={{ color: 'var(--accent-color)' }} /> يبدأ عند: {currentLesson.videoTimestamp}
                    </span>
                    <button 
                      className="badge d-flex align-items-center py-2 px-3 shadow-sm border-0"
                      style={{ 
                        cursor: 'pointer', 
                        transition: 'all 0.3s',
                        backgroundColor: lastReadLessonId === currentLesson.id.toString() ? 'var(--primary-color)' : 'var(--badge-bg)',
                        color: lastReadLessonId === currentLesson.id.toString() ? 'var(--accent-color)' : 'var(--text-main)',
                      }}
                      onClick={() => {
                        const id = currentLesson.id.toString();
                        if (lastReadLessonId === id) {
                          setLastReadLessonId(null);
                          localStorage.removeItem('lastReadLessonId');
                        } else {
                          setLastReadLessonId(id);
                          localStorage.setItem('lastReadLessonId', id);
                        }
                      }}
                      title="تحديد كعلامة توقف للعودة إليها لاحقاً"
                    >
                      <FiFlag className="ms-2" style={{ color: 'var(--accent-color)' }} /> 
                      {lastReadLessonId === currentLesson.id.toString() ? 'علامة وقوفك الحالية' : 'ضع علامة وقوف'}
                    </button>
                  </div>

                  <QuoteCard text={currentLesson.mainText} searchQuery={currentSearchQuery} />
                  
                  <ShareButton 
                    title={currentLesson.title} 
                    text={currentLesson.mainText} 
                    sheikhComment={currentLesson.sheikhExplanation}
                  />
                  
                  <ExplanationCard explanation={currentLesson.sheikhExplanation} searchQuery={currentSearchQuery} />
                  <VideoCard videoUrl={currentLesson.videoUrl} startTime={currentLesson.startTime} />
                  
                  {/* الميزات التفاعلية الجديدة */}
                  <NotesCard lessonId={currentLesson.id} />
                </div>
              )}

              {/* 5. شاشة الإعدادات */}
              {currentView === 'settings' && (
                <div className="mt-4 mb-5 text-center">
                  <h3 className="mb-4 fw-bold" style={{ color: 'var(--primary-color)' }}>
                    حول التطبيق والإعدادات
                  </h3>

                  <div className="custom-card p-5 mx-auto text-center" style={{ maxWidth: '600px' }}>
                    
                    {/* قسم الدعاء */}
                    <FiHeart size={50} className="mx-auto mb-3" style={{ color: '#e74c3c' }} />
                    <h4 className="fw-bold mb-3" style={{ color: 'var(--text-main)' }}>طلب دعاء</h4>
                    <p className="fs-5 text-muted mb-4" style={{ lineHeight: '1.8' }}>
                      نرجو الدعاء لمصمم الموقع بظهر الغيب وسؤال التوفيق والسداد في الدارين.
                    </p>

                    <hr className="my-4 w-75 mx-auto" style={{ opacity: 0.1 }} />

                    {/* قسم التواصل */}
                    <h5 className="fw-bold mb-4" style={{ color: 'var(--primary-color)' }}>للتواصل مع المطور:</h5>

                    <div className="d-flex flex-column gap-3 px-md-4">
                      <a 
                        href="https://wa.me/201093122064" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="btn btn-lg d-flex align-items-center justify-content-center gap-3 shadow-sm border-0" 
                        style={{ backgroundColor: '#25D366', color: 'white', borderRadius: '10px' }}
                      >
                        <FiPhone size={24} /> +201093122064
                      </a>

                      <a 
                        href="https://www.facebook.com/profile.php?id=100015027550497" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="btn btn-lg d-flex align-items-center justify-content-center gap-3 shadow-sm border-0" 
                        style={{ backgroundColor: '#1877F2', color: 'white', borderRadius: '10px' }}
                      >
                        <FiFacebook size={24} /> حساب فيسبوك
                      </a>

                      <a 
                        href="https://www.linkedin.com/in/mohamed-abohelal" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="btn btn-lg d-flex align-items-center justify-content-center gap-3 shadow-sm border-0" 
                        style={{ backgroundColor: '#0A66C2', color: 'white', borderRadius: '10px' }}
                      >
                        <FiLinkedin size={24} /> حساب لينكد إن
                      </a>
                    </div>

                  </div>
                </div>
              )}
              </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}

      {/* زر العودة للأعلى */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="back-to-top"
            aria-label="العودة للأعلى"
          >
            <svg className="back-to-top-progress" viewBox="0 0 48 48" aria-hidden="true">
              <circle className="back-to-top-progress-track" cx="24" cy="24" r="21" />
              <motion.circle
                className="back-to-top-progress-value"
                cx="24"
                cy="24"
                r="21"
                pathLength={1}
                style={{ pathLength: scrollYProgress }}
              />
            </svg>
            <span className="back-to-top-icon">
              <FiArrowUp />
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* شريط التنقل السفلي للموبايل */}
      {currentView !== 'hero' && (
        <div className="mobile-bottom-nav">
          <button 
            className={`nav-item ${['books', 'chapters', 'lessons', 'reading'].includes(currentView) ? 'active' : ''}`}
            onClick={() => setCurrentView('books')}
          >
            <FiHome size={20} />
            <span>الرئيسية</span>
          </button>
          <button 
            className={`nav-item ${currentView === 'bookmarks' ? 'active' : ''}`}
            onClick={() => setCurrentView('bookmarks')}
          >
            <FiBookmark size={20} />
            <span>المفضلة</span>
          </button>
          <button 
            className={`nav-item ${currentView === 'highlights' ? 'active' : ''}`}
            onClick={() => setCurrentView('highlights')}
          >
            <FiEdit3 size={20} />
            <span>الفوائد</span>
          </button>
          <button 
            className={`nav-item ${currentView === 'settings' ? 'active' : ''}`}
            onClick={() => setCurrentView('settings')}
          >
            <FiList size={20} />
            <span>المزيد</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default App;