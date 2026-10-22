// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { extractEntryAsset, currentEntryAsset, isNewerBuild, useAppVersion } from './useAppVersion';

const RUNNING = 'assets/index-CjObGFim.js';
const SERVED_NEW = 'assets/index-ZZZnew99.js';

const pageHtml = (asset: string) => `<!doctype html><html><head><script type="module" crossorigin src="/${asset}"></script></head><body></body></html>`;

beforeEach(() => {
  document.head.innerHTML = `<script type="module" crossorigin src="/${RUNNING}"></script>`;
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
});
