import { describe, it, expect } from 'vitest';
import { computeUnifiedSyncState } from './syncStatus';
import type { UnifiedSyncInput } from './syncStatus';

const base = (over: Partial<UnifiedSyncInput> = {}): UnifiedSyncInput => ({
  isOffline: false,
  isFirebaseConfigured: true,
  user: null,
  cloudStatus: 'synced',
  contentSyncDone: true,
  librarySyncState: 'local',
  stopMarksSyncState: 'local',
  ...over,
});

const signedIn = { uid: 'u1' };

describe('computeUnifiedSyncState', () => {
  it('تزامن كامل لضيف بعد اكتمال المحتوى', () => {
    expect(computeUnifiedSyncState(base())).toBe('synced');
  });

  it('غير متصل يتقدم على أي نجاح', () => {
    expect(computeUnifiedSyncState(base({ isOffline: true }))).toBe('offline');
  });

  it('بلا Firebase = محلي', () => {
    expect(computeUnifiedSyncState(base({ isFirebaseConfigured: false }))).toBe('local');
  });

  it('فشل المحتوى المؤكد = خطأ', () => {
    expect(computeUnifiedSyncState(base({ cloudStatus: 'offline' }))).toBe('error');
  });

  it('المحتوى الذي لم يكتمل = مزامنة جارية', () => {
    expect(computeUnifiedSyncState(base({ contentSyncDone: false }))).toBe('syncing');
  });

  it('الحساب المسجّل لا يُعلن نجاحًا قبل اكتمال مكتبته وعلامته', () => {
    expect(computeUnifiedSyncState(base({ user: signedIn, librarySyncState: 'syncing', stopMarksSyncState: 'synced' }))).toBe('syncing');
    expect(computeUnifiedSyncState(base({ user: signedIn, librarySyncState: 'synced', stopMarksSyncState: 'pending' }))).toBe('syncing');
    expect(computeUnifiedSyncState(base({ user: signedIn, librarySyncState: 'loading', stopMarksSyncState: 'synced' }))).toBe('syncing');
  });

  it('تزامن الحساب المسجّل ينجح فقط عند synced للطرفين', () => {
    expect(computeUnifiedSyncState(base({ user: signedIn, librarySyncState: 'synced', stopMarksSyncState: 'synced' }))).toBe('synced');
    // مكتبة محفوظة محليًا فقط = نجاح جزئي، لا علامة صح خضراء
    expect(computeUnifiedSyncState(base({ user: signedIn, librarySyncState: 'local', stopMarksSyncState: 'synced' }))).toBe('partial');
    expect(computeUnifiedSyncState(base({ user: signedIn, librarySyncState: 'offline', stopMarksSyncState: 'synced' }))).toBe('partial');
  });

  it('فشل المكتبة أو العلامة = خطأ واحد قابل لإعادة المحاولة', () => {
    expect(computeUnifiedSyncState(base({ user: signedIn, librarySyncState: 'error', stopMarksSyncState: 'synced' }))).toBe('error');
    expect(computeUnifiedSyncState(base({ user: signedIn, librarySyncState: 'synced', stopMarksSyncState: 'error' }))).toBe('error');
  });

  it('فحص صلاحية المشرف لا يحجب إعلان اكتمال المزامنة (ليس مسار مزامنة)', () => {
    // ربط المؤشر بفحص المشرف كان يترك العلامة تدور بلا نهاية لو تأخر تقييم الصلاحية
    expect(computeUnifiedSyncState(base({ user: signedIn, librarySyncState: 'synced', stopMarksSyncState: 'synced' }))).toBe('synced');
  });
});
