// حالة المزامنة الموحّدة — مصدر واحد للحقيقة يُغذّي علامة واحدة فقط في كل التطبيق.
// بدل عدة مؤشرات متفرقة (المحتوى، المكتبة، العلامة، التفضيلات) نجمع الكلّ هنا.
// نتيجة: 'syncing' | 'error' | 'offline' | 'partial' | 'synced' | 'local'
import type { StopMarksSyncState } from '../hooks/useStopMarks';
import type { LibrarySyncState } from '../hooks/useUserLibrary';

export type UnifiedSyncState = 'syncing' | 'error' | 'offline' | 'partial' | 'synced' | 'local';

export interface UnifiedSyncInput {
  isOffline: boolean;
  /** هل Firebase مهيأ في هذا البناء؟ */
  isFirebaseConfigured: boolean;
  user: unknown;
  /** حالة المحتوى من useAppData (cloudStatus) */
  cloudStatus: string;
  contentSyncDone: boolean;
  librarySyncState: LibrarySyncState;
  stopMarksSyncState: StopMarksSyncState;
}

/** هل هذه الحالة \"قيد التنفيذ\"؟ */
export const isBusySync = (state: UnifiedSyncState): boolean => state === 'syncing';

/** هل تحتاج هذه الحالة تدخلًا من المستخدم (عرض علامة حمراء)? */
export const isFailedSync = (state: UnifiedSyncState): boolean => state === 'error';

// أقصى مدة تُقبل فيها حالة "جارٍ المزامنة" قبل اعتبارها معلّقة.
// أي مسار لا يُنهي حالته (خطأ منطقي أو رد لا يصل أبدًا) كان يُبقي العلامة تدور بلا نهاية
// ويربك المستخدم. بعد هذه المدة ننتقل إلى 'partial': لا نزعم نجاحًا، ولا نُبقي دورانًا كاذبًا.
export const SYNC_STALL_TIMEOUT_MS = 15_000;

export function computeUnifiedSyncState(input: UnifiedSyncInput): UnifiedSyncState {
  if (!input.isFirebaseConfigured) return 'local';
  if (input.isOffline) return 'offline';

  // خطأ مؤكّد في المحتوى بعد استنفاد المحاولات
  if (input.contentSyncDone && input.cloudStatus === 'offline') return 'error';
  // فشل مزامنة المكتبة أو العلامة — قابل لإعادة المحاولة بضغطة
  if (input.librarySyncState === 'error' || input.stopMarksSyncState === 'error') return 'error';

  if (!input.contentSyncDone) return 'syncing';

  // ضيف: المحتوى فقط هو ما يُزامن (لا مكتبة حساب ولا علامات سحابية)
  if (!input.user) return 'synced';

  // 'loading'/'syncing' = طلب جارٍ الآن. 'pending' = تغيير محفوظ محليًا ينتظر الرفع
  // (يُنقل إلى 'syncing' خلال أجزاء من الثانية عند بدء الطلب) — لذا يُعد عملًا جاريًا.
  const libraryBusy =
    input.librarySyncState === 'loading' ||
    input.librarySyncState === 'syncing' ||
    input.librarySyncState === 'pending';
  const marksBusy =
    input.stopMarksSyncState === 'loading' || input.stopMarksSyncState === 'pending';

  if (libraryBusy || marksBusy) return 'syncing';

  if (input.librarySyncState === 'synced' && input.stopMarksSyncState === 'synced') return 'synced';

  // جزء مؤكَّد وجزء محفوظ محليًا فقط (offline/local) — لا نزعم نجاحًا كاملًا
  return 'partial';
}
