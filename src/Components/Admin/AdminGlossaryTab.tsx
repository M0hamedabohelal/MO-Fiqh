// تبويب إدارة القاموس الفقهي — إضافة وتعديل وحذف المصطلحات مع معاينة المطابقات
import { useState, useMemo } from 'react';
import type { FormEvent } from 'react';
import { FiPlus, FiSave, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { saveTerm, deleteTerm } from '../../firebase/services';
import { inputStyle } from './AdminStyles';
import { countTermMatches } from '../../utils/glossaryUtil';
import type { GlossaryMap, Lesson } from '../../types';

interface AdminGlossaryTabProps {
  glossary: GlossaryMap;
  lessons?: Lesson[];
  onDataChanged: () => Promise<boolean>;
  flash: (type: 'success' | 'error', text: string) => void;
}

const AdminGlossaryTab = ({ glossary, lessons, onDataChanged, flash }: AdminGlossaryTabProps) => {
  const [busy, setBusy] = useState(false);
  const [newTerm, setNewTerm] = useState('');
  const [newDefinition, setNewDefinition] = useState('');
  const [editingTermKey, setEditingTermKey] = useState<string | null>(null);
  const [editingTermDef, setEditingTermDef] = useState('');

  // استخراج نصوص المسائل لمعاينة المطابقات بدقة
  const lessonTexts = useMemo(() => {
    if (!lessons || lessons.length === 0) return [];
    return lessons.map((l) => `${l.title || ''} ${l.mainText || ''} ${l.sheikhExplanation || ''}`);
  }, [lessons]);

  // عدد مرات ظهور المصطلح الجديد في نصوص المسائل الحالية
  const newTermMatchCount = useMemo(() => {
    const trimmed = newTerm.trim();
    if (!trimmed || lessonTexts.length === 0) return 0;
    return countTermMatches(trimmed, lessonTexts);
  }, [newTerm, lessonTexts]);

  // خريطة عدد المطابقات للمصطلحات المسجلة
  const termMatchCounts = useMemo(() => {
    if (lessonTexts.length === 0) return new Map<string, number>();
    const map = new Map<string, number>();
    for (const term of Object.keys(glossary)) {
      map.set(term, countTermMatches(term, lessonTexts));
    }
    return map;
  }, [glossary, lessonTexts]);

  const handleAddTerm = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
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
      flash('error', `فشل الحفظ: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateTerm = async (term: string): Promise<void> => {
    // حماية من مسح تعريف سليم بقيمة فارغة — نفس قيد مسار الإضافة
    const trimmedDef = editingTermDef.trim();
    if (!trimmedDef) return;
    setBusy(true);
    try {
      await saveTerm(term, trimmedDef);
      setEditingTermKey(null);
      flash('success', 'تم تحديث المصطلح.');
      await onDataChanged();
    } catch (err) {
      flash('error', `فشل التحديث: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteTerm = async (term: string): Promise<void> => {
    // تأكيد قبل حذف لا رجعة فيه (باقي الشاشات تستخدم تأكيدًا مزدوجًا — هنا حماية صريحة)
    if (!window.confirm(`حذف المصطلح "${term}"؟ لا يمكن التراجع.`)) return;
    setBusy(true);
    try {
      await deleteTerm(term);
      flash('success', `تم حذف "${term}".`);
      await onDataChanged();
    } catch (err) {
      flash('error', `فشل الحذف: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <form onSubmit={handleAddTerm} className="custom-card p-4 shadow-sm mb-4">
        <h5 className="fw-bold mb-3" style={{ color: 'var(--primary-color)' }}>إضافة مصطلح جديد</h5>
        <div className="row g-2">
          <div className="col-md-4">
            <input
              type="text"
              className="form-control"
              placeholder="المصطلح"
              value={newTerm}
              onChange={(e) => setNewTerm(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div className="col-md-8">
            <input
              type="text"
              className="form-control"
              placeholder="التعريف"
              value={newDefinition}
              onChange={(e) => setNewDefinition(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        {/* وضع التحقق ومعاينة المطابقة المباشرة في المسائل */}
        {newTerm.trim() && lessonTexts.length > 0 && (
          <div className="mt-2 small d-flex flex-wrap align-items-center gap-2">
            {newTermMatchCount > 0 ? (
              <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                ✓ سيُبرز في {newTermMatchCount} موضعًا في المسائل الحالية
              </span>
            ) : (
              <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle px-2 py-1">
                لم يُعثر على تطابق في المسائل الحالية بعد (سيُحفظ في القاموس)
              </span>
            )}
            {newTermMatchCount > 40 && newTerm.trim().length <= 3 && (
              <span className="badge bg-warning-subtle text-warning border border-warning-subtle px-2 py-1">
                ⚠️ تنبيه: عدد مطابقات مرتفع ({newTermMatchCount}) لمصطلح قصير
              </span>
            )}
          </div>
        )}

        <button
          type="submit"
          className="btn mt-3 d-flex align-items-center gap-2"
          disabled={busy || !newTerm.trim() || !newDefinition.trim()}
          style={{ backgroundColor: 'var(--accent-color)', color: 'var(--text-on-accent)', fontWeight: 'bold', borderRadius: '10px' }}
        >
          {busy ? <span className="spinner-border spinner-border-sm" /> : <><FiPlus /> إضافة للمصطلحات</>}
        </button>
      </form>

      <div className="d-flex flex-column gap-2">
        {Object.entries(glossary).map(([term, definition]) => (
          editingTermKey === term ? (
            <div key={term} className="custom-card p-3">
              <div className="fw-bold mb-2" style={{ color: 'var(--primary-color)' }}>{term}</div>
              <textarea
                rows={2}
                className="form-control mb-2"
                value={editingTermDef}
                onChange={(e) => setEditingTermDef(e.target.value)}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
              <div className="d-flex gap-2">
                <button
                  className="btn btn-sm d-flex align-items-center gap-1"
                  disabled={busy}
                  onClick={() => handleUpdateTerm(term)}
                  style={{ backgroundColor: 'var(--accent-color)', color: 'var(--text-on-accent)', fontWeight: 'bold' }}
                >
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
                {termMatchCounts.has(term) && (
                  <span
                    className={`badge ms-2 ${termMatchCounts.get(term) ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-light text-muted border'}`}
                    style={{ fontSize: '0.75rem' }}
                    title="عدد مرات الظهور في نصوص المسائل الحالية"
                  >
                    {termMatchCounts.get(term)} تطابق
                  </span>
                )}
              </div>
              <div className="d-flex gap-2 flex-shrink-0">
                <button
                  className="btn btn-sm btn-light d-flex align-items-center gap-1"
                  onClick={() => { setEditingTermKey(term); setEditingTermDef(definition); }}
                  title="تعديل"
                  aria-label={`تعديل مصطلح ${term}`}
                >
                  <FiEdit2 size={14} />
                </button>
                <button
                  className="btn btn-sm btn-outline-danger"
                  disabled={busy}
                  onClick={() => handleDeleteTerm(term)}
                  title="حذف"
                  aria-label={`حذف مصطلح ${term}`}
                >
                  <FiTrash2 size={14} />
                </button>
              </div>
            </div>
          )
        ))}
      </div>
    </>
  );
};

export default AdminGlossaryTab;
