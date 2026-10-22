// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// سياق المصادقة يُتحكَّم به من الاختبار بدل تسجيل دخول حقيقي
const authState: { user: { uid: string } | null; authLoading: boolean } = { user: null, authLoading: false };
vi.mock('../Components/Auth/AuthContext', () => ({ useAuth: () => authState }));

import { useUserLibrary } from './useUserLibrary';

const GUEST_KEYS = ['guest_bookmarks', 'guest_highlights', 'guest_notes', 'guest_readLessons'];

beforeEach(() => {
  localStorage.clear();
  authState.user = null;
  authState.authLoading = false;
});

describe('useUserLibrary — ضيف', () => {
  it('يقرأ المكتبة المحفوظة للضيف عند الإقلاع', async () => {
    localStorage.setItem('guest_bookmarks', JSON.stringify(['3', '7']));
    localStorage.setItem('guest_notes', JSON.stringify({ '3': 'ملاحظة' }));
    const { result } = renderHook(() => useUserLibrary());
    await waitFor(() => expect(result.current.bookmarks).toEqual(['3', '7']));
    expect(result.current.notes).toEqual({ '3': 'ملاحظة' });
    expect(result.current.isDataLoaded).toBe(true);
  });

  it('toggleBookmark يضيف ثم يزيل، ويُحفظ محليًا', async () => {
    const { result } = renderHook(() => useUserLibrary());
    await waitFor(() => expect(result.current.isDataLoaded).toBe(true));

    act(() => result.current.toggleBookmark(5));
    await waitFor(() => expect(result.current.bookmarks).toEqual(['5']));
    expect(JSON.parse(localStorage.getItem('guest_bookmarks') || '[]')).toEqual(['5']);

    act(() => result.current.toggleBookmark(5));
    await waitFor(() => expect(result.current.bookmarks).toEqual([]));
    expect(JSON.parse(localStorage.getItem('guest_bookmarks') || '[]')).toEqual([]);
  });

  it('حفظ الملاحظة الفارغة يحذفها بدل تخزين سلسلة فارغة', async () => {
    const { result } = renderHook(() => useUserLibrary());
    await waitFor(() => expect(result.current.isDataLoaded).toBe(true));

    act(() => result.current.saveNoteForLesson(9, 'نص'));
    await waitFor(() => expect(result.current.notes).toEqual({ '9': 'نص' }));

    act(() => result.current.saveNoteForLesson(9, '   '));
    await waitFor(() => expect(result.current.notes).toEqual({}));
    expect(JSON.parse(localStorage.getItem('guest_notes') || '{}')).toEqual({});
  });
});

describe('useUserLibrary — حساب', () => {
  it('يدمج بيانات الضيف مرة واحدة ثم يمسح مفاتيح الضيف', async () => {
    authState.user = { uid: 'user-A' };
    localStorage.setItem('guest_bookmarks', JSON.stringify(['1']));
    localStorage.setItem('guest_readLessons', JSON.stringify(['2']));
    localStorage.setItem('library_local_v1_user-A', JSON.stringify({ bookmarks: ['9'], highlights: [], notes: {}, readLessons: [] }));

    const { result } = renderHook(() => useUserLibrary());
    await waitFor(() => expect(result.current.bookmarks.length).toBeGreaterThan(0));

    // اتحاد لا استبدال
    expect([...result.current.bookmarks].sort()).toEqual(['1', '9']);
    expect(result.current.readLessons).toEqual(['2']);
    // مفاتيح الضيف مُسحت بعد الدمج
    GUEST_KEYS.forEach((key) => expect(localStorage.getItem(key)).toBeNull());
  });

  it('يعزل بيانات كل حساب عن الآخر', async () => {
    authState.user = { uid: 'user-A' };
    localStorage.setItem('library_local_v1_user-A', JSON.stringify({ bookmarks: ['A1'], highlights: [], notes: {}, readLessons: [] }));
    localStorage.setItem('library_local_v1_user-B', JSON.stringify({ bookmarks: ['B1'], highlights: [], notes: {}, readLessons: [] }));

    const first = renderHook(() => useUserLibrary());
    await waitFor(() => expect(first.result.current.bookmarks).toEqual(['A1']));
    first.unmount();

    authState.user = { uid: 'user-B' };
    const second = renderHook(() => useUserLibrary());
    await waitFor(() => expect(second.result.current.bookmarks).toEqual(['B1']));
    expect(second.result.current.bookmarks).not.toContain('A1');
  });

  it('لا يكتب في مفاتيح الضيف بعد تسجيل الدخول', async () => {
    authState.user = { uid: 'user-C' };
    const { result } = renderHook(() => useUserLibrary());
    await waitFor(() => expect(result.current.isDataLoaded).toBe(true));

    act(() => result.current.toggleBookmark(11));
    await waitFor(() => expect(result.current.bookmarks).toEqual(['11']));

    expect(localStorage.getItem('guest_bookmarks')).toBeNull();
    expect(JSON.parse(localStorage.getItem('library_local_v1_user-C') || '{}').bookmarks).toEqual(['11']);
  });
});
