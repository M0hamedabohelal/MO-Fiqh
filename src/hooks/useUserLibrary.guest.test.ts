// @vitest-environment jsdom
// حارس الزائر: الحفظ (مفضلة/فوائد/ملاحظات/علامات وقف/ثيم) يتطلب حسابًا.
// القراءة تبقى حرة — لا يُحجب المحتوى عن الزائر (قرار SEO ومصلحة المستخدم).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const requireLogin = vi.fn();
let authUser: { uid: string } | null = null;

vi.mock('../Components/Auth/AuthContext', () => ({
  useAuth: () => ({ user: authUser, authLoading: false }),
}));
vi.mock('../utils/guestPrompt', () => ({
  requireLogin: (...a: unknown[]) => requireLogin(...(a as [])),
}));

import { useUserLibrary } from './useUserLibrary';

describe('حارس الزائر — useUserLibrary', () => {
  beforeEach(() => {
    localStorage.clear();
    requireLogin.mockClear();
    authUser = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('الزائر: محاولة إضافة مفضلة تُظهر التحذير ولا تُحفظ', async () => {
    const { result } = renderHook(() => useUserLibrary());
    await waitFor(() => expect(result.current).toBeTruthy());

    act(() => { result.current.toggleBookmark('12'); });

    expect(requireLogin).toHaveBeenCalledTimes(1);
    expect(result.current.bookmarks).toHaveLength(0);
  });

  it('الزائر: الملاحظة لا تُحفظ ويُنبَّه', async () => {
    const { result } = renderHook(() => useUserLibrary());
    await waitFor(() => expect(result.current).toBeTruthy());

    act(() => { result.current.saveNoteForLesson('7', 'ملاحظة'); });

    expect(requireLogin).toHaveBeenCalledTimes(1);
    expect(result.current.notes).toEqual({});
  });

  it('الزائر: الفائدة لا تُحفظ ويُنبَّه', async () => {
    const { result } = renderHook(() => useUserLibrary());
    await waitFor(() => expect(result.current).toBeTruthy());

    act(() => { result.current.addHighlight({ id: 'h1', lessonId: '1', text: 'x' } as never); });

    expect(requireLogin).toHaveBeenCalledTimes(1);
    expect(result.current.highlights).toHaveLength(0);
  });

  it('المسجّل: الحفظ يعمل عاديًا بلا تحذير', async () => {
    authUser = { uid: 'u1' };
    const { result } = renderHook(() => useUserLibrary());
    await waitFor(() => expect(result.current).toBeTruthy());

    act(() => { result.current.toggleBookmark('12'); });

    expect(requireLogin).not.toHaveBeenCalled();
    expect(result.current.bookmarks).toEqual(['12']);
  });

  it('إلغاء الحفظ مسموح للزائر أيضًا (لا يُحبَس في بيانات موجودة)', async () => {
    // الضيف له بيانات قديمة (من قبل هذا التغيير) — يجب أن يقدر يمسحها
    localStorage.setItem('guest_bookmarks', JSON.stringify(['12']));
    const { result } = renderHook(() => useUserLibrary());
    await waitFor(() => expect(result.current.bookmarks).toEqual(['12']));

    act(() => { result.current.toggleBookmark('12'); });

    expect(result.current.bookmarks).toHaveLength(0);
  });
});
