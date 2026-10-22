// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// خدمات Firestore مُستبدلة بالكامل: المستمع وقراءة الكاش تحت سيطرة الاختبار.
// هذا هو الاختبار الذي يحمي من فئة الأعطال الحقيقية: لقطة كاش لا تُعلن نجاحًا،
// وإعادة تحميل لا تُعلّق، وحالة «لا محتوى» تنتهي بحالة صريحة لا بدوران.
const mock = vi.hoisted(() => ({
  listeners: [] as Array<{ onNext: (lessons: unknown[], fromCache: boolean) => void; onError: (e: unknown) => void }>,
  cached: [] as unknown[],
  glossaryCalls: 0,
}));

vi.mock('../firebase/config', () => ({
  isFirebaseConfigured: true,
  enableFirestoreNetwork: vi.fn(async () => {}),
}));

vi.mock('../firebase/services', () => ({
  subscribeToLessons: async (onNext: never, onError: never) => {
    mock.listeners.push({ onNext: onNext as never, onError: onError as never });
    return () => {};
  },
  fetchLessons: async () => mock.cached,
  fetchGlossary: async () => { mock.glossaryCalls += 1; return {}; },
}));

import { useAppData } from './useAppData';

const lesson = (id: number, bookName: string, chapterName = 'الباب الأول') => ({
  id, bookName, chapterName, title: `مسألة ${id}`, mainText: 'نص',
});

const TRI = 'كتاب الطهارة';
const SALAT = 'كتاب الصلاة';
const CACHE_KEY = 'content_lessons_cache_v1';

/** آخر مستمع مُسجَّل (كل إعادة تحميل تفتح مستمعًا جديدًا) */
const latest = () => mock.listeners[mock.listeners.length - 1];

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  localStorage.clear();
  mock.listeners.length = 0;
  mock.cached = [];
  mock.glossaryCalls = 0;
});

afterEach(() => {
  vi.useRealTimers();
});

async function mountAndSettle() {
  const hook = renderHook(() => useAppData({ isOffline: false }));
  // الجلب الأول مجدول بعد ~600ms
  await act(async () => { await vi.advanceTimersByTimeAsync(700); });
  return hook;
}

describe('useAppData — مصدر المحتوى', () => {
  it('لقطة خادمية تُعلن النجاح وتُصنَّف cloud، مع ترتيب الكتب', async () => {
    const { result } = await mountAndSettle();
    expect(mock.listeners.length).toBeGreaterThan(0);

    await act(async () => {
      latest().onNext([lesson(9, SALAT), lesson(1, TRI)], false);
    });

    await waitFor(() => expect(result.current.cloudLessonsLoaded).toBe(true));
    expect(result.current.contentSource).toBe('cloud');
    expect(result.current.contentReady).toBe(true);
    expect(result.current.cloudStatus).toBe('synced');
    // الترتيب يتبع BOOKS_LIST لا ترتيب الوصول
    expect(result.current.lessons.map((l) => l.bookName)).toEqual([TRI, SALAT]);
  });

  it('لقطة كاش فقط تُعرض ولا تُعلن نجاح السحابة', async () => {
    const { result } = await mountAndSettle();
    await act(async () => {
      latest().onNext([lesson(2, TRI)], true);
    });

    expect(result.current.cloudLessonsLoaded).toBe(false);
    expect(result.current.contentSource).toBe('cache');
    expect(result.current.lessons.length).toBe(1);
  });

  it('كاش محفوظ عند الإقلاع يُستخدم بلا انتظار السحابة', async () => {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), lessons: [lesson(1, TRI), lesson(2, TRI)] }));
    const { result } = renderHook(() => useAppData({ isOffline: false }));

    await waitFor(() => expect(result.current.contentSource).toBe('cache'));
    expect(result.current.lessons.length).toBe(2);
    expect(result.current.contentReady).toBe(true);
  });

  it('بلا سحابة وبلا كاش: الحالة تنتهي إلى empty (لا تعليق)', async () => {
    const { result } = await mountAndSettle();
    // المستمع لا يُرسل شيئًا؛ ننتظر انتهاء مهلة إعادة التحميل (15s)
    await act(async () => { await vi.advanceTimersByTimeAsync(16_000); });

    await waitFor(() => expect(result.current.contentSource).toBe('empty'));
    expect(result.current.contentReady).toBe(true);
    expect(result.current.lessons).toEqual([]);
  });
});

describe('useAppData — ترتيب قراءة المسرد', () => {
  it('لا يقرأ المسرد قبل أول لقطة خادمية، ويقرأه مرة واحدة بعدها', async () => {
    const { result } = await mountAndSettle();
    expect(mock.glossaryCalls).toBe(0);

    await act(async () => { latest().onNext([lesson(1, TRI)], false); });
    await waitFor(() => expect(mock.glossaryCalls).toBe(1));

    // لقطة ثانية لا تعيد القراءة
    await act(async () => { latest().onNext([lesson(1, TRI)], false); });
    await expect(Promise.resolve()).resolves.toBeUndefined();
    expect(mock.glossaryCalls).toBe(1);
    expect(result.current.cloudLessonsLoaded).toBe(true);
  });

  it('شبكة أمان: يقرأ المسرد بعد 8 ثوانٍ حتى لو لم تصل السحابة', async () => {
    await mountAndSettle();
    expect(mock.glossaryCalls).toBe(0);
    await act(async () => { await vi.advanceTimersByTimeAsync(8_500); });
    await waitFor(() => expect(mock.glossaryCalls).toBe(1));
  });
});

describe('useAppData — إعادة التحميل', () => {
  it('إعادة التحميل تنجح عند وصول لقطة خادمية (ولا تعلّق)', async () => {
    const { result } = await mountAndSettle();
    let resolved: boolean | null = null;

    await act(async () => {
      void result.current.reloadFromCloud(true).then((ok) => { resolved = ok; });
      await Promise.resolve();
    });
    // إعادة التحميل تفتح مستمعًا جديدًا
    await waitFor(() => expect(mock.listeners.length).toBeGreaterThan(1));

    await act(async () => {
      latest().onNext([lesson(1, TRI)], false);
      await Promise.resolve();
    });

    await waitFor(() => expect(resolved).toBe(true));
  });

  it('إعادة التحميل تفشل بعد المهلة إن لم تصل لقطة وتُظهر تعذّرًا يدويًا', async () => {
    const { result } = await mountAndSettle();
    let resolved: boolean | null = null;

    await act(async () => {
      void result.current.reloadFromCloud(true).then((ok) => { resolved = ok; });
      await Promise.resolve();
    });
    await act(async () => { await vi.advanceTimersByTimeAsync(16_000); });

    await waitFor(() => expect(resolved).toBe(false));
    expect(result.current.cloudStatus).toBe('offline');
    expect(result.current.contentSource).toBe('empty');
  });

  it('خطأ المستمع يُنهي الإعادة بفشل بدل التعليق', async () => {
    const { result } = await mountAndSettle();
    let resolved: boolean | null = null;

    await act(async () => {
      void result.current.reloadFromCloud(true).then((ok) => { resolved = ok; });
      await Promise.resolve();
    });
    await waitFor(() => expect(mock.listeners.length).toBeGreaterThan(1));

    await act(async () => {
      latest().onError(new Error('Target ID already exists'));
      await Promise.resolve();
    });

    await waitFor(() => expect(resolved).toBe(false));
  });
});
