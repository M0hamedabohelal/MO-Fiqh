// ReviewMode.tsx — شاشة وضع المراجعة والاختبار السريع (Flashcards)
// تتيح للمستخدم مراجعة المسائل المقروءة والفوائد بقلب البطاقة وتقييم الاستذكار.
import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheck, FiRefreshCw, FiBookOpen, FiArrowRight, FiAward, FiEye } from 'react-icons/fi';
import { useApp } from '../Layout/AppContext';
import { useReviewMode } from '../../hooks/useReviewMode';
import EmptyState from '../UI/EmptyState';

interface ReviewModeProps {
  onClose?: () => void;
}

const ReviewMode = ({ onClose }: ReviewModeProps) => {
  const { lessons, readLessons, highlights } = useApp();
  const {
    totalCount,
    currentIndex,
    currentItem,
    isFlipped,
    flip,
    markCard,
    reset,
    isCompleted,
    masteredCount,
    reviewAgainCount,
  } = useReviewMode(lessons, readLessons, highlights);

  const progressPercent = useMemo(() => {
    if (totalCount === 0) return 0;
    return Math.round(((currentIndex + (isCompleted ? 1 : 0)) / totalCount) * 100);
  }, [currentIndex, isCompleted, totalCount]);

  if (totalCount === 0) {
    return (
      <div className="mt-4 mb-5">
        <div className="d-flex align-items-center gap-2 mb-4">
          {onClose && (
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onClose}>
              <FiArrowRight className="ms-1" /> رجوع
            </button>
          )}
          <h3 className="mb-0 fw-bold" style={{ color: 'var(--primary-color)' }}>
            وضع المراجعة والاستذكار
          </h3>
        </div>
        <EmptyState
          icon={FiBookOpen}
          title="لا توجد مسائل أو فوائد للمراجعة بعد"
          message="عندما تقرأ مسائل في كتب الفقه أو تحفظ فوائد ومقتطفات، ستظهر لك هنا تلقائيًا لتختبر حفظك واستذكارك للأحكام والتعليقات."
        />
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="mt-4 mb-5 text-center">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="custom-card p-5 mx-auto shadow-sm"
          style={{ maxWidth: '540px' }}
        >
          <div className="mb-3" style={{ color: 'var(--accent-color)' }}>
            <FiAward size={56} />
          </div>
          <h3 className="fw-bold mb-3" style={{ color: 'var(--primary-color)' }}>
            أحسنت! أتممت جلسة المراجعة 🎉
          </h3>
          <p className="text-muted mb-4" style={{ lineHeight: '1.8' }}>
            تم استذكار ومراجعة {totalCount} بطاقة فقهية بنجاح، وسُجّل الإنجاز في ملف مواظبتك.
          </p>

          <div className="d-flex justify-content-center gap-4 mb-4">
            <div className="p-3 rounded-3" style={{ background: 'rgba(39, 174, 96, 0.1)', border: '1px solid #27ae60' }}>
              <div className="h4 fw-bold mb-0 text-success">{masteredCount}</div>
              <small className="text-muted">مُتقنة ومستذكرة</small>
            </div>
            <div className="p-3 rounded-3" style={{ background: 'rgba(231, 76, 60, 0.1)', border: '1px solid #e74c3c' }}>
              <div className="h4 fw-bold mb-0 text-danger">{reviewAgainCount}</div>
              <small className="text-muted">تحتاج تكرارًا</small>
            </div>
          </div>

          <div className="d-flex gap-2 justify-content-center flex-wrap">
            <button
              type="button"
              className="btn btn-sm d-flex align-items-center gap-2 px-4 py-2"
              style={{ background: 'var(--primary-color)', color: 'var(--text-on-primary)', borderRadius: '10px', fontWeight: 'bold' }}
              onClick={reset}
            >
              <FiRefreshCw size={16} /> مراجعة جديدة
            </button>
            {onClose && (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary px-4 py-2"
                style={{ borderRadius: '10px' }}
                onClick={onClose}
              >
                إنهاء والعودة
              </button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mt-4 mb-5">
      {/* الترويسة وشريط التقدم */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div className="d-flex align-items-center gap-2">
          {onClose && (
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onClose} aria-label="رجوع">
              <FiArrowRight />
            </button>
          )}
          <h4 className="mb-0 fw-bold" style={{ color: 'var(--primary-color)' }}>
            <FiRefreshCw className="ms-2" /> وضع المراجعة والاختبار
          </h4>
        </div>
        <span className="badge badge-custom px-3 py-2">
          مسألة {currentIndex + 1} من {totalCount}
        </span>
      </div>

      {/* شريط التقدم */}
      <div className="progress mb-4" style={{ height: '8px', borderRadius: '4px', background: 'var(--badge-bg)' }}>
        <div
          className="progress-bar"
          role="progressbar"
          style={{
            width: `${progressPercent}%`,
            background: 'linear-gradient(90deg, var(--accent-color), var(--primary-color))',
            transition: 'width 0.3s ease',
          }}
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      {/* بطاقة المراجعة التفاعلية (Flashcard) */}
      {currentItem && (
        <div className="d-flex justify-content-center">
          <motion.div
            key={currentItem.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="custom-card p-4 p-md-5 shadow-sm text-center position-relative parchment-texture"
            style={{
              maxWidth: '650px',
              width: '100%',
              minHeight: '340px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              borderTop: isFlipped ? '4px solid var(--accent-color)' : '4px solid var(--primary-color)',
            }}
          >
            {/* عنوان المسألة أو مصدر الفائدة */}
            <div>
              <div className="text-muted small fw-bold mb-2">
                {currentItem.bookName} {currentItem.chapterName ? `• ${currentItem.chapterName}` : ''}
              </div>
              <h5 className="fw-bold mb-4" style={{ color: 'var(--primary-color)', fontFamily: 'var(--font-heading)' }}>
                {currentItem.title}
              </h5>
            </div>

            {/* محتوى الوجه أو الظهر */}
            <AnimatePresence initial={false}>
              {!isFlipped ? (
                <motion.div
                  key="front"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="my-auto py-3"
                >
                  <p
                    className="mb-4"
                    style={{
                      fontSize: '1.2rem',
                      lineHeight: '2',
                      fontFamily: 'var(--font-quote)',
                      color: 'var(--text-main)',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {currentItem.frontText}
                  </p>
                  <div className="text-muted small mb-3">💡 استذكر حكم هذه المسألة أو تعليق الشيخ قبل الكشف</div>
                  <button
                    type="button"
                    className="btn btn-sm d-inline-flex align-items-center gap-2 px-4 py-2 shadow-sm"
                    style={{
                      background: 'var(--badge-bg)',
                      color: 'var(--primary-color)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      fontWeight: 'bold',
                    }}
                    onClick={flip}
                  >
                    <FiEye size={17} /> كشف الحكم والتعليق
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="back"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="my-auto py-3"
                >
                  <div className="badge badge-custom mb-3 py-1 px-3">📖 التعليق والبيان</div>
                  <div
                    className="text-end p-3 rounded-3 mb-4"
                    style={{
                      background: 'rgba(0,0,0,0.03)',
                      borderRight: '3px solid var(--accent-color)',
                      lineHeight: '1.9',
                      fontSize: '1.05rem',
                      color: 'var(--text-main)',
                      maxHeight: '260px',
                      overflowY: 'auto',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {currentItem.backText}
                  </div>

                  {/* أزرار التقييم الذاتي */}
                  <div className="d-flex gap-2 justify-content-center flex-wrap">
                    <button
                      type="button"
                      className="btn btn-sm d-flex align-items-center gap-2 px-3 py-2 text-danger"
                      style={{
                        background: 'rgba(231, 76, 60, 0.1)',
                        border: '1px solid #e74c3c',
                        borderRadius: '10px',
                        fontWeight: 'bold',
                      }}
                      onClick={() => markCard('review')}
                    >
                      <FiRefreshCw size={15} /> أحتاج مراجعة
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm d-flex align-items-center gap-2 px-4 py-2 text-success"
                      style={{
                        background: 'rgba(39, 174, 96, 0.12)',
                        border: '1px solid #27ae60',
                        borderRadius: '10px',
                        fontWeight: 'bold',
                      }}
                      onClick={() => markCard('mastered')}
                    >
                      <FiCheck size={16} /> أتقنت واستذكرت
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-3 text-muted" style={{ fontSize: '0.78rem' }}>
              {!isFlipped ? 'انقر على الزر لكشف الشرح والتأكد من حفظك' : 'قيّم استذكارك للمتابعة'}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ReviewMode;
