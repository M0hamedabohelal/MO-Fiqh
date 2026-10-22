// حالة المزامنة الموحّدة — مصدر واحد للحقيقة يُغذّي علامة واحدة فقط في كل التطبيق.
// بدل عدة مؤشرات متفرقة (المحتوى، المكتبة، العلامة، التفضيلات، صلاحية المشرف)
// نجمع الكلّ هنا ونشتق منه: 'syncing' | 'error' | 'offline' | 'partial' | 'synced' | 'local'
import type { StopMarksSyncState } from '../hooks/useStopMarks';
import type { LibrarySyncState } from '../hooks/useUserLibrary';

export type UnifiedSyncState = 'syncing' | 'error' | 'offline' | 'partial' | 'synced' | 'local';

export interface UnifiedSyncInput {
  isOffline: boolean;
  /** هل Firebase مهيأ في هذا البناء؟ */
  isFirebaseConfigured: boolean;
  user: unknown;
  /** جهاز التحقق من صلاحية المشرف — 'skipped' يعني لا حساب مسجّل */
  adminCheck: 'pending' | 'done' | 'skipped';
  /** حالة المحتوى من useAppData (cloudStatus) */
  cloudStatus: string;
  contentSyncDone: boolean;
  /** هل المستخدم الحالي مشرف؟ — يحدد إن كان فحص المشرف شرطًا لتمام المزامنة */
  isAdminUser: boolean;
  librarySyncState: LibrarySyncState;
  stopMarksSyncState: StopMarksSyncState;
}

/** هل هذه الحالة \"قيد التنفيذ\"؟ */
export const isBusySync = (state: UnifiedSyncState): boolean => state === 'syncing';

/** هل تحتاج هذه الحالة تدخلًا من المستخدم (عرض علامة حمراء)? */
export const isFailedSync = (state: UnifiedSyncState): boolean => state === 'error';

export function computeUnifiedSyncState(input: UnifiedSyncInput): UnifiedSyncState {
  if (!input.isFirebaseConfigured) return 'local';
  if (input.isOffline) return 'offline';

  // خطأ مؤكّد في أي مسار: المحتوى فشل فعلًا بعد استنفاد المحاولات
  if (input.contentSyncDone && input.cloudStatus === 'offline') return 'error';

  const contentDone = input.contentSyncDone;
  const adminPending = input.adminCheck === 'pending';
  const adminOk = !adminPending && (!input.isAdminUser || input.adminCheck === 'done');

  // فحص المشرف لم يكتمل بعد (لا تُعلن النجاح قبل التأكد أن اللوحة جاهزة/غير مطلوبة)
  if (adminPending) return 'syncing';

  if (!input.user) {
    // ضيف: المحتوى فقط هو ما يُزامن
    if (!contentDone) return 'syncing';
    return adminOk ? 'synced' : 'syncing';
  }

  // مسجّل: المحتوى + المكتبة + علامة الوقوف
  const libraryBusy = input.librarySyncState === 'loading' || input.librarySyncState === 'syncing' || input.librarySyncState === 'pending';
  const marksBusy = input.stopMarksSyncState === 'loading' || input.stopMarksSyncState === 'pending';
  const libraryOk = input.librarySyncState === 'synced';
  const marksOk = input.stopMarksSyncState === 'synced';

  if (input.librarySyncState === 'error' || input.stopMarksSyncState === 'error') return 'error';

  if (!contentDone || libraryBusy || marksBusy) return 'syncing';

  if (libraryOk && marksOk && adminOk) return 'synced';
  // جزء تم وجزء لم يُؤكَّد (محلي فقط بلا رفع) — لا نزعم نجاحًا كاملًا
  return 'partial';
}
