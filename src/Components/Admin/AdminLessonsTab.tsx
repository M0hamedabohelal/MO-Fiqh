// تبويب إدارة المسائل — إضافة وتعديل وحذف واستيراد بالجملة مباشرة على السحابة
import { useState, useMemo } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { motion } from 'framer-motion';
import {
  FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiBook,
  FiAlertTriangle, FiSearch, FiEye, FiEyeOff, FiInfo, FiUpload,
} from 'react-icons/fi';
import {
  createLesson, updateLesson, deleteLessonById, bulkCreateLessons,
} from '../../firebase/services';
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
  mediaUrl: string;
  mediaType: string;
  adminNote: string;
}

interface AdminLessonsTabProps {
  lessons: Lesson[];
  onDataChanged: () => Promise<void>;
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
  mediaUrl: '',
  mediaType: '',
  adminNote: '',
};

const AdminLessonsTab = ({ lessons, onDataChanged, flash }: AdminLessonsTabProps) => {
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
        const valid = (parsed as Array<Partial<Lesson>>).filter((x) => x && String(x.title || '').trim()) as BulkLessonInput[];
        if (valid.length === 0) {
          setBulkError('لا توجد مسائل صالحة في الملف (تأكد أن كل عنصر له "title").');
          return;
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

  const uploadToCloudinary = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingMedia(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "fiqh_preset");

    try {
      const res = await fetch("https://api.cloudinary.com/v1_1/dzk4hgpq/auto/upload", {
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
    const trimmedTitle = (form.title || '').trim();
    const trimmedBookName = (form.bookName || '').trim();

    if (!trimmedTitle || !trimmedBookName) {
      flash('error', 'اسم الكتاب وعنوان المسألة حقول إلزامية.');
      return;
    }

    const cleanedForm: LessonFormState = {
      ...form,
      title: trimmedTitle,
      bookName: trimmedBookName,
      chapterName: (form.chapterName || '').trim(),
    };

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

      {/* استيراد بالجملة (JSON) */}
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary d-flex align-items-center justify-content-center gap-2 w-100 mb-3"
        style={{ borderRadius: '10px' }}
        onClick={() => setBulkOpen((p) => !p)}
      >
        <FiUpload size={16} /> استيراد مسائل بالجملة (JSON) {bulkOpen ? '— إخفاء' : ''}
      </button>
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
            <button type="button" className="btn btn-sm text-muted" onClick={closeForm}>
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
                      (document.getElementById('cloudinaryFileInput') as HTMLInputElement).value = '';
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
              <small className="text-muted d-block mt-1">تلميح: لإنشاء رابط ذكي لمسألة أخرى، استخدم الصيغة: <code dir="ltr" style={{ color: 'var(--accent-color)' }}>[نص الرابط](lesson:رقم_المسألة)</code> (مثال: <code dir="ltr" style={{ color: 'var(--accent-color)' }}>[الوضوء](lesson:5)</code>).</small>
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
            {bookLessons.map((lesson) => (
              showDeleteConfirm === (lesson._docId || String(lesson.id)) ? (
                <div key={lesson._docId || lesson.id} className="custom-card p-3 d-flex align-items-center justify-content-between flex-wrap gap-2 border-danger">
                  <span className="small fw-bold"><FiAlertTriangle className="ms-1 text-warning" /> متأكد من حذف "{lesson.title}"؟ لا يمكن الرجوع.</span>
                  <div className="d-flex gap-2">
                    <button className="btn btn-sm btn-danger" disabled={busy} onClick={() => handleDeleteLesson(lesson._docId || String(lesson.id))}>
                      نعم، احذف
                    </button>
                    <button className="btn btn-sm btn-light" onClick={() => setShowDeleteConfirm(null)}>إلغاء</button>
                  </div>
                </div>
              ) : (
                <div key={lesson._docId || lesson.id} className="custom-card p-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
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
                    <button className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1" disabled={busy} onClick={() => setShowDeleteConfirm(lesson._docId || String(lesson.id))} title="حذف">
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      ))}
    </>
  );
};

export default AdminLessonsTab;
