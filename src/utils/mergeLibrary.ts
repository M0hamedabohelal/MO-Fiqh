// دمج مكتبة الضيف مع مكتبة السحابة — دالة pure قابلة للاختبار
// مستخرجة من useUserLibrary للحفاظ على نفس السلوك مع إمكانية التغطية بـ vitest
import type { HighlightItem } from '../types';

export interface LibraryState {
  bookmarks: string[];
  highlights: HighlightItem[];
  notes: Record<string, string>;
  readLessons: string[];
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

  const mergedReadLessons = Array.from(
    new Set([...asStrings(guest.readLessons), ...asStrings(cloud.readLessons)]),
  );

  return {
    bookmarks: mergedBookmarks,
    highlights: Array.from(highlightMap.values()),
    notes: mergedNotes,
    readLessons: mergedReadLessons,
  };
}

// تطبيع خريطة الملاحظات قبل الدمج: تقليم النصوص وإسقاط الفارغ (الفارغة = محذوفة —
// نفس قاعدة الحفظ في الواجهة)، حتى يقارن الدمج الثلاثي قيمًا نظيفة لا فراغات عابرة
export function normalizeNoteMap(notes: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  Object.entries(notes || {}).forEach(([k, v]) => {
    const t = typeof v === 'string' ? v.trim() : '';
    if (t) out[k] = t;
  });
  return out;
}

// ─── الدمج الثلاثي الاتجاهات لقيم الخرائط (three-way merge) ───
// المشكلة: الدمج السابق كان "المحلي يفوز دائمًا عند التعارض"، فأي مزامنة صادرة
// من جهاز يحمل قيمة قديمة (مفتوح منذ زمن/عائد من أوفلاين/بعد استعادة نسخة)
// كانت تمحو القيمة الأحدث على السحابة (علامة توقف أو نص ملاحظة)، فيلتقطها
// الجهاز الآخر وتتقاربان على القديم.
// الحل بلا طوابع زمنية: آخر حالة مكتوبة بنجاح (base) هي المرجع —
// لكل مفتاح: لم يتغير محليًا (يساوي base) ← تُؤخذ السحابة،
//           لم يتغير سحابيًا (يساوي base) ← تُؤخذ المحلية،
//           تغيّر في الجهتين (تعارض حقيقي نادر) ← المحلية (نية صريحة لهذا الجهاز
//           كالاستعادة، وتقارب حتمي على آخر جهازٍزامن).
// الغائب يُعامل كقيمة: حذف من جهة واحدة مع ثبات الأخرى = حذف (تؤكده الشواهد لاحقًا).
export function threeWayMergeMaps(
  base: Record<string, string>,
  local: Record<string, string>,
  cloud: Record<string, string>,
): Record<string, string> {
  const b = base || {};
  const l = local || {};
  const c = cloud || {};
  const out: Record<string, string> = {};
  const keys = new Set([...Object.keys(b), ...Object.keys(l), ...Object.keys(c)]);
  keys.forEach((k) => {
    const bv = b[k];
    const lv = l[k];
    const cv = c[k];
    if (lv === cv) {
      if (lv !== undefined) out[k] = String(lv);
    } else if (lv === bv) {
      if (cv !== undefined) out[k] = String(cv);
    } else if (cv === bv) {
      if (lv !== undefined) out[k] = String(lv);
    } else {
      // تعارض حقيقي: الجهتان غيّرتا المفتاح منذ آخر مزامنة — المحلية تفوز
      if (lv !== undefined) out[k] = String(lv);
    }
  });
  return out;
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
}

export function emptyTombs(): TombstoneMap {
  return { bookmarks: {}, readLessons: {}, highlightIds: {}, noteKeys: {} };
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

// ─── إسقاط الشواهد "العالقة" ───
// المشكلة: شاهد حذف مسجَّل يبقى عالقًا في ذاكرة جهاز، فيستمر بإسقاط عنصر قادم من
// جهاز آخر ثم يعيد تسجيل حذفه ويُعيد ما رفعه الجهاز الأول —
// حلقة محو ذاتية. العلامة: الشاهد يعيق عنصرًا ما زال قائمًا في السحابة = بلا أساس
// (أُلغيت إعادته من جهاز آخر فنُزع شاهده هنالك).
// تُحترم الشواهد الحديثة (أقل من graceMs) حتى لا تُلغى حذفة محلية لم تُرفع بعد
// (نافذة الـ250ms قبل الرفع) فتعود بالخطأ.
export function dropStaleTombs(
  tombs: TombstoneMap,
  present: LibraryState,
  graceMs = 10000,
  now = Date.now(),
): TombstoneMap {
  const t = cleanTombs(tombs);
  const sets = {
    bookmarks: new Set(asStrings(present.bookmarks)),
    readLessons: new Set(asStrings(present.readLessons)),
    highlightIds: new Set((present.highlights || []).map((h) => String(h.id ?? h.text))),
    noteKeys: new Set(Object.keys(present.notes || {})),
  };
  (Object.keys(t) as Array<keyof TombstoneMap>).forEach((section) => {
    Object.entries(t[section]).forEach(([k, ts]) => {
      if (sets[section].has(k) && now - ts > graceMs) delete t[section][k];
    });
  });
  return t;
}

// إسقاط المشهود بحذفه من المدمج — إلا ما هو موجود محليًا (إعادة إضافة تُلغي الشاهد)
export function applyTombsToMerged(merged: LibraryState, local: LibraryState, tombs: TombstoneMap): LibraryState {
  const t = cleanTombs(tombs);
  const localBookmarks = new Set(asStrings(local.bookmarks));
  const localRead = new Set(asStrings(local.readLessons));
  const localHl = new Set((local.highlights || []).map((h) => String(h.id ?? h.text)));
  const localNotes = local.notes || {};
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
  };
  (Object.keys(out) as Array<keyof TombstoneMap>).forEach((section) => {
    Object.entries(t[section]).forEach(([k, ts]) => {
      if (!has[section].has(k)) out[section][k] = ts;
    });
  });
  return out;
}
