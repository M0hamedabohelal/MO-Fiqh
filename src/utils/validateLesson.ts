// التحقق من بيانات المسألة قبل الحفظ — يمنع بيانات فاسدة تكسر العرض أو الترتيب
// بدون اعتماديات خارجية (صفر زيادة في الحزمة) — نفس قواعد zod المقترحة يدويًا
import type { Lesson } from '../types';

export interface LessonInput {
  bookName?: unknown;
  chapterName?: unknown;
  title?: unknown;
  mainText?: unknown;
  sheikhExplanation?: unknown;
  videoUrl?: unknown;
  mediaUrl?: unknown;
  pageNumber?: unknown;
  [key: string]: unknown;
}

const URL_RE = /^https?:\/\/.+/i;
const MAX_TEXT = 60000;
const MAX_SHORT = 500;

export function validateLessonForm<T extends object>(input: T): string[] {
  const errors: string[] = [];
  const rec = input as Record<string, unknown>;
  const str = (v: unknown): string => String(v ?? '').trim();

  const bookName = str(rec['bookName']);
  const title = str(rec['title']);
  const chapterName = str(rec['chapterName']);
  const mainText = str(rec['mainText']);
  const explanation = str(rec['sheikhExplanation']);

  if (!bookName) errors.push('اسم الكتاب إلزامي.');
  else if (bookName.length > MAX_SHORT) errors.push('اسم الكتاب طويل جدًا.');

  if (!title) errors.push('عنوان المسألة إلزامي.');
  else if (title.length > MAX_SHORT) errors.push('عنوان المسألة طويل جدًا.');

  if (chapterName.length > MAX_SHORT) errors.push('اسم الباب طويل جدًا.');

  if (!mainText && !explanation) {
    errors.push('يجب إدخال نص المتن أو شرح الشيخ على الأقل.');
  }
  if (mainText.length > MAX_TEXT) errors.push('نص المتن يتجاوز الحد المسموح.');
  if (explanation.length > MAX_TEXT) errors.push('شرح الشيخ يتجاوز الحد المسموح.');

  const videoUrl = str(rec['videoUrl']);
  if (videoUrl && !URL_RE.test(videoUrl)) errors.push('رابط الفيديو غير صالح (يجب أن يبدأ بـ http).');

  const audioUrl = str(rec['audioUrl']);
  if (audioUrl && !URL_RE.test(audioUrl)) {
    errors.push('رابط الصوت غير صالح (يجب أن يبدأ بـ http — يفضّل MP3 مباشر).');
  }

  const mediaUrl = str(rec['mediaUrl']);
  if (mediaUrl && !URL_RE.test(mediaUrl) && !mediaUrl.startsWith('/')) {
    errors.push('رابط الميديا غير صالح.');
  }

  const page = str(rec['pageNumber']);
  if (page.length > 20) errors.push('رقم الصفحة غير منطقي.');

  return errors;
}

// تنظيف + تقليم قبل الحفظ — يُستدعى بعد نجاح التحقق
export function cleanLessonForm<T extends object>(form: T): T {
  const out: Record<string, unknown> = { ...(form as Record<string, unknown>) };
  for (const k of ['bookName', 'chapterName', 'title', 'mainText', 'sheikhExplanation', 'videoUrl', 'audioUrl', 'mediaUrl', 'adminNote'] as const) {
    if (typeof out[k] === 'string') out[k] = (out[k] as string).trim();
  }
  return out as T;
}

// فلترة ملف الاستيراد بالجملة: تُسقط العناصر الفاسدة مع تقرير أسباب
export function filterValidBulkLessons(
  items: Array<Partial<Lesson>>,
): { valid: Array<Omit<Lesson, 'id' | '_docId'>>; rejected: number; reasons: string[] } {
  const valid: Array<Omit<Lesson, 'id' | '_docId'>> = [];
  const reasons: string[] = [];
  let rejected = 0;
  items.forEach((item, i) => {
    const errs = validateLessonForm(item as LessonInput);
    if (errs.length === 0) {
      valid.push(cleanLessonForm(item) as Omit<Lesson, 'id' | '_docId'>);
    } else {
      rejected += 1;
      if (reasons.length < 5) reasons.push(`عنصر #${i + 1}: ${errs[0]}`);
    }
  });
  return { valid, rejected, reasons };
}
