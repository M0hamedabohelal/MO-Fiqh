// حداثة علامات التوقف — اختيار "أكمل القراءة" الصحيح زمنيًا
// المشكلة: ترتيب مفاتيح الكائن (إدخال/أبجدية) ليس زمنيًا، خصوصًا مع علامات قادمة
// من أجهزة أخرى، فكان "الأحدث" يُختار خطأً أحيانًا.
// الحل محلي فقط (لا يمس صيغة المزامنة السحابية): خريطة { كتاب: طابع لمسة }
// تُسجَّل عند كل تعيين صريح من المستخدم، والقارئ يفضّل صاحب أحدث لمسة.
// عند غياب السجل تمامًا نرجع للسلوك القديم (آخر قيمة) حتى لا يتغير شيء للمستخدمين الحاليين.
import { safeGet, safeSet, safeRemove, safeParse } from './safeStorage';

const TOUCH_KEY = 'stopMarkTouchedAt';

export type StopMarkTouchedAt = Record<string, number>;

export function readStopMarkTouchedAt(): StopMarkTouchedAt {
  const raw = safeParse<Record<string, unknown>>(safeGet(TOUCH_KEY), {});
  const out: StopMarkTouchedAt = {};
  Object.entries(raw).forEach(([k, v]) => {
    const n = Number(v);
    if (k && Number.isFinite(n) && n > 0) out[k] = n;
  });
  return out;
}

// تُستدعى عند التعيين الصريح فقط (زر علامة التوقف) — لا عند وصول بيانات السحابة
export function recordStopMarkTouch(bookName: string): void {
  const book = (bookName || '').trim();
  if (!book) return;
  const current = readStopMarkTouchedAt();
  current[book] = Date.now();
  safeSet(TOUCH_KEY, JSON.stringify(current));
}

// مسح السجل المحلي (عند تسجيل الخروج حتى لا يتسرب لمستخدم/ضيف آخر على نفس الجهاز)
export function clearStopMarkTouchedAt(): void {
  safeRemove(TOUCH_KEY);
}

// نواة pure قابلة للاختبار: أحدث لمسة يفوز، وبلا سجل → آخر قيمة (توافق رجعي)
export function pickLatestStopMarkId(
  stopMarks: Record<string, string>,
  touchedAt: StopMarkTouchedAt,
): string | null {
  const entries = Object.entries(stopMarks || {}).filter(([, id]) => Boolean(id));
  if (entries.length === 0) return null;
  let bestId: string | null = null;
  let bestTs = 0;
  for (const [book, id] of entries) {
    const ts = Number(touchedAt[book]) || 0;
    if (ts > bestTs) {
      bestTs = ts;
      bestId = String(id);
    }
  }
  if (bestTs <= 0) return String(entries[entries.length - 1][1]);
  return bestId;
}
