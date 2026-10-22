import { describe, it, expect } from 'vitest';
import { computeUnifiedSyncState } from './syncStatus';
import type { UnifiedSyncInput } from './syncStatus';

const base = (over: Partial<UnifiedSyncInput> = {}): UnifiedSyncInput => ({
  isOffline: false,
  isFirebaseConfigured: true,
  user: null,
  adminCheck: 'skipped',
  cloudStatus: 'synced',
  contentSyncDone: true,
  isAdminUser: false,
  librarySyncState: 'local',
  stopMarksSyncState: 'local',
  ...over,
});

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

  it('فحص المشرف المعلّق يعني مزامنة جارية', () => {
    expect(computeUnifiedSyncState(base({ adminCheck: 'pending' }))).toBe('syncing');
  });

  it('الحساب المسجّل لا يُعلن نجاحًا قبل اكتمال مكتبته وعلامته', () => {
    const user = { uid: 'u1' };
    expect(computeUnifiedSyncState(base({ user, adminCheck: 'done', librarySyncState: 'syncing', stopMarksSyncState: 'synced' }))).toBe('syncing');
    expect(computeUnifiedSyncState(base({ user, adminCheck: 'done', librarySyncState: 'synced', stopMarksSyncState: 'pending' }))).toBe('syncing');
  });

  it('تزامن الحساب المسجّل ينجح فقط عند synced للطرفين وفحص مشرف مكتمل', () => {
    const user = { uid: 'u1' };
    expect(computeUnifiedSyncState(base({ user, adminCheck: 'done', librarySyncState: 'synced', stopMarksSyncState: 'synced' }))).toBe('synced');
    // مكتبة محفوظة محليًا فقط = نجاح جزئي، لا علامة صح خضراء
    expect(computeUnifiedSyncState(base({ user, adminCheck: 'done', librarySyncState: 'local', stopMarksSyncState: 'synced' }))).toBe('partial');
  });

  it('فشل المكتبة أو العلامة = خطأ واحد قابل لإعادة المحاولة', () => {
    const user = { uid: 'u1' };
    expect(computeUnifiedSyncState(base({ user, adminCheck: 'done', librarySyncState: 'error', stopMarksSyncState: 'synced' }))).toBe('error');
    expect(computeUnifiedSyncState(base({ user, adminCheck: 'done', librarySyncState: 'synced', stopMarksSyncState: 'error' }))).toBe('error');
  });

  it('المشرف لا يُعلن نجاحًا قبل تأكيد صلاحيته', () => {
    expect(computeUnifiedSyncState(base({ user: { uid: 'a1' }, isAdminUser: true, adminCheck: 'pending', librarySyncState: 'synced', stopMarksSyncState: 'synced' }))).toBe('syncing');
    expect(computeUnifiedSyncState(base({ user: { uid: 'a1' }, isAdminUser: true, adminCheck: 'done', librarySyncState: 'synced', stopMarksSyncState: 'synced' }))).toBe('synced');
  });
});
