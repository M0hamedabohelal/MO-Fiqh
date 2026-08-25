// لوحة الإدارة — إضافة وتعديل وحذف المسائل ومصطلحات القاموس مباشرة على السحابة
import { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiBook,
  FiAlertTriangle, FiCheckCircle, FiRefreshCw, FiUpload, FiChevronDown, FiChevronLeft,
  FiSearch, FiEye, FiEyeOff, FiBarChart2
} from 'react-icons/fi';
import {
  createLesson, bulkCreateLessons, updateLesson, deleteLessonById,
  saveTerm, deleteTerm, fetchLessonViews,
} from '../../firebase/services';

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

  // حالة الاستيراد بالجملة
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const fileInputRef = useRef(null);

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

  /* ==================== الاستيراد بالجملة ==================== */

  const handleBulkFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setBulkText(String(reader.result || ''));
      flash('success', `تم تحميل الملف "${file.name}" — راجع المحتوى ثم اضغط استيراد.`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleBulkImport = async () => {
    let parsed;
    try {
      parsed = JSON.parse(bulkText);
    } catch {
      flash('error', 'الملف ليس JSON صالحًا — راجع الصيغة (مصفوفة كائنات).');
      return;
    }
    if (!Array.isArray(parsed) || parsed.length === 0) {
      flash('error', 'المحتوى يجب أن يكون مصفوفة غير فارغة من المسائل.');
      return;
    }
    const invalid = parsed.filter((item) => !item || typeof item !== 'object' || !String(item.title || '').trim() || !String(item.bookName || '').trim());
    if (invalid.length > 0) {
      flash('error', `${invalid.length} عنصر ناقص — كل مسألة تحتاج على الأقل "title" و"bookName".`);
      return;
    }
    if (!window.confirm(`سيتم إضافة ${parsed.length} مسألة جديدة بترقيم تلقائي. متابعة؟`)) return;

    setBusy(true);
    try {
      const count = await bulkCreateLessons(parsed);
      setBulkText('');
      setBulkOpen(false);
      flash('success', `تم استيراد ${count} مسألة بنجاح.`);
      await onDataChanged();
    } catch (err) {
      flash('error', `فشل الاستيراد: ${err.message}`);
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
              style={{ backgroundColor: 'var(--accent-color)', color: 'var(--primary-color)', fontWeight: 'bold', borderRadius: '12px' }}
            >
              <FiPlus size={20} /> إضافة مسألة جديدة
            </button>
          )}

          {/* الاستيراد بالجملة */}
          <div className="custom-card p-3 mb-4">
            <button
              type="button"
              className="btn w-100 d-flex justify-content-between align-items-center border-0"
              style={{ color: 'var(--primary-color)', fontWeight: 'bold', background: 'transparent' }}
              onClick={() => setBulkOpen((prev) => !prev)}
            >
              <span className="d-flex align-items-center gap-2"><FiUpload size={18} /> استيراد بالجملة (JSON)</span>
              {bulkOpen ? <FiChevronDown size={20} /> : <FiChevronLeft size={20} />}
            </button>

            {bulkOpen && (
              <div className="mt-3 border-top pt-3">
                <p className="small text-muted mb-2">
                  الصق مصفوفة JSON أو اختر ملفًا. كل مسألة تحتاج على الأقل:
                  <code className="mx-1" dir="ltr">title</code>و
                  <code dir="ltr">bookName</code> — والباقي اختياري (chapterName, pageNumber, videoNumber, videoTimestamp, mainText, sheikhExplanation, videoUrl, startTime). الترقيم تلقائي.
                </p>
                <textarea
                  rows="7"
                  className="form-control mb-2 font-monospace small"
                  dir="ltr"
                  placeholder={'[\n  {\n    "title": "حكم الوضوء",\n    "bookName": "كتاب الطهارة",\n    "chapterName": "باب الوضوء",\n    "pageNumber": "10",\n    "mainText": "..."\n  }\n]'}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
                <div className="d-flex gap-2 flex-wrap">
                  <button
                    type="button"
                    className="btn d-flex align-items-center gap-2 flex-grow-1"
                    disabled={busy || !bulkText.trim()}
                    onClick={handleBulkImport}
                    style={{ backgroundColor: 'var(--accent-color)', color: 'var(--primary-color)', fontWeight: 'bold', borderRadius: '10px' }}
                  >
                    {busy ? <span className="spinner-border spinner-border-sm" /> : <><FiUpload size={16} /> استيراد {bulkText.trim() ? `(${(() => { try { const p = JSON.parse(bulkText); return Array.isArray(p) ? `${p.length} مسألة` : ''; } catch { return ''; } })()})` : ''}</>}
                  </button>
                  <button
                    type="button"
                    className="btn btn-light d-flex align-items-center gap-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    📄 اختيار ملف .json
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    style={{ display: 'none' }}
                    onChange={handleBulkFileSelect}
                  />
                  {bulkText && (
                    <button type="button" className="btn btn-outline-secondary" onClick={() => setBulkText('')}>
                      تفريغ
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

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
                  <label className="form-label small fw-bold">وقت التشغيل</label>
                  <input type="text" className="form-control" dir="ltr" placeholder="00:00:00" value={form.startTime} onChange={handleFieldChange('startTime')} style={inputStyle} />
                </div>
                <div className="col-12">
                  <label className="form-label small fw-bold">متن المسألة</label>
                  <textarea rows="7" className="form-control" value={form.mainText} onChange={handleFieldChange('mainText')} style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.8' }} />
                </div>
                <div className="col-12">
                  <label className="form-label small fw-bold">شرح الشيخ</label>
                  <textarea rows="5" className="form-control" value={form.sheikhExplanation} onChange={handleFieldChange('sheikhExplanation')} style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.8' }} />
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
                  <div className="manuscript-frame p-3 p-md-4">
                    {(form.mainText || '').split('\n').filter((p) => p.trim()).map((para, i) => (
                      <p key={i} style={{ fontFamily: 'var(--font-quote)', textAlign: 'justify', lineHeight: '2.2', marginBottom: '1rem', fontSize: '1.1rem' }}>
                        {para}
                      </p>
                    ))}
                  </div>
                  {(form.sheikhExplanation || '').trim() && (
                    <div className="mt-4">
                      <h5 className="fw-bold mb-3" style={{ color: 'var(--accent-color)' }}>✦ شرح الشيخ</h5>
                      {(form.sheikhExplanation || '').split('\n').filter((p) => p.trim()).map((para, i) => (
                        <p key={i} style={{ textAlign: 'justify', lineHeight: '2', marginBottom: '.75rem' }}>
                          {para}
                        </p>
                      ))}
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
                  style={{ backgroundColor: 'var(--accent-color)', color: 'var(--primary-color)', fontWeight: 'bold', borderRadius: '10px' }}>
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
                        <div className="fw-bold small">{lesson.title}</div>
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
              style={{ backgroundColor: 'var(--accent-color)', color: 'var(--primary-color)', fontWeight: 'bold', borderRadius: '10px' }}>
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
                      style={{ backgroundColor: 'var(--accent-color)', color: 'var(--primary-color)', fontWeight: 'bold' }}>
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
