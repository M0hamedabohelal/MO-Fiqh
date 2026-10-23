// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  extractEntryAsset,
  currentEntryAsset,
  isNewerBuild,
  readBootBuild,
  useAppVersion,
  __resetBootBuildForTests,
} from './useAppVersion';

const RUNNING = 'assets/index-CjObGFim.js';
const SERVED_NEW = 'assets/index-ZZZnew99.js';

const pageHtml = (asset: string) => `<!doctype html><html><head><script type="module" crossorigin src="/${asset}"></script></head><body></body></html>`;

beforeEach(() => {
  document.head.innerHTML = `<script type="module" crossorigin src="/${RUNNING}"></script>`;
  sessionStorage.clear();
  __resetBootBuildForTests();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('استخراج اسم الحزمة', () => {
  it('يقرأ اسم الحزمة من صفحة الخادم بلا شرطة بادئة', () => {
    expect(extractEntryAsset(pageHtml(SERVED_NEW))).toBe(SERVED_NEW);
    expect(extractEntryAsset('<html><body>لا حزمة</body></html>')).toBeNull();
  });

  it('يقرأ الحزمة التي يعمل عليها التبويب من وسم السكربت', () => {
    expect(currentEntryAsset(document)).toBe(RUNNING);
  });

  it('اختلاف الاسم يعني نسخة جديدة، وغياب أحدهما لا يُعلن شيئًا', () => {
    expect(isNewerBuild(RUNNING, SERVED_NEW)).toBe(true);
    expect(isNewerBuild(RUNNING, RUNNING)).toBe(false);
    expect(isNewerBuild(null, SERVED_NEW)).toBe(false);
    expect(isNewerBuild(RUNNING, null)).toBe(false);
  });
});

// العلة الحقيقية: بعد إعادة التحميل يقرأ التبويب اسم الحزمة **الجديد** من وسم السكربت،
// ثم يقارنه بالحزمة المخدومة فيجدهما متساويين ويقول «أنت محدّث» — فيخفي أن المستخدم كان
// على نسخة أقدم ولم يُبلَّغ قط. الحل: تسجيل حزمة أول إقلاع في sessionStorage حتى تُعرف
// النسخة التي بدأ عليها التبويب فعلًا ولا يُقارن الملف بنفسه بعد التحديث.
describe('readBootBuild — حزمة أول إقلاع في الجلسة', () => {
  it('يسجّل النتيجة ويعيدها لاحقًا حتى لو تغيّر وسم السكربت في الصفحة', () => {
    expect(readBootBuild(RUNNING)).toBe(RUNNING);
    // إعادة تحميل: الصفحة الآن تحمل حزمة أخرى
    expect(readBootBuild(SERVED_NEW)).toBe(RUNNING);
  });

  it('يتجاهل القيمة الفارغة ولا يسجّلها', () => {
    expect(readBootBuild(null)).toBeNull();
    expect(sessionStorage.length).toBe(0);
  });
});

describe('useAppVersion', () => {
  it('يُظهر حالة التحديث حين يقدّم الخادم حزمة مختلفة', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => pageHtml(SERVED_NEW) })));
    const { result } = renderHook(() => useAppVersion());

    expect(result.current.updateReady).toBe(false);
    await act(async () => { await result.current.checkNow(); });

    expect(result.current.updateReady).toBe(true);
    expect(result.current.lastCheckedAt).not.toBeNull();
    expect(result.current.checking).toBe(false);
  });

  it('لا يُظهر الحالة عندما تكون الحزمة المقدَّمة هي العاملة', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => pageHtml(RUNNING) })));
    const { result } = renderHook(() => useAppVersion());
    await act(async () => { await result.current.checkNow(); });
    expect(result.current.updateReady).toBe(false);
  });

  it('انقطاع الشبكة لا يُعلن تحديثًا ولا يرمي', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    const { result } = renderHook(() => useAppVersion());
    await act(async () => { await result.current.checkNow(); });
    expect(result.current.updateReady).toBe(false);
    expect(result.current.checking).toBe(false);
  });

  it('يجرّب تلقائيًا بعد الإقلاع (8 ثوانٍ)', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, text: async () => pageHtml(SERVED_NEW) }));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useAppVersion());

    expect(fetchMock).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(9_000); });
    await waitFor(() => expect(result.current.updateReady).toBe(true));
  });

  it('الإخفاء يُخفي الشريط دون إلغاء الحقيقة', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => pageHtml(SERVED_NEW) })));
    const { result } = renderHook(() => useAppVersion());
    await act(async () => { await result.current.checkNow(); });
    expect(result.current.dismissed).toBe(false);
    act(() => result.current.dismiss());
    expect(result.current.dismissed).toBe(true);
    expect(result.current.updateReady).toBe(true);
  });

  // طلب المستخدم: زر «التحقق» لا يكتفي بالرد «أنت محدّث» في حالة عدم وجود نشر —
  // بل يبقى كذلك فقط إن كانت الحزمة العاملة هي المخدومة فعلًا.
  it('checkAndReload لا يعيد التحميل إن كانت الحزمة العاملة هي المخدومة', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => pageHtml(RUNNING) })));
    const { result } = renderHook(() => useAppVersion());
    const hardReload = vi.fn();
    vi.stubGlobal('location', { ...window.location, replace: hardReload, href: 'https://fqh.me/#/settings' });

    let updated = false;
    await act(async () => { updated = await result.current.checkAndReload(); });

    expect(updated).toBe(false);
    expect(hardReload).not.toHaveBeenCalled();
  });

  it('checkAndReload يعيد التحميل بالقوة حين يوجد نشر أحدث', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => pageHtml(SERVED_NEW) })));
    const { result } = renderHook(() => useAppVersion());
    const hardReload = vi.fn();
    vi.stubGlobal('location', { ...window.location, replace: hardReload, href: 'https://fqh.me/#/settings' });

    let updated = false;
    await act(async () => { updated = await result.current.checkAndReload(); });

    expect(updated).toBe(true);
    expect(hardReload).toHaveBeenCalledTimes(1);
  });

  // الفحص يلزمه تجاوز كاش HTTP دائمًا: لو اعتمدنا على ترويسات الخادم وحدها، أي وسيط
  // (proxy/متصفح يخزّن بلا احترام) يُرجع index.html قديم فيظن التطبيق أنه أحدث نسخة.
  it('الفحص يطلب index.html بلا كاش', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, text: async () => pageHtml(RUNNING) }));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useAppVersion());
    await act(async () => { await result.current.checkNow(); });
    const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const [url, init] = call;
    expect(url).toContain('/index.html');
    expect(init.cache).toBe('no-store');
  });

  // الشرط الجوهري: بعد التحديث لا يُقارن التبويب الحزمة بنفسها.
  it('بعد إعادة التحميل يتولّى الحزمة الجديدة كأساس فلا يبقى الشريط ظاهرًا', async () => {
    // أول إقلاع: كان يعمل على RUNNING وسُجّل في sessionStorage
    const { result: first } = renderHook(() => useAppVersion());
    expect(first.current.runningBuild).toBe(RUNNING);
    expect(first.current.bootBuild).toBe(RUNNING);

    // إعادة تحميل: الصفحة الآن تحمل حزمة أحدث. الذاكرة داخل الوحدة تُصفَّر كما في
    // تحميل صفحة جديد، لكن sessionStorage يبقى بقيمة الإقلاع القديمة.
    __resetBootBuildForTests();
    document.head.innerHTML = `<script type="module" crossorigin src="/${SERVED_NEW}"></script>`;
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => pageHtml(SERVED_NEW) })));
    const { result: afterReload } = renderHook(() => useAppVersion());

    // الحزمة العاملة اختلفت عن المحفوظ → تُتبنّى كأساس (انتهى التحديث فعلًا)
    expect(afterReload.current.runningBuild).toBe(SERVED_NEW);
    expect(afterReload.current.bootBuild).toBe(SERVED_NEW);

    await act(async () => { await afterReload.current.checkNow(); });
    expect(afterReload.current.updateReady).toBe(false);
  });

  // الحالة المضادّة: إعادة تحميل **عادية** (نفس الحزمة) لا يجوز أن تُنسي التبويب أنه
  // على نسخة قديمة بينما الخادم يقدّم أحدث — وهذا أصل الشكوى: «لم يظهر زر تحديث».
  it('إعادة التحميل العادية تحفظ حزمة الإقلاع فيظل كشف النشر الجديد صحيحًا', async () => {
    const { result } = renderHook(() => useAppVersion());
    expect(result.current.bootBuild).toBe(RUNNING);

    // نفس الصفحة، نفس الحزمة — لكن الخادم نشر حزمة أحدث
    __resetBootBuildForTests();
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => pageHtml(SERVED_NEW) })));
    const { result: afterPlainReload } = renderHook(() => useAppVersion());

    expect(afterPlainReload.current.bootBuild).toBe(RUNNING);
    await act(async () => { await afterPlainReload.current.checkNow(); });
    expect(afterPlainReload.current.updateReady).toBe(true);
  });
});
