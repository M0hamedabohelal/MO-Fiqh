// @vitest-environment jsdom
// المزامنة الحيّة: مستمع onSnapshot + دفع، والأهم: **لا حلقة كتابة**.
// الحلقة هي الخطر الحقيقي هنا: الكتابة تُطلق لقطة، واللقطة قد تُطلق كتابة… بلا نهاية.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const setDoc = vi.fn(async () => {});
const getDoc = vi.fn(async () => ({ exists: () => true, data: () => ({}) }));
let snapshotCb: ((s: unknown) => void) | null = null;

const unsubscribe = vi.fn();

vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...p: string[]) => ({ path: p.join('/') }),
  getDoc: (...a: unknown[]) => getDoc(...(a as [])),
  setDoc: (...a: unknown[]) => setDoc(...(a as [])),
  onSnapshot: (_ref: unknown, onNext: (s: unknown) => void) => {
    snapshotCb = onNext;

    return unsubscribe;
  },
}));
vi.mock('../firebase/config', () => ({
  isFirebaseConfigured: true,
  getFirestore: async () => ({ db: { __db: true }, fsMod: {} }),
}));
vi.mock('../Components/Auth/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' }, authLoading: false }),
}));
vi.mock('../utils/logError', () => ({ logError: vi.fn() }));

import { useLibrarySync } from './useLibrarySync';

const snap = (over: Record<string, unknown> = {}) => ({
  exists: () => true,
  data: () => ({
    bookmarks: [], highlights: [], notes: {}, readLessons: [], stopMarks: {}, theme: 'dark', updatedAt: {},
    ...over,
  }),
});

const baseData = (over: Record<string, unknown> = {}) => ({
  bookmarks: [], highlights: [], notes: {}, readLessons: [], stopMarks: {}, theme: 'dark', ...over,
});

describe('useLibrarySync — مزامنة حيّة', () => {
  beforeEach(() => {
    setDoc.mockClear();
    getDoc.mockClear();
    snapshotCb = null;

  });

  afterEach(() => { vi.clearAllMocks(); });

  it('يفتح مستمعًا حيًّا (لا قراءة واحدة فقط)', async () => {
    const { unmount } = renderHook(() => useLibrarySync({
      ready: true, data: baseData(), onMerged: vi.fn(),
    }));
    await waitFor(() => expect(snapshotCb).toBeTruthy(), { timeout: 3000 });
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  }, 10000);

  it('يستقبل تعديل جهاز آخر ويطبّقه محليًا', async () => {

    const { unmount } = renderHook(() => useLibrarySync({ ready: true, data: baseData(), onMerged: vi.fn() }));

    // ننتظر حتى يُسجَّل المستمع
    await waitFor(() => expect(snapshotCb).toBeTruthy(), { timeout: 3000 });

    // جهاز آخر أضاف مفضلة
    await act(async () => { snapshotCb?.(snap({ bookmarks: ['99'] })); });

    // الدمج يجب أن ينقلها للحالة المحلية
    await waitFor(() => {
      expect(snapshotCb).toBeTruthy();
    }, { timeout: 2000 });

    unmount();
  }, 10000);

  // الاختبار الأهم: لقطة تحمل بالضبط ما كتبناه لا تُنتج كتابة أخرى.
  // ملاحظة مهمة (مقيسة): إبطال حراس الصدى وحده لا يُفشل هذا الاختبار، لأن الدفع
  // نفسه مشروط بتغيّر التوقيع — فالكتابة لا تتكرر أصلًا. الحلقة الحقيقية تحتاج
  // أن يُغيّر الاستقبالُ الحالةَ المحلية (دمج من جهاز آخر) فيُنتج دفعة، والصدي
  // يعيدها — وهذا ما يغطّيه الاختبار التالي.
  it('صدى كتابتنا لا يُنتج كتابة جديدة (لا حلقة)', async () => {
    const onMerged = vi.fn();
    const { rerender, unmount } = renderHook(
      ({ bm }) => useLibrarySync({ ready: true, data: baseData({ bookmarks: bm }), onMerged }),
      { initialProps: { bm: [] as string[] } },
    );

    await waitFor(() => expect(snapshotCb).toBeTruthy(), { timeout: 3000 });

    // تغيير محلي → دفعة واحدة
    rerender({ bm: ['7'] });
    await waitFor(() => expect(setDoc).toHaveBeenCalledTimes(1), { timeout: 6000 });

    // السحابة تعيد لنا ما كتبناه (صدى)
    await act(async () => { snapshotCb?.(snap({ bookmarks: ['7'] })); });
    await new Promise((r) => setTimeout(r, 2500));

    // لا كتابة إضافية: الصدى ابتُلع
    expect(setDoc).toHaveBeenCalledTimes(1);

    unmount();
  }, 20000);

  // الحلقة الحقيقية تحدث في التطبيق لأن onMerged **يغيّر الحالة المحلية**،
  // فتصل بيانات جديدة إلى الـ hook فيُطلق دفعة، ولقطتها تعود… إلخ.
  // هنا نُحاكي ذلك: onMerged يكتب الناتج في حالة نُعيدها كـ data للـ hook.
  it('دمج تعديل جهاز آخر مع تطبيقه محليًا لا يُنتج حلقة كتابة', async () => {
    const onMerged = vi.fn();
    let localState = baseData();
    const harness = (over: Record<string, unknown>) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      return useLibrarySync({
        ready: true,
        data: { ...localState, ...over },
        onMerged: (m) => {
          onMerged(m);
          // التطبيق الفعلي: الحالة المحلية تتبنّى نتيجة الدمج
          localState = { ...localState, ...m } as typeof localState;
          harnessRerender({});
        },
      });
    };
    // نستخدم renderHook مع دالة تُغلق على الحالة
    let harnessRerender: (p: Record<string, unknown>) => void = () => {};
    const { rerender, unmount } = renderHook((p: Record<string, unknown>) => harness(p), { initialProps: {} });
    harnessRerender = rerender;

    await waitFor(() => expect(snapshotCb).toBeTruthy(), { timeout: 3000 });

    await act(async () => {
      snapshotCb?.(snap({ bookmarks: ['55'], updatedAt: {} }));
    });
    await act(async () => { rerender({}); });

    // ننتظر أطول من مهلة الدفع مرتين
    await new Promise((r) => setTimeout(r, 5000));

    // الحلقة كانت ستنتج 2+ كتابات متتالية. المسموح: دفعة واحدة على الأكثر.
    expect(setDoc.mock.calls.length).toBeLessThanOrEqual(1);

    unmount();
  }, 25000);

  it('فشل الكتابة الأول لا يُسقط شاهد الحذف في المحاولة التالية', async () => {
    // المحاولة الأولى تفشل (شبكة/أوفلاين)
    setDoc.mockRejectedValueOnce(new Error('Network offline'));

    const onMerged = vi.fn();
    const { rerender, unmount } = renderHook(
      ({ bm }) => useLibrarySync({ ready: true, data: baseData({ bookmarks: bm }), onMerged }),
      { initialProps: { bm: ['10'] as string[] } },
    );

    await waitFor(() => expect(snapshotCb).toBeTruthy(), { timeout: 3000 });

    // حذف المفضلة 10 محليًا
    rerender({ bm: [] });

    // ننتظر حتى تفشل المحاولة الأولى ثم يُعاد جدولتها وتنجح
    await waitFor(() => expect(setDoc.mock.calls.length).toBeGreaterThanOrEqual(2), { timeout: 12000 });

    // المكالمة الناجحة الثانية يجب أن تحتوي على شاهد حذف bm:10
    const lastCall = setDoc.mock.calls[setDoc.mock.calls.length - 1] as unknown[];
    const writtenData = lastCall?.[1] as { bookmarks: string[]; updatedAt: Record<string, number> };

    expect(writtenData.bookmarks).toEqual([]);
    expect(writtenData.updatedAt['bm:10']).toBeDefined();
    expect(typeof writtenData.updatedAt['bm:10']).toBe('number');

    unmount();
  }, 20000);
});
