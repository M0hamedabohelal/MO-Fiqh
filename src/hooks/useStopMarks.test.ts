// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const authState: { user: { uid: string } | null; authLoading: boolean } = { user: null, authLoading: false };
vi.mock('../Components/Auth/AuthContext', () => ({ useAuth: () => authState }));

import { useStopMarks } from './useStopMarks';
import { stopMarkBookKey } from '../features/stopMarks/model';
import type { Lesson } from '../types';

const lesson = (id: number, bookName = 'كتاب الطهارة'): Lesson =>
  ({ id, bookName, chapterName: 'الباب الأول', title: `مسألة ${id}`, mainText: '' });

const TRI = stopMarkBookKey('كتاب الطهارة');
const SALAT = stopMarkBookKey('كتاب الصلاة');
const GUEST_KEY = 'guest_stopMarks_v2';
const accountKey = (uid: string) => `stopMarks_v2_${uid}`;
const readMarks = (key: string) => JSON.parse(localStorage.getItem(key) || '{}');

beforeEach(() => {
  localStorage.clear();
  authState.user = null;
  authState.authLoading = false;
});

describe('useStopMarks — ضيف', () => {
  it('يضع علامة الوقوف ويحفظها محليًا، والضغط مرة أخرى يزيلها منطقيًا', async () => {
    const { result } = renderHook(() => useStopMarks());
    await waitFor(() => expect(result.current.stopMarksReady).toBe(true));

    act(() => result.current.toggleStopMark(lesson(4)));
    await waitFor(() => expect(Object.keys(result.current.stopMarks).length).toBe(1));

    const [bookKey] = Object.keys(result.current.stopMarks);
    expect(result.current.stopMarks[bookKey].lessonId).toBe('4');
    expect(readMarks(GUEST_KEY)[bookKey].lessonId).toBe('4');

    // نفس المسألة = إلغاء (سجل حذف منطقي لا حذف مستند)
    act(() => result.current.toggleStopMark(lesson(4)));
    await waitFor(() => expect(result.current.stopMarks[bookKey].lessonId).toBeNull());
    expect(readMarks(GUEST_KEY)[bookKey].lessonId).toBeNull();
  });

  it('لا يكتب في مفاتيح الحساب وهو ضيف', async () => {
    const { result } = renderHook(() => useStopMarks());
    await waitFor(() => expect(result.current.stopMarksReady).toBe(true));
    act(() => result.current.toggleStopMark(lesson(2)));
    await waitFor(() => expect(Object.keys(result.current.stopMarks).length).toBe(1));

    const accountKeys = Object.keys(localStorage).filter((k) => k.startsWith('stopMarks_v2_'));
    expect(accountKeys).toEqual([]);
  });

  it('يقرأ علامات الضيف المحفوظة عند الإقلاع', async () => {
    localStorage.setItem(GUEST_KEY, JSON.stringify({
      [TRI]: { bookName: 'كتاب الطهارة', lessonId: '7', updatedAt: 1, deviceId: 'd1' },
    }));
    const { result } = renderHook(() => useStopMarks());
    await waitFor(() => expect(result.current.stopMarksReady).toBe(true));
    expect(result.current.stopMarks[TRI].lessonId).toBe('7');
  });
});

describe('useStopMarks — حساب', () => {
  it('يرحّل علامات الضيف إلى الحساب عند أول دخول', async () => {
    authState.user = { uid: 'user-A' };
    localStorage.setItem(GUEST_KEY, JSON.stringify({
      [TRI]: { bookName: 'كتاب الطهارة', lessonId: '3', updatedAt: 5, deviceId: 'd1' },
    }));

    const { result } = renderHook(() => useStopMarks());
    await waitFor(() => expect(result.current.stopMarksReady).toBe(true));

    expect(result.current.stopMarks[TRI].lessonId).toBe('3');
    expect(readMarks(accountKey('user-A'))[TRI].lessonId).toBe('3');
  });

  it('يحفظ تحت مفتاح الحساب لا مفتاح الضيف', async () => {
    authState.user = { uid: 'user-B' };
    const { result } = renderHook(() => useStopMarks());
    await waitFor(() => expect(result.current.stopMarksReady).toBe(true));

    act(() => result.current.toggleStopMark(lesson(9, 'كتاب الصلاة')));
    await waitFor(() => expect(Object.keys(result.current.stopMarks).length).toBe(1));

    expect(readMarks(accountKey('user-B'))[SALAT].lessonId).toBe('9');
  });

  it('restoreStopMarks يدمج العلامات المستعادة دون فقد الحالية', async () => {
    authState.user = { uid: 'user-C' };
    localStorage.setItem(accountKey('user-C'), JSON.stringify({
      [TRI]: { bookName: 'كتاب الطهارة', lessonId: '1', updatedAt: 10, deviceId: 'd1' },
    }));
    const { result } = renderHook(() => useStopMarks());
    await waitFor(() => expect(result.current.stopMarksReady).toBe(true));

    act(() => result.current.restoreStopMarks({
      [SALAT]: { bookName: 'كتاب الصلاة', lessonId: '2', updatedAt: 20, deviceId: 'd1' },
    }));
    await waitFor(() => expect(Object.keys(result.current.stopMarks).length).toBe(2));
    expect(result.current.stopMarks[SALAT].lessonId).toBe('2');
    expect(result.current.stopMarks[TRI].lessonId).toBe('1');
  });
});
