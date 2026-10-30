import { useState, useMemo } from 'react';
import { FiBookmark, FiChevronLeft, FiChevronDown, FiBook, FiSearch, FiEdit3, FiPrinter, FiGrid, FiList } from 'react-icons/fi';
import EmptyState from '../UI/EmptyState';
import { useApp } from '../Layout/AppContext';
import { exportBookmarksPrint } from '../../utils/printExport';
import type { Lesson } from '../../types';

// شاشة المسائل المحفوظة في المفضلة
const BookmarksView = () => {
  const {
    bookmarks,
    highlights,
    lessons,
    openLessonById: onOpenLessonById,
    setCurrentView,
  } = useApp();
  const onBrowse = (): void => setCurrentView('books');
  const [query, setQuery] = useState('');
  const [collapsedBooks, setCollapsedBooks] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');

  // المطابقة كنصوص دائمًا — المعرفات قد تأتي أرقامًا من مصدر ونصوصًا من آخر
  const bookmarkSet = new Set((bookmarks || []).map(String));
  const bookmarkedLessons = lessons.filter((l) => bookmarkSet.has(String(l.id)));
  const q = query.trim();
  const visibleLessons = q
    ? bookmarkedLessons.filter((l) => `${l.title} ${l.bookName} ${l.chapterName}`.includes(q))
    : bookmarkedLessons;

  // تجميع المسائل حسب الكتاب ثم الباب
  const groupedByBook = useMemo(() => {
    const map = new Map<string, { bookName: string; chapters: Map<string, Lesson[]> }>();
    visibleLessons.forEach((lesson) => {
      const b = lesson.bookName || 'مسائل أخرى';
      const c = lesson.chapterName || 'بدون باب';
      if (!map.has(b)) {
        map.set(b, { bookName: b, chapters: new Map() });
      }
      const bookObj = map.get(b)!;
      if (!bookObj.chapters.has(c)) {
        bookObj.chapters.set(c, []);
      }
      bookObj.chapters.get(c)!.push(lesson);
    });

    return Array.from(map.values()).map((b) => ({
      bookName: b.bookName,
      chapters: Array.from(b.chapters.entries()).map(([chapterName, chapterLessons]) => ({
        chapterName,
        lessons: chapterLessons,
      })),
      totalLessons: Array.from(b.chapters.values()).reduce((acc, arr) => acc + arr.length, 0),
    }));
  }, [visibleLessons]);

  const toggleCollapseBook = (bookName: string): void => {
    setCollapsedBooks((prev) => ({
      ...prev,
      [bookName]: !prev[bookName],
    }));
  };

  const handlePrintBooklet = (): void => {
    exportBookmarksPrint({ bookmarkedLessons: visibleLessons });
  };

  return (
    <div className="mt-3 mt-md-4 mb-5">
      {/* تبويبات التبديل السلس بين الفوائد والمفضلة */}
      <div className="d-flex gap-2 mb-3 p-1 rounded-3" style={{ background: 'var(--badge-bg)', width: 'fit-content' }}>
        <button
          type="button"
          className="btn btn-sm px-3 py-1 rounded-2 text-muted fw-bold border-0"
          onClick={() => setCurrentView('highlights')}
        >
          <FiEdit3 className="ms-1" /> الفوائد والزوائد ({(highlights || []).length})
        </button>
        <button
          type="button"
          className="btn btn-sm px-3 py-1 rounded-2 shadow-sm fw-bold border-0"
          style={{ backgroundColor: 'var(--primary-color)', color: 'var(--text-on-primary)' }}
        >
          <FiBookmark className="ms-1" /> المسائل المفضلة ({bookmarkedLessons.length})
        </button>
      </div>

      {/* ترويسة الشاشة مع زر كراسة المراجعة وأزرار نمط العرض */}
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <h3 className="mb-0 fw-bold d-flex align-items-center" style={{ color: 'var(--primary-color)' }}>
          <FiBookmark className="ms-2" /> المفضلة
        </h3>

        {bookmarkedLessons.length > 0 && (
          <div className="d-flex align-items-center gap-2">
            {/* تبديل نمط العرض (مجمع بالأبواب / قائمة مسترسلة) */}
            <div className="btn-group btn-group-sm shadow-sm" role="group" aria-label="نمط عرض المفضلة">
              <button
                type="button"
                className={`btn btn-sm ${viewMode === 'grouped' ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setViewMode('grouped')}
                title="عرض مصنف حسب الكتب والأبواب"
                aria-label="عرض مصنف"
              >
                <FiGrid className="me-1" /> حسب الكتب
              </button>
              <button
                type="button"
                className={`btn btn-sm ${viewMode === 'flat' ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setViewMode('flat')}
                title="عرض قائمة مستمرة"
                aria-label="عرض قائمة مستمرة"
              >
                <FiList className="me-1" /> قائمة
              </button>
            </div>

            {/* زر تصدير كراسة المراجعة */}
            <button
              type="button"
              className="btn btn-sm d-flex align-items-center gap-1 shadow-sm px-2 px-md-3 py-1 fw-bold"
              style={{
                borderRadius: '8px',
                backgroundColor: 'var(--badge-bg)',
                borderColor: 'var(--border-color)',
                color: 'var(--primary-color)',
                border: '1px solid',
                minHeight: '32px',
              }}
              onClick={handlePrintBooklet}
              title="تصدير كراسة المراجعة للطباعة (PDF)"
              aria-label="تصدير كراسة المراجعة للطباعة"
            >
              <FiPrinter size={15} />
              <span className="d-none d-sm-inline">كراسة المراجعة</span>
              <span className="d-inline d-sm-none">PDF</span>
            </button>
          </div>
        )}
      </div>

      {bookmarkedLessons.length === 0 ? (
        <EmptyState
          icon={FiBookmark}
          title="لا توجد مسائل محفوظة"
          message="احفظ المسائل التي تهمك بالضغط على أيقونة المفضلة داخل أي مسألة."
          hint="⭐ ستجدها هنا في أي وقت"
        >
          <button className="btn btn-primary mt-1" onClick={onBrowse}>
            تصفح الكتب
          </button>
        </EmptyState>
      ) : (
        <div className="d-flex flex-column gap-3">
          {bookmarkedLessons.length > 3 && (
            <div className="position-relative">
              <FiSearch className="position-absolute top-50 translate-middle-y" size={16} style={{ right: '12px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-control"
                placeholder="ابحث في مفضلتك..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ paddingRight: '36px', borderRadius: '10px' }}
                aria-label="البحث في المفضلة"
              />
            </div>
          )}

          {visibleLessons.length === 0 ? (
            <div className="text-center text-muted py-4">
              لا نتائج مطابقة لـ "{q}" — <button className="btn btn-link btn-sm" onClick={() => setQuery('')}>مسح البحث</button>
            </div>
          ) : viewMode === 'grouped' ? (
            /* العرض المصنف حسب الكتب والأبواب */
            <div className="d-flex flex-column gap-3">
              {groupedByBook.map((group) => {
                const isCollapsed = Boolean(collapsedBooks[group.bookName]) && !q;
                return (
                  <div
                    key={group.bookName}
                    className="bookmark-book-card rounded-3 p-2 p-md-3 shadow-sm"
                    style={{
                      backgroundColor: 'var(--card-bg)',
                      border: '1px solid var(--border-color)',
                      transition: 'all 0.25s ease',
                    }}
                  >
                    {/* شريط الكتاب العلوي القابل للطي */}
                    <button
                      type="button"
                      className="btn w-100 d-flex justify-content-between align-items-center p-2 text-start border-0"
                      onClick={() => toggleCollapseBook(group.bookName)}
                      aria-expanded={!isCollapsed}
                      aria-label={`قسم ${group.bookName}`}
                      title={isCollapsed ? 'فتح قسم الكتاب' : 'طي قسم الكتاب'}
                    >
                      <div className="d-flex align-items-center gap-2">
                        <div
                          className="d-flex align-items-center justify-content-center rounded-2"
                          style={{
                            width: '32px',
                            height: '32px',
                            backgroundColor: 'var(--badge-bg)',
                            color: 'var(--accent-color)',
                            border: '1px solid var(--border-color)',
                          }}
                        >
                          <FiBook size={16} />
                        </div>
                        <span
                          className="fw-bold"
                          style={{
                            fontFamily: 'var(--font-heading)',
                            fontSize: '1.05rem',
                            color: 'var(--primary-color)',
                          }}
                        >
                          {group.bookName}
                        </span>
                        <span
                          className="badge rounded-pill px-2 py-1"
                          style={{
                            backgroundColor: 'var(--badge-bg)',
                            color: 'var(--text-muted)',
                            border: '1px solid var(--border-color)',
                            fontSize: '0.78rem',
                          }}
                        >
                          {group.totalLessons} {group.totalLessons === 1 ? 'مسألة' : 'مسائل'}
                        </span>
                      </div>

                      <FiChevronDown
                        size={18}
                        style={{
                          transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s ease',
                          color: 'var(--text-muted)',
                        }}
                      />
                    </button>

                    {/* قائمة المسائل داخل الكتاب */}
                    {!isCollapsed && (
                      <div className="d-flex flex-column gap-2 mt-2 pt-2 border-top">
                        {group.chapters.map((ch) => (
                          <div key={ch.chapterName} className="mb-1">
                            {group.chapters.length > 1 && (
                              <div
                                className="small fw-bold text-muted px-2 py-1 mb-1 d-flex align-items-center gap-1"
                                style={{ fontSize: '0.82rem' }}
                              >
                                <span>📑</span>
                                <span>{ch.chapterName}</span>
                                <span className="text-muted">({ch.lessons.length})</span>
                              </div>
                            )}

                            {ch.lessons.map((lesson) => (
                              <button
                                key={lesson.id}
                                className="btn w-100 text-end p-3 shadow-sm d-flex justify-content-between align-items-center list-btn mb-2"
                                onClick={() => onOpenLessonById(lesson.id)}
                              >
                                <div className="d-flex flex-column align-items-start text-start gap-1 pe-1 overflow-hidden">
                                  <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1em', lineHeight: '1.7' }}>
                                    {lesson.title}
                                  </span>
                                  <span className="text-muted" style={{ fontFamily: 'var(--font-ui)', fontSize: '0.85rem', lineHeight: '1.5' }}>
                                    <FiBook className="me-1 mb-1" size={14} />
                                    {lesson.bookName} <span className="mx-1">&gt;</span> {lesson.chapterName}
                                  </span>
                                </div>
                                <FiChevronLeft className="flex-shrink-0 ms-2" size={20} style={{ color: 'var(--accent-color)' }} />
                              </button>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* العرض المسطح المباشر */
            visibleLessons.map((lesson) => (
              <button
                key={lesson.id}
                className="btn w-100 text-end p-4 shadow-sm d-flex justify-content-between align-items-center list-btn mb-3"
                onClick={() => onOpenLessonById(lesson.id)}
              >
                <div className="d-flex flex-column align-items-start text-start gap-2 pe-1">
                  <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15em', lineHeight: '1.8' }}>
                    {lesson.title}
                  </span>
                  <span className="text-muted" style={{ fontFamily: 'var(--font-ui)', fontSize: '0.85rem', lineHeight: '1.5' }}>
                    <FiBook className="me-1 mb-1" size={14} />
                    {lesson.bookName} <span className="mx-1">&gt;</span> {lesson.chapterName}
                  </span>
                </div>
                <FiChevronLeft className="flex-shrink-0 ms-2" size={20} style={{ color: 'var(--accent-color)' }} />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default BookmarksView;
