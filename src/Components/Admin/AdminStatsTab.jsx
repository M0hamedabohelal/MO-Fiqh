// تبويب الإحصائيات — أكثر المسائل قراءةً وإجمالي المشاهدات
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FiBarChart2 } from 'react-icons/fi';
import { fetchLessonViews } from '../../firebase/services';

const AdminStatsTab = ({ lessons }) => {
  const [viewStats, setViewStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatsLoading(true);
    fetchLessonViews()
      .then((m) => { if (!cancelled) setViewStats(m || {}); })
      .catch(() => { if (!cancelled) setViewStats({}); })
      .finally(() => { if (!cancelled) setStatsLoading(false); });
    return () => { cancelled = true; };
  }, []);

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
    </>
  );
};

export default AdminStatsTab;
