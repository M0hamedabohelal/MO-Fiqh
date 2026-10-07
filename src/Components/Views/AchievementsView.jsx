import { useMemo, useState } from 'react';
import { FiBook, FiZap, FiAward, FiStar, FiEdit3, FiFileText, FiLock, FiTrendingUp, FiDownload } from 'react-icons/fi';
import CertificateModal from '../UI/CertificateModal';

const VISIT_DAYS_KEY = 'fiqh_visit_days';

// تاريخ اليوم بالتوقيت المحلي YYYY-MM-DD
function localDay(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

// عدد الأيام المتتالية حتى اليوم
function getStreak() {
  try {
    const set = new Set(JSON.parse(localStorage.getItem(VISIT_DAYS_KEY) || '[]'));
    let streak = 0;
    for (let back = 0; back < 365; back += 1) {
      if (set.has(localDay(-back))) {
        streak += 1;
      } else {
        break;
      }
    }
    return streak;
  } catch {
    return 0;
  }
}

// شاشة الإنجازات: سلسلة الأيام + شارات التقدم + حلقة الإتمام + الشهادات
const AchievementsView = ({ readLessons, highlights, notes, booksWithStats, lessonsCount, userName }) => {
  const streak = useMemo(() => getStreak(), []);
  const notesCount = useMemo(() => Object.keys(notes || {}).length, [notes]);
  const readCount = (readLessons || []).length;
  const totalLessons = useMemo(
    () => lessonsCount || (booksWithStats || []).reduce((s, b) => s + (b.issuesCount || 0), 0),
    [lessonsCount, booksWithStats],
  );
  const overall = totalLessons > 0 ? Math.round((readCount / totalLessons) * 100) : 0;

  const badges = [
    { icon: FiBook, title: 'أول الغيث', desc: 'اقرأ أول مسألة', earned: readCount >= 1 },
    { icon: FiZap, title: 'المثابر', desc: '3 أيام متتالية', earned: streak >= 3 },
    { icon: FiAward, title: 'الأسبوع الذهبي', desc: '7 أيام متتالية', earned: streak >= 7 },
    // شارة ختمة مستقلة لكل كتاب — التقدم بعدد الكتب المُتممة
    ...(booksWithStats || []).map((b) => ({
      icon: FiStar,
      title: `ختمة ${b.bookName}`,
      desc: b.issuesCount > 0 ? `${b.readCount} من ${b.issuesCount} مسائل` : 'لا مسائل بعد',
      earned: b.issuesCount > 0 && b.readCount >= b.issuesCount,
    })),
    { icon: FiEdit3, title: 'المقتبس', desc: 'احفظ 10 فوائد', earned: (highlights || []).length >= 10 },
    { icon: FiFileText, title: 'المدون', desc: 'اكتب 5 ملاحظات', earned: notesCount >= 5 },
  ];
  const earnedCount = badges.filter((b) => b.earned).length;

  // حلقة الإتمام (SVG)
  const R = 52;
  const C = 2 * Math.PI * R;

  // الكتب المُتممة + نافذة الشهادة
  const doneBooks = useMemo(
    () => (booksWithStats || []).filter((b) => b.issuesCount > 0 && b.readCount >= b.issuesCount),
    [booksWithStats],
  );
  const [certBook, setCertBook] = useState(null);
  const dateLabel = useMemo(() => {
    try {
      return new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return '';
    }
  }, []);

  return (
    <div className="mt-4 mb-5">
      <h3 className="mb-4 fw-bold" style={{ color: 'var(--primary-color)' }}>
        <FiAward className="ms-2" /> إنجازاتي
      </h3>

      {/* حلقة الإتمام العامة */}
      <div className="custom-card p-4 mb-4 d-flex align-items-center gap-4 shadow-sm">
        <div style={{ position: 'relative', width: '120px', height: '120px', flexShrink: 0 }}>
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r={R} fill="none" stroke="var(--badge-bg)" strokeWidth="12" />
            <circle
              cx="60"
              cy="60"
              r={R}
              fill="none"
              stroke="var(--accent-color)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C - (C * overall) / 100}
              transform="rotate(-90 60 60)"
              style={{ transition: 'stroke-dashoffset 1s ease' }}
            />
          </svg>
          <div
            className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center fw-bold"
            style={{ fontSize: '1.3rem', color: 'var(--primary-color)' }}
          >
            {overall}%
          </div>
        </div>
        <div>
          <h5 className="fw-bold mb-2" style={{ color: 'var(--text-main)' }}>رحلتك الفقهية</h5>
          <p className="text-muted mb-0" style={{ lineHeight: '1.9' }}>
            قرأت {readCount} من {totalLessons} مسائل
            {streak > 0 && (
              <> — وسلسلتك الحالية <strong style={{ color: 'var(--primary-color)' }}>{streak} {streak === 1 ? 'يوم' : 'أيام'}</strong></>
            )}
          </p>
        </div>
      </div>

      {/* إحصاءات سريعة */}
      <div className="row g-3 mb-4">
        {[
          { icon: FiBook, label: 'مسائل مقروءة', value: readCount },
          { icon: FiTrendingUp, label: 'أيام متتالية', value: streak },
          { icon: FiEdit3, label: 'فوائد محفوظة', value: (highlights || []).length },
          { icon: FiFileText, label: 'ملاحظات', value: notesCount },
        ].map(({ icon: Icon, label, value }) => (
          <div className="col-6 col-md-3" key={label}>
            <div className="custom-card p-3 text-center shadow-sm h-100">
              <Icon size={22} className="mb-2" style={{ color: 'var(--accent-color)' }} />
              <div className="fw-bold" style={{ fontSize: '1.4rem', color: 'var(--text-main)' }}>{value}</div>
              <small className="text-muted">{label}</small>
            </div>
          </div>
        ))}
      </div>

      {/* الشهادات */}
      {doneBooks.length > 0 && (
        <>
          <h5 className="fw-bold mb-3" style={{ color: 'var(--primary-color)' }}>
            <FiAward className="ms-1" /> شهادات الإتمام
          </h5>
          <div className="row g-3 mb-4">
            {doneBooks.map((b) => (
              <div className="col-12 col-md-6" key={b.bookName}>
                <div className="custom-card p-3 d-flex align-items-center justify-content-between gap-2 shadow-sm">
                  <div>
                    <div className="fw-bold" style={{ color: 'var(--text-main)' }}>{b.bookName}</div>
                    <small className="text-muted">{b.issuesCount} مسائل مُتممة</small>
                  </div>
                  <button
                    className="btn btn-sm d-flex align-items-center gap-2 flex-shrink-0"
                    onClick={() => setCertBook(b)}
                    style={{ backgroundColor: 'var(--accent-color)', color: 'var(--text-on-accent)', fontWeight: 'bold', borderRadius: '10px' }}
                  >
                    <FiDownload size={15} /> الشهادة
                  </button>
                </div>
              </div>
            ))}
          </div>
          <CertificateModal
            show={!!certBook}
            bookName={certBook?.bookName || ''}
            userName={userName}
            lessonsCount={certBook?.issuesCount || 0}
            dateLabel={dateLabel}
            onClose={() => setCertBook(null)}
          />
        </>
      )}

      {/* الشارات */}
      <h5 className="fw-bold mb-3" style={{ color: 'var(--primary-color)' }}>
        الشارات ({earnedCount} من {badges.length})
      </h5>
      <div className="row g-3">
        {badges.map(({ icon: Icon, title, desc, earned }) => (
          <div className="col-6 col-md-4" key={title}>
            <div
              className="custom-card p-3 text-center shadow-sm h-100"
              style={{ opacity: earned ? 1 : 0.55 }}
            >
              <div
                className="mx-auto mb-2 d-flex align-items-center justify-content-center"
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: earned
                    ? 'linear-gradient(135deg, #c9a84c, #e6c875)'
                    : 'var(--badge-bg)',
                  border: '1px solid var(--badge-border)',
                }}
              >
                {earned
                  ? <Icon size={24} style={{ color: '#1a1a1a' }} />
                  : <FiLock size={20} className="text-muted" />}
              </div>
              <div className="fw-bold" style={{ color: 'var(--text-main)' }}>{title}</div>
              <small className="text-muted">{desc}</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AchievementsView;
