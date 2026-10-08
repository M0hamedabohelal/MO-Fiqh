// تبويب إدارة القاموس الفقهي — إضافة وتعديل وحذف المصطلحات
import { useState } from 'react';
import type { FormEvent } from 'react';
import { FiPlus, FiSave, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { saveTerm, deleteTerm } from '../../firebase/services';
import { inputStyle } from './AdminStyles';
import type { GlossaryMap } from '../../types';

interface AdminGlossaryTabProps {
  glossary: GlossaryMap;
  onDataChanged: () => Promise<void>;
  flash: (type: 'success' | 'error', text: string) => void;
}

const AdminGlossaryTab = ({ glossary, onDataChanged, flash }: AdminGlossaryTabProps) => {
  const [busy, setBusy] = useState(false);
  const [newTerm, setNewTerm] = useState('');
  const [newDefinition, setNewDefinition] = useState('');
  const [editingTermKey, setEditingTermKey] = useState<string | null>(null);
  const [editingTermDef, setEditingTermDef] = useState('');

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
    setBusy(true);
    try {
      await saveTerm(term, editingTermDef);
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
              <textarea rows={2} className="form-control mb-2" value={editingTermDef} onChange={(e) => setEditingTermDef(e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} />
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
  );
};

export default AdminGlossaryTab;
