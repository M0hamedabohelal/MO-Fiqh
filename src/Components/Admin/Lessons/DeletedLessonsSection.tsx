// DeletedLessonsSection.tsx — سلة المحذوفات واستعادة المسائل المحذوفة
import { FiRotateCcw } from 'react-icons/fi';
import type { DeletedLessonItem } from '../../../firebase/services';

interface DeletedLessonsSectionProps {
  showDeleted: boolean;
  deletedLessons: DeletedLessonItem[] | null;
  busy: boolean;
  cloudBackupReady: boolean;
  onRestore: (item: DeletedLessonItem) => Promise<void>;
}

export const DeletedLessonsSection = ({
  showDeleted,
  deletedLessons,
  busy,
  cloudBackupReady,
  onRestore,
}: DeletedLessonsSectionProps) => {
  if (!showDeleted) return null;

  return (
    <div className="custom-card p-3 mt-2">
      <h6 className="fw-bold mb-2">المسائل المحذوفة مؤخرًا</h6>
      {deletedLessons === null ? (
        <div className="text-muted small">جارٍ تحميل القائمة...</div>
      ) : deletedLessons.length === 0 ? (
        <div className="text-muted small">لا توجد مسائل محذوفة قابلة للاستعادة.</div>
      ) : (
        <div className="d-flex flex-column gap-2">
          {deletedLessons.map((item) => (
            <div
              key={item.docId}
              className="d-flex align-items-center justify-content-between flex-wrap gap-2 p-2 rounded"
              style={{ backgroundColor: 'var(--badge-bg)' }}
            >
              <span className="small">
                ID {item.lesson.id} — {item.lesson.title}
                <small className="d-block text-muted">{new Date(item.deletedAt).toLocaleString('ar-EG')}</small>
              </span>
              <button
                type="button"
                className="btn btn-sm btn-outline-success d-flex align-items-center gap-1"
                disabled={busy || !cloudBackupReady}
                onClick={() => void onRestore(item)}
              >
                <FiRotateCcw size={14} /> استعادة
              </button>
            </div>
          ))}
        </div>
      )}
      {!cloudBackupReady && <small className="text-muted d-block mt-2">الاستعادة تحتاج اتصالًا بالسحابة.</small>}
    </div>
  );
};
