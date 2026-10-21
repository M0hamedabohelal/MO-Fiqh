import type { Lesson } from '../types';

export interface LessonAudit {
  total: number;
  numericIdCount: number;
  maximumId: number | null;
  missingNumericIds: number[];
  duplicateIds: Array<{ id: string; count: number }>;
  incompleteLessonIds: string[];
  missingPageNumberIds: string[];
  emptyMainTextIds: string[];
  invalidAudioUrlIds: string[];
  invalidVideoUrlIds: string[];
  invalidMediaUrlIds: string[];
  invalidTimeIds: string[];
  invalidTimeRangeIds: string[];
  books: Array<{ name: string; count: number }>;
}

function normalizeDigits(value: string): string {
  return value.replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
}

function parseTime(value: unknown): number | null {
  const text = normalizeDigits(String(value ?? '').trim());
  if (!text) return null;
  if (/^\d+$/.test(text)) {
    const seconds = Number(text);
    return Number.isSafeInteger(seconds) ? seconds : null;
  }
  if (!/^\d{1,3}:\d{1,2}(?::\d{1,2})?$/.test(text)) return null;
  const parts = text.split(':').map(Number);
  const [first, second, third] = parts;
  if (parts.length === 2) {
    if (second > 59) return null;
    return first * 60 + second;
  }
  if (second > 59 || third > 59) return null;
  return first * 3600 + second * 60 + third;
}

function isHttpUrl(value: unknown): boolean {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function hasYouTubeVideoId(value: unknown): boolean {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'youtu.be') return /^[\w-]{11}$/.test(url.pathname.split('/').filter(Boolean)[0] ?? '');
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      const id = url.searchParams.get('v') ?? url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})(?:\/|$)/)?.[1];
      return Boolean(id && /^[\w-]{11}$/.test(id));
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * فحص غير هدّام لسلامة فهرس المسائل. فجوات المعرّفات معلوماتية فقط؛ لا تعني
 * وجود خطأ لأن المعرّف لا يساوي عدد المسائل بالضرورة.
 */
export function auditLessons(lessons: readonly Partial<Lesson>[]): LessonAudit {
  const idCounts = new Map<string, number>();
  const numericIds = new Set<number>();
  const bookCounts = new Map<string, number>();
  const incompleteIds: string[] = [];
  const missingPageNumberIds: string[] = [];
  const emptyMainTextIds: string[] = [];
  const invalidAudioUrlIds: string[] = [];
  const invalidVideoUrlIds: string[] = [];
  const invalidMediaUrlIds: string[] = [];
  const invalidTimeIds: string[] = [];
  const invalidTimeRangeIds: string[] = [];

  lessons.forEach((lesson, index) => {
    const id = lesson.id == null ? '' : String(lesson.id).trim();
    if (id) {
      idCounts.set(id, (idCounts.get(id) ?? 0) + 1);
      const numericId = Number(id);
      if (Number.isSafeInteger(numericId) && numericId > 0) numericIds.add(numericId);
    }

    const bookName = String(lesson.bookName ?? '').trim();
    if (bookName) bookCounts.set(bookName, (bookCounts.get(bookName) ?? 0) + 1);

    const issueId = id || `صف ${index + 1}`;
    const mainText = String(lesson.mainText ?? '').trim();
    if (!id || !String(lesson.title ?? '').trim() || !bookName || !String(lesson.chapterName ?? '').trim() || !mainText) {
      incompleteIds.push(id || `صف ${index + 1}`);
    }
    if (!mainText) emptyMainTextIds.push(issueId);
    if (!String(lesson.pageNumber ?? '').trim()) missingPageNumberIds.push(issueId);

    if (lesson.audioUrl && !isHttpUrl(lesson.audioUrl)) invalidAudioUrlIds.push(issueId);
    if (lesson.videoUrl && !hasYouTubeVideoId(lesson.videoUrl)) invalidVideoUrlIds.push(issueId);
    if (lesson.mediaUrl && !isHttpUrl(lesson.mediaUrl)) invalidMediaUrlIds.push(issueId);

    const rawTimes = [lesson.videoTimestamp, lesson.startTime, lesson.endTime].filter((time) => String(time ?? '').trim());
    if (rawTimes.some((time) => parseTime(time) === null)) invalidTimeIds.push(issueId);
    const start = String(lesson.startTime ?? '').trim() ? parseTime(lesson.startTime) : 0;
    const end = String(lesson.endTime ?? '').trim() ? parseTime(lesson.endTime) : null;
    if (start !== null && end !== null && end <= start) invalidTimeRangeIds.push(issueId);
  });

  const sortedNumericIds = [...numericIds].sort((a, b) => a - b);
  const maximumId = sortedNumericIds[sortedNumericIds.length - 1] ?? null;
  const missingNumericIds: number[] = [];
  // سقف دفاعي حتى لا يؤدي id فاسد ضخم إلى حلقة طويلة في لوحة الإدارة.
  if (maximumId !== null && maximumId <= 100_000) {
    for (let id = 1; id <= maximumId; id += 1) {
      if (!numericIds.has(id)) missingNumericIds.push(id);
    }
  }

  return {
    total: lessons.length,
    numericIdCount: numericIds.size,
    maximumId,
    missingNumericIds,
    duplicateIds: [...idCounts]
      .filter(([, count]) => count > 1)
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true })),
    // المعرف المكرر يبلغ عنه مرة واحدة؛ تفاصيل عدد تكراره موجودة في duplicateIds.
    incompleteLessonIds: [...new Set(incompleteIds)],
    missingPageNumberIds,
    emptyMainTextIds,
    invalidAudioUrlIds,
    invalidVideoUrlIds,
    invalidMediaUrlIds,
    invalidTimeIds,
    invalidTimeRangeIds,
    books: [...bookCounts]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ar')),
  };
}
