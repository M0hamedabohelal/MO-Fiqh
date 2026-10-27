// LessonRowCard.tsx — بطاقة عرض المسألة وإجراءاتها (سجل التعديلات، التعديل، الحذف)
import { FiEdit2, FiTrash2, FiEye, FiClock } from 'react-icons/fi';
import type { Lesson } from '../../../types';
import type { LessonRevision } from '../../../firebase/services';

interface LessonRowCardProps {
  lesson: Lesson;
  docId: string;
  isConfirmingDelete: boolean;
  isHistoryOpen: boolean;
  historyLoading: boolean;
  historyItems: LessonRevision[];
  busy: boolean;
  cloudBackupReady: boolean;
  onOpenEdit: (lesson: Lesson) => void;
  onRequestDelete: (docId: string) => void;
  onCancelDelete: () => void;
  onConfirmDelete: (docId: string) => Promise<void>;
  onToggleHistory: (docId: string) => Promise<void>;
  onRestoreRevision: (docId: string, revision: LessonRevision) => Promise<void>;
}

export const LessonRowCard = ({
  lesson,
  docId,
  isConfirmingDelete,
  isHistoryOpen,
  historyLoading,
  historyItems,
  busy,
  cloudBackupReady,
  onOpenEdit,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
  onToggleHistory,
  onRestoreRevision,
}: LessonRowCardProps) => {
  return (
    <div className="custom-card p-3 shadow-sm">
      <div className="d-flex justify-content-between align-items-start gap-2 flex-wrap">
        <div className="flex-grow-1">
          <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
            <span className="badge badge-custom">ID {lesson.id}</span>
            <h6 className="fw-bold mb-0">{lesson.title}</h6>
            <a
              href={`#/lesson/${lesson.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-link p-0 text-muted"
              title="معاينة في صفحة القراءة"
            >
              <FiEye size={15} />
            </a>
          </div>
          {lesson.chapterName && (
            <small className="text-muted">
              {lesson.chapterName} {lesson.pageNumber ? `• ص ${lesson.pageNumber}` : ''}
            </small>
          )}
        </div>
        <div className="d-flex gap-1 flex-shrink-0">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => void onToggleHistory(docId)}
            title="سجل تعديلات هذه المسألة"
            aria-label="سجل التعديلات"
          >
            <FiClock size={15} />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={() => onOpenEdit(lesson)}
            title="تعديل المسألة"
            aria-label="تعديل المسألة"
          >
            <FiEdit2 size={15} />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={() => onRequestDelete(docId)}
            title="حذف المسألة"
            aria-label="حذف المسألة"
          >
            <FiTrash2 size={15} />
          </button>
        </div>
      </div>

      {isConfirmingDelete && (
        <div className="alert alert-danger mt-3 mb-0 p-2 d-flex align-items-center justify-content-between flex-wrap gap-2">
          <span className="small">هل أنت متأكد من حذف مسألة «{lesson.title}»؟</span>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-danger btn-sm"
              disabled={busy}
              onClick={() => void onConfirmDelete(docId)}
            >
              {busy ? 'جارٍ الحذف...' : 'نعم، احذف'}
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onCancelDelete}>
              إلغاء
            </button>
          </div>
        </div>
      )}

      {isHistoryOpen && !isConfirmingDelete && (
        <div className="custom-card p-3 mt-2" aria-live="polite">
          <h6 className="fw-bold mb-2">سجل تعديل المسألة: {lesson.title}</h6>
          {historyLoading ? (
            <div className="text-muted small">جارٍ تحميل السجل...</div>
          ) : historyItems.length === 0 ? (
            <div className="text-muted small">لا توجد نسخ سابقة لهذه المسألة.</div>
          ) : (
            <div className="d-flex flex-column gap-2">
              {historyItems.map((revision) => (
                <div
                  key={revision.id}
                  className="d-flex align-items-center justify-content-between flex-wrap gap-2 p-2 rounded"
                  style={{ backgroundColor: 'var(--badge-bg)' }}
                >
                  <span className="small">
                    {revision.lesson.title}
                    <small className="d-block text-muted">
                      {new Date(revision.savedAt).toLocaleString('ar-EG')}
                    </small>
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-success"
                    disabled={busy || !cloudBackupReady}
                    onClick={() => void onRestoreRevision(docId, revision)}
                  >
                    استعادة هذه النسخة
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
