// نسخة محلية من المسائل التي نزلت آخر مرة من السحابة.
// الهدف: عند فتح التطبيق بلا إنترنت نعرض آخر مجموعة كاملة نزلت فعلًا،
// لا اللقطة المضمّنة داخل البناء (التي تتجدد فقط عند تحديث التطبيق).
import type { Lesson } from '../types';
import { safeGet, safeSet } from './safeStorage';

const CACHE_KEY = 'content_lessons_cache_v1';

interface CachedLessons {
  at: number;
  lessons: Lesson[];
}

export function readCachedLessons(): Lesson[] | null {
  const raw = safeGet(CACHE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CachedLessons> | null;
    if (!parsed || !Array.isArray(parsed.lessons) || parsed.lessons.length === 0) return null;
    return parsed.lessons;
  } catch {
    return null;
  }
}

export function writeCachedLessons(lessons: Lesson[]): void {
  if (!Array.isArray(lessons) || lessons.length === 0) return;
  safeSet(CACHE_KEY, JSON.stringify({ at: Date.now(), lessons } satisfies CachedLessons));
}
