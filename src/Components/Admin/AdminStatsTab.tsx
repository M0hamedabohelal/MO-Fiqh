// تبويب الإحصائيات — أكثر المسائل قراءةً وإجمالي المشاهدات + سجل أخطاء العملاء
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FiBarChart2, FiAlertTriangle, FiTrash2, FiDatabase, FiCheckCircle } from 'react-icons/fi';
import { fetchLessonViews, fetchClientErrors, deleteClientError, pruneOldClientErrors } from '../../firebase/services';
import type { ClientErrorItem } from '../../firebase/services';
import type { Lesson } from '../../types';
import { auditLessons } from '../../utils/auditLessons';

interface AdminStatsTabProps {
  lessons: Lesson[];
  cloudLessonsLoaded: boolean;
  cloudStatus: string;
}

interface StatsRow {
  lessonId: string;
  title: string;
  bookName: string;
  chapterName: string;
  views: number;
}

const AdminStatsTab = ({ lessons, cloudLessonsLoaded, cloudStatus }: AdminStatsTabProps) => {
  const [viewStats, setViewStats] = useState<Record<string, number> | null>(null);
  // معرّفات اللقطة المضمّنة في البناء — تُحمَّل هنا فقط (للمشرف) لمقارنة «البناء ↔ السحابة».
  // ليست مصدر عرض للمستخدم: أي انحراف بينها وبين السحابة يظهر كتنبيه هنا بدل عرض محتوى ناقص.
  const [bundledIds, setBundledIds] = useState<string[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  // سجل أخطاء العملاء — للمراقبة (يُجمَع تلقائيًا من الأجهزة، مخنوقًا)
  const [clientErrors, setClientErrors] = useState<ClientErrorItem[] | null>(null);
  const [clearingId, setClearingId] = useState<string | null>(null);
  // تنظيف الأخطاء القديمة دفعة واحدة (بديل سياسة TTL التي تتطلب فوترة)
  const [pruning, setPruning] = useState(false);
  const [pruneMsg, setPruneMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // اللقطة المضمّنة تُطلب عند فتح تبويب الإحصائيات فقط (حزمة منفصلة، لا تُحمَّل للمستخدم العادي)
    void import('../../data/lessons')
      .then((mod) => {
        if (cancelled) return;
        setBundledIds((mod.lessonsData || []).map((lesson) => String(lesson.id)));
      })
      .catch(() => { /* بلا لقطة: تُخفى المقارنة فقط */ });
    return () => { cancelled = true; };
  }, []);

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
    if (!window.confirm('حذف كل سجل الأخطاء الأقدم من 30 يومًا؟ لا يمكن التراجع.')) return;
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
  const contentAudit = useMemo(() => auditLessons(lessons), [lessons]);
  const lessonSourceDiff = useMemo(() => {
    if (!bundledIds.length) return { localOnly: [] as string[], activeOnly: [] as string[] };
    const localIds = new Set(bundledIds);
    const activeIds = new Set(lessons.map((lesson) => String(lesson.id)));
    return {
      localOnly: [...localIds].filter((id) => !activeIds.has(id)).sort((a, b) => Number(a) - Number(b)),
      activeOnly: [...activeIds].filter((id) => !localIds.has(id)).sort((a, b) => Number(a) - Number(b)),
    };
  }, [lessons, bundledIds]);
  const duplicateCount = contentAudit.duplicateIds.length;
  const incompleteCount = contentAudit.incompleteLessonIds.length;
  const invalidLinkCount = contentAudit.invalidAudioUrlIds.length + contentAudit.invalidVideoUrlIds.length + contentAudit.invalidMediaUrlIds.length;
  const invalidTimingCount = contentAudit.invalidTimeIds.length + contentAudit.invalidTimeRangeIds.length;
  const qualityAlertCount = contentAudit.missingPageNumberIds.length + contentAudit.emptyMainTextIds.length + invalidLinkCount + invalidTimingCount;
  const hasContentWarnings = duplicateCount > 0 || incompleteCount > 0 || qualityAlertCount > 0 || lessonSourceDiff.localOnly.length > 0 || lessonSourceDiff.activeOnly.length > 0;
  const auditAlertCount = duplicateCount + incompleteCount + qualityAlertCount + lessonSourceDiff.localOnly.length + lessonSourceDiff.activeOnly.length;
  const qualityIssues: Array<[string, string[]]> = [
    ['صفحات بلا رقم', contentAudit.missingPageNumberIds],
    ['مسائل بلا متن', contentAudit.emptyMainTextIds],
    ['روابط صوت غير صالحة', contentAudit.invalidAudioUrlIds],
    ['روابط فيديو غير صالحة', contentAudit.invalidVideoUrlIds],
    ['روابط وسائط غير صالحة', contentAudit.invalidMediaUrlIds],
    ['توقيتات غير صالحة', contentAudit.invalidTimeIds],
    ['نهايات قبل البداية أو مساوية لها', contentAudit.invalidTimeRangeIds],
  ];
  const contentSource = cloudLessonsLoaded ? 'المحتوى المحمّل من السحابة' : 'النسخة المحلية الاحتياطية';

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

      <section className="custom-card p-3 p-md-4 shadow-sm mb-4" aria-labelledby="content-audit-title">
        <h5 id="content-audit-title" className="fw-bold mb-1 d-flex align-items-center gap-2" style={{ color: 'var(--primary-color)' }}>
          <FiDatabase /> سلامة فهرس المسائل
        </h5>
        <small className="text-muted d-block mb-3">
          المصدر الحالي: {contentSource} ({cloudStatus === 'offline' ? 'غير متصل' : cloudStatus === 'synced' ? 'متزامن' : cloudStatus === 'local' ? 'محلي' : 'جارٍ الاتصال'}).
          أعلى ID لا يساوي عدد المسائل، والفجوات قد تكون مقصودة.
        </small>
        <div className="row g-2 text-center">
          <div className="col-6 col-md-3"><div className="p-2 rounded h-100" style={{ backgroundColor: 'var(--badge-bg)' }}><strong className="d-block fs-5">{contentAudit.total}</strong><small>مسألة محمّلة</small></div></div>
          <div className="col-6 col-md-3"><div className="p-2 rounded h-100" style={{ backgroundColor: 'var(--badge-bg)' }}><strong className="d-block fs-5">{contentAudit.maximumId ?? '—'}</strong><small>أعلى ID</small></div></div>
          <div className="col-6 col-md-3"><div className="p-2 rounded h-100" style={{ backgroundColor: 'var(--badge-bg)' }}><strong className="d-block fs-5">{contentAudit.missingNumericIds.length}</strong><small>IDs غير مستخدمة</small></div></div>
          <div className="col-6 col-md-3"><div className="p-2 rounded h-100" style={{ backgroundColor: 'var(--badge-bg)' }}><strong className="d-block fs-5" style={{ color: hasContentWarnings ? '#e67e22' : '#27ae60' }}>{auditAlertCount}</strong><small>تنبيهات سلامة المحتوى</small></div></div>
        </div>
        <div className="row g-2 text-center mt-1">
          <div className="col-6 col-md-3"><div className="p-2 rounded h-100" style={{ backgroundColor: 'var(--badge-bg)' }}><strong className="d-block fs-5">{contentAudit.missingPageNumberIds.length}</strong><small>بلا رقم صفحة</small></div></div>
          <div className="col-6 col-md-3"><div className="p-2 rounded h-100" style={{ backgroundColor: 'var(--badge-bg)' }}><strong className="d-block fs-5">{contentAudit.emptyMainTextIds.length}</strong><small>بلا متن</small></div></div>
          <div className="col-6 col-md-3"><div className="p-2 rounded h-100" style={{ backgroundColor: 'var(--badge-bg)' }}><strong className="d-block fs-5">{invalidLinkCount}</strong><small>روابط بصيغة غير صالحة</small></div></div>
          <div className="col-6 col-md-3"><div className="p-2 rounded h-100" style={{ backgroundColor: 'var(--badge-bg)' }}><strong className="d-block fs-5">{invalidTimingCount}</strong><small>توقيتات غير صالحة</small></div></div>
        </div>
        <div className="mt-3 small">
          {hasContentWarnings ? (
            <p className="mb-1" role="status" style={{ color: '#e67e22' }}>
              <FiAlertTriangle className="ms-1" /> تكرار IDs: {duplicateCount} — بيانات وصفية ناقصة: {incompleteCount}
            </p>
          ) : (
            <p className="mb-1" style={{ color: '#27ae60' }}><FiCheckCircle className="ms-1" /> لا يوجد تكرار IDs أو بيانات وصفية ناقصة في المحتوى الحالي.</p>
          )}
          {contentAudit.missingNumericIds.length > 0 && (
            <div className="text-muted">
              IDs غير مستخدمة: {contentAudit.missingNumericIds.slice(0, 24).join('، ')}
              {contentAudit.missingNumericIds.length > 24 ? '، …' : ''}
            </div>
          )}
          {qualityAlertCount > 0 && (
            <div className="mt-2" role="status" style={{ color: '#e67e22' }}>
              {qualityIssues.filter(([, ids]) => ids.length > 0).map(([label, issueIds]) => (
                <div key={label}>{label}: {issueIds.length} ({issueIds.slice(0, 12).join('، ')}{issueIds.length > 12 ? '، …' : ''})</div>
              ))}
            </div>
          )}
          <small className="text-muted d-block mt-2">فحص الروابط يتحقق من صحة تنسيقها فقط، ولا يختبر إتاحة الخدمة الخارجية.</small>
          {cloudLessonsLoaded && (lessonSourceDiff.localOnly.length > 0 || lessonSourceDiff.activeOnly.length > 0) && (
            <div className="mt-2" role="status" style={{ color: '#e67e22' }}>
              اختلاف IDs بين السحابة والنسخة المحلية — موجودة محليًا فقط: {lessonSourceDiff.localOnly.length}
              {lessonSourceDiff.localOnly.length > 0 && ` (${lessonSourceDiff.localOnly.slice(0, 12).join('، ')}${lessonSourceDiff.localOnly.length > 12 ? '، …' : ''})`}
              {' '}— موجودة في السحابة فقط: {lessonSourceDiff.activeOnly.length}
              {lessonSourceDiff.activeOnly.length > 0 && ` (${lessonSourceDiff.activeOnly.slice(0, 12).join('، ')}${lessonSourceDiff.activeOnly.length > 12 ? '، …' : ''})`}
            </div>
          )}
          <div className="d-flex flex-wrap gap-2 mt-2">
            {contentAudit.books.map(({ name, count }) => (
              <span key={name} className="badge" style={{ backgroundColor: 'var(--badge-bg)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}>{name}: {count}</span>
            ))}
          </div>
        </div>
      </section>

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
