import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiCheck, FiAward, FiRefreshCw, FiBookOpen, FiHelpCircle } from 'react-icons/fi';
import { generateQuiz, readQuizBest, saveQuizBest } from '../../utils/quizUtil';
import type { Lesson } from '../../types';

export interface QuizTarget {
  bookName: string;
  chapterName: string;
  lessons: Lesson[];
}

interface QuizModalProps {
  target: QuizTarget | null;
  onClose: () => void;
  onSelectLesson: (lessonId: string | number) => void;
}

// نافذة الاختبار الذاتي — تُبنى الأسئلة لحظة الفتح وتُنسى عند الإغلاق (لا حالة معلقة)
const QuizModal = ({ target, onClose, onSelectLesson }: QuizModalProps) => {
  const [runId, setRunId] = useState(0);
  const questions = useMemo(
    () => (target ? generateQuiz(target.lessons, 8) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [target, runId],
  );
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [best, setBest] = useState(() => (target ? readQuizBest(target.bookName, target.chapterName) : 0));

  if (!target) return null;
  const total = questions.length;
  const current = questions[index];

  const choose = (i: number): void => {
    if (picked !== null || !current) return;
    setPicked(i);
    if (i === current.answerIndex) setScore((s) => s + 1);
  };

  const next = (): void => {
    if (index + 1 >= total) {
      const finalScore = score;
      setBest(saveQuizBest(target.bookName, target.chapterName, finalScore));
      setFinished(true);
    } else {
      setIndex((v) => v + 1);
      setPicked(null);
    }
  };

  const retry = (): void => {
    setRunId((v) => v + 1);
    setIndex(0);
    setPicked(null);
    setScore(0);
    setFinished(false);
  };

  const review = (): void => {
    if (!current) return;
    onSelectLesson(current.lessonId);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        key={`quiz-${runId}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="position-fixed top-0 start-0 end-0 bottom-0 d-flex align-items-center justify-content-center"
        style={{ zIndex: 1050, background: 'rgba(0,0,0,0.6)', padding: '16px' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 16 }}
          className="w-100 custom-card p-4 shadow"
          style={{ maxWidth: '560px', maxHeight: '90dvh', overflowY: 'auto', borderRadius: '18px' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0 fw-bold d-flex align-items-center gap-2" style={{ color: 'var(--primary-color)' }}>
              <FiHelpCircle /> اختبر نفسك
            </h5>
            <button className="btn btn-sm p-1" onClick={onClose} aria-label="إغلاق الاختبار">
              <FiX size={20} />
            </button>
          </div>
          <p className="text-muted small mb-4">{target.bookName} — {target.chapterName}</p>

          {total === 0 ? (
            <p className="text-muted text-center py-4">محتوى هذا الباب لا يكفي لتوليد أسئلة بعد.</p>
          ) : !finished && current ? (
            <>
              <div className="d-flex justify-content-between align-items-center mb-2 small text-muted">
                <span>السؤال {index + 1} من {total}</span>
                <span>النقاط: {score}</span>
              </div>
              <div className="progress mb-3" style={{ height: '6px', borderRadius: '6px', background: 'var(--border-color)' }}>
                <div className="progress-bar" style={{ width: `${((index) / total) * 100}%`, background: 'var(--accent-color)', borderRadius: '6px' }} />
              </div>

              <p className="fw-bold mb-1" style={{ color: 'var(--text-main)', lineHeight: 1.9 }}>{current.prompt}</p>
              {current.kind === 'tf' && (
                <p className="p-3 mb-3" style={{ background: 'var(--badge-bg)', borderRadius: '12px', lineHeight: 2 }}>
                  «{current.source}»
                </p>
              )}
              {current.kind === 'mcq' && <div className="mb-1" />}

              <div className="d-flex flex-column gap-2">
                {current.options.map((opt, i) => {
                  const locked = picked !== null;
                  const isAnswer = i === current.answerIndex;
                  const isPicked = i === picked;
                  return (
                    <button
                      key={i}
                      disabled={locked}
                      onClick={() => choose(i)}
                      className="btn text-end p-3"
                      style={{
                        borderRadius: '12px',
                        border: `1.5px solid ${locked && isAnswer ? '#27ae60' : locked && isPicked ? '#e74c3c' : 'var(--border-color)'}`,
                        backgroundColor: locked && isAnswer ? 'rgba(39,174,96,0.12)' : locked && isPicked ? 'rgba(231,76,60,0.1)' : 'var(--card-bg)',
                        color: 'var(--text-main)',
                        lineHeight: 1.9,
                        cursor: locked ? 'default' : 'pointer',
                      }}
                    >
                      <span className="d-flex align-items-start gap-2">
                        {locked && isAnswer && <FiCheck className="flex-shrink-0 mt-1" color="#27ae60" size={18} />}
                        {locked && isPicked && !isAnswer && <FiX className="flex-shrink-0 mt-1" color="#e74c3c" size={18} />}
                        <span>{opt}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {picked !== null && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3">
                  <div className="small text-muted mb-1">من مسألة: {current.lessonTitle}</div>
                  <div className="d-flex gap-2">
                    <button className="btn btn-primary flex-fill" onClick={next}>
                      {index + 1 >= total ? 'عرض النتيجة' : 'السؤال التالي'}
                    </button>
                    <button
                      className="btn d-flex align-items-center gap-1"
                      style={{ background: 'var(--badge-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                      onClick={review}
                      title="فتح المسألة المصدر"
                    >
                      <FiBookOpen size={16} /> راجع المسألة
                    </button>
                  </div>
                </motion.div>
              )}
            </>
          ) : (
            <div className="text-center py-3">
              <FiAward size={52} style={{ color: 'var(--accent-color)' }} className="mb-3" />
              <h4 className="fw-bold mb-2" style={{ color: 'var(--text-main)' }}>
                نتيجتك: {score} من {total}
              </h4>
              <p className="text-muted mb-1">
                {score === total ? 'ممتاز! إتقان كامل لهذا الباب 🎉' : score >= Math.ceil(total / 2) ? 'جيد جدًا — راجع ما فاتك وثبّته' : 'لا بأس — أعد قراءة الباب وحاول مجددًا'}
              </p>
              {best > 0 && <p className="small mb-4" style={{ color: 'var(--accent-color)' }}>أفضل نتيجة لك في هذا الباب: {best} من {total}</p>}
              <div className="d-flex gap-2 justify-content-center">
                <button className="btn btn-primary d-flex align-items-center gap-2" onClick={retry}>
                  <FiRefreshCw size={16} /> اختبار جديد
                </button>
                <button
                  className="btn d-flex align-items-center gap-2"
                  style={{ background: 'var(--badge-bg)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                  onClick={onClose}
                >
                  إنهاء
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default QuizModal;
