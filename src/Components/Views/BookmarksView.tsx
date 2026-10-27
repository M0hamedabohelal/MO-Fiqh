import { useState } from 'react';
import { FiBookmark, FiChevronLeft, FiBook, FiSearch, FiEdit3 } from 'react-icons/fi';
import EmptyState from '../UI/EmptyState';
import { useApp } from '../Layout/AppContext';

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
  // المطابقة كنصوص دائمًا — المعرفات قد تأتي أرقامًا من مصدر ونصوصًا من آخر
  const bookmarkSet = new Set((bookmarks || []).map(String));
  const bookmarkedLessons = lessons.filter((l) => bookmarkSet.has(String(l.id)));
  const q = query.trim();
  const visibleLessons = q
    ? bookmarkedLessons.filter((l) => `${l.title} ${l.bookName} ${l.chapterName}`.includes(q))
    : bookmarkedLessons;

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

      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="mb-0 fw-bold" style={{ color: 'var(--primary-color)' }}>
          <FiBookmark className="ms-2" /> المفضلة
        </h3>
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
          ) : visibleLessons.map((lesson) => (
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
          ))}
        </div>
      )}
    </div>
  );
};

export default BookmarksView;
