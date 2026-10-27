import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { FiUpload, FiDownload } from 'react-icons/fi';
import { filterValidBulkLessons } from '../../../utils/validateLesson';
import { bulkCreateLessons } from '../../../firebase/services';
import { inputStyle } from '../AdminStyles';
import type { Lesson } from '../../../types';

type BulkLessonInput = Omit<Lesson, 'id' | '_docId'>;

interface BulkImportSectionProps {
  bulkOpen: boolean;
  setBulkOpen: (updater: (prev: boolean) => boolean) => void;
  cloudBackupReady: boolean;
  lessonsLength: number;
  onDownloadBackup: () => void;
  onDataChanged: () => Promise<boolean>;
  flash: (type: 'success' | 'error', text: string) => void;
}

export const BulkImportSection = ({
  bulkOpen,
  setBulkOpen,
  cloudBackupReady,
  lessonsLength,
  onDownloadBackup,
  onDataChanged,
  flash,
}: BulkImportSectionProps) => {
  const [busy, setBusy] = useState(false);
  const [bulkItems, setBulkItems] = useState<BulkLessonInput[]>([]);
  const [bulkFileName, setBulkFileName] = useState('');
  const [bulkError, setBulkError] = useState('');

  const handleBulkFile = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkError('');
    setBulkItems([]);
    setBulkFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed: unknown = JSON.parse(reader.result as string);
        if (!Array.isArray(parsed)) throw new Error('الملف يجب أن يحتوي على مصفوفة مسائل');
        const { valid, rejected, reasons } = filterValidBulkLessons(parsed as Array<Partial<Lesson>>);
        if (valid.length === 0) {
          setBulkError('لا توجد مسائل صالحة في الملف (تأكد أن كل عنصر له title و bookName ونص).');
          return;
        }
        if (rejected > 0) {
          setBulkError(`تم قبول ${valid.length} وتجاهل ${rejected} عناصر فاسدة. ${reasons.join(' • ')}`);
        }
        setBulkItems(valid);
      } catch (err) {
        setBulkError(`تعذّر قراءة الملف: ${(err as Error).message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleBulkImport = async (): Promise<void> => {
    if (bulkItems.length === 0 || busy) return;
    if (!window.confirm(`هل أنت متأكد من رفع ${bulkItems.length} مسألة دفعة واحدة إلى السحابة؟`)) return;
    setBusy(true);
    try {
      const count = await bulkCreateLessons(bulkItems);
      flash('success', `تم رفع ${count} مسألة بنجاح إلى السحابة.`);
      setBulkItems([]);
      setBulkFileName('');
      setBulkOpen(() => false);
      const el = document.getElementById('bulkFileInput') as HTMLInputElement | null;
      if (el) el.value = '';
      await onDataChanged();
    } catch (err) {
      flash('error', `فشل الاستيراد: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="d-flex gap-2 mb-3 flex-wrap">
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary d-flex align-items-center justify-content-center gap-2 flex-grow-1"
          style={{ borderRadius: '10px' }}
          onClick={onDownloadBackup}
          disabled={!cloudBackupReady}
          title={cloudBackupReady ? 'تنزيل لقطة من محتوى السحابة قبل التعديل' : 'حمّل المحتوى من السحابة واتصل بالإنترنت لضمان أن النسخة حديثة'}
        >
          <FiDownload size={16} /> تنزيل نسخة المحتوى ({lessonsLength})
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary d-flex align-items-center justify-content-center gap-2 flex-grow-1"
          style={{ borderRadius: '10px' }}
          onClick={() => setBulkOpen((p) => !p)}
        >
          <FiUpload size={16} /> استيراد مسائل بالجملة (JSON) {bulkOpen ? '— إخفاء' : ''}
        </button>
      </div>

      {!cloudBackupReady && (
        <small className="text-muted d-block mb-3">
          تعطّل تنزيل النسخة حتى يكتمل تحميل المحتوى من السحابة والاتصال بالإنترنت؛ لتجنب حفظ لقطة محلية قديمة بالخطأ.
        </small>
      )}

      {bulkOpen && (
        <div className="custom-card p-3 mb-4">
          <p className="text-muted small mb-2" style={{ lineHeight: '1.7' }}>
            ارفع ملف <code>JSON</code> يحتوي على مصفوفة مسائل بنفس حقول "إضافة مسألة" ({'title, bookName, chapterName, mainText, sheikhExplanation...'}). تُرقّم المعرفات تلقائيًا.
          </p>
          <input
            type="file"
            accept=".json,application/json"
            className="form-control mb-2"
            style={{ ...inputStyle, maxWidth: '320px' }}
            onChange={handleBulkFile}
            id="bulkFileInput"
          />
          {bulkError && <div className="text-danger small mb-2">{bulkError}</div>}
          {bulkItems.length > 0 && (
            <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
              <span className="text-muted small">
                تم قراءة <strong>{bulkItems.length}</strong> مسألة من <code dir="ltr">{bulkFileName}</code>
              </span>
              <button
                type="button"
                className="btn btn-sm d-flex align-items-center gap-2"
                disabled={busy}
                onClick={handleBulkImport}
                style={{ backgroundColor: 'var(--primary-color)', color: 'var(--text-on-primary)', borderRadius: '8px' }}
              >
                <FiUpload size={14} />
                {busy ? <span className="spinner-border spinner-border-sm" /> : `رفع ${bulkItems.length} مسألة`}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
};
