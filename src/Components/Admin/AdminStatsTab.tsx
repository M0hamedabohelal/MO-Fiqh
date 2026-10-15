// تبويب الإحصائيات — أكثر المسائل قراءةً وإجمالي المشاهدات + سجل أخطاء العملاء
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FiBarChart2, FiAlertTriangle, FiTrash2 } from 'react-icons/fi';
import { fetchLessonViews, fetchClientErrors, deleteClientError, pruneOldClientErrors } from '../../firebase/services';
import type { ClientErrorItem } from '../../firebase/services';
import type { Lesson } from '../../types';

interface AdminStatsTabProps {
  lessons: Lesson[];
}

interface StatsRow {
  lessonId: string;
  title: string;
  bookName: string;
  chapterName: string;
  views: number;
}

const AdminStatsTab = ({ lessons }: AdminStatsTabProps) => {
  const [viewStats, setViewStats] = useState<Record<string, number> | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  // سجل أخطاء العملاء — للمراقبة (يُجمَع تلقائيًا من الأجهزة، مخنوقًا)
  const [clientErrors, setClientErrors] = useState<ClientErrorItem[] | null>(null);
  const [clearingId, setClearingId] = useState<string | null>(null);
  // تنظيف الأخطاء القديمة دفعة واحدة (بديل سياسة TTL التي تتطلب فوترة)
  const [pruning, setPruning] = useState(false);
  const [pruneMsg, setPruneMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatsLoading(true);
    fetchLessonViews()
      .then((m) => { if (!cancelled) setViewStats(m || {}); })
      .catch(() => { if (!cancelled) setViewStats({}); })
      .finally(() => { if (!cancelled) setStatsLoading(false); });
    fetchClientErrors(30)
      .then((items) => { if (!cancelled) setClientErrors(items); })
      .catch(() => { if (!cancelled) setClientErrors([]); });
    return () => { cancelled = true; };
  }, []);

  const handleClearError = async (id: string): Promise<void> => {
    setClearingId(id);
    try {
      await deleteClientError(id);
      setClientErrors((prev) => (prev || []).filter((e) => e.id !== id));
    } finally {
      setClearingId(null);
    }
  };

  // حذف كل الأخطاء الأقدم من 30 يومًا ثم تحديث القائمة المعروضة
  const handlePruneOld = async (): Promise<void> => {
    setPruning(true);
    setPruneMsg(null);
    try {
      const removed = await pruneOldClientErrors();
      const items = await fetchClientErrors(30);
      setClientErrors(items);
      setPruneMsg(removed > 0 ? `تم حذف ${removed} خطأ قديم (أقدم من 30 يومًا).` : 'لا توجد أخطاء أقدم من 30 يومًا.');
    } catch {
      setPruneMsg('تعذّر التنظيف — تحقق من الاتصال وحاول مجددًا.');
    } finally {
      setPruning(false);
    }
  };

  const statsRows: StatsRow[] = useMemo(() => {
    if (!viewStats) return [];
    return Object.entries(viewStats)
      .map(([key, count]): StatsRow => {
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
    [statsRows],
  );

  const maxViews = statsRows.length > 0 ? statsRows[0].views : 0;

  return (
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
      {/* سجل أخطاء العملاء — أحدث 30 خطأً مسجلًا من أجهزة المستخدمين */}
      <div className="custom-card p-3 p-md-4 shadow-sm mt-4">
        <h5 className="fw-bold mb-1 d-flex align-items-center gap-2" style={{ color: 'var(--primary-color)' }}>
          <FiAlertTriangle /> أخطاء العملاء
          {clientErrors !== null && clientErrors.length > 0 && (
            <span className="badge bg-danger" style={{ fontSize: '0.7rem' }}>{clientErrors.length}</span>
          )}
        </h5>
        <small className="text-muted d-block mb-2">تُجمَع تلقائيًا (حدث واحد كل دقيقة لكل جهاز كحد أقصى) — امسح ما عالجته.</small>
        <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
          <button
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
            onClick={handlePruneOld}
            disabled={pruning || clientErrors === null}
            title="حذف كل الأخطاء الأقدم من 30 يومًا دفعة واحدة"
          >
            {pruning ? (
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
            ) : (
              <FiTrash2 size={13} />
            )}
            {pruning ? 'جارٍ التنظيف...' : 'تنظيف الأقدم من 30 يومًا'}
          </button>
          {pruneMsg && <small className="text-muted">{pruneMsg}</small>}
        </div>
        {clientErrors === null ? (
          <div className="text-center p-3"><div className="spinner-border spinner-border-sm" style={{ color: 'var(--primary-color)' }} /></div>
        ) : clientErrors.length === 0 ? (
          <p className="text-muted mb-0 small">✅ لا أخطاء مسجلة — كل الأجهزة تعمل بسلاسة.</p>
        ) : (
          <div className="d-flex flex-column gap-2">
            {clientErrors.map((err) => (
              <div key={err.id} className="d-flex align-items-start gap-2 p-2 rounded" style={{ backgroundColor: 'var(--badge-bg)' }}>
                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                  <div className="small fw-bold text-truncate">
                    <span className="badge bg-secondary me-2" style={{ fontSize: '0.65rem' }}>{err.scope}</span>
                    {err.message}
                  </div>
                  <small className="text-muted d-block">
                    {err.at ? new Date(err.at).toLocaleString('ar-EG') : '—'}
                    {err.url ? ` • ${String(err.url).slice(0, 60)}` : ''}
                  </small>
                </div>
                <button
                  className="btn btn-sm btn-outline-danger flex-shrink-0"
                  onClick={() => handleClearError(err.id)}
                  disabled={clearingId === err.id}
                  aria-label="مسح هذا الخطأ بعد معالجته"
                  title="مسح بعد المعالجة"
                >
                  <FiTrash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default AdminStatsTab;
