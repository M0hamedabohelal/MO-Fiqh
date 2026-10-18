import { useRef, useState } from 'react';
import { FiEdit3, FiTrash2, FiBook, FiChevronLeft, FiPrinter, FiSearch, FiDownload, FiUpload, FiCopy } from 'react-icons/fi';
import EmptyState from '../UI/EmptyState';
import ShareButton from '../UI/ShareButton';
import { exportNotesPrint } from '../../utils/printExport';
import { buildBackup, downloadBackup, parseBackupFile, backupToText } from '../../utils/libraryBackup';
import { useApp } from '../Layout/AppContext';

// شاشة الفوائد المقتبسة + تصديرها مع الملاحظات
const HighlightsView = () => {
  const {
    bookmarks,
    readLessons,
    highlights,
    notes,
    lessons,
    deleteHighlight: onDeleteHighlight,
    openLessonById: onOpenLessonById,
    stopMarks,
    restoreLibrary,
  } = useApp();
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);
  const hasAnySavedContent =
    highlights.length > 0 || Object.values(notes).some((t) => t && String(t).trim());

  const q = query.trim();
  const filteredHighlights = q
    ? highlights.filter((h) => {
        const lesson = lessons.find((l) => String(l.id) === String(h.lessonId));
        const hay = `${h.text} ${h.title || ''} ${lesson?.title || ''} ${h.bookName || ''} ${lesson?.bookName || ''}`;
        return hay.includes(q);
      })
    : highlights;
  const noteEntries = Object.entries(notes).filter(([, t]) => t && String(t).trim());
  const filteredNotes = q
    ? noteEntries.filter(([id, t]) => {
        const lesson = lessons.find((l) => String(l.id) === String(id));
        return `${t} ${lesson?.title || ''} ${lesson?.bookName || ''}`.includes(q);
      })
    : noteEntries;

  const titleOf = (id: string): string => lessons.find((l) => String(l.id) === String(id))?.title || '';

  const handleBackup = (): void => {
    downloadBackup(buildBackup({ bookmarks, highlights, notes, readLessons, stopMarks: stopMarks || {} }));
    setNotice('تم تنزيل نسخة احتياطية من مكتبتك.');
    setTimeout(() => setNotice(''), 3000);
  };

  const handleCopyAll = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(backupToText({ bookmarks, highlights, notes, readLessons }, titleOf));
      setNotice('تم نسخ مكتبتك كنص.');
    } catch {
      setNotice('تعذّر النسخ — جرّب التصدير.');
    }
    setTimeout(() => setNotice(''), 3000);
  };

  const handleRestoreFile = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    try {
      const text = await file.text();
      const data = parseBackupFile(text);
      // restoreLibrary يدمج كل الأقسام بما فيها علامات التوقف — لا دمج ثانٍ هنا حتى لا يُبطل اتجاه الغلبة
      restoreLibrary(data);
      setNotice(`تمت الاستعادة ودمج ${data.bookmarks.length} مفضلة و${data.highlights.length} فائدة.`);
    } catch (err) {
      setNotice((err as Error).message);
    }
    setTimeout(() => setNotice(''), 4000);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="mt-4 mb-5">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
        <h3 className="mb-0 fw-bold" style={{ color: 'var(--primary-color)' }}>
          <FiEdit3 className="ms-2" /> الفوائد المقتبسة
        </h3>
        <div className="d-flex gap-2 flex-wrap">
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
      {/* بحث داخل مكتبتي */}
      {hasAnySavedContent && (
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
          message={`لا توجد فوائد أو ملاحظات تحتوي على "${q}".`}
          hint="جرّب كلمة أخرى أو امسح البحث"
        >
          <button className="btn btn-outline-secondary btn-sm mt-1" onClick={() => setQuery('')}>
            مسح البحث
          </button>
        </EmptyState>
      ) : (
        <div className="d-flex flex-column gap-3">
          {filteredHighlights.slice().reverse().map((highlight) => {
            // المطابقة كنصوص دائمًا — المعرفات قد تأتي أرقامًا من مصدر ونصوصًا من آخر
            const sourceLesson = lessons.find((l) => String(l.id) === String(highlight.lessonId));
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
                    onClick={() => onDeleteHighlight(highlight.id)}
                    title="حذف الفائدة"
                    aria-label="حذف الفائدة المقتبسة"
                  >
                    <FiTrash2 size={15} />
                  </button>
                </div>

                <ShareButton title="فائدة مقتبسة" text={highlight.text} sheikhComment="" isSmall />
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
                    onClick={() => onOpenLessonById(highlight.lessonId)}
                  >
                    الذهاب للمسألة <FiChevronLeft className="me-1" />
                  </button>
                </div>
              </div>
            );
          })}
          {/* نتائج الملاحظات المطابقة للبحث */}
          {q && filteredNotes.map(([lessonId, text]) => {
            const lesson = lessons.find((l) => String(l.id) === String(lessonId));
            return (
              <div key={`note-${lessonId}`} className="custom-card p-3 p-md-4 shadow-sm" style={{ borderRight: '4px solid var(--accent-color)' }}>
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
        </div>
      )}
    </div>
  );
};

export default HighlightsView;
