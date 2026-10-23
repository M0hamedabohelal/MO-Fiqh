import type { HighlightItem } from '../types';

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
  stopMarks?: Record<string, unknown>;
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
  theme: 'theme',
} as const;

export const noteKey = KEYS.note;
export const highlightKey = KEYS.highlight;
export const themeKey = KEYS.theme;

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

  out.bookmarks = Array.from(new Set([...(a.bookmarks ?? []), ...(b.bookmarks ?? [])]));
  out.readLessons = Array.from(new Set([...(a.readLessons ?? []), ...(b.readLessons ?? [])]));

  // ── الملاحظات ──
  const noteIds = new Set([...Object.keys(a.notes ?? {}), ...Object.keys(b.notes ?? {})]);
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

  // ── الفوائد ──
  const hlA = new Map<string, HighlightItem>();
  (a.highlights ?? []).forEach((h) => { if (h) hlA.set(byId(h), h); });
  const hlB = new Map<string, HighlightItem>();
  (b.highlights ?? []).forEach((h) => { if (h) hlB.set(byId(h), h); });
  const hlKeys = new Set([...hlA.keys(), ...hlB.keys()]);
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

  return out;
}

/**
 * توقيع مستقر للمحتوى — يُستخدم لكشف «هل تغيّر شيء فعلًا؟».
 * الترتيب مُطبَّع لأن المصفوفة نفسها قد تصل بترتيب مختلف بين الأجهزة.
 */
export function librarySignature(lib: SyncableLibrary): string {
  const parts = [
    `b:${[...(lib.bookmarks ?? [])].map(String).sort().join(',')}`,
    `r:${[...(lib.readLessons ?? [])].map(String).sort().join(',')}`,
    `n:${Object.entries(lib.notes ?? {}).sort(([x], [y]) => x.localeCompare(y)).map(([k, v]) => `${k}=${v}`).join('|')}`,
    `h:${(lib.highlights ?? []).map(byId).sort().join(',')}`,
    `t:${(lib as SyncableLibrary & { theme?: string }).theme ?? ''}`,
  ];
  return parts.join('§');
}
