// لوحة الإدارة — إضافة وتعديل وحذف المسائل ومصطلحات القاموس مباشرة على السحابة
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiBook,
  FiAlertTriangle, FiCheckCircle, FiRefreshCw,
  FiSearch, FiEye, FiEyeOff, FiBarChart2, FiInfo, FiBell
} from 'react-icons/fi';
import {
  createLesson, updateLesson, deleteLessonById,
  saveTerm, deleteTerm, fetchLessonViews
} from '../../firebase/services';
import QuoteCard from '../Content/QuoteCard';
import ExplanationCard from '../Content/ExplanationCard';
import AdminAnnouncements from './AdminAnnouncements';


const EMPTY_LESSON = {
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


const inputStyle = {
  backgroundColor: 'var(--badge-bg)',
  color: 'var(--text-main)',
  border: '1px solid var(--border-color)',
  borderRadius: '10px',
};

const AdminPanel = ({ lessons, glossary, onDataChanged }) => {
  const [tab, setTab] = useState('lessons'); // lessons | glossary | stats
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success'|'error', text }
  const [busy, setBusy] = useState(false);

  // حالة نموذج المسألة
  const [editingDocId, setEditingDocId] = useState(null); // null = إضافة جديدة، docId = تعديل
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_LESSON);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null); // docId
  const [showPreview, setShowPreview] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const uploadToCloudinary = async (e) => {
    const file = e.target.files[0];
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
      const data = await res.json();
      if (data.secure_url) {
        setForm(prev => ({
          ...prev,
          mediaUrl: data.secure_url,
          mediaType: file.type.includes("pdf") ? "pdf" : "image"
        }));
        flash('success', 'تم رفع الملف بنجاح!');
      } else {
        flash('error', 'فشل الرفع، تأكد من إعدادات Cloudinary.');
      }
    } catch (err) {
      flash('error', `خطأ في الرفع: ${err.message}`);
    } finally {
      setUploadingMedia(false);
    }
  };

  // البحث والتصفية داخل اللوحة
  const [adminSearch, setAdminSearch] = useState('');
  const [adminBookFilter, setAdminBookFilter] = useState('');

  // إحصائيات المشاهدات
  const [viewStats, setViewStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // حالة القاموس
  const [newTerm, setNewTerm] = useState('');
  const [newDefinition, setNewDefinition] = useState('');
  const [editingTermKey, setEditingTermKey] = useState(null);
  const [editingTermDef, setEditingTermDef] = useState('');


  const flash = (type, text) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  /* ==================== إدارة المسائل ==================== */

  const openAddForm = () => {
    setEditingDocId(null);
    setForm(EMPTY_LESSON);
    setFormOpen(true);
  };

  const openEditForm = (lesson) => {
    setEditingDocId(lesson._docId || String(lesson.id));
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

  const closeForm = () => {
    setFormOpen(false);
    setEditingDocId(null);
    setForm(EMPTY_LESSON);
  };

  const handleFieldChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSaveLesson = async (e) => {
    e.preventDefault();
    const trimmedTitle = (form.title || '').trim();
    const trimmedBookName = (form.bookName || '').trim();
    
    if (!trimmedTitle || !trimmedBookName) {
      flash('error', 'اسم الكتاب وعنوان المسألة حقول إلزامية.');
      return;
    }
    
    const cleanedForm = {
      ...form,
      title: trimmedTitle,
      bookName: trimmedBookName,
      chapterName: (form.chapterName || '').trim()
    };

    setBusy(true);
    try {

      if (editingDocId) {
        await updateLesson(editingDocId, { ...cleanedForm, id: Number(editingDocId) });
        flash('success', 'تم حفظ التعديلات بنجاح.');
      } else {
        await createLesson(cleanedForm);
        flash('success', 'تمت إضافة المسألة الجديدة بنجاح.');
      }
      closeForm();
      await onDataChanged();
    } catch (err) {
      flash('error', `فشل الحفظ: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteLesson = async (docId) => {
    setBusy(true);
    try {
      await deleteLessonById(docId);
      setShowDeleteConfirm(null);
      flash('success', 'تم حذف المسألة.');
      await onDataChanged();
    } catch (err) {
      flash('error', `فشل الحذف: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  /* ==================== إدارة القاموس ==================== */

  const handleAddTerm = async (e) => {
    e.preventDefault();
    if (!newTerm.trim() || !newDefinition.trim()) return;
    setBusy(true);
    try {
      await saveTerm(newTerm.trim(), newDefinition.trim());
      setNewTerm('');
      setNewDefinition('');
      flash('success', 'تم حفظ المصطلح.');
      await onDataChanged();
    } catch (err) {
      flash('error', `فشل الحفظ: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateTerm = async (term) => {
    setBusy(true);
    try {
      await saveTerm(term, editingTermDef);
      setEditingTermKey(null);
      flash('success', 'تم تحديث المصطلح.');
      await onDataChanged();
    } catch (err) {
      flash('error', `فشل التحديث: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteTerm = async (term) => {
    setBusy(true);
    try {
      await deleteTerm(term);
      flash('success', `تم حذف "${term}".`);
      await onDataChanged();
    } catch (err) {
      flash('error', `فشل الحذف: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  /* ==================== الواجهة ==================== */

  // الكتب الموجودة فعليًا (للقائمة المنسدلة)
  const booksInLessons = useMemo(
    () => [...new Set(lessons.map((l) => (l.bookName || '').trim()).filter(Boolean))],
    [lessons]
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
  const lessonsByBook = filteredLessons.reduce((acc, lesson) => {
    const bName = (lesson.bookName || '').trim();
    if (!acc[bName]) acc[bName] = [];
    acc[bName].push(lesson);
    return acc;
  }, {});

  /* ==================== الإحصائيات ==================== */

  useEffect(() => {
    if (tab !== 'stats') return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatsLoading(true);
    fetchLessonViews()
      .then((m) => { if (!cancelled) setViewStats(m || {}); })
      .catch(() => { if (!cancelled) setViewStats({}); })
      .finally(() => { if (!cancelled) setStatsLoading(false); });
    return () => { cancelled = true; };
  }, [tab]);

  const statsRows = useMemo(() => {
    if (!viewStats) return [];
    return Object.entries(viewStats)
      .map(([key, count]) => {
        const lessonId = key.replace('lesson_', '');
        const lesson = lessons.find((l) => String(l.id) === lessonId);
        return {
          lessonId,
          title: lesson?.title || `مسألة #${lessonId}`,
          bookName: lesson?.bookName || '—',
          chapterName: lesson?.chapterName || '',
          views: Number(count) || 0,
        };
      })
      .sort((a, b) => b.views - a.views);
  }, [viewStats, lessons]);

  const totalViews = useMemo(
    () => statsRows.reduce((sum, r) => sum + r.views, 0),
    [statsRows]
  );

  const maxViews = statsRows.length > 0 ? statsRows[0].views : 0;

  return (
    <div className="mt-4 mb-5">
      <h3 className="mb-4 fw-bold d-flex align-items-center" style={{ color: 'var(--primary-color)' }}>
        <FiEdit2 className="ms-2" /> لوحة الإدارة
      </h3>

      {/* رسالة الحالة */}
      {statusMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`alert d-flex align-items-center gap-2 ${statusMessage.type === 'success' ? 'alert-success' : 'alert-danger'}`}
          role="alert"
        >
          {statusMessage.type === 'success' ? <FiCheckCircle /> : <FiAlertTriangle />}
          {statusMessage.text}
        </motion.div>
      )}

      {/* تبويبات */}
      <ul className="nav nav-pills mb-4 gap-2">
        <li className="nav-item">
          <button
            className={`nav-link ${tab === 'lessons' ? 'active' : ''}`}
            onClick={() => setTab('lessons')}
            style={tab === 'lessons' ? { backgroundColor: 'var(--primary-color)' } : { color: 'var(--text-main)' }}
          >
            <FiBook className="ms-1" /> المسائل ({lessons.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${tab === 'glossary' ? 'active' : ''}`}
            onClick={() => setTab('glossary')}
            style={tab === 'glossary' ? { backgroundColor: 'var(--primary-color)' } : { color: 'var(--text-main)' }}
          >
            📖 القاموس ({Object.keys(glossary).length})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link d-flex align-items-center gap-1 ${tab === 'stats' ? 'active' : ''}`}
            onClick={() => setTab('stats')}
            style={tab === 'stats' ? { backgroundColor: 'var(--primary-color)' } : { color: 'var(--text-main)' }}
          >
            <FiBarChart2 /> الإحصائيات
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link d-flex align-items-center gap-1 ${tab === 'announcements' ? 'active' : ''}`}
            onClick={() => setTab('announcements')}
            style={tab === 'announcements' ? { backgroundColor: 'var(--primary-color)' } : { color: 'var(--text-main)' }}
          >
            <FiBell /> التنبيهات
          </button>
        </li>
      </ul>

      {/* ==================== تبويب المسائل ==================== */}
      {tab === 'lessons' && (
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
                           document.getElementById('cloudinaryFileInput').value = '';
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
                  <textarea rows="7" className="form-control" value={form.mainText} onChange={handleFieldChange('mainText')} style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.8' }} />
                  <small className="text-muted d-block mt-1">تلميح: لإنشاء رابط ذكي لمسألة أخرى، استخدم الصيغة: <code dir="ltr" style={{ color: 'var(--accent-color)' }}>[نص الرابط](lesson:رقم_المسألة)</code> (مثال: <code dir="ltr" style={{ color: 'var(--accent-color)' }}>[الوضوء](lesson:5)</code>).</small>
                </div>
                <div className="col-12">
                  <label className="form-label small fw-bold">شرح الشيخ</label>
                  <textarea rows="5" className="form-control" value={form.sheikhExplanation} onChange={handleFieldChange('sheikhExplanation')} style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.8' }} />
                  <small className="text-muted d-block mt-1">تلميح: لإنشاء رابط ذكي لمسألة أخرى، استخدم الصيغة: <code dir="ltr" style={{ color: 'var(--accent-color)' }}>[نص الرابط](lesson:رقم_المسألة)</code></small>
                </div>
                <div className="col-12">
                  <label className="form-label small fw-bold">ملحوظة خاصة (تظهر أعلى المتن - اختياري)</label>
                  <textarea rows="3" className="form-control" value={form.adminNote} onChange={handleFieldChange('adminNote')} style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.8' }} placeholder="أضف تنبيهاً أو ملحوظة هامة للمستخدم تظهر قبل نص المسألة..." />
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
      )}

      {/* ==================== تبويب القاموس ==================== */}
      {tab === 'glossary' && (
        <>
          <form onSubmit={handleAddTerm} className="custom-card p-4 shadow-sm mb-4">
            <h5 className="fw-bold mb-3" style={{ color: 'var(--primary-color)' }}>إضافة مصطلح جديد</h5>
            <div className="row g-2">
              <div className="col-md-4">
                <input type="text" className="form-control" placeholder="المصطلح" value={newTerm} onChange={(e) => setNewTerm(e.target.value)} style={inputStyle} />
              </div>
              <div className="col-md-8">
                <input type="text" className="form-control" placeholder="التعريف" value={newDefinition} onChange={(e) => setNewDefinition(e.target.value)} style={inputStyle} />
              </div>
            </div>
            <button type="submit" className="btn mt-3 d-flex align-items-center gap-2" disabled={busy || !newTerm.trim() || !newDefinition.trim()}
              style={{ backgroundColor: 'var(--accent-color)', color: 'var(--text-on-accent)', fontWeight: 'bold', borderRadius: '10px' }}>
              {busy ? <span className="spinner-border spinner-border-sm" /> : <><FiPlus /> إضافة للمصطلحات</>}
            </button>
          </form>

          <div className="d-flex flex-column gap-2">
            {Object.entries(glossary).map(([term, definition]) => (
              editingTermKey === term ? (
                <div key={term} className="custom-card p-3">
                  <div className="fw-bold mb-2" style={{ color: 'var(--primary-color)' }}>{term}</div>
                  <textarea rows="2" className="form-control mb-2" value={editingTermDef} onChange={(e) => setEditingTermDef(e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} />
                  <div className="d-flex gap-2">
                    <button className="btn btn-sm d-flex align-items-center gap-1" disabled={busy} onClick={() => handleUpdateTerm(term)}
                      style={{ backgroundColor: 'var(--accent-color)', color: 'var(--text-on-accent)', fontWeight: 'bold' }}>
                      <FiSave size={14} /> حفظ
                    </button>
                    <button className="btn btn-sm btn-light" onClick={() => setEditingTermKey(null)}>إلغاء</button>
                  </div>
                </div>
              ) : (
                <div key={term} className="custom-card p-3 d-flex align-items-start justify-content-between gap-2">
                  <div className="flex-grow-1">
                    <span className="fw-bold" style={{ color: 'var(--primary-color)' }}>{term}: </span>
                    <span className="small">{definition}</span>
                  </div>
                  <div className="d-flex gap-2 flex-shrink-0">
                    <button className="btn btn-sm btn-light d-flex align-items-center gap-1" onClick={() => { setEditingTermKey(term); setEditingTermDef(definition); }} title="تعديل">
                      <FiEdit2 size={14} />
                    </button>
                    <button className="btn btn-sm btn-outline-danger" disabled={busy} onClick={() => handleDeleteTerm(term)} title="حذف">
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            ))}
          </div>
        </>
      )}

      {/* ==================== تبويب الإحصائيات ==================== */}
      {tab === 'stats' && (
        <>
          <div className="d-flex gap-3 mb-4 flex-wrap">
            <div className="custom-card p-3 flex-grow-1 text-center">
              <div className="fw-bold" style={{ fontSize: '1.6rem', color: 'var(--primary-color)' }}>{statsLoading ? '...' : totalViews}</div>
              <small className="text-muted">إجمالي المشاهدات</small>
            </div>
            <div className="custom-card p-3 flex-grow-1 text-center">
              <div className="fw-bold" style={{ fontSize: '1.6rem', color: 'var(--accent-color)' }}>{statsLoading ? '...' : statsRows.filter((r) => r.views > 0).length}</div>
              <small className="text-muted">مسائل تمت قراءتها</small>
            </div>
            <div className="custom-card p-3 flex-grow-1 text-center">
              <div className="fw-bold" style={{ fontSize: '1.6rem', color: '#27ae60' }}>{statsLoading ? '...' : `${lessons.length}`}</div>
              <small className="text-muted">إجمالي المسائل</small>
            </div>
          </div>

          {statsLoading ? (
            <div className="text-center p-5"><div className="spinner-border" style={{ color: 'var(--primary-color)' }} /></div>
          ) : statsRows.length === 0 ? (
            <div className="custom-card p-5 text-center shadow-sm">
              <FiBarChart2 size={48} className="mb-3 text-muted" style={{ opacity: 0.35 }} />
              <p className="text-muted mb-0">لا توجد مشاهدات مسجلة بعد — ستظهر هنا تلقائيًا مع استخدام القارئين للموقع.</p>
            </div>
          ) : (
            <div className="custom-card p-3 p-md-4 shadow-sm">
              <h5 className="fw-bold mb-3" style={{ color: 'var(--primary-color)' }}>🏆 أكثر المسائل قراءة</h5>
              <div className="d-flex flex-column gap-2">
                {statsRows.map((row, index) => (
                  row.views > 0 && (
                    <div key={row.lessonId} className="d-flex align-items-center gap-3 p-2 rounded" style={{ backgroundColor: 'var(--badge-bg)' }}>
                      <span style={{ width: '32px', textAlign: 'center', flexShrink: 0, fontSize: '1.1rem' }}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                      </span>
                      <div className="flex-grow-1 text-end" style={{ minWidth: 0 }}>
                        <div className="fw-bold small text-truncate">{row.title}</div>
                        <small className="text-muted text-truncate d-block">{row.bookName}{row.chapterName ? ` — ${row.chapterName}` : ''}</small>
                      </div>
                      <div style={{ width: '110px', flexShrink: 0 }}>
                        <div className="progress-track mb-1">
                          <motion.div
                            className="progress-fill"
                            initial={{ width: 0 }}
                            animate={{ width: maxViews > 0 ? `${Math.max((row.views / maxViews) * 100, 6)}%` : '0%' }}
                            transition={{ duration: 0.7, ease: 'easeOut' }}
                          />
                        </div>
                        <small className="text-muted">{row.views} مشاهدة</small>
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ==================== الإشعارات ==================== */}
      {tab === 'announcements' && (
        <AdminAnnouncements />
      )}

      {/* زر تحديث من السحابة */}
      <div className="text-center mt-5">
        <button className="btn btn-sm btn-light text-muted d-flex align-items-center gap-2 mx-auto" onClick={onDataChanged} disabled={busy}>
          <FiRefreshCw size={14} /> تحديث البيانات من السحابة
        </button>
      </div>
    </div>
  );
};

export default AdminPanel;
