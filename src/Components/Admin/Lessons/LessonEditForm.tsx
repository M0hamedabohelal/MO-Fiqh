import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { FiX, FiTrash2, FiBook, FiInfo } from 'react-icons/fi';
import QuoteCard from '../../Content/QuoteCard';
import ExplanationCard from '../../Content/ExplanationCard';
import { inputStyle } from '../AdminStyles';
import { CLOUDINARY_UPLOAD_URL, CLOUDINARY_UPLOAD_PRESET, validateUploadFile } from '../../../utils/cloudinary';
import type { LessonFormState } from './types';

interface LessonEditFormProps {
  editingDocId: string | null;
  form: LessonFormState;
  setForm: React.Dispatch<React.SetStateAction<LessonFormState>>;
  handleFieldChange: (field: keyof LessonFormState) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleSaveLesson: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  closeForm: () => void;
  busy: boolean;
  flash: (type: 'success' | 'error', text: string) => void;
}

export const LessonEditForm = ({
  editingDocId,
  form,
  setForm,
  handleFieldChange,
  handleSaveLesson,
  closeForm,
  busy,
  flash,
}: LessonEditFormProps) => {
  const [showPreview, setShowPreview] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);

  const uploadToCloudinary = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateUploadFile(file);
    if (validationError) {
      flash('error', validationError);
      e.target.value = '';
      return;
    }

    setUploadingMedia(true);
    const data = new FormData();
    data.append('file', file);
    data.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
      const res = await fetch(CLOUDINARY_UPLOAD_URL, { method: 'POST', body: data });
      const json = await res.json();
      if (json.secure_url) {
        setForm((prev) => ({
          ...prev,
          mediaUrl: json.secure_url,
          mediaType: file.type.includes('pdf') ? 'pdf' : 'image',
        }));
        flash('success', 'تم رفع الملف بنجاح.');
      } else {
        flash('error', 'فشل الرفع. تأكد من إعدادات Cloudinary.');
      }
    } catch {
      flash('error', 'حدث خطأ أثناء الرفع إلى السحابة.');
    } finally {
      setUploadingMedia(false);
    }
  };

  const uploadAudioToCloudinary = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateUploadFile(file);
    if (validationError) {
      flash('error', validationError);
      e.target.value = '';
      return;
    }

    setUploadingAudio(true);
    const data = new FormData();
    data.append('file', file);
    data.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
      const res = await fetch(CLOUDINARY_UPLOAD_URL.replace('/image/upload', '/video/upload'), {
        method: 'POST',
        body: data,
      });
      const json = await res.json();
      if (json.secure_url) {
        setForm((prev) => ({
          ...prev,
          audioUrl: json.secure_url,
        }));
        flash('success', 'تم رفع الملف الصوتي بنجاح.');
      } else {
        flash('error', 'فشل رفع الملف الصوتي.');
      }
    } catch {
      flash('error', 'حدث خطأ أثناء رفع الصوت.');
    } finally {
      setUploadingAudio(false);
    }
  };

  return (
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
                  setForm((prev) => ({ ...prev, mediaUrl: '', mediaType: '' }));
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

      <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-outline-secondary d-flex align-items-center gap-2"
          onClick={() => setShowPreview((p) => !p)}
        >
          {showPreview ? 'إخفاء المعاينة' : '👁️ معاينة المسألة'}
        </button>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-secondary px-4" onClick={closeForm} disabled={busy}>
            إلغاء
          </button>
          <button
            type="submit"
            className="btn px-4 text-white d-flex align-items-center gap-2"
            disabled={busy || uploadingMedia || uploadingAudio}
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            {busy ? <span className="spinner-border spinner-border-sm" /> : null}
            {editingDocId ? 'حفظ التعديلات' : 'إضافة المسألة'}
          </button>
        </div>
      </div>
    </motion.form>
  );
};
