import type { Lesson } from '../../types';

export interface StopMarkRecord {
  bookName: string;
  lessonId: string | null;
  updatedAt: number;
  deviceId: string;
}

export type StopMarkMap = Record<string, StopMarkRecord>;

export function normalizeBookName(value: unknown): string {
  return typeof value === 'string' ? value.normalize('NFC').trim().replace(/\s+/g, ' ') : '';
}

export function stopMarkBookKey(bookName: unknown): string {
  const normalized = normalizeBookName(bookName);
  return normalized ? encodeURIComponent(normalized) : '';
}

function normalizeRecord(bookKey: string, value: unknown): StopMarkRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Partial<StopMarkRecord>;
  const bookName = normalizeBookName(raw.bookName);
  const lessonId = raw.lessonId === null
    ? null
    : typeof raw.lessonId === 'string' || typeof raw.lessonId === 'number'
      ? String(raw.lessonId).trim() || null
      : undefined;
  const updatedAt = Number(raw.updatedAt);
  const deviceId = typeof raw.deviceId === 'string' ? raw.deviceId.trim() : '';

  if (
    !bookName ||
    stopMarkBookKey(bookName) !== bookKey ||
    lessonId === undefined ||
    !Number.isFinite(updatedAt) || updatedAt < 0 ||
    !deviceId || deviceId.length > 120
  ) return null;

  return { bookName, lessonId, updatedAt, deviceId };
}

export function normalizeStopMarkMap(value: unknown): StopMarkMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const marks: StopMarkMap = {};
  Object.entries(value as Record<string, unknown>).forEach(([bookKey, raw]) => {
    const record = normalizeRecord(bookKey, raw);
    if (record) marks[bookKey] = record;
  });
  return marks;
}

export function compareStopMarks(a: StopMarkRecord, b: StopMarkRecord): number {
  if (a.updatedAt !== b.updatedAt) return a.updatedAt - b.updatedAt;
  const deviceOrder = a.deviceId.localeCompare(b.deviceId);
  if (deviceOrder !== 0) return deviceOrder;
  return String(a.lessonId ?? '').localeCompare(String(b.lessonId ?? ''));
}

export function mergeStopMarkMaps(localValue: unknown, cloudValue: unknown): StopMarkMap {
  const local = normalizeStopMarkMap(localValue);
  const cloud = normalizeStopMarkMap(cloudValue);
  const merged: StopMarkMap = { ...local };

  Object.entries(cloud).forEach(([bookKey, cloudRecord]) => {
    const localRecord = merged[bookKey];
    if (!localRecord || compareStopMarks(cloudRecord, localRecord) > 0) {
      merged[bookKey] = cloudRecord;
    }
  });
  return merged;
}

export function getStopMarkForBook(marks: StopMarkMap, bookName: unknown, lessons?: Lesson[]): StopMarkRecord | null {
  const bookKey = stopMarkBookKey(bookName);
  const record = bookKey ? marks[bookKey] : undefined;
  if (!record?.lessonId) return null;
  if (lessons && !lessons.some((lesson) => String(lesson.id) === record.lessonId && normalizeBookName(lesson.bookName) === record.bookName)) return null;
  return record;
}

export function getLatestStopMark(marks: StopMarkMap, lessons?: Lesson[]): StopMarkRecord | null {
  const orderedMarks = Object.values(normalizeStopMarkMap(marks))
    .filter((mark) => mark.lessonId !== null && (!lessons || lessons.some((lesson) => String(lesson.id) === mark.lessonId && normalizeBookName(lesson.bookName) === mark.bookName)))
    .sort(compareStopMarks);
  return orderedMarks[orderedMarks.length - 1] ?? null;
}

export function createStopMarkChange(
  marks: StopMarkMap,
  lesson: Pick<Lesson, 'id' | 'bookName'>,
  deviceId: string,
  now = Date.now(),
): { bookKey: string; record: StopMarkRecord } | null {
  const bookName = normalizeBookName(lesson.bookName);
  const bookKey = stopMarkBookKey(bookName);
  const lessonId = String(lesson.id).trim();
  if (!bookKey || !lessonId || !deviceId.trim()) return null;

  const previous = marks[bookKey];
  const isSameActiveLesson = previous?.lessonId === lessonId;
  return {
    bookKey,
    record: {
      bookName,
      lessonId: isSameActiveLesson ? null : lessonId,
      updatedAt: Math.max(now, (previous?.updatedAt ?? 0) + 1),
      deviceId: deviceId.trim(),
    },
  };
}

export function createRestoredStopMarks(
  currentValue: unknown,
  incomingValue: unknown,
  deviceId: string,
  now = Date.now(),
): StopMarkMap {
  const current = normalizeStopMarkMap(currentValue);
  const incoming = normalizeStopMarkMap(incomingValue);
  const restored: StopMarkMap = { ...current };
  Object.entries(incoming).forEach(([bookKey, mark]) => {
    if (mark.lessonId === null) return;
    restored[bookKey] = {
      ...mark,
      updatedAt: Math.max(now, (current[bookKey]?.updatedAt ?? 0) + 1),
      deviceId,
    };
  });
  return restored;
}

