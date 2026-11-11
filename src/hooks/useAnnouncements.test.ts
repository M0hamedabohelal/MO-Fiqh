// @vitest-environment jsdom
// سلوك مزامنة «الإشعارات المقروءة»: كان يكتب داخل المستمع نفسه، ويسجّل
// permission-denied في كل إعادة اشتراك (٣ رسائل في الكونسول).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const logError = vi.fn();
const setDoc = vi.fn(async () => {});
const getDoc = vi.fn(async () => ({ exists: () => false, data: () => ({}) }));
let snapshotCb: ((s: unknown) => void) | null = null;
let errorCb: ((e: unknown) => void) | null = null;
const unsubscribe = vi.fn();

const authUser = { current: { uid: 'u1' } as { uid: string } | null };

vi.mock('../firebase/services', () => ({ fetchAnnouncements: vi.fn(async () => []) }));
vi.mock('../firebase/config', () => ({
  isFirebaseConfigured: true,
  getFirestore: async () => ({ db: { __db: true }, fsMod: {} }),
}));
vi.mock('../Components/Auth/AuthContext', () => ({
  useAuth: () => ({ user: authUser.current }),
}));
vi.mock('../utils/logError', () => ({ logError: (...a: unknown[]) => logError(...a) }));
vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...path: string[]) => ({ path: path.join('/') }),
  getDoc: (...a: unknown[]) => getDoc(...(a as [])),
  onSnapshot: (_ref: unknown, onNext: (s: unknown) => void, onErr: (e: unknown) => void) => {
    snapshotCb = onNext;
    errorCb = onErr;
    return unsubscribe;
  },
  setDoc: (...a: unknown[]) => setDoc(...(a as [])),
}));

import { useAnnouncements } from './useAnnouncements';
import { fetchAnnouncements } from '../firebase/services';
import { setSyncDisabled } from '../utils/librarySync';

const snap = (items: string[] | null) => ({
  exists: () => items !== null,
  data: () => ({ items }),
});

describe('useAnnouncements — مزامنة مقروء الإشعارات', () => {
  beforeEach(() => {
    localStorage.clear();
    logError.mockClear();
    setDoc.mockClear();
    snapshotCb = null;
    errorCb = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('لا يكتب داخل المستمع إلا عند اختلاف حقيقي (لا حلقة كتابة)', async () => {
    localStorage.setItem('readAnnouncements_u1', JSON.stringify(['a']));
    const { unmount } = renderHook(() => useAnnouncements());
    await waitFor(() => expect(snapshotCb).toBeTruthy());

    // السحابة لا تعرف شيئًا بعد → كتابة واحدة لرفع المحلي
    await act(async () => { snapshotCb?.(snap([])); });
    expect(setDoc).toHaveBeenCalledTimes(1);

    // اللقطة اللاحقة (ناتجة عن كتابتنا) لا تُنتج كتابة أخرى
    await act(async () => { snapshotCb?.(snap(['a'])); });
    expect(setDoc).toHaveBeenCalledTimes(1);

    // نفس اللقطة مرة أخرى: لا كتابة
    await act(async () => { snapshotCb?.(snap(['a'])); });
    expect(setDoc).toHaveBeenCalledTimes(1);
    unmount();
  });

  // السيناريو الذي يُنتج حلقة فعلية: المحلي فيه قراءات والسحابة أقل منها عند كل لقطة
  // (جهاز آخر لم يُحدّث بعد). الحارس القديم كان يكتب مع كل لقطة لأن الطولين يختلفان
  // دائمًا — كتابة → لقطة → كتابة بلا نهاية. الجديد يكتب مرة واحدة فقط.
  it('سحابة ناقصة عن المحلي لا تُنتج كتابات متكررة', async () => {
    localStorage.setItem('readAnnouncements_u1', JSON.stringify(['a', 'b']));
    const { unmount } = renderHook(() => useAnnouncements());
    await waitFor(() => expect(snapshotCb).toBeTruthy());

    await act(async () => { snapshotCb?.(snap(['a'])); });
    await act(async () => { snapshotCb?.(snap(['a'])); });
    await act(async () => { snapshotCb?.(snap(['a'])); });

    // كتابة واحدة لرفع 'b'، ثم تتوقف — لا حلقة
    expect(setDoc).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('يسجّل permission-denied مرة واحدة فقط مهما تكرر الاشتراك', async () => {
    renderHook(() => useAnnouncements());
    await waitFor(() => expect(errorCb).toBeTruthy());

    const denied = Object.assign(new Error('Missing or insufficient permissions.'), {
      code: 'permission-denied',
    });

    await act(async () => { errorCb?.(denied); });
    await act(async () => { errorCb?.(denied); });
    await act(async () => { errorCb?.(denied); });

    expect(logError).toHaveBeenCalledTimes(1);
  });

  it('الأخطاء الأخرى (غير الصلاحيات) تُسجَّل كما هي', async () => {
    renderHook(() => useAnnouncements());
    await waitFor(() => expect(errorCb).toBeTruthy());
    await act(async () => { errorCb?.(new Error('unavailable')); });
    expect(logError).toHaveBeenCalledTimes(1);
  });

  it('markAsRead يكتب سحابيًا عندما تكون المزامنة مفعّلة', async () => {
    vi.mocked(fetchAnnouncements).mockResolvedValueOnce([
      { id: 'a', title: 'عنوان', body: 'نص', createdAt: 1 },
    ]);
    const { result, unmount } = renderHook(() => useAnnouncements());
    await waitFor(() => expect(result.current.announcements).toHaveLength(1));

    setDoc.mockClear();
    act(() => result.current.markAsRead());

    await waitFor(() => expect(setDoc).toHaveBeenCalledTimes(1));
    unmount();
  });

  it('markAsRead لا يكتب سحابيًا عندما تكون المزامنة موقوفة', async () => {
    vi.mocked(fetchAnnouncements).mockResolvedValueOnce([
      { id: 'a', title: 'عنوان', body: 'نص', createdAt: 1 },
    ]);
    setSyncDisabled('u1', true);
    const { result, unmount } = renderHook(() => useAnnouncements());
    await waitFor(() => expect(result.current.announcements).toHaveLength(1));

    setDoc.mockClear();
    act(() => result.current.markAsRead());
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    expect(setDoc).not.toHaveBeenCalled();
    unmount();
  });

  it('الكتابة الجارية لا تُسقط التحديث الجديد وتدفعه في طابور', async () => {
    let resolveFirstWrite: (() => void) | null = null;
    setDoc.mockImplementationOnce(() => new Promise((resolve) => { resolveFirstWrite = resolve; }));

    renderHook(() => useAnnouncements());
    await waitFor(() => expect(snapshotCb).toBeTruthy());

    // الطلب الأول ينطلق ويعلق
    localStorage.setItem('readAnnouncements_u1', JSON.stringify(['x']));
    await act(async () => { snapshotCb?.(snap([])); });
    expect(setDoc).toHaveBeenCalledTimes(1);

    // وصول لقطة جديدة وتحديث محلي أثناء الكتابة الجارية
    localStorage.setItem('readAnnouncements_u1', JSON.stringify(['x', 'y']));
    await act(async () => { snapshotCb?.(snap([])); });
    expect(setDoc).toHaveBeenCalledTimes(1);

    // انتهاء الكتابة الأولى يُطلق الدفعة المتراكمة تلقائيًا
    await act(async () => {
      resolveFirstWrite?.();
    });

    expect(setDoc).toHaveBeenCalledTimes(2);
  });
});
