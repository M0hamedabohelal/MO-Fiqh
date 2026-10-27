// تبويب إدارة المسائل — إضافة وتعديل وحذف واستيراد بالجملة مباشرة على السحابة
import { useState, useMemo } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import {
  FiPlus, FiEdit2, FiTrash2, FiX, FiBook,
  FiSearch, FiEye, FiClock, FiRotateCcw,
} from 'react-icons/fi';
import {
  createLesson, updateLesson, deleteLessonById,
  fetchLessonRevisions, fetchDeletedLessons, restoreDeletedLesson,
} from '../../firebase/services';
import type { DeletedLessonItem, LessonRevision } from '../../firebase/services';
import { validateLessonForm, cleanLessonForm } from '../../utils/validateLesson';
import { inputStyle } from './AdminStyles';
import type { Lesson } from '../../types';
import { EMPTY_LESSON } from './Lessons/types';
import type { LessonFormState } from './Lessons/types';
import { BulkImportSection } from './Lessons/BulkImportSection';
import { LessonEditForm } from './Lessons/LessonEditForm';

interface AdminLessonsTabProps {
  lessons: Lesson[];
  cloudBackupReady: boolean;
  onDataChanged: () => Promise<boolean>;
  flash: (type: 'success' | 'error', text: string) => void;
}

const AdminLessonsTab = ({ lessons, cloudBackupReady, onDataChanged, flash }: AdminLessonsTabProps) => {
  const [busy, setBusy] = useState(false);

  // حالة نموذج المسألة
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editingLessonId, setEditingLessonId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<LessonFormState>(EMPTY_LESSON);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [historyDocId, setHistoryDocId] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<LessonRevision[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [deletedLessons, setDeletedLessons] = useState<DeletedLessonItem[] | null>(null);

  // البحث والتصفية داخل اللوحة
  const [adminSearch, setAdminSearch] = useState('');
  const [adminBookFilter, setAdminBookFilter] = useState('');

  // استيراد بالجملة
  const [bulkOpen, setBulkOpen] = useState(false);

  const handleDownloadContentBackup = (): void => {
    if (!cloudBackupReady) {
      flash('error', 'انتظر اكتمال تحميل المحتوى من السحابة قبل حفظ النسخة.');
      return;
    }
    const data = {
      exportedAt: new Date().toISOString(),
      source: 'AdminLessonsTab',
      lessonCount: lessons.length,
      lessons,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lessons-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    flash('success', `تم تنزيل نسخة من ${lessons.length} مسألة.`);
  };

  const handleRestoreRevision = async (docId: string, revision: LessonRevision): Promise<void> => {
    if (!window.confirm(`هل أنت متأكد من استعادة النسخة المؤرخة في ${new Date(revision.savedAt).toLocaleString('ar-EG')}؟`)) return;
    setBusy(true);
    try {
      const cleanRevision = cleanLessonForm(revision.lesson);
      await updateLesson(docId, cleanRevision as Lesson);
      flash('success', 'تمت استعادة النسخة السابقة بنجاح.');
      setHistoryDocId(null);
      await onDataChanged();
    } catch (err) {
      flash('error', `فشلت الاستعادة: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const toggleLessonHistory = async (docId: string): Promise<void> => {
    if (historyDocId === docId) {
      setHistoryDocId(null);
      return;
    }
    setHistoryDocId(docId);
    setHistoryItems([]);
    setHistoryLoading(true);
    try {
      setHistoryItems(await fetchLessonRevisions(docId));
    } catch {
      flash('error', 'تعذر تحميل سجل التعديلات السابقة.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const toggleDeletedLessons = async (): Promise<void> => {
    const next = !showDeleted;
    setShowDeleted(next);
    if (!next) return;
    try {
      setDeletedLessons(await fetchDeletedLessons());
    } catch {
      flash('error', 'تعذر جلب قائمة المسائل المحذوفة.');
      setDeletedLessons([]);
    }
  };

  const handleRestoreDeletedLesson = async (item: DeletedLessonItem): Promise<void> => {
    if (!window.confirm(`هل أنت متأكد من استعادة مسألة «${item.lesson.title}»؟`)) return;
    setBusy(true);
    try {
      await restoreDeletedLesson(item.docId);
      flash('success', `تمت استعادة مسألة «${item.lesson.title}» بنجاح.`);
      setDeletedLessons((prev) => (prev ? prev.filter((d) => d.docId !== item.docId) : null));
      await onDataChanged();
    } catch (err) {
      flash('error', `تعذرت الاستعادة: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const openAddForm = (): void => {
    setEditingDocId(null);
    setEditingLessonId(null);
    setForm(EMPTY_LESSON);
    setFormOpen(true);
  };

  const openEditForm = (lesson: Lesson): void => {
    const docId = lesson._docId || String(lesson.id);
    setEditingDocId(docId);
    setEditingLessonId(lesson.id != null ? Number(lesson.id) : null);
    setForm({
      bookName: lesson.bookName || '',
      chapterName: lesson.chapterName || '',
      title: lesson.title || '',
      pageNumber: lesson.pageNumber ? String(lesson.pageNumber) : '',
      videoNumber: lesson.videoNumber ? String(lesson.videoNumber) : '',
      videoTimestamp: lesson.videoTimestamp || '',
      mainText: lesson.mainText || '',
      sheikhExplanation: lesson.sheikhExplanation || '',
      videoUrl: lesson.videoUrl || '',
      startTime: lesson.startTime || '',
      endTime: lesson.endTime || '',
      audioUrl: lesson.audioUrl || '',
      mediaUrl: lesson.mediaUrl || '',
      mediaType: lesson.mediaType || '',
      adminNote: lesson.adminNote || '',
    });
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeForm = (): void => {
    setFormOpen(false);
    setEditingDocId(null);
    setEditingLessonId(null);
    setForm(EMPTY_LESSON);
  };

  const handleFieldChange = (field: keyof LessonFormState) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>): void => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSaveLesson = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    const validationErrors = validateLessonForm(form);
    if (validationErrors.length > 0) {
      flash('error', validationErrors[0]);
      return;
    }

    const cleanedForm: LessonFormState = cleanLessonForm({
      ...form,
    });

    setBusy(true);
    try {
      if (editingDocId) {
        if (editingLessonId == null) {
          setBusy(false);
          flash('error', 'تعذّر تحديد رقم المسألة الأصلي — أعد المحاولة بالنقر على تعديل.');
          return;
        }
        await updateLesson(editingDocId, { ...cleanedForm, id: editingLessonId } as Lesson);
        flash('success', 'تم حفظ التعديلات بنجاح.');
      } else {
        await createLesson(cleanedForm);
        flash('success', 'تمت إضافة المسألة بنجاح.');
      }
      closeForm();
      await onDataChanged();
    } catch (err) {
      flash('error', `حدث خطأ أثناء الحفظ: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteLesson = async (docId: string): Promise<void> => {
    setBusy(true);
    try {
      await deleteLessonById(docId);
      setShowDeleteConfirm(null);
      flash('success', 'تم حذف المسألة ونقلها إلى سلة المحذوفات.');
      await onDataChanged();
    } catch (err) {
      flash('error', `تعذر الحذف: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const booksInLessons = useMemo(
    () => [...new Set(lessons.map((l) => (l.bookName || '').trim()).filter(Boolean))],
    [lessons],
  );

  const filteredLessons = useMemo(() => {
    const q = adminSearch.trim().toLowerCase();
    return lessons.filter((l) => {
      const matchBook = !adminBookFilter || (l.bookName || '').trim() === adminBookFilter;
      if (!matchBook) return false;
      if (!q) return true;
      return String(l.id).includes(q) ||
        (l.title || '').toLowerCase().includes(q) ||
        (l.mainText || '').toLowerCase().includes(q) ||
        (l.bookName || '').toLowerCase().includes(q) ||
        String(l.chapterName || '').includes(q);
    });
  }, [lessons, adminSearch, adminBookFilter]);

  const lessonsByBook: Record<string, Lesson[]> = filteredLessons.reduce<Record<string, Lesson[]>>((acc, lesson) => {
    const book = (lesson.bookName || 'بدون كتاب').trim();
    if (!acc[book]) acc[book] = [];
    acc[book].push(lesson);
    return acc;
  }, {});

  return (
    <div>
      {/* شريط البحث والتصفية وأزرار العمليات */}
      <div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
        <div className="input-group" style={{ maxWidth: '320px' }}>
          <span className="input-group-text bg-transparent border-end-0" style={{ borderColor: 'var(--border-color)' }}>
            <FiSearch />
          </span>
          <input
            type="search"
            className="form-control border-start-0"
            placeholder="بحث بالرقم أو العنوان أو النص..."
            value={adminSearch}
            onChange={(e) => setAdminSearch(e.target.value)}
            style={inputStyle}
          />
        </div>
        <select
          className="form-select"
          value={adminBookFilter}
          onChange={(e) => setAdminBookFilter(e.target.value)}
          style={{ ...inputStyle, maxWidth: '220px' }}
        >
          <option value="">📚 كل الكتب</option>
          {booksInLessons.map((bookName) => (
            <option key={bookName} value={bookName}>{bookName}</option>
          ))}
        </select>
        {(adminSearch || adminBookFilter) && (
          <button type="button" className="btn btn-light d-flex align-items-center gap-1" onClick={() => { setAdminSearch(''); setAdminBookFilter(''); }}>
            <FiX /> إلغاء التصفية
          </button>
        )}
      </div>

      {!formOpen && (
        <button
          className="btn w-100 mb-3 p-3 d-flex align-items-center justify-content-center gap-2 shadow-sm"
          onClick={openAddForm}
          style={{ backgroundColor: 'var(--accent-color)', color: 'var(--text-on-accent)', fontWeight: 'bold', borderRadius: '12px' }}
        >
          <FiPlus size={20} /> إضافة مسألة جديدة
        </button>
      )}

      {/* سلة المحذوفات القابلة للاستعادة */}
      <div className="mb-3">
        <button type="button" className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2" onClick={() => void toggleDeletedLessons()}>
          <FiRotateCcw size={15} /> {showDeleted ? 'إخفاء المحذوفة' : 'عرض المحذوفة واستعادتها'}
        </button>
        {showDeleted && (
          <div className="custom-card p-3 mt-2">
            <h6 className="fw-bold mb-2">المسائل المحذوفة مؤخرًا</h6>
            {deletedLessons === null ? (
              <div className="text-muted small">جارٍ تحميل القائمة...</div>
            ) : deletedLessons.length === 0 ? (
              <div className="text-muted small">لا توجد مسائل محذوفة قابلة للاستعادة.</div>
            ) : (
              <div className="d-flex flex-column gap-2">
                {deletedLessons.map((item) => (
                  <div key={item.docId} className="d-flex align-items-center justify-content-between flex-wrap gap-2 p-2 rounded" style={{ backgroundColor: 'var(--badge-bg)' }}>
                    <span className="small">ID {item.lesson.id} — {item.lesson.title}<small className="d-block text-muted">{new Date(item.deletedAt).toLocaleString('ar-EG')}</small></span>
                    <button type="button" className="btn btn-sm btn-outline-success d-flex align-items-center gap-1" disabled={busy || !cloudBackupReady} onClick={() => void handleRestoreDeletedLesson(item)}>
                      <FiRotateCcw size={14} /> استعادة
                    </button>
                  </div>
                ))}
              </div>
            )}
            {!cloudBackupReady && <small className="text-muted d-block mt-2">الاستعادة تحتاج اتصالًا بالسحابة.</small>}
          </div>
        )}
      </div>

      {/* قسم النسخ الاحتياطي والاستيراد بالجملة */}
      <BulkImportSection
        bulkOpen={bulkOpen}
        setBulkOpen={setBulkOpen}
        cloudBackupReady={cloudBackupReady}
        lessonsLength={lessons.length}
        onDownloadBackup={handleDownloadContentBackup}
        onDataChanged={onDataChanged}
        flash={flash}
      />

      {/* نموذج الإضافة / التعديل */}
      {formOpen && (
        <LessonEditForm
          editingDocId={editingDocId}
          form={form}
          setForm={setForm}
          handleFieldChange={handleFieldChange}
          handleSaveLesson={handleSaveLesson}
          closeForm={closeForm}
          busy={busy}
          flash={flash}
        />
      )}

      {/* قائمة المسائل المقسمة حسب الكتب */}
      <div className="mb-2 text-muted small">
        نتائج البحث: {filteredLessons.length} من {lessons.length} مسألة
      </div>

      {Object.keys(lessonsByBook).length === 0 && (adminSearch || adminBookFilter) ? (
        <div className="text-center p-4 text-muted custom-card">لا توجد مسائل تطابق معايير البحث.</div>
      ) : Object.entries(lessonsByBook).map(([bookName, bookLessons]) => (
        <div key={bookName} className="mb-4">
          <div className="d-flex align-items-center gap-2 mb-2 pb-1 border-bottom">
            <FiBook style={{ color: 'var(--primary-color)' }} />
            <h6 className="fw-bold mb-0" style={{ color: 'var(--primary-color)' }}>{bookName}</h6>
            <span className="badge badge-custom small">{bookLessons.length}</span>
          </div>

          <div className="d-flex flex-column gap-2">
            {bookLessons.map((lesson) => {
              const docId = lesson._docId || String(lesson.id);
              return (
                <div key={docId} className="custom-card p-3 shadow-sm">
                  <div className="d-flex justify-content-between align-items-start gap-2 flex-wrap">
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                        <span className="badge badge-custom">ID {lesson.id}</span>
                        <h6 className="fw-bold mb-0">{lesson.title}</h6>
                        <a href={`#/lesson/${lesson.id}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-link p-0 text-muted" title="معاينة في صفحة القراءة">
                          <FiEye size={15} />
                        </a>
                      </div>
                      {lesson.chapterName && (
                        <small className="text-muted">{lesson.chapterName} {lesson.pageNumber ? `• ص ${lesson.pageNumber}` : ''}</small>
                      )}
                    </div>
                    <div className="d-flex gap-1 flex-shrink-0">
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => void toggleLessonHistory(docId)} title="سجل تعديلات هذه المسألة" aria-label="سجل التعديلات">
                        <FiClock size={15} />
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => openEditForm(lesson)} title="تعديل المسألة" aria-label="تعديل المسألة">
                        <FiEdit2 size={15} />
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setShowDeleteConfirm(docId)} title="حذف المسألة" aria-label="حذف المسألة">
                        <FiTrash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {showDeleteConfirm === docId && (
                    <div className="alert alert-danger mt-3 mb-0 p-2 d-flex align-items-center justify-content-between flex-wrap gap-2">
                      <span className="small">هل أنت متأكد من حذف مسألة «{lesson.title}»؟</span>
                      <div className="d-flex gap-2">
                        <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => void handleDeleteLesson(docId)}>
                          {busy ? 'جارٍ الحذف...' : 'نعم، احذف'}
                        </button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowDeleteConfirm(null)}>
                          إلغاء
                        </button>
                      </div>
                    </div>
                  )}

                  {historyDocId === docId && showDeleteConfirm !== docId && (
                    <div className="custom-card p-3 mt-2" aria-live="polite">
                      <h6 className="fw-bold mb-2">سجل تعديل المسألة: {lesson.title}</h6>
                      {historyLoading ? <div className="text-muted small">جارٍ تحميل السجل...</div> : historyItems.length === 0 ? <div className="text-muted small">لا توجد نسخ سابقة لهذه المسألة.</div> : (
                        <div className="d-flex flex-column gap-2">
                          {historyItems.map((revision) => (
                            <div key={revision.id} className="d-flex align-items-center justify-content-between flex-wrap gap-2 p-2 rounded" style={{ backgroundColor: 'var(--badge-bg)' }}>
                              <span className="small">{revision.lesson.title}<small className="d-block text-muted">{new Date(revision.savedAt).toLocaleString('ar-EG')}</small></span>
                              <button type="button" className="btn btn-sm btn-outline-success" disabled={busy || !cloudBackupReady} onClick={() => void handleRestoreRevision(docId, revision)}>استعادة هذه النسخة</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AdminLessonsTab;
