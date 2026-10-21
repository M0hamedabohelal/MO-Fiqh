import { describe, expect, it } from 'vitest';
import {
  compareStopMarks,
  createStopMarkChange,
  createRestoredStopMarks,
  getLatestStopMark,
  getStopMarkForBook,
  mergeStopMarkMaps,
  normalizeStopMarkMap,
  stopMarkBookKey,
} from './model';
import type { StopMarkMap } from './model';

const makeMark = (bookName: string, lessonId: string | null, updatedAt: number, deviceId = 'device-a') => ({
  bookName,
  lessonId,
  updatedAt,
  deviceId,
});

describe('stop mark model', () => {
  it('uses a normalized, URL-safe book key and ignores the former data shape', () => {
    expect(stopMarkBookKey('  كتاب   الصلاة  ')).toBe(stopMarkBookKey('كتاب الصلاة'));
    expect(stopMarkBookKey('كتاب/الصلاة')).toContain('%2F');
    expect(normalizeStopMarkMap({ 'كتاب الصلاة': '17' })).toEqual({});
  });

  it('toggles one lesson per book and keeps other books independent', () => {
    const first = createStopMarkChange({}, { id: 17, bookName: 'كتاب الصلاة' }, 'device-a', 100);
    expect(first?.record.lessonId).toBe('17');
    const second = createStopMarkChange(
      { [first!.bookKey]: first!.record },
      { id: 17, bookName: 'كتاب الصلاة' },
      'device-a',
      100,
    );
    expect(second?.record.lessonId).toBeNull();
    expect(second?.record.updatedAt).toBe(101);
    const otherBook = createStopMarkChange({}, { id: 18, bookName: 'كتاب الطهارة' }, 'device-a', 100);
    expect(otherBook?.record.lessonId).toBe('18');
  });

  it('merges by update time and lets a newer removal win', () => {
    const key = stopMarkBookKey('كتاب الصلاة');
    const merged = mergeStopMarkMaps(
      { [key]: makeMark('كتاب الصلاة', '17', 10) },
      { [key]: makeMark('كتاب الصلاة', null, 11, 'device-b') },
    );
    expect(merged[key]?.lessonId).toBeNull();
    expect(getStopMarkForBook(merged, 'كتاب الصلاة')).toBeNull();
  });

  it('breaks equal-time conflicts deterministically by device ID', () => {
    const a = makeMark('كتاب الصلاة', '17', 50, 'device-a');
    const b = makeMark('كتاب الصلاة', null, 50, 'device-b');
    expect(compareStopMarks(b, a)).toBeGreaterThan(0);
    expect(compareStopMarks(a, b)).toBeLessThan(0);
  });

  it('selects the most recently active, valid lesson', () => {
    const marks: StopMarkMap = {
      [stopMarkBookKey('كتاب الصلاة')]: makeMark('كتاب الصلاة', '17', 10),
      [stopMarkBookKey('كتاب الطهارة')]: makeMark('كتاب الطهارة', '999', 30),
      [stopMarkBookKey('كتاب الصيام')]: makeMark('كتاب الصيام', '25', 20),
    };
    const lessons = [
      { id: 17, bookName: 'كتاب الصلاة' },
      { id: 25, bookName: 'كتاب الصيام' },
    ] as never[];
    expect(getLatestStopMark(marks, lessons)?.lessonId).toBe('25');
    expect(getStopMarkForBook(marks, 'كتاب الصلاة', lessons)?.lessonId).toBe('17');
    expect(getStopMarkForBook(marks, 'كتاب الطهارة', lessons)).toBeNull();
  });

  it('restoring a backup creates a fresh winning version', () => {
    const key = stopMarkBookKey('كتاب الصلاة');
    const current = { [key]: makeMark('كتاب الصلاة', '18', 200, 'device-z') };
    const restored = { [key]: makeMark('كتاب الصلاة', '17', 20, 'old-device') };
    const result = createRestoredStopMarks(current, restored, 'device-new', 300);
    expect(result[key]).toEqual(makeMark('كتاب الصلاة', '17', 300, 'device-new'));
  });
});
