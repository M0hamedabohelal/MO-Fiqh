// تبويب إدارة المسائل — إضافة وتعديل وحذف واستيراد بالجملة مباشرة على السحابة
import { useState, useMemo } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { motion } from 'framer-motion';
import {
  FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiBook,
  FiAlertTriangle, FiSearch, FiEye, FiEyeOff, FiInfo, FiUpload, FiDownload, FiClock, FiRotateCcw,
} from 'react-icons/fi';
import {
  createLesson, updateLesson, deleteLessonById, bulkCreateLessons,
  fetchLessonRevisions, fetchDeletedLessons, restoreDeletedLesson,
} from '../../firebase/services';
import type { DeletedLessonItem, LessonRevision } from '../../firebase/services';
import { validateLessonForm, cleanLessonForm, filterValidBulkLessons } from '../../utils/validateLesson';
import { CLOUDINARY_UPLOAD_URL, CLOUDINARY_UPLOAD_PRESET, validateUploadFile } from '../../utils/cloudinary';
import QuoteCard from '../Content/QuoteCard';
import ExplanationCard from '../Content/ExplanationCard';
import { inputStyle } from './AdminStyles';
import type { Lesson } from '../../types';

interface LessonFormState {
  bookName: string;
  chapterName: string;
  title: string;
  pageNumber: string;
  videoNumber: string;
  videoTimestamp: string;
  mainText: string;
  sheikhExplanation: string;
  videoUrl: string;
  startTime: string;
  endTime: string;
  audioUrl: string;
  mediaUrl: string;
  mediaType: string;
  adminNote: string;
}

interface AdminLessonsTabProps {
  lessons: Lesson[];
  cloudBackupReady: boolean;
  onDataChanged: () => Promise<boolean>;
  flash: (type: 'success' | 'error', text: string) => void;
}

type BulkLessonInput = Omit<Lesson, 'id' | '_docId'>;

const EMPTY_LESSON: LessonFormState = {
  bookName: '',
  chapterName: '',
  title: '',
  pageNumber: '',
  videoNumber: '',
  videoTimestamp: '',
  mainText: '',
  sheikhExplanation: '',
  videoUrl: '',
  startTime: '',
  endTime: '',
  audioUrl: '',
  mediaUrl: '',
  mediaType: '',
  adminNote: '',
};

const AdminLessonsTab = ({ lessons, cloudBackupReady, onDataChanged, flash }: AdminLessonsTabProps) => {
  const [busy, setBusy] = useState(false);

  // حالة نموذج المسألة
  const [editingDocId, setEditingDocId] = useState<string | null>(null); // null = إضافة جديدة، docId = تعديل
  // المعرّف الرقمي الأصلي للمسألة — يُحفظ عند فتح التعديل ولا يُستنتج من docId (قد يكون غير رقمي في مستندات قديمة)
  const [editingLessonId, setEditingLessonId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<LessonFormState>(EMPTY_LESSON);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [historyDocId, setHistoryDocId] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<LessonRevision[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [deletedLessons, setDeletedLessons] = useState<DeletedLessonItem[] | null>(null);

  // البحث والتصفية داخل اللوحة
  const [adminSearch, setAdminSearch] = useState('');
  const [adminBookFilter, setAdminBookFilter] = useState('');

  // استيراد بالجملة من ملف JSON
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkItems, setBulkItems] = useState<BulkLessonInput[]>([]);
  const [bulkFileName, setBulkFileName] = useState('');
  const [bulkError, setBulkError] = useState('');

  const handleBulkFile = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkError('');
    setBulkItems([]);
    setBulkFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed: unknown = JSON.parse(reader.result as string);
        if (!Array.isArray(parsed)) throw new Error('الملف يجب أن يحتوي على مصفوفة مسائل');
        const { valid, rejected, reasons } = filterValidBulkLessons(parsed as Array<Partial<Lesson>>);
        if (valid.length === 0) {
          setBulkError('لا توجد مسائل صالحة في الملف (تأكد أن كل عنصر له title و bookName ونص).');
          return;
        }
        if (rejected > 0) {
          setBulkError(`تم قبول ${valid.length} وتجاهل ${rejected} عناصر فاسدة. ${reasons.join(' • ')}`);
        }
        setBulkItems(valid);
      } catch (err) {
        setBulkError(`تعذّر قراءة الملف: ${(err as Error).message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleBulkImport = async (): Promise<void> => {
    if (bulkItems.length === 0) return;
    setBusy(true);
    try {
      const n = await bulkCreateLessons(bulkItems);
      flash('success', `تم رفع ${n} مسألة بنجاح.`);
      setBulkItems([]);
      setBulkFileName('');
      setBulkOpen(false);
      await onDataChanged();
    } catch (err) {
      flash('error', `فشل الاستيراد: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleDownloadContentBackup = (): void => {
    const payload = {
      app: 'fqh-content',
      version: 1,
      exportedAt: new Date().toISOString(),
      lessonCount: lessons.length,
      lessons,
    };
    const blobUrl = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `fiqh-content-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    flash('success', `تم تنزيل نسخة من ${lessons.length} مسألة.`);
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
      flash('error', 'تعذر تحميل سجل تعديلات المسألة.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleRestoreRevision = async (docId: string, revision: LessonRevision): Promise<void> => {
    if (!window.confirm(`استعادة نسخة «${revision.lesson.title}» المحفوظة في ${new Date(revision.savedAt).toLocaleString('ar-EG')}؟ سيُحفظ المحتوى الحالي في السجل أولًا.`)) return;
    setBusy(true);
    try {
      await updateLesson(docId, revision.lesson);
      await onDataChanged();
      setHistoryItems(await fetchLessonRevisions(docId));
      flash('success', 'تمت الاستعادة، وحُفظت النسخة السابقة في سجل التعديلات.');
    } catch (error) {
      flash('error', `تعذرت الاستعادة: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const toggleDeletedLessons = async (): Promise<void> => {
    const nextOpen = !showDeleted;
    setShowDeleted(nextOpen);
    if (!nextOpen || deletedLessons !== null) return;
    try {
      setDeletedLessons(await fetchDeletedLessons());
    } catch {
      flash('error', 'تعذر تحميل قائمة المسائل المحذوفة.');
      setDeletedLessons([]);
    }
  };

  const handleRestoreDeletedLesson = async (item: DeletedLessonItem): Promise<void> => {
    if (!window.confirm(`استعادة المسألة «${item.lesson.title}» (ID ${item.lesson.id})؟`)) return;
    setBusy(true);
    try {
      await restoreDeletedLesson(item.docId);
      setDeletedLessons((previous) => (previous || []).filter((lesson) => lesson.docId !== item.docId));
      await onDataChanged();
      flash('success', 'تمت استعادة المسألة المحذوفة.');
    } catch (error) {
      flash('error', `تعذرت الاستعادة: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const uploadToCloudinary = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    const invalid = validateUploadFile(file);
    if (invalid) {
      flash('error', invalid);
      e.target.value = '';
      return;
    }

    setUploadingMedia(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    try {
      const res = await fetch(CLOUDINARY_UPLOAD_URL, {
        method: "POST",
        body: formData,
      });
      const data: { secure_url?: string } = await res.json();
      if (data.secure_url) {
        setForm(prev => ({
          ...prev,
          mediaUrl: data.secure_url as string,
          mediaType: file.type.includes("pdf") ? "pdf" : "image",
        }));
        flash('success', 'تم رفع الملف بنجاح!');
      } else {
        flash('error', 'فشل الرفع، تأكد من إعدادات Cloudinary.');
      }
    } catch (err) {
      flash('error', `خطأ في الرفع: ${(err as Error).message}`);
    } finally {
      setUploadingMedia(false);
    }
  };

  const openAddForm = (): void => {
    setEditingDocId(null);
    setEditingLessonId(null);
    setForm(EMPTY_LESSON);
    setFormOpen(true);
  };

  // رفع ملف صوتي (MP3 بجودة عالية) إلى Cloudinary — نفس حساب المرفقات، يُحفظ الرابط الأصلي بدون ضغط
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const uploadAudioToCloudinary = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    const invalid = validateUploadFile(file);
    if (invalid) {
      flash('error', invalid);
      e.target.value = '';
      return;
    }
    setUploadingAudio(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    try {
      const res = await fetch(CLOUDINARY_UPLOAD_URL, {
        method: 'POST',
        body: formData,
      });
      const data: { secure_url?: string } = await res.json();
      if (data.secure_url) {
        setForm((prev) => ({ ...prev, audioUrl: data.secure_url as string }));
        flash('success', 'تم رفع الملف الصوتي بنجاح!');
      } else {
        flash('error', 'فشل رفع الصوت، تأكد من إعدادات Cloudinary.');
      }
    } catch (err) {
      flash('error', `خطأ في رفع الصوت: ${(err as Error).message}`);
    } finally {
      setUploadingAudio(false);
    }
  };

  const openEditForm = (lesson: Lesson): void => {
    setEditingDocId(lesson._docId || String(lesson.id));
    const numericId = Number(lesson.id);
    setEditingLessonId(Number.isFinite(numericId) ? numericId : null);
    setForm({
      bookName: lesson.bookName || '',
      chapterName: lesson.chapterName || '',
      title: lesson.title || '',
      pageNumber: lesson.pageNumber || '',
      videoNumber: lesson.videoNumber || '',
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
        // لا نشتق id من docId أبدًا — مستند قديم بمعرّف غير رقمي كان يخزّن id: NaN ويفسد الترتيب والروابط
        if (editingLessonId == null) {
          setBusy(false);
          flash('error', 'تعذّر تحديد معرّف المسألة — أغلق النموذج وأعد فتح التعديل.');
          return;
        }
        await updateLesson(editingDocId, { ...cleanedForm, id: editingLessonId });
        flash('success', 'تم حفظ التعديلات بنجاح.');
      } else {
        await createLesson(cleanedForm);
        flash('success', 'تمت إضافة المسألة الجديدة بنجاح.');
      }
      closeForm();
      await onDataChanged();
    } catch (err) {
      flash('error', `فشل الحفظ: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteLesson = async (docId: string): Promise<void> => {
    setBusy(true);
    try {
      await deleteLessonById(docId);
      setShowDeleteConfirm(null);
      flash('success', 'تم حذف المسألة.');
      await onDataChanged();
      if (deletedLessons !== null) setDeletedLessons(await fetchDeletedLessons());
    } catch (err) {
      flash('error', `فشل الحذف: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  // الكتب الموجودة فعليًا (للقائمة المنسدلة)
  const booksInLessons = useMemo(
    () => [...new Set(lessons.map((l) => (l.bookName || '').trim()).filter(Boolean))],
    [lessons],
  );

  // البحث والتصفية
  const filteredLessons = useMemo(() => {
    const q = adminSearch.trim();
    return lessons.filter((l) => {
      const matchBook = !adminBookFilter || l.bookName === adminBookFilter;
      const matchQuery =
        !q ||
        String(l.title || '').includes(q) ||
        String(l.chapterName || '').includes(q);
      return matchBook && matchQuery;
    });
  }, [lessons, adminSearch, adminBookFilter]);

  // تجميع المسائل المصفاة حسب الكتاب للعرض
  const lessonsByBook: Record<string, Lesson[]> = filteredLessons.reduce<Record<string, Lesson[]>>((acc, lesson) => {
    const bName = (lesson.bookName || '').trim();
    if (!acc[bName]) acc[bName] = [];
    acc[bName].push(lesson);
    return acc;
  }, {});

  return (
    <>
      {/* البحث والتصفية */}
      <div className="d-flex gap-2 mb-3 flex-wrap">
        <div className="position-relative flex-grow-1" style={{ minWidth: '220px' }}>
          <FiSearch className="position-absolute top-50 translate-middle-y" size={16} style={{ right: '12px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            placeholder="ابحث بعنوان المسألة أو الباب..."
            value={adminSearch}
            onChange={(e) => setAdminSearch(e.target.value)}
            style={{ ...inputStyle, paddingRight: '36px' }}
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

      <div className="d-flex gap-2 mb-3 flex-wrap">
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary d-flex align-items-center justify-content-center gap-2 flex-grow-1"
          style={{ borderRadius: '10px' }}
          onClick={handleDownloadContentBackup}
          disabled={!cloudBackupReady}
          title={cloudBackupReady ? 'تنزيل لقطة من محتوى السحابة قبل التعديل' : 'حمّل المحتوى من السحابة واتصل بالإنترنت لضمان أن النسخة حديثة'}
        >
          <FiDownload size={16} /> تنزيل نسخة المحتوى ({lessons.length})
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary d-flex align-items-center justify-content-center gap-2 flex-grow-1"
          style={{ borderRadius: '10px' }}
          onClick={() => setBulkOpen((p) => !p)}
        >
          <FiUpload size={16} /> استيراد مسائل بالجملة (JSON) {bulkOpen ? '— إخفاء' : ''}
        </button>
      </div>
      {!cloudBackupReady && <small className="text-muted d-block mb-3">تعطّل تنزيل النسخة حتى يكتمل تحميل المحتوى من السحابة والاتصال بالإنترنت؛ لتجنب حفظ لقطة محلية قديمة بالخطأ.</small>}
      {bulkOpen && (
        <div className="custom-card p-3 mb-4">
          <p className="text-muted small mb-2" style={{ lineHeight: '1.7' }}>
            ارفع ملف <code>JSON</code> يحتوي على مصفوفة مسائل بنفس حقول "إضافة مسألة" ({'title, bookName, chapterName, mainText, sheikhExplanation...'}). تُرقّم المعرفات تلقائيًا.
          </p>
          <input
            type="file"
            accept=".json,application/json"
            className="form-control mb-2"
            style={{ ...inputStyle, maxWidth: '320px' }}
            onChange={handleBulkFile}
            id="bulkFileInput"
          />
          {bulkError && <div className="text-danger small mb-2">{bulkError}</div>}
          {bulkItems.length > 0 && (
            <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
              <span className="text-muted small">
                تم قراءة <strong>{bulkItems.length}</strong> مسألة من <code dir="ltr">{bulkFileName}</code>
              </span>
              <button
                type="button"
                className="btn btn-sm d-flex align-items-center gap-2"
                disabled={busy}
                onClick={handleBulkImport}
                style={{ backgroundColor: 'var(--primary-color)', color: '#fff', borderRadius: '8px' }}
              >
                <FiUpload size={14} />
                {busy ? <span className="spinner-border spinner-border-sm" /> : `رفع ${bulkItems.length} مسألة`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* نموذج الإضافة / التعديل */}
      {formOpen && (
        <motion.form
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSaveLesson}
          className="custom-card p-4 shadow-sm mb-4"
        >
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="fw-bold mb-0" style={{ color: 'var(--primary-color)' }}>
              {editingDocId ? 'تعديل مسألة' : 'مسألة جديدة'}
            </h5>
            <button type="button" className="btn btn-sm text-muted" onClick={closeForm} aria-label="إغلاق النموذج">
              <FiX size={22} />
            </button>
          </div>

          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label small fw-bold">اسم الكتاب *</label>
              <input type="text" className="form-control" dir="rtl" value={form.bookName} onChange={handleFieldChange('bookName')} style={inputStyle} required />
            </div>
            <div className="col-md-6">
              <label className="form-label small fw-bold">الباب</label>
              <input type="text" className="form-control" value={form.chapterName} onChange={handleFieldChange('chapterName')} style={inputStyle} />
            </div>
            <div className="col-12">
              <label className="form-label small fw-bold">عنوان المسألة *</label>
              <input type="text" className="form-control" value={form.title} onChange={handleFieldChange('title')} style={inputStyle} required />
            </div>
            <div className="col-md-4 col-6">
              <label className="form-label small fw-bold">رقم الصفحة</label>
              <input type="text" className="form-control" value={form.pageNumber} onChange={handleFieldChange('pageNumber')} style={inputStyle} />
            </div>
            <div className="col-md-4 col-6">
              <label className="form-label small fw-bold">الدرس</label>
              <input type="text" className="form-control" value={form.videoNumber} onChange={handleFieldChange('videoNumber')} style={inputStyle} />
            </div>
            <div className="col-md-4 col-6">
              <label className="form-label small fw-bold">وقت البداية بالفيديو</label>
              <input type="text" className="form-control" dir="ltr" placeholder="00:00:00" value={form.videoTimestamp} onChange={handleFieldChange('videoTimestamp')} style={inputStyle} />
            </div>
            <div className="col-md-8 col-6">
              <label className="form-label small fw-bold">رابط الفيديو</label>
              <input type="url" className="form-control" dir="ltr" placeholder="https://youtu.be/..." value={form.videoUrl} onChange={handleFieldChange('videoUrl')} style={inputStyle} />
            </div>
            <div className="col-md-4 col-6">
              <label className="form-label small fw-bold">وقت البداية</label>
              <input type="text" className="form-control" dir="ltr" placeholder="00:00:00" value={form.startTime} onChange={handleFieldChange('startTime')} style={inputStyle} />
            </div>
            <div className="col-md-4 col-6">
              <label className="form-label small fw-bold">وقت النهاية (اختياري)</label>
              <input type="text" className="form-control" dir="ltr" placeholder="00:00:00" value={form.endTime} onChange={handleFieldChange('endTime')} style={inputStyle} />
            </div>
            <div className="col-12">
              <label className="form-label small fw-bold">🎧 صوت الدرس (MP3 — اختياري)</label>
              <div className="d-flex flex-wrap gap-2 align-items-center">
                <input
                  type="file"
                  className="form-control"
                  accept="audio/*,.mp3,.m4a,.wav"
                  onChange={uploadAudioToCloudinary}
                  style={{ ...inputStyle, maxWidth: '250px' }}
                  disabled={uploadingAudio}
                  id="audioFileInput"
                />
                <input
                  type="url"
                  className="form-control flex-grow-1"
                  dir="ltr"
                  placeholder="أو ضع رابط MP3 مباشر هنا..."
                  value={form.audioUrl}
                  onChange={handleFieldChange('audioUrl')}
                  style={inputStyle}
                />
                {form.audioUrl && (
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm px-3"
                    style={{ borderRadius: '8px' }}
                    onClick={() => {
                      setForm((prev) => ({ ...prev, audioUrl: '' }));
                      const el = document.getElementById('audioFileInput') as HTMLInputElement | null;
                      if (el) el.value = '';
                    }}
                  >
                    <FiTrash2 className="me-1" /> إزالة
                  </button>
                )}
              </div>
              {uploadingAudio ? (
                <small className="text-info d-block mt-2">⏳ جاري رفع الصوت... يرجى الانتظار.</small>
              ) : (
                <small className="text-muted d-block mt-2">
                  لجودة جيدة: ارفع MP3 بمعدل 128kbps على الأقل (ساعة ≈ 60MB). يُحفظ الرابط الأصلي بدون أي ضغط — الجودة = جودة ملفك.
                </small>
              )}
              {form.audioUrl && (
                <audio controls preload="metadata" src={form.audioUrl} className="w-100 mt-2" style={{ maxWidth: '400px' }} />
              )}
            </div>
            <div className="col-12">
              <label className="form-label small fw-bold">إرفاق صورة أو PDF (اختياري)</label>
              <div className="d-flex flex-wrap gap-2 align-items-center">
                <input
                  type="file"
                  className="form-control"
                  accept="image/*,.pdf"
                  onChange={uploadToCloudinary}
                  style={{ ...inputStyle, maxWidth: '250px' }}
                  disabled={uploadingMedia}
                  id="cloudinaryFileInput"
                />
                <input
                  type="url"
                  className="form-control flex-grow-1"
                  dir="ltr"
                  placeholder="أو ضع رابطاً خارجياً هنا..."
                  value={form.mediaUrl}
                  onChange={handleFieldChange('mediaUrl')}
                  style={inputStyle}
                />
                <select className="form-select" value={form.mediaType} onChange={handleFieldChange('mediaType')} style={{ ...inputStyle, maxWidth: '140px' }}>
                  <option value="">نوع المرفق</option>
                  <option value="image">صورة (Image)</option>
                  <option value="pdf">ملف (PDF)</option>
                </select>
                {form.mediaUrl && (
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm px-3"
                    style={{ borderRadius: '8px' }}
                    onClick={() => {
                      setForm(prev => ({ ...prev, mediaUrl: '', mediaType: '' }));
                      const input = document.getElementById('cloudinaryFileInput');
                      if (input instanceof HTMLInputElement) input.value = '';
                    }}
                  >
                    <FiTrash2 className="me-1" /> إزالة
                  </button>
                )}
              </div>
              {uploadingMedia ? (
                <small className="text-info d-block mt-2">⏳ جاري الرفع إلى السحابة... يرجى الانتظار.</small>
              ) : (
                <small className="text-muted d-block mt-2">اختر ملفاً من جهازك ليتم رفعه مباشرة، أو قم بلصق رابط خارجي.</small>
              )}
            </div>
            <div className="col-12">
              <label className="form-label small fw-bold">متن المسألة</label>
              <textarea rows={7} className="form-control" value={form.mainText} onChange={handleFieldChange('mainText')} style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.8' }} />
              <small className="text-muted d-block mt-1" style={{ lineHeight: '2' }}>
                تنسيق يظهر للقارئ: <code dir="ltr">## عنوان رئيسي</code> لعنوان وسطي، <code dir="ltr">العنوان الفرعي:</code> لتمييز بداية فقرة، <code dir="ltr">**نص عريض**</code>، <code dir="ltr">*تظليل*</code>، <code dir="ltr">!!تنبيه!!</code>، و<code dir="ltr">***</code> لفاصل زخرفي. لإنشاء رابط لمسألة أخرى استخدم <code dir="ltr" style={{ color: 'var(--accent-color)' }}>[نص الرابط](lesson:رقم_المسألة)</code> مثل <code dir="ltr" style={{ color: 'var(--accent-color)' }}>[الوضوء](lesson:5)</code>.
              </small>
            </div>
            <div className="col-12">
              <label className="form-label small fw-bold">شرح الشيخ</label>
              <textarea rows={5} className="form-control" value={form.sheikhExplanation} onChange={handleFieldChange('sheikhExplanation')} style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.8' }} />
              <small className="text-muted d-block mt-1">تلميح: لإنشاء رابط ذكي لمسألة أخرى، استخدم الصيغة: <code dir="ltr" style={{ color: 'var(--accent-color)' }}>[نص الرابط](lesson:رقم_المسألة)</code></small>
            </div>
            <div className="col-12">
              <label className="form-label small fw-bold">ملحوظة خاصة (تظهر أعلى المتن - اختياري)</label>
              <textarea rows={3} className="form-control" value={form.adminNote} onChange={handleFieldChange('adminNote')} style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.8' }} placeholder="أضف تنبيهاً أو ملحوظة هامة للمستخدم تظهر قبل نص المسألة..." />
            </div>
          </div>

          {/* معاينة قبل الحفظ */}
          {showPreview && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="custom-card p-4 mt-4 border"
            >
              <div className="text-center text-muted small mb-3">👁️ معاينة — هكذا سيراها القارئ</div>
              <h4 className="text-center fw-bold mb-3" style={{ color: 'var(--primary-color)' }}>
                {form.title || 'عنوان المسألة'}
              </h4>
              <div className="text-center mb-4">
                <span className="badge badge-custom px-3 py-2">
                  <FiBook className="ms-1" /> {form.bookName || 'الكتاب'} {form.chapterName ? `— ${form.chapterName}` : ''} {form.pageNumber ? `• ص ${form.pageNumber}` : ''}
                </span>
              </div>

              {/* البسملة المحاكية */}
              <div className="text-center mb-4" style={{ fontFamily: 'var(--font-quote)', fontSize: '1.5rem', color: 'var(--text-main)' }}>
                بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
              </div>

              {(form.adminNote || '').trim() && (
                <div className="custom-card p-3 mb-4 d-flex gap-3 align-items-start shadow-sm" style={{ borderRight: '4px solid var(--accent-color)' }}>
                  <FiInfo className="mt-1 flex-shrink-0" size={24} style={{ color: 'var(--accent-color)' }} />
                  <div className="text-start">
                    <h6 className="fw-bold mb-2" style={{ color: 'var(--primary-color)', fontFamily: 'var(--font-heading)' }}>ملحوظة هامة:</h6>
                    <div className="mb-0" style={{ lineHeight: '1.9', color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>{form.adminNote}</div>
                  </div>
                </div>
              )}

              {(form.mainText || '').trim() && (
                <div className="mt-2 mb-4">
                  <QuoteCard text={form.mainText || ''} searchQuery="" />
                </div>
              )}
              {(form.sheikhExplanation || '').trim() && (
                <div className="mt-4 mb-4">
                  <ExplanationCard explanation={form.sheikhExplanation || ''} searchQuery="" />
                </div>
              )}
              {(form.mediaUrl) && (
                <div className="mt-4 mb-4 text-center">
                  <span className="badge bg-info p-2 d-block mx-auto mb-2" style={{ maxWidth: '200px' }}>
                    يوجد مرفق ({form.mediaType || 'لم يحدد'})
                  </span>
                </div>
              )}
              {form.videoUrl && (
                <div className="text-center mt-4">
                  <span className="badge badge-custom px-3 py-2">▶ الدرس {form.videoNumber || ''} — يبدأ عند {form.videoTimestamp || form.startTime || '00:00:00'}</span>
                </div>
              )}
            </motion.div>
          )}

          <div className="d-flex gap-2 mt-4">
            <button type="submit" className="btn flex-grow-1 d-flex align-items-center justify-content-center gap-2" disabled={busy}
              style={{ backgroundColor: 'var(--accent-color)', color: 'var(--text-on-accent)', fontWeight: 'bold', borderRadius: '10px' }}>
              {busy ? <span className="spinner-border spinner-border-sm" /> : <><FiSave /> حفظ</>}
            </button>
            <button type="button" className="btn btn-light d-flex align-items-center gap-2" onClick={() => setShowPreview((prev) => !prev)}>
              {showPreview ? <><FiEyeOff /> إخفاء المعاينة</> : <><FiEye /> معاينة</>}
            </button>
            <button type="button" className="btn btn-outline-secondary" onClick={closeForm}>إلغاء</button>
          </div>
        </motion.form>
      )}

      {/* قائمة المسائل مجمعة حسب الكتاب */}
      {(adminSearch || adminBookFilter) && (
        <div className="text-muted small mb-3">
          نتائج البحث: {filteredLessons.length} من {lessons.length} مسألة
        </div>
      )}
      {Object.keys(lessonsByBook).length === 0 && (adminSearch || adminBookFilter) ? (
        <div className="custom-card p-5 text-center shadow-sm">
          <FiSearch size={44} className="mb-3 text-muted" style={{ opacity: 0.35 }} />
          <p className="text-muted mb-0">لا توجد مسائل مطابقة لبحثك.</p>
        </div>
      ) : Object.entries(lessonsByBook).map(([bookName, bookLessons]) => (
        <div key={bookName} className="mb-4">
          <h5 className="fw-bold mb-3 d-flex align-items-center" style={{ color: 'var(--primary-color)' }}>
            <FiBook className="ms-2" /> {bookName}
            <span className="badge badge-custom ms-2">{bookLessons.length} مسألة</span>
          </h5>

          <div className="d-flex flex-column gap-2">
            {bookLessons.map((lesson) => {
              const docId = lesson._docId || String(lesson.id);
              return (
                <div key={docId}>
                  {showDeleteConfirm === docId ? (
                    <div className="custom-card p-3 d-flex align-items-center justify-content-between flex-wrap gap-2 border-danger">
                      <span className="small fw-bold"><FiAlertTriangle className="ms-1 text-warning" /> متأكد من حذف "{lesson.title}"؟ يمكن استعادتها لاحقًا من قائمة المحذوفة.</span>
                      <div className="d-flex gap-2">
                        <button className="btn btn-sm btn-danger" disabled={busy} onClick={() => void handleDeleteLesson(docId)}>
                          نعم، احذف
                        </button>
                        <button className="btn btn-sm btn-light" onClick={() => setShowDeleteConfirm(null)}>إلغاء</button>
                      </div>
                    </div>
                  ) : (
                    <div className="custom-card p-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
                      <div className="flex-grow-1 text-end" style={{ minWidth: '200px' }}>
                        <div className="fw-bold small">
                          <span className="badge bg-secondary me-2 ms-2" style={{ fontSize: '0.7rem' }}>ID: {lesson.id}</span>
                          {lesson.title}
                        </div>
                        <small className="text-muted">{lesson.chapterName} • ص {lesson.pageNumber}</small>
                      </div>
                      <div className="d-flex gap-2 flex-shrink-0">
                        <button className="btn btn-sm btn-light d-flex align-items-center gap-1" onClick={() => openEditForm(lesson)} title="تعديل">
                          <FiEdit2 size={14} /> تعديل
                        </button>
                        <button className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1" disabled={busy} onClick={() => void toggleLessonHistory(docId)} title="سجل التعديلات">
                          <FiClock size={14} /> السجل
                        </button>
                        <button className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1" disabled={busy} onClick={() => setShowDeleteConfirm(docId)} title="حذف" aria-label={`حذف مسألة ${lesson.title}`}>
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                  {historyDocId === docId && showDeleteConfirm !== docId && (
                    <div className="custom-card p-3 mt-2" aria-live="polite">
                      <h6 className="fw-bold mb-2">سجل النسخ السابقة: {lesson.title}</h6>
                      {historyLoading ? <div className="text-muted small">جارٍ تحميل السجل...</div> : historyItems.length === 0 ? <div className="text-muted small">لا توجد نسخ سابقة لهذا المحتوى.</div> : (
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
    </>
  );
};

export default AdminLessonsTab;
