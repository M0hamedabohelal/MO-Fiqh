import { useEffect, useMemo } from 'react';
import { safeGet, safeSet, safeParse } from '../utils/safeStorage';
import type { Lesson } from '../types';

// لقطة وقت تحميل التطبيق — للمقارنات الزمنية أثناء الرسم (أسبوع الشارة)
const APP_START = Date.now();
const NEW_BADGE_DAYS = 7;
const FIRST_SEEN_KEY = 'fiqh_lessons_first_seen';
const SEEN_MAX_KEY = 'fiqh_seen_max_lesson_id';

// شارة "جديد": تظهر أسبوعًا من أول ظهور للمسألة
// (المسائل بلا تاريخ إضافة، فيُحفظ أول ظهور محليًا؛ والقديم منها لا يُوسم)
function readFirstSeen(): Record<string, number> {
  const parsed = safeParse<unknown>(safeGet(FIRST_SEEN_KEY) || '{}', {});
  return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, number>) : {};
}

function readSeenMax(): number {
  try {
    return Number(safeGet(SEEN_MAX_KEY) || 0);
  } catch {
    return 0;
  }
}

export function useNewBadge(lessons: Lesson[], readLessons: string[]): {
  newLessonIds: Set<string>;
  newLessonsCount: number;
} {
  const { freshIds } = useMemo(() => {
    const fresh = new Set<string>();
    if (lessons.length === 0) return { freshIds: fresh };
    const weekMs = NEW_BADGE_DAYS * 24 * 60 * 60 * 1000;
    const records = readFirstSeen();
    const seenMax = readSeenMax();
    const isFirstRun = seenMax === 0 && Object.keys(records).length === 0;
    lessons.forEach((l: Lesson) => {
      const id = String(l.id);
      const rec = records[id];
      if (rec === undefined) {
        // بلا سجل: جديدة فقط لو ظهرت بعد آخر معرف معروف (وليست أول تشغيل)
        if (!isFirstRun && (Number(l.id) || 0) > seenMax) fresh.add(id);
      } else if (rec > 0 && APP_START - rec < weekMs) {
        fresh.add(id);
      }
    });
    return { freshIds: fresh };
  }, [lessons]);

  // ختم الطوابع الزمنية للمسائل الجديدة + تحديث أعلى معرف + تنظيف المحذوف
  useEffect(() => {
    if (lessons.length === 0) return;
    const now = Date.now();
    const records = readFirstSeen();
    const seenMax = readSeenMax();
    const isFirstRun = seenMax === 0 && Object.keys(records).length === 0;
    let changed = false;
    let maxId = seenMax;
    const alive = new Set<string>();
    lessons.forEach((l: Lesson) => {
      const id = String(l.id);
      alive.add(id);
      const numId = Number(l.id) || 0;
      if (numId > maxId) maxId = numId;
      if (records[id] === undefined && !isFirstRun && numId > seenMax) {
        records[id] = now;
        changed = true;
      }
    });
    Object.keys(records).forEach((id) => {
      if (!alive.has(id)) {
        delete records[id];
        changed = true;
      }
    });
    if (changed) safeSet(FIRST_SEEN_KEY, JSON.stringify(records));
    if (maxId !== seenMax) safeSet(SEEN_MAX_KEY, String(maxId));
  }, [lessons]);

  const newLessonIds = freshIds;
  const newLessonsCount = useMemo(
    () => lessons.filter((l: Lesson) => freshIds.has(String(l.id)) && !readLessons.includes(String(l.id))).length,
    [lessons, freshIds, readLessons],
  );

  return { newLessonIds, newLessonsCount };
}
