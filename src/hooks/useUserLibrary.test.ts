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

  // سياسة 2026: الحفظ المحلي يعمل للضيف وتُدمج بياناته عند أول تسجيل دخول.
  it('الزائر يستطيع إضافة مفضلة محليًا ويُحفظ في التخزين', async () => {
    const { result } = renderHook(() => useUserLibrary());
    await waitFor(() => expect(result.current.isDataLoaded).toBe(true));

    act(() => result.current.toggleBookmark(5));
    await waitFor(() => expect(result.current.bookmarks).toEqual(['5']));
    expect(JSON.parse(localStorage.getItem('guest_bookmarks') || '[]')).toEqual(['5']);
  });

  it('الزائر يستطيع إزالة مفضلة قديمة (لا يُحبَس في بيانات سابقة)', async () => {
    localStorage.setItem('guest_bookmarks', JSON.stringify(['5']));
    const { result } = renderHook(() => useUserLibrary());
    await waitFor(() => expect(result.current.bookmarks).toEqual(['5']));

    act(() => result.current.toggleBookmark(5));
    await waitFor(() => expect(result.current.bookmarks).toEqual([]));
    expect(JSON.parse(localStorage.getItem('guest_bookmarks') || '[]')).toEqual([]);
  });

  it('الزائر: حفظ الملاحظة وتعديلها ومسحها يعمل محليًا', async () => {
    localStorage.setItem('guest_notes', JSON.stringify({ '9': 'قديمة' }));
    const { result } = renderHook(() => useUserLibrary());
    await waitFor(() => expect(result.current.notes).toEqual({ '9': 'قديمة' }));

    // إضافة/تعديل: مسموح محليًا
    act(() => result.current.saveNoteForLesson(9, 'نص'));
    await waitFor(() => expect(result.current.notes).toEqual({ '9': 'نص' }));

    // مسح: مسموح
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

  it('يدمج الملاحظات بأمان عند تعارض نصوص الملاحظات بين الحساب والضيف لنفس المسألة', async () => {
    authState.user = { uid: 'user-D' };
    localStorage.setItem('guest_notes', JSON.stringify({ '5': 'ملاحظة الضيف الجديدة' }));
    localStorage.setItem(
      'library_local_v1_user-D',
      JSON.stringify({ bookmarks: [], highlights: [], notes: { '5': 'ملاحظة الحساب الأصلية' }, readLessons: [] }),
    );

    const { result } = renderHook(() => useUserLibrary());
    await waitFor(() => expect(result.current.isDataLoaded).toBe(true));

    expect(result.current.notes['5']).toContain('ملاحظة الحساب الأصلية');
    expect(result.current.notes['5']).toContain('ملاحظة الضيف الجديدة');

    const saved = JSON.parse(localStorage.getItem('library_local_v1_user-D') || '{}');
    expect(saved.notes['5']).toContain('ملاحظة الحساب الأصلية');
    expect(saved.notes['5']).toContain('ملاحظة الضيف الجديدة');
  });

  it('يستجيب لتحديث التخزين من تبويب آخر عبر حدث storage', async () => {
    authState.user = { uid: 'user-E' };
    localStorage.setItem(
      'library_local_v1_user-E',
      JSON.stringify({ bookmarks: ['1'], highlights: [], notes: {}, readLessons: [] }),
    );

    const { result } = renderHook(() => useUserLibrary());
    await waitFor(() => expect(result.current.bookmarks).toEqual(['1']));

    localStorage.setItem(
      'library_local_v1_user-E',
      JSON.stringify({ bookmarks: ['1', '2'], highlights: [], notes: { '2': 'ملاحظة من تبويب 2' }, readLessons: [] }),
    );

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'library_local_v1_user-E',
          newValue: localStorage.getItem('library_local_v1_user-E'),
        }),
      );
    });

    await waitFor(() => expect(result.current.bookmarks).toEqual(['1', '2']));
    expect(result.current.notes['2']).toBe('ملاحظة من تبويب 2');
  });
});
