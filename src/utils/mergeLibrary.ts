// دمج مكتبة الضيف مع مكتبة السحابة — دالة pure قابلة للاختبار
// مستخرجة من useUserLibrary للحفاظ على نفس السلوك مع إمكانية التغطية بـ vitest
import type { HighlightItem } from '../types';

export interface LibraryState {
  bookmarks: string[];
  highlights: HighlightItem[];
  notes: Record<string, string>;
  readLessons: string[];
  stopMarks: Record<string, string>;
}

const asStrings = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);

export function mergeLibraries(
  cloud: Partial<LibraryState>,
  guest: Partial<LibraryState>,
): LibraryState {
  const mergedBookmarks = Array.from(
    new Set([...asStrings(cloud.bookmarks), ...asStrings(guest.bookmarks)]),
  );

  const highlightMap = new Map<string, HighlightItem>();
  [...(guest.highlights ?? []), ...(cloud.highlights ?? [])].forEach((h) => {
    if (h) highlightMap.set(String(h.id ?? h.text), h);
  });

  // ملاحظات السحابة أحدث (كُتبت من جهاز آخر) — تتفوق عند التعارض، وملاحظات الضيف الجديدة تُضاف
  const mergedNotes: Record<string, string> = { ...(guest.notes ?? {}), ...(cloud.notes ?? {}) };

  // علامات التوقف: نفس القاعدة — السحابة تتفوق عند التعارض على نفس الكتاب (جهاز آخر أحدث غالبًا)
  const mergedStopMarks: Record<string, string> = { ...(guest.stopMarks ?? {}), ...(cloud.stopMarks ?? {}) };

  const mergedReadLessons = Array.from(
    new Set([...asStrings(guest.readLessons), ...asStrings(cloud.readLessons)]),
  );

  return {
    bookmarks: mergedBookmarks,
    highlights: Array.from(highlightMap.values()),
    notes: mergedNotes,
    readLessons: mergedReadLessons,
    stopMarks: mergedStopMarks,
  };
}

// ─── شواهد الحذف (tombstones): الحل الجذري لعودة المحذوف ───
// المشكلة: "معروف سابقًا" لا يميّز "جديد من جهاز آخر" عن "محذوف عمدًا هنا"،
// فيعود المحذوف عبر المستمع اللحظي للأبد عند أي تعديل متزامن على جهاز آخر.
// الشاهد = تسجيل صريح "حُذف هذا المفتاح" يُزامن سحابيًا فتتفق عليه كل الأجهزة.
// القواعد: الوجود المحلي يفوز دائمًا (إعادة الإضافة تُلغي الشاهد)، والشاهد
// للمفاتيح الغائبة محليًا يُسقطها من أي دمج قادم. الشواهد لعناصر عادت تُحذف تلقائيًا.

export interface TombstoneMap {
  bookmarks: Record<string, number>;
  readLessons: Record<string, number>;
  highlightIds: Record<string, number>;
  noteKeys: Record<string, number>;
  stopMarkKeys: Record<string, number>;
}

export function emptyTombs(): TombstoneMap {
  return { bookmarks: {}, readLessons: {}, highlightIds: {}, noteKeys: {}, stopMarkKeys: {} };
}

function cleanTombsSection(v: unknown): Record<string, number> {
  if (!v || typeof v !== 'object') return {};
  const out: Record<string, number> = {};
  Object.entries(v as Record<string, unknown>).forEach(([k, ts]) => {
    const n = Number(ts);
    out[k] = Number.isFinite(n) && n > 0 ? n : Date.now();
  });
  return out;
}

export function cleanTombs(v: unknown): TombstoneMap {
  const o = (v && typeof v === 'object' ? v : {}) as Partial<TombstoneMap>;
  return {
    bookmarks: cleanTombsSection(o.bookmarks),
    readLessons: cleanTombsSection(o.readLessons),
    highlightIds: cleanTombsSection(o.highlightIds),
    noteKeys: cleanTombsSection(o.noteKeys),
    stopMarkKeys: cleanTombsSection(o.stopMarkKeys),
  };
}

// اتحاد شاهدين (الأجهزة تتفق — يُؤخذ الأحدث عند التعارض الشكلي)
export function mergeTombs(a: TombstoneMap, b: TombstoneMap): TombstoneMap {
  const ca = cleanTombs(a);
  const cb = cleanTombs(b);
  const out = emptyTombs();
  (Object.keys(out) as Array<keyof TombstoneMap>).forEach((section) => {
    const keys = new Set([...Object.keys(ca[section]), ...Object.keys(cb[section])]);
    keys.forEach((k) => {
      out[section][k] = Math.max(ca[section][k] || 0, cb[section][k] || 0);
    });
  });
  return out;
}

// إسقاط المشهود بحذفه من المدمج — إلا ما هو موجود محليًا (إعادة إضافة تُلغي الشاهد)
export function applyTombsToMerged(merged: LibraryState, local: LibraryState, tombs: TombstoneMap): LibraryState {
  const t = cleanTombs(tombs);
  const localBookmarks = new Set(asStrings(local.bookmarks));
  const localRead = new Set(asStrings(local.readLessons));
  const localHl = new Set((local.highlights || []).map((h) => String(h.id ?? h.text)));
  const localNotes = local.notes || {};
  const localMarks = local.stopMarks || {};
  return {
    bookmarks: merged.bookmarks.filter((id) => localBookmarks.has(String(id)) || !t.bookmarks[String(id)]),
    readLessons: merged.readLessons.filter((id) => localRead.has(String(id)) || !t.readLessons[String(id)]),
    highlights: (merged.highlights || []).filter((h) => {
      const id = String(h.id ?? h.text);
      return localHl.has(id) || !t.highlightIds[id];
    }),
    notes: Object.fromEntries(
      Object.entries(merged.notes || {}).filter(([k]) => k in localNotes || !t.noteKeys[k]),
    ),
    stopMarks: Object.fromEntries(
      Object.entries(merged.stopMarks || {}).filter(([k]) => k in localMarks || !t.stopMarkKeys[k]),
    ),
  };
}

// تنظيف الشواهد: ما عاد موجودًا (أُعيدت إضافته) يُحذف شاهده — يمنع النمو اللانهائي
export function pruneTombs(tombs: TombstoneMap, present: LibraryState): TombstoneMap {
  const t = cleanTombs(tombs);
  const out = emptyTombs();
  const has = {
    bookmarks: new Set(asStrings(present.bookmarks)),
    readLessons: new Set(asStrings(present.readLessons)),
    highlightIds: new Set((present.highlights || []).map((h) => String(h.id ?? h.text))),
    noteKeys: new Set(Object.keys(present.notes || {})),
    stopMarkKeys: new Set(Object.keys(present.stopMarks || {})),
  };
  (Object.keys(out) as Array<keyof TombstoneMap>).forEach((section) => {
    Object.entries(t[section]).forEach(([k, ts]) => {
      if (!has[section].has(k)) out[section][k] = ts;
    });
  });
  return out;
}
