import { useRef, useState, useMemo } from 'react';
import {
  FiEdit3,
  FiTrash2,
  FiBook,
  FiChevronLeft,
  FiPrinter,
  FiSearch,
  FiDownload,
  FiUpload,
  FiCopy,
  FiRefreshCw,
  FiBookmark,
  FiCheck,
  FiFilter,
} from 'react-icons/fi';
import EmptyState from '../UI/EmptyState';
import ShareButton from '../UI/ShareButton';
import { exportNotesPrint } from '../../utils/printExport';
import { buildBackup, downloadBackup, parseBackupFile, backupToText } from '../../utils/libraryBackup';
import { useApp } from '../Layout/AppContext';

export const HIGHLIGHT_COLORS = [
  { key: 'gold', label: 'ذهبي (مسألة هامة)', dot: '#d4af37', classSuffix: 'gold' },
  { key: 'green', label: 'أخضر (قاعدة فقهية)', dot: '#27ae60', classSuffix: 'green' },
  { key: 'blue', label: 'أزرق (لطيفة لغوية)', dot: '#2980b9', classSuffix: 'blue' },
  { key: 'purple', label: 'بنفسجي (تنبيه)', dot: '#8e44ad', classSuffix: 'purple' },
] as const;

// شاشة الفوائد المقتبسة بنمط بطاقات الاقتباس الأندلسية الملهمة (Masonry) وتصنيف الألوان
const HighlightsView = () => {
  const {
    bookmarks,
    readLessons,
    highlights,
    notes,
    stopMarks,
    lessons,
    deleteHighlight: onDeleteHighlight,
    updateHighlightColor: onUpdateHighlightColor,
    openLessonById: onOpenLessonById,
    restoreLibrary,
    setCurrentView,
  } = useApp();

  const [query, setQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState('all');
  const [selectedColor, setSelectedColor] = useState('all');
  const [copiedId, setCopiedId] = useState<string | number | null>(null);
  const [notice, setNotice] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);

  const hasAnySavedContent =
    highlights.length > 0 || Object.values(notes).some((t) => t && String(t).trim());

  // قائمة الكتب المتاحة بالفوائد للتصفية
  const availableBooks = useMemo(() => {
    const map = new Map<string, number>();
    highlights.forEach((h) => {
      const source = lessons.find((l) => String(l.id) === String(h.lessonId));
      const b = h.bookName || source?.bookName;
      if (b) {
        map.set(b, (map.get(b) || 0) + 1);
      }
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [highlights, lessons]);

  // إحصائيات الألوان
  const colorCounts = useMemo(() => {
    const counts: Record<string, number> = { all: highlights.length, uncolored: 0 };
    HIGHLIGHT_COLORS.forEach((c) => {
      counts[c.key] = 0;
    });
    highlights.forEach((h) => {
      if (h.color && counts[h.color] !== undefined) {
        counts[h.color] = (counts[h.color] || 0) + 1;
      } else {
        counts.uncolored = (counts.uncolored || 0) + 1;
      }
    });
    return counts;
  }, [highlights]);

  const q = query.trim();

  // تصفية الفوائد حسب البحث والكتاب واللون
  const filteredHighlights = useMemo(() => {
    return highlights.filter((h) => {
      const lesson = lessons.find((l) => String(l.id) === String(h.lessonId));
      const book = h.bookName || lesson?.bookName || '';

      // تصفية بالكتاب
      if (selectedBook !== 'all' && book !== selectedBook) {
        return false;
      }

      // تصفية باللون
      if (selectedColor !== 'all') {
        if (selectedColor === 'uncolored' && h.color) return false;
        if (selectedColor !== 'uncolored' && h.color !== selectedColor) return false;
      }

      // تصفية بالبحث
      if (q) {
        const hay = `${h.text} ${h.title || ''} ${lesson?.title || ''} ${book} ${h.chapterName || lesson?.chapterName || ''}`;
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [highlights, lessons, selectedBook, selectedColor, q]);

  const noteEntries = Object.entries(notes).filter(([, t]) => t && String(t).trim());
  const filteredNotes = q
    ? noteEntries.filter(([id, t]) => {
        const lesson = lessons.find((l) => String(l.id) === String(id));
        return `${t} ${lesson?.title || ''} ${lesson?.bookName || ''}`.includes(q);
      })
    : noteEntries;

  const titleOf = (id: string): string => lessons.find((l) => String(l.id) === String(id))?.title || '';

  const handleBackup = (): void => {
    downloadBackup(buildBackup({ bookmarks, highlights, notes, readLessons, stopMarks }));
    setNotice('تم تنزيل نسخة احتياطية من مكتبتك.');
    setTimeout(() => setNotice(''), 3000);
  };

  const handleCopyAll = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(backupToText({ bookmarks, highlights, notes, readLessons, stopMarks }, titleOf));
      setNotice('تم نسخ كل الفوائد والملاحظات إلى الحافظة.');
    } catch {
      setNotice('تعذر النسخ إلى الحافظة.');
    }
    setTimeout(() => setNotice(''), 3000);
  };

  const handleCopySingle = async (id: string | number, text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      setNotice('تعذر النسخ إلى الحافظة.');
      setTimeout(() => setNotice(''), 2500);
    }
  };

  const handleRestoreFile = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    try {
      const text = await file.text();
      const data = parseBackupFile(text);
      restoreLibrary(data);
      setNotice(`تمت الاستعادة ودمج ${data.bookmarks.length} مفضلة و${data.highlights.length} فائدة.`);
    } catch (err) {
      setNotice((err as Error).message);
    }
    setTimeout(() => setNotice(''), 4000);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="mt-3 mt-md-4 mb-5">
      {/* تبويبات التبديل السلس بين الفوائد والمفضلة */}
      <div className="d-flex gap-2 mb-3 p-1 rounded-3" style={{ background: 'var(--badge-bg)', width: 'fit-content' }}>
        <button
          type="button"
          className="btn btn-sm px-3 py-1 rounded-2 shadow-sm fw-bold border-0"
          style={{ backgroundColor: 'var(--primary-color)', color: 'var(--text-on-primary)' }}
        >
          <FiEdit3 className="ms-1" /> الفوائد والزوائد ({highlights.length})
        </button>
        <button
          type="button"
          className="btn btn-sm px-3 py-1 rounded-2 text-muted fw-bold border-0"
          onClick={() => setCurrentView('bookmarks')}
        >
          <FiBookmark className="ms-1" /> المسائل المفضلة ({bookmarks.length})
        </button>
      </div>

      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
        <h3 className="mb-0 fw-bold" style={{ color: 'var(--primary-color)' }}>
          <FiEdit3 className="ms-2" /> الفوائد المقتبسة
        </h3>
        <div className="d-flex gap-2 flex-wrap">
          <button
            type="button"
            className="btn btn-sm d-flex align-items-center shadow-sm"
            style={{
              backgroundColor: 'var(--primary-color)',
              color: 'var(--text-on-primary)',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 'bold',
            }}
            onClick={() => setCurrentView('review')}
            title="مراجعة الفوائد والمسائل بأسلوب البطاقات"
          >
            <FiRefreshCw className="ms-1" size={14} /> وضع المراجعة
          </button>
          {hasAnySavedContent && (
            <button
              className="btn btn-sm d-flex align-items-center shadow-sm"
              style={{
                backgroundColor: 'var(--badge-bg)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                fontWeight: 'bold',
              }}
              onClick={() => exportNotesPrint({ highlights, notes, lessons })}
              title="طباعة أو حفظ PDF"
            >
              <FiPrinter className="ms-2" size={18} /> تصدير PDF
            </button>
          )}
          {hasAnySavedContent && (
            <button
              className="btn btn-sm d-flex align-items-center shadow-sm"
              style={{ backgroundColor: 'var(--badge-bg)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '10px', fontWeight: 'bold' }}
              onClick={handleBackup}
              title="تنزيل نسخة احتياطية JSON"
            >
              <FiDownload className="ms-1" size={16} /> نسخة احتياطية
            </button>
          )}
          {hasAnySavedContent && (
            <button
              className="btn btn-sm d-flex align-items-center shadow-sm"
              style={{ backgroundColor: 'var(--badge-bg)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '10px', fontWeight: 'bold' }}
              onClick={handleCopyAll}
              title="نسخ المكتبة كنص"
            >
              <FiCopy className="ms-1" size={16} /> نسخ الكل
            </button>
          )}
          <button
            className="btn btn-sm d-flex align-items-center shadow-sm"
            style={{ backgroundColor: 'var(--badge-bg)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '10px', fontWeight: 'bold' }}
            onClick={() => fileRef.current?.click()}
            title="استعادة نسخة احتياطية"
          >
            <FiUpload className="ms-1" size={16} /> استعادة
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="d-none" onChange={(e) => handleRestoreFile(e.target.files?.[0])} />
        </div>
      </div>

      {notice && (
        <div className="alert alert-info py-2 small" role="status">{notice}</div>
      )}

      {/* بحث وتصنيف داخل الفوائد */}
      {hasAnySavedContent && (
        <div className="mb-4">
          <div className="position-relative mb-3">
            <FiSearch className="position-absolute top-50 translate-middle-y" size={16} style={{ right: '12px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              placeholder="ابحث في فوائدك وملاحظاتك..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ paddingRight: '36px', borderRadius: '10px' }}
              aria-label="البحث في الفوائد والملاحظات"
            />
          </div>

          {/* فلاتر التصنيف: بالكتب وبالألوان */}
          {highlights.length > 0 && (
            <div className="d-flex flex-column gap-2 p-2 rounded-3" style={{ background: 'var(--badge-bg)', border: '1px solid var(--border-color)' }}>
              {/* تصنيف الكتب */}
              {availableBooks.length > 1 && (
                <div className="d-flex align-items-center gap-1 overflow-x-auto pb-1" role="group" aria-label="تصفية حسب الكتاب">
                  <span className="small text-muted fw-bold ms-2 d-flex align-items-center" style={{ whiteSpace: 'nowrap' }}>
                    <FiBook className="ms-1" size={13} /> الكتاب:
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm py-0 px-2"
                    style={{
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      fontWeight: selectedBook === 'all' ? 700 : 500,
                      backgroundColor: selectedBook === 'all' ? 'var(--primary-color)' : 'transparent',
                      color: selectedBook === 'all' ? '#ffffff' : 'var(--text-main)',
                      whiteSpace: 'nowrap',
                    }}
                    onClick={() => setSelectedBook('all')}
                  >
                    الكل ({highlights.length})
                  </button>
                  {availableBooks.map((b) => (
                    <button
                      key={b.name}
                      type="button"
                      className="btn btn-sm py-0 px-2"
                      style={{
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: selectedBook === b.name ? 700 : 500,
                        backgroundColor: selectedBook === b.name ? 'var(--primary-color)' : 'transparent',
                        color: selectedBook === b.name ? '#ffffff' : 'var(--text-main)',
                        whiteSpace: 'nowrap',
                      }}
                      onClick={() => setSelectedBook(b.name)}
                    >
                      {b.name} ({b.count})
                    </button>
                  ))}
                </div>
              )}

              {/* تصنيف الألوان */}
              <div className="d-flex align-items-center gap-1 overflow-x-auto pb-1" role="group" aria-label="تصفية حسب اللون">
                <span className="small text-muted fw-bold ms-2 d-flex align-items-center" style={{ whiteSpace: 'nowrap' }}>
                  <FiFilter className="ms-1" size={13} /> التصنيف:
                </span>
                <button
                  type="button"
                  className="btn btn-sm py-0 px-2"
                  style={{
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: selectedColor === 'all' ? 700 : 500,
                    backgroundColor: selectedColor === 'all' ? 'var(--primary-color)' : 'transparent',
                    color: selectedColor === 'all' ? '#ffffff' : 'var(--text-main)',
                    whiteSpace: 'nowrap',
                  }}
                  onClick={() => setSelectedColor('all')}
                >
                  كل الألوان ({highlights.length})
                </button>
                {HIGHLIGHT_COLORS.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    className="btn btn-sm py-0 px-2 d-inline-flex align-items-center gap-1"
                    style={{
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      fontWeight: selectedColor === c.key ? 700 : 500,
                      backgroundColor: selectedColor === c.key ? 'var(--primary-color)' : 'transparent',
                      color: selectedColor === c.key ? '#ffffff' : 'var(--text-main)',
                      whiteSpace: 'nowrap',
                    }}
                    onClick={() => setSelectedColor(c.key)}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: c.dot }} />
                    {c.label.split(' ')[0]} ({colorCounts[c.key] || 0})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {highlights.length === 0 ? (
        <EmptyState
          icon={FiEdit3}
          title="لا توجد فوائد مقتبسة بعد"
          message="حدد أي نص في المسائل واضغط على زر الحفظ لإضافته هنا."
          hint="✨ جمّع أهم الفوائد العلمية في مكان واحد"
        />
      ) : filteredHighlights.length === 0 && filteredNotes.length === 0 ? (
        <EmptyState
          icon={FiSearch}
          title="لا نتائج مطابقة"
          message={`لا توجد فوائد أو ملاحظات تطابق معايير التصفية الحالية.`}
          hint="جرّب تعديل خيارات التصفية أو امسح البحث"
        >
          <button
            className="btn btn-outline-secondary btn-sm mt-1"
            onClick={() => {
              setQuery('');
              setSelectedBook('all');
              setSelectedColor('all');
            }}
          >
            إعادة تعيين الفلاتر
          </button>
        </EmptyState>
      ) : (
        <>
          {/* شبكة الفوائد بنمط Masonry الفاخر */}
          <div className="highlights-masonry">
            {filteredHighlights.slice().reverse().map((highlight) => {
              const sourceLesson = lessons.find((l) => String(l.id) === String(highlight.lessonId));
              const highlightBookName = highlight.bookName || sourceLesson?.bookName || 'كتاب غير محدد';
              const highlightChapterName = highlight.chapterName || sourceLesson?.chapterName || 'باب غير محدد';
              const highlightTitle = highlight.title || sourceLesson?.title || 'مسألة غير محددة';
              const colorClass = highlight.color ? `highlight-card-${highlight.color}` : '';

              return (
                <div
                  key={highlight.id}
                  className={`custom-card p-3 p-md-4 shadow-sm highlight-masonry-card ${colorClass}`}
                >
                  {/* علامة اقتباس أندلسية خلفية */}
                  <span className="highlight-quote-mark" aria-hidden="true">❝</span>

                  {/* شريط التحكم العلوي: تصنيف اللون + زر الحذف */}
                  <div className="d-flex align-items-center justify-content-between gap-2 mb-3 position-relative" style={{ zIndex: 2 }}>
                    <div className="highlight-color-picker" title="اختر تصنيف ولون الفائدة">
                      {HIGHLIGHT_COLORS.map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          className={`highlight-color-dot ${highlight.color === opt.key ? 'active' : ''}`}
                          style={{ backgroundColor: opt.dot }}
                          onClick={() => {
                            if (onUpdateHighlightColor) {
                              onUpdateHighlightColor(highlight.id, highlight.color === opt.key ? '' : opt.key);
                            }
                          }}
                          title={opt.label}
                          aria-label={opt.label}
                        />
                      ))}
                    </div>

                    <button
                      className="btn btn-outline-danger btn-sm rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{ width: '32px', height: '32px', minWidth: '32px' }}
                      onClick={() => onDeleteHighlight(highlight.id)}
                      title="حذف الفائدة"
                      aria-label="حذف الفائدة المقتبسة"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>

                  {/* نص الفائدة المقتبسة */}
                  <p className="highlight-text-content mb-3">
                    "{highlight.text}"
                  </p>

                  {/* صف المشاركة السريعة والنسخ المباشر */}
                  <div className="d-flex align-items-center justify-content-between gap-2 mb-3 position-relative" style={{ zIndex: 2 }}>
                    <div className="d-flex align-items-center gap-2">
                      <button
                        type="button"
                        className="btn btn-sm d-inline-flex align-items-center gap-1 shadow-xs"
                        style={{
                          backgroundColor: 'var(--badge-bg)',
                          color: copiedId === highlight.id ? 'var(--primary-color)' : 'var(--text-main)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          padding: '4px 10px',
                        }}
                        onClick={() => handleCopySingle(highlight.id, highlight.text)}
                        title="نسخ نص الفائدة"
                      >
                        {copiedId === highlight.id ? <FiCheck size={14} /> : <FiCopy size={13} />}
                        <span>{copiedId === highlight.id ? 'تم النسخ' : 'نسخ'}</span>
                      </button>

                      <ShareButton
                        title="فائدة مقتبسة"
                        text={highlight.text}
                        sheikhComment=""
                        isSmall
                        lessonId={highlight.lessonId}
                      />
                    </div>
                  </div>

                  <hr style={{ opacity: 0.1, margin: '8px 0' }} />

                  {/* معلومات المسألة وزر الانتقال */}
                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 position-relative" style={{ zIndex: 2 }}>
                    <span className="badge badge-custom text-muted d-flex flex-column align-items-start py-2 px-2" style={{ maxWidth: '65%' }}>
                      <span className="text-truncate w-100"><FiBook className="ms-1" /> {highlightTitle}</span>
                      <small className="mt-1 text-truncate w-100">
                        {highlightBookName} &gt; {highlightChapterName}
                      </small>
                    </span>
                    <button
                      className="btn btn-sm btn-light text-primary d-flex align-items-center"
                      style={{ fontWeight: 'bold', flexShrink: 0, borderRadius: '8px' }}
                      onClick={() => onOpenLessonById(highlight.lessonId)}
                    >
                      الذهاب للمسألة <FiChevronLeft className="me-1" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* نتائج الملاحظات المطابقة للبحث */}
          {q && filteredNotes.map(([lessonId, text]) => {
            const lesson = lessons.find((l) => String(l.id) === String(lessonId));
            return (
              <div key={`note-${lessonId}`} className="custom-card p-3 p-md-4 shadow-sm mb-3" style={{ borderRight: '4px solid var(--accent-color)', borderRadius: '12px' }}>
                <p className="mb-2" style={{ lineHeight: '1.9' }}>{text}</p>
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <small className="text-muted">📝 {lesson ? `${lesson.bookName} — ${lesson.title}` : `مسألة ${lessonId}`}</small>
                  <button
                    className="btn btn-sm btn-light text-primary d-flex align-items-center"
                    style={{ fontWeight: 'bold', flexShrink: 0 }}
                    onClick={() => onOpenLessonById(lessonId)}
                  >
                    الذهاب للمسألة <FiChevronLeft className="me-1" />
                  </button>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};

export default HighlightsView;
