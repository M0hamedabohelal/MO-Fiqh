import type { HighlightItem } from '../types';
import { mergeStopMarkMaps } from '../features/stopMarks/model';
import type { StopMarkMap } from '../features/stopMarks/model';

// ─── مزامنة مكتبة المستخدم بين الأجهزة ───
//
// البيانات المتزامنة: المفضلة · الفوائد (highlights) · الملاحظات · الثيم · علامات الوقف.
// (المسائل المقروءة تُزامَن كذلك لأنها لا تكلّف شيئًا وتفيد شريط التقدم بين الأجهزة.)
//
// مبادئ التصميم — كل واحدة منها عالجت عطلًا فعليًا أو خطرًا حقيقيًا:
//
// 1) الدمج لا الاستبدال: جهاز بلا تعديلات يجب ألا يمحو عمل جهاز آخر. الاتحاد هو
//    السلوك الافتراضي للمجموعات (مفضلة/فوائد/مقروءة).
// 2) آخر تعديل يفوز للقيم القابلة للاستبدال (نص الملاحظة، الثيم): كل مفتاح يحمل
//    طابعه الزمني في `updatedAt`، فيُحسم التعارض بالمقارنة لا بالوصول المتأخر.
// 3) حذف قابل للنشر: حذف عنصر يترك طابعه الزمني في `updatedAt`، فلو أعاد جهاز قديم
//    إرسال العنصر «يُعاد» حيًا. الطابع هو الذي يحمي الحذف، لا غياب العنصر.
// 4) التوقيع يمنع حلقة الكتابة: المستمع يشتعل بعد كل كتابة، فالمقارنة بالتوقيع ضرورية
//    حتى لا ندخل دورة كتابة/لقطة لا نهائية (وهو عطل وقع فعلًا في مزامنة الإشعارات).

export interface SyncableLibrary {
  bookmarks: string[];
  highlights: HighlightItem[];
  notes: Record<string, string>;
  readLessons: string[];
  /** علامات الوقف — خريطة كتاب → سجل (شكل StopMarkMap) */
  stopMarks?: StopMarkMap;
  /** الثيم المختار — قيمة واحدة يفوز فيها الأحدث */
  theme?: string;
  /** خريطة «مفتاح العنصر → طابعه الزمني» — أساس حلّ التعارض */
  updatedAt: Record<string, number>;
}

export const emptyLibrary = (): SyncableLibrary => ({
  bookmarks: [],
  highlights: [],
  notes: {},
  readLessons: [],
  stopMarks: {},
  updatedAt: {},
});

/** مسار مستند المكتبة — محصور بالمستخدم صاحبه */
export const libraryDocPath = (uid: string): string => `users/${uid}/data/library`;

/** هل المزامنة ممكنة؟ بلا معرف مستخدم لا مساس بالسحابة */
export const cloudEnabled = (uid: string | null | undefined): uid is string =>
  typeof uid === 'string' && uid.length > 0;

const KEYS = {
  note: (id: string) => `note:${id}`,
  highlight: (id: string) => `hl:${id}`,
  bookmark: (id: string) => `bm:${id}`,
  read: (id: string) => `read:${id}`,
  theme: 'theme',
} as const;

const ts = (lib: SyncableLibrary, key: string): number => {
  const v = lib.updatedAt?.[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
};

const byId = (h: HighlightItem): string => String(h?.id ?? h?.text ?? '');

/**
 * دمج مكتبتين بلا فقدان بيانات.
 * - مفضلة/مقروءة: اتحاد.
 * - ملاحظات/فوائد: الأحدث طابعًا يفوز؛ ومفتاح حُذف في الأحدث يُحذف.
 * - `updatedAt` الناتج = الأكبر لكل مفتاح (فلا ترجع ساعة جهاز قديم بالزمن).
 */
export function mergeLibraries(a: SyncableLibrary, b: SyncableLibrary): SyncableLibrary {
  const out = emptyLibrary();

  // ── المفضلة (طابع الأحدث يفوز للإضافة والحذف، مع اتحاد احتياطي للبيانات دون طابع) ──
  const bmIds = new Set([
    ...(a.bookmarks ?? []).map(String),
    ...(b.bookmarks ?? []).map(String),
    ...Object.keys(a.updatedAt ?? {})
      .filter((k) => k.startsWith('bm:'))
      .map((k) => k.slice(3)),
    ...Object.keys(b.updatedAt ?? {})
      .filter((k) => k.startsWith('bm:'))
      .map((k) => k.slice(3)),
  ]);

  const mergedBookmarks: string[] = [];
  for (const id of bmIds) {
    const key = KEYS.bookmark(id);
    const ta = ts(a, key);
    const tb = ts(b, key);
    const inA = (a.bookmarks ?? []).map(String).includes(id);
    const inB = (b.bookmarks ?? []).map(String).includes(id);

    // إن لم يكن لأي منهما طابع زمني (بيانات قديمة): الاتحاد الافتراضي
    if (ta === 0 && tb === 0) {
      if (inA || inB) mergedBookmarks.push(id);
      continue;
    }

    const winner = ta === tb ? (inA ? 'a' : inB ? 'b' : 'none') : ta > tb ? 'a' : 'b';
    if (winner === 'a' && inA) mergedBookmarks.push(id);
    else if (winner === 'b' && inB) mergedBookmarks.push(id);

    const stamp = Math.max(ta, tb);
    if (stamp > 0) out.updatedAt[key] = stamp;
  }
  out.bookmarks = mergedBookmarks;

  // ── المسائل المقروءة (طابع الأحدث يفوز للتعليم والإلغاء) ──
  const readIds = new Set([
    ...(a.readLessons ?? []).map(String),
    ...(b.readLessons ?? []).map(String),
    ...Object.keys(a.updatedAt ?? {})
      .filter((k) => k.startsWith('read:'))
      .map((k) => k.slice(5)),
    ...Object.keys(b.updatedAt ?? {})
      .filter((k) => k.startsWith('read:'))
      .map((k) => k.slice(5)),
  ]);

  const mergedRead: string[] = [];
  for (const id of readIds) {
    const key = KEYS.read(id);
    const ta = ts(a, key);
    const tb = ts(b, key);
    const inA = (a.readLessons ?? []).map(String).includes(id);
    const inB = (b.readLessons ?? []).map(String).includes(id);

    if (ta === 0 && tb === 0) {
      if (inA || inB) mergedRead.push(id);
      continue;
    }

    const winner = ta === tb ? (inA ? 'a' : inB ? 'b' : 'none') : ta > tb ? 'a' : 'b';
    if (winner === 'a' && inA) mergedRead.push(id);
    else if (winner === 'b' && inB) mergedRead.push(id);

    const stamp = Math.max(ta, tb);
    if (stamp > 0) out.updatedAt[key] = stamp;
  }
  out.readLessons = mergedRead;

  // ── الملاحظات (الأحدث يفوز، وحذف الملاحظة ينتشر كشاهد قبر) ──
  const noteIds = new Set([
    ...Object.keys(a.notes ?? {}),
    ...Object.keys(b.notes ?? {}),
    ...Object.keys(a.updatedAt ?? {})
      .filter((k) => k.startsWith('note:'))
      .map((k) => k.slice(5)),
    ...Object.keys(b.updatedAt ?? {})
      .filter((k) => k.startsWith('note:'))
      .map((k) => k.slice(5)),
  ]);
  for (const id of noteIds) {
    const key = KEYS.note(id);
    const ta = ts(a, key);
    const tb = ts(b, key);
    const inA = Object.prototype.hasOwnProperty.call(a.notes ?? {}, id);
    const inB = Object.prototype.hasOwnProperty.call(b.notes ?? {}, id);
    // الأحدث يحكم: إن كان أحدث مصدر لا يحمل المفتاح، فمعناه أنه حُذف هناك.
    const winner =
      ta === tb ? (inA ? 'a' : inB ? 'b' : 'none') : ta > tb ? 'a' : 'b';
    if (winner === 'a' && inA) out.notes[id] = a.notes[id];
    else if (winner === 'b' && inB) out.notes[id] = b.notes[id];
    else if (winner === 'none') { /* لا شيء */ }
    // winner='a' لكن inA=false → حُذف في الأحدث ⇒ لا نضيفه (حذف ينفذ)
    const stamp = Math.max(ta, tb);
    if (stamp > 0) out.updatedAt[key] = stamp;
  }

  // ── الفوائد (الأحدث يفوز، وحذف الفائدة ينتشر كشاهد قبر) ──
  const hlA = new Map<string, HighlightItem>();
  (a.highlights ?? []).forEach((h) => { if (h) hlA.set(byId(h), h); });
  const hlB = new Map<string, HighlightItem>();
  (b.highlights ?? []).forEach((h) => { if (h) hlB.set(byId(h), h); });
  const hlKeys = new Set([
    ...hlA.keys(),
    ...hlB.keys(),
    ...Object.keys(a.updatedAt ?? {})
      .filter((k) => k.startsWith('hl:'))
      .map((k) => k.slice(3)),
    ...Object.keys(b.updatedAt ?? {})
      .filter((k) => k.startsWith('hl:'))
      .map((k) => k.slice(3)),
  ]);
  for (const id of hlKeys) {
    if (!id) continue;
    const key = KEYS.highlight(id);
    const ta = ts(a, key);
    const tb = ts(b, key);
    const winner = ta === tb ? (hlA.has(id) ? hlA.get(id)! : hlB.get(id)!) : ta > tb ? hlA.get(id) : hlB.get(id);
    if (winner) out.highlights.push(winner);
    const stamp = Math.max(ta, tb);
    if (stamp > 0) out.updatedAt[key] = stamp;
  }

  // ── الثيم (قيمة واحدة، آخر تعديل يفوز) ──
  const ta = ts(a, KEYS.theme);
  const tb = ts(b, KEYS.theme);
  const themeSource = ta >= tb ? a : b;
  const themeValue = (themeSource as SyncableLibrary & { theme?: string }).theme;
  if (typeof themeValue === 'string' && themeValue) {
    (out as SyncableLibrary & { theme?: string }).theme = themeValue;
    out.updatedAt[KEYS.theme] = Math.max(ta, tb);
  }

  // ── علامات الوقف (خريطة كتاب → سجل، الأحدث طابعًا لكل كتاب يفوز) ──
  out.stopMarks = mergeStopMarkMaps(a.stopMarks, b.stopMarks);

  return out;
}

/**
 * توقيع مستقر للمحتوى — يُستخدم لكشف «هل تغيّر شيء فعلًا؟».
 * الترتيب مُطبَّع لأن المصفوفة نفسها قد تصل بترتيب مختلف بين الأجهزة.
 */
export function librarySignature(lib: SyncableLibrary): string {
  const stopMarksParts = Object.entries((lib.stopMarks ?? {}) as Record<string, { lessonId?: string | null; updatedAt?: number }>)
    .sort(([k1], [k2]) => k1.localeCompare(k2))
    .map(([k, v]) => `${k}:${v?.lessonId ?? ''}:${v?.updatedAt ?? 0}`)
    .join(';');

  const parts = [
    `b:${[...(lib.bookmarks ?? [])].map(String).sort().join(',')}`,
    `r:${[...(lib.readLessons ?? [])].map(String).sort().join(',')}`,
    `n:${Object.entries(lib.notes ?? {}).sort(([x], [y]) => x.localeCompare(y)).map(([k, v]) => `${k}=${v}`).join('|')}`,
    `h:${(lib.highlights ?? []).map(byId).sort().join(',')}`,
    `t:${(lib as SyncableLibrary & { theme?: string }).theme ?? ''}`,
    `s:${stopMarksParts}`,
  ];
  return parts.join('§');
}
