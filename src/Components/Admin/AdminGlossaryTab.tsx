// تبويب إدارة القاموس الفقهي — إضافة وتعديل وحذف المصطلحات مع معاينة المطابقات والبحث السريع
import { useState, useMemo, useEffect } from 'react';
import type { FormEvent } from 'react';
import { FiPlus, FiSave, FiEdit2, FiTrash2, FiSearch, FiX } from 'react-icons/fi';
import { saveTerm, deleteTerm } from '../../firebase/services';
import { inputStyle } from './AdminStyles';
import { countTermMatches, normalizeGlossaryTerm } from '../../utils/glossaryUtil';
import type { GlossaryMap, Lesson } from '../../types';

interface AdminGlossaryTabProps {
  glossary: GlossaryMap;
  lessons?: Lesson[];
  onDataChanged: () => Promise<unknown>;
  flash: (type: 'success' | 'error', text: string) => void;
}

// تخزين مؤقت على مستوى الوحدة لنصوص المسائل المطبّعة لتجنب تكرار التطبيع الثقيل عند التنقل بين التبويبات
let cachedLessonsRef: Lesson[] | null = null;
let cachedNormalizedLessonTexts: string[] = [];

function getNormalizedLessonTexts(lessons?: Lesson[]): string[] {
  if (!lessons || lessons.length === 0) return [];
  if (cachedLessonsRef === lessons && cachedNormalizedLessonTexts.length === lessons.length) {
    return cachedNormalizedLessonTexts;
  }
  cachedLessonsRef = lessons;
  cachedNormalizedLessonTexts = lessons.map((l) =>
    normalizeGlossaryTerm(`${l.title || ''} ${l.mainText || ''} ${l.sheikhExplanation || ''}`)
  );
  return cachedNormalizedLessonTexts;
}

// تخزين مؤقت لنتائج مطابقة المصطلحات لتوفير انتقال فوري بنسبة 100% بين تبويبات لوحة الإدارة
let cachedCountsGlossaryRef: GlossaryMap | null = null;
let cachedCountsLessonsRef: Lesson[] | null = null;
let cachedMatchCounts = new Map<string, number>();

function clearGlossaryMatchesCache(): void {
  cachedCountsGlossaryRef = null;
  cachedCountsLessonsRef = null;
  cachedMatchCounts = new Map();
}

const AdminGlossaryTab = ({ glossary, lessons, onDataChanged, flash }: AdminGlossaryTabProps) => {
  const [busy, setBusy] = useState(false);
  const [newTerm, setNewTerm] = useState('');
  const [newDefinition, setNewDefinition] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTermKey, setEditingTermKey] = useState<string | null>(null);
  const [editingTermDef, setEditingTermDef] = useState('');

  // استخراج نصوص المسائل وتطبيعها مسبقًا مع الاستفادة من الكاش
  const normalizedLessonTexts = useMemo(() => getNormalizedLessonTexts(lessons), [lessons]);

  // إحصاء عدد المطابقات للمصطلحات المسجلة (استرجاع فوري من الكاش إن وجد لمنع أي تجميد أثناء الانتقال)
  const [termMatchCounts, setTermMatchCounts] = useState<Map<string, number>>(() => {
    if (
      cachedCountsGlossaryRef === glossary &&
      cachedCountsLessonsRef === (lessons ?? null) &&
      cachedMatchCounts.size > 0
    ) {
      return cachedMatchCounts;
    }
    return new Map();
  });
  const [isCountingMatches, setIsCountingMatches] = useState(false);

  // عدد مرات ظهور المصطلح الجديد في نصوص المسائل الحالية (مُؤجل لمنع تأخير الكتابة)
  const [newTermMatchCount, setNewTermMatchCount] = useState(0);

  // حساب مطابقات المصطلح الجديد بتأخير زمني (Debounce 200ms) لمنع أي بطء أثناء الكتابة
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = newTerm.trim();
      if (!trimmed || normalizedLessonTexts.length === 0) {
        setNewTermMatchCount(0);
      } else {
        setNewTermMatchCount(countTermMatches(trimmed, normalizedLessonTexts, true));
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [newTerm, normalizedLessonTexts]);

  // حساب المطابقات لجميع المصطلحات المسجلة في الخلفية (Async عبر شرائح عمل خفيفة لضمان استجابة وسلاسة تامة)
  useEffect(() => {
    const terms = Object.keys(glossary || {});
    if (normalizedLessonTexts.length === 0 || terms.length === 0) {
      const timer = setTimeout(() => {
        setTermMatchCounts(new Map());
        setIsCountingMatches(false);
      }, 0);
      return () => clearTimeout(timer);
    }

    // إذا كانت النتائج محسوبة مسبقًا لنفس المراجع، نعتمدها فورًا
    if (
      cachedCountsGlossaryRef === glossary &&
      cachedCountsLessonsRef === (lessons ?? null) &&
      cachedMatchCounts.size > 0
    ) {
      const timer = setTimeout(() => {
        setTermMatchCounts(cachedMatchCounts);
        setIsCountingMatches(false);
      }, 0);
      return () => clearTimeout(timer);
    }

    let cancelled = false;

    const map = new Map<string, number>();
    let currentIndex = 0;
    const CHUNK_SIZE = 8; // شريحة عمل خفيفة جدًا لا تتجاوز بضع أجزاء من الألف من الثانية

    function processNextChunk() {
      if (cancelled) return;
      setIsCountingMatches(true);

      const end = Math.min(currentIndex + CHUNK_SIZE, terms.length);
      for (let i = currentIndex; i < end; i += 1) {
        const term = terms[i];
        map.set(term, countTermMatches(term, normalizedLessonTexts, true));
      }
      currentIndex = end;

      if (currentIndex < terms.length) {
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          window.requestIdleCallback(() => processNextChunk(), { timeout: 100 });
        } else {
          setTimeout(processNextChunk, 4);
        }
      } else if (!cancelled) {
        cachedCountsGlossaryRef = glossary;
        cachedCountsLessonsRef = lessons ?? null;
        cachedMatchCounts = map;
        setTermMatchCounts(new Map(map));
        setIsCountingMatches(false);
      }
    }

    const timer = setTimeout(processNextChunk, 20);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [glossary, lessons, normalizedLessonTexts]);

  // تصفية المصطلحات حسب حقل البحث
  const filteredEntries = useMemo(() => {
    const entries = Object.entries(glossary || {});
    const query = searchTerm.trim();
    if (!query) return entries;
    const normQuery = normalizeGlossaryTerm(query);
    return entries.filter(([term, def]) => {
      const normTerm = normalizeGlossaryTerm(term);
      const normDef = normalizeGlossaryTerm(def);
      return normTerm.includes(normQuery) || normDef.includes(normQuery);
    });
  }, [glossary, searchTerm]);

  const handleAddTerm = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    const term = newTerm.trim();
    const def = newDefinition.trim();
    if (!term || !def) return;

    if (term.includes('/')) {
      flash('error', 'لا يمكن حفظ مصطلح يحتوي على الشرطة المائلة "/".');
      return;
    }

    setBusy(true);
    try {
      await saveTerm(term, def);
      clearGlossaryMatchesCache();
      setNewTerm('');
      setNewDefinition('');
      flash('success', `تم حفظ المصطلح "${term}".`);
      await onDataChanged();
    } catch (err) {
      flash('error', `فشل الحفظ: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateTerm = async (term: string): Promise<void> => {
    const trimmedDef = editingTermDef.trim();
    if (!trimmedDef) return;
    setBusy(true);
    try {
      await saveTerm(term, trimmedDef);
      clearGlossaryMatchesCache();
      setEditingTermKey(null);
      flash('success', `تم تحديث المصطلح "${term}".`);
      await onDataChanged();
    } catch (err) {
      flash('error', `فشل التحديث: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteTerm = async (term: string): Promise<void> => {
    if (!window.confirm(`حذف المصطلح "${term}"؟ لا يمكن التراجع.`)) return;
    setBusy(true);
    try {
      await deleteTerm(term);
      clearGlossaryMatchesCache();
      flash('success', `تم حذف "${term}".`);
      await onDataChanged();
    } catch (err) {
      flash('error', `فشل الحذف: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const totalTermsCount = Object.keys(glossary || {}).length;

  return (
    <>
      {/* نموذج إضافة مصطلح جديد */}
      <form onSubmit={handleAddTerm} className="custom-card p-4 shadow-sm mb-4">
        <h5 className="fw-bold mb-3" style={{ color: 'var(--primary-color)' }}>
          إضافة مصطلح جديد
        </h5>
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
        {newTerm.trim() && normalizedLessonTexts.length > 0 && (
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
          style={{
            backgroundColor: 'var(--accent-color)',
            color: 'var(--text-on-accent)',
            fontWeight: 'bold',
            borderRadius: '10px',
          }}
        >
          {busy ? <span className="spinner-border spinner-border-sm" /> : <><FiPlus /> إضافة للمصطلحات</>}
        </button>
      </form>

      {/* شريط البحث في القاموس والإحصاءات */}
      <div className="custom-card p-3 shadow-sm mb-3 d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div className="d-flex align-items-center gap-2 flex-grow-1" style={{ maxWidth: '400px' }}>
          <div className="input-group">
            <span className="input-group-text bg-transparent border-end-0">
              <FiSearch style={{ color: 'var(--text-muted)' }} />
            </span>
            <input
              type="text"
              className="form-control border-start-0"
              placeholder="ابحث في المصطلحات والتعريفات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={inputStyle}
            />
            {searchTerm && (
              <button
                type="button"
                className="btn btn-outline-secondary border-start-0"
                onClick={() => setSearchTerm('')}
                title="مسح البحث"
              >
                <FiX />
              </button>
            )}
          </div>
        </div>
        <div className="small text-muted d-flex align-items-center gap-2">
          <span>
            المصطلحات: <strong style={{ color: 'var(--primary-color)' }}>{filteredEntries.length}</strong>
            {searchTerm && ` من أصل ${totalTermsCount}`}
          </span>
          {isCountingMatches && (
            <span className="spinner-border spinner-border-sm text-secondary" title="جاري فحص تطابق المسائل..." />
          )}
        </div>
      </div>

      {/* قائمة المصطلحات */}
      <div className="d-flex flex-column gap-2">
        {filteredEntries.length === 0 ? (
          <div className="custom-card p-4 text-center text-muted">
            {searchTerm ? 'لم يتم العثور على أي مصطلح يطابق البحث.' : 'لا توجد مصطلحات في القاموس بعد.'}
          </div>
        ) : (
          filteredEntries.map(([term, definition]) =>
            editingTermKey === term ? (
              <div key={term} className="custom-card p-3 shadow-sm">
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
                    disabled={busy || !editingTermDef.trim()}
                    onClick={() => handleUpdateTerm(term)}
                    style={{
                      backgroundColor: 'var(--accent-color)',
                      color: 'var(--text-on-accent)',
                      fontWeight: 'bold',
                    }}
                  >
                    <FiSave size={14} /> حفظ
                  </button>
                  <button className="btn btn-sm btn-light" onClick={() => setEditingTermKey(null)}>
                    إلغاء
                  </button>
                </div>
              </div>
            ) : (
              <div key={term} className="custom-card p-3 d-flex align-items-start justify-content-between gap-2">
                <div className="flex-grow-1">
                  <span className="fw-bold" style={{ color: 'var(--primary-color)' }}>{term}: </span>
                  <span className="small">{definition}</span>
                  {termMatchCounts.has(term) && (
                    <span
                      className={`badge ms-2 ${
                        termMatchCounts.get(term)
                          ? 'bg-success-subtle text-success border border-success-subtle'
                          : 'bg-light text-muted border'
                      }`}
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
                    onClick={() => {
                      setEditingTermKey(term);
                      setEditingTermDef(definition);
                    }}
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
          )
        )}
      </div>
    </>
  );
};

export default AdminGlossaryTab;
