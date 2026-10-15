// طبقة الخدمات — كل التعامل مع Firestore في مكان واحد
// يبدأ بمسار البيانات فقط (firestore) — لا يُسحب auth معه
import { getFirestore, isFirebaseConfigured } from './config';
import { applyTombsToMerged, pruneTombs, mergeTombs, cleanTombs } from '../utils/mergeLibrary';
import type { TombstoneMap } from '../utils/mergeLibrary';
import type { Firestore } from 'firebase/firestore';
import type * as FsMod from 'firebase/firestore';
import type { Lesson, GlossaryMap, UserLibraryData, AnnouncementItem, HighlightItem } from '../types';

async function getDb(): Promise<{ db: Firestore; fs: typeof FsMod }> {
  if (!isFirebaseConfigured) throw new Error('Firebase غير مهيأ');
  const { db, fsMod } = await getFirestore();
  return { db, fs: fsMod };
}

/* ==================== المسائل (Lessons) ==================== */

// جلب كل المسائل مرتبة حسب id
// ملاحظة أداء: للمجموعات الصغيرة (< ~2000) الجلب الكامل مقبول ومخزّن محليًا.
// للمجموعات الكبيرة استخدم fetchLessonsPaged بالأسفل (ترقيم + startAfter).
export async function fetchLessons(): Promise<Lesson[]> {
  const { db, fs } = await getDb();
  const snapshot = await fs.getDocs(fs.collection(db, 'lessons'));
  return snapshot.docs
    .map((d) => ({ ...d.data(), _docId: d.id }) as Lesson)
    .sort((a, b) => Number(a.id) - Number(b.id));
}

// جلب مرقّم للمسائل (للتوسع المستقبلي — لا يكسر السلوك الحالي)
// يُستخدم مع orderBy('id') + limit لتجنّب جلب آلاف المستندات دفعة واحدة.
export async function fetchLessonsPaged(
  pageSize = 50,
  cursorId?: number,
): Promise<{ items: Lesson[]; lastId: number | null; hasMore: boolean }> {
  const { db, fs } = await getDb();
  const constraints: unknown[] = [fs.orderBy('id', 'asc'), fs.limit(pageSize + 1)];
  // startAfter يحتاج DocumentSnapshot في الـ SDK — نبنيه عبر استعلام تمهيدي رخيص بالـ id
  let q = fs.query(fs.collection(db, 'lessons'), ...(constraints as never[]));
  if (cursorId != null) {
    const cursorSnap = await fs.getDocs(
      fs.query(fs.collection(db, 'lessons'), fs.where('id', '==', cursorId), fs.limit(1)),
    );
    const cursorDoc = cursorSnap.docs[0];
    // مؤشر مفقود (مسألة حُذفت) → صفحة فارغة بدل تكرار الصفحة الأولى خطأً
    if (!cursorDoc) return { items: [], lastId: cursorId, hasMore: false };
    q = fs.query(
      fs.collection(db, 'lessons'),
      fs.orderBy('id', 'asc'),
      fs.startAfter(cursorDoc),
      fs.limit(pageSize + 1),
    );
  }
  const snapshot = await fs.getDocs(q);
  const all = snapshot.docs.map((d) => ({ ...d.data(), _docId: d.id }) as Lesson);
  const hasMore = all.length > pageSize;
  const items = hasMore ? all.slice(0, pageSize) : all;
  const lastId = items.length > 0 ? Number(items[items.length - 1].id) : null;
  return { items, lastId, hasMore };
}

// ─── عدّاد ذري لمعرّفات المسائل — يمنع race بين مشرفَين ───
// counters/lessons = { value: number } — يُنشأ تلقائيًا من max(id) الحالي عند أول استخدام.
async function reserveLessonIds(count: number): Promise<number[] | null> {
  try {
    const { db, fs } = await getDb();
    const counterRef = fs.doc(db, 'counters', 'lessons');
    // بذر أول مرة: لو لا يوجد عدّاد، احسب max الحالي مرة واحدة فقط
    const existing = await fs.getDoc(counterRef);
    if (!existing.exists()) {
      const lessons = await fetchLessons();
      const numericIds = lessons.map((l) => Number(l.id)).filter((n) => Number.isFinite(n));
      const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 0;
      await fs.setDoc(counterRef, { value: maxId, updatedAt: Date.now() }, { merge: true });
    }
    let start = 0;
    await fs.runTransaction(db, async (tx) => {
      const snap = await tx.get(counterRef);
      const current = snap.exists() ? Number((snap.data() as { value?: unknown }).value) || 0 : 0;
      start = current + 1;
      tx.set(counterRef, { value: current + count, updatedAt: Date.now() }, { merge: true });
    });
    return Array.from({ length: count }, (_, i) => start + i);
  } catch (err) {
    // سقوط آمن للمنطق القديم — مع تسجيل السبب (صلاحيات/أوفلاين) للمراقبة
    try {
      const { logError } = await import('../utils/logError');
      logError('lessons.reserveIds', err, { count });
    } catch { /* تجاهل */ }
    return null;
  }
}

// إضافة مسألة جديدة (لوحة الإدارة)
export async function createLesson(lessonData: Omit<Lesson, 'id' | '_docId'>): Promise<Lesson> {
  const { db, fs } = await getDb();

  // المسار الجديد: حجز ذري — مشرفان يضيفان معًا يحصل كلٌّ على id مختلف
  const reserved = await reserveLessonIds(1);
  if (reserved) {
    const payload = { ...lessonData, id: reserved[0] };
    await fs.setDoc(fs.doc(db, 'lessons', String(reserved[0])), payload);
    return payload;
  }

  // Fallback القديم (أوفلاين / counters غير متاح)
  const existing = await fetchLessons();
  // ترشيح القيم غير الرقمية — معرّف واحد فاسد كان يسمّم Math.max بـ NaN فينتج nextId=NaN
  const numericIds = existing.map((l) => Number(l.id)).filter((n) => Number.isFinite(n));
  const nextId = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;

  const payload = { ...lessonData, id: nextId };
  await fs.setDoc(fs.doc(db, 'lessons', String(nextId)), payload);
  return payload;
}

// استيراد بالجملة — رفع مصفوفة مسائل دفعة واحدة بمعرفات متسلسلة تلقائياً
// يستخدم حجزًا ذريًا + WriteBatch (كتابة واحدة بدل N كتابات متتالية)
export async function bulkCreateLessons(lessonsArray: Array<Omit<Lesson, 'id' | '_docId'>>): Promise<number> {
  const { db, fs } = await getDb();

  const reserved = await reserveLessonIds(lessonsArray.length);
  if (reserved) {
    // دفعات من 400 (حد Firestore الآمن 500 عملية لكل batch)
    const CHUNK = 400;
    for (let i = 0; i < lessonsArray.length; i += CHUNK) {
      const batch = fs.writeBatch(db);
      const slice = lessonsArray.slice(i, i + CHUNK);
      slice.forEach((item, j) => {
        const id = reserved[i + j];
        const cleanItem: Record<string, unknown> = { ...item };
        delete cleanItem._docId;
        delete cleanItem.id;
        batch.set(fs.doc(db, 'lessons', String(id)), { ...cleanItem, id });
      });
      await batch.commit();
    }
    return lessonsArray.length;
  }

  // Fallback القديم
  const existing = await fetchLessons();
  const numericIds = existing.map((l) => Number(l.id)).filter((n) => Number.isFinite(n));
  let nextId = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;

  let uploaded = 0;
  for (const item of lessonsArray) {
    // نتجاهل أي معرف قادم من الملف ونعيد الترقيم تلقائياً
    const cleanItem: Record<string, unknown> = { ...item };
    delete cleanItem._docId;
    delete cleanItem.id;
    const payload = { ...cleanItem, id: nextId };
    await fs.setDoc(fs.doc(db, 'lessons', String(nextId)), payload);
    uploaded += 1;
    nextId += 1;
  }
  return uploaded;
}

// تعديل مسألة موجودة (docId هو معرف المستند في Firestore)
export async function updateLesson(docId: string, lessonData: Lesson): Promise<void> {
  const { db, fs } = await getDb();
  await fs.setDoc(fs.doc(db, 'lessons', String(docId)), lessonData);
}

// حذف مسألة
export async function deleteLessonById(docId: string): Promise<void> {
  const { db, fs } = await getDb();
  await fs.deleteDoc(fs.doc(db, 'lessons', String(docId)));
}

/* ==================== القاموس الفقهي (Glossary) ==================== */

// جلب القاموس ككائن { مصطلح: تعريف }
export async function fetchGlossary(): Promise<GlossaryMap> {
  const { db, fs } = await getDb();
  const snapshot = await fs.getDocs(fs.collection(db, 'glossary'));
  const result: GlossaryMap = {};
  snapshot.forEach((d) => {
    result[d.id] = d.data().definition;
  });
  return result;
}

// إضافة/تعديل مصطلح
export async function saveTerm(term: string, definition: string): Promise<void> {
  const { db, fs } = await getDb();
  await fs.setDoc(fs.doc(db, 'glossary', term), { definition });
}

// حذف مصطلح
export async function deleteTerm(term: string): Promise<void> {
  const { db, fs } = await getDb();
  await fs.deleteDoc(fs.doc(db, 'glossary', term));
}

/* ==================== بيانات المستخدم (User Data) ==================== */
/* المفضلة والفوائد والملاحظات — مستند واحد لكل نوع، متزامن عبر الأجهزة */

async function userRoot(db: Firestore, fs: typeof FsMod, uid: string) {
  return fs.collection(db, 'users', uid, 'data');
}

// جلب كل بيانات المستخدم: bookmarks / highlights / notes / readLessons / visits / stopMarks / tombstones
export async function fetchUserData(uid: string): Promise<UserLibraryData> {
  const { db, fs } = await getDb();
  const snapshot = await fs.getDocs(await userRoot(db, fs, uid));
  const data: UserLibraryData = { bookmarks: [], highlights: [], notes: {}, readLessons: [], visits: [], stopMarks: {}, tombs: { bookmarks: {}, readLessons: {}, highlightIds: {}, noteKeys: {}, stopMarkKeys: {} } };
  snapshot.forEach((d) => {
    const value = d.data();
    switch (d.id) {
      case 'bookmarks':
        data.bookmarks = value.items || [];
        break;
      case 'highlights':
        data.highlights = value.items || [];
        break;
      case 'notes':
        data.notes = value.notes || {};
        break;
      case 'readLessons':
        data.readLessons = value.items || [];
        break;
      case 'visits':
        data.visits = value.items || [];
        break;
      case 'stopMarks':
        data.stopMarks = value.marks && typeof value.marks === 'object' ? value.marks : {};
        break;
      case 'tombstones':
        data.tombs = cleanTombs(value.tombs);
        break;
      default:
        break;
    }
  });
  return data;
}

async function saveUserDataSection(
  db: Firestore,
  fs: typeof FsMod,
  uid: string,
  section: string,
  value: Record<string, unknown>,
): Promise<void> {
  await fs.setDoc(fs.doc(await userRoot(db, fs, uid), section), value, { merge: true });
}

export async function syncBookmarks(uid: string, bookmarkIds: string[]): Promise<void> {
  const { db, fs } = await getDb();
  await saveUserDataSection(db, fs, uid, 'bookmarks', { items: bookmarkIds });
}

export async function syncHighlights(uid: string, highlightsArray: HighlightItem[]): Promise<void> {
  const { db, fs } = await getDb();
  await saveUserDataSection(db, fs, uid, 'highlights', { items: highlightsArray });
}

// مزامنة علامات التوقف لكل كتاب — لتظهر على كل أجهزة المستخدم
export async function syncStopMarks(uid: string, marks: Record<string, string>): Promise<void> {
  const { db, fs } = await getDb();
  await saveUserDataSection(db, fs, uid, 'stopMarks', { marks });
}

// ─── الدمج عند الكتابة: يمنع ضياع تعديلات جهاز آخر ───
// بدل الكتابة العمياء للقسم كاملًا (الأخير يمحو ما كتبه الجهاز الآخر)،
// نقرأ الأحدث أولًا وندمج على مستوى العنصر ثم نكتب. نافذة السباق المتبقية
// أجزاء من الثانية بدل الجلسة كاملة.
// tombs: شواهد الحذف المتفق عليها سحابيًا — المشهود بحذفه يُسقط نهائيًا
// (لا يعود عبر أي جهاز) إلا بإعادة إضافته صراحةً محليًا. تُحفظ مع البيانات.
export async function mergeAndSyncLibrary(
  uid: string,
  local: {
    bookmarks: string[];
    highlights: HighlightItem[];
    notes: Record<string, string>;
    readLessons: string[];
    stopMarks: Record<string, string>;
  },
  inputTombs?: TombstoneMap,
): Promise<{
  data: {
    bookmarks: string[];
    highlights: HighlightItem[];
    notes: Record<string, string>;
    readLessons: string[];
    stopMarks: Record<string, string>;
  };
  tombs: TombstoneMap;
}> {
  const cloud = await fetchUserData(uid);
  const tombs = mergeTombs(cleanTombs(cloud.tombs), cleanTombs(inputTombs));
  const str = (v: unknown): string => String(v);

  // اتحاد، المحلي يفوز، مع تقليم الفارغ (سلوك معتمد: الملاحظة الفارغة = محذوفة)
  const unionBookmarks = Array.from(new Set([
    ...(local.bookmarks || []).map(str),
    ...(cloud.bookmarks || []).map(str),
  ]));
  const unionRead = Array.from(new Set([
    ...(local.readLessons || []).map(str),
    ...(cloud.readLessons || []).map(str),
  ]));
  const hlMap = new Map<string, HighlightItem>();
  [...(local.highlights || []), ...(cloud.highlights || [])].forEach((h) => {
    if (h) hlMap.set(str(h.id ?? h.text), h);
  });
  const unionNotes: Record<string, string> = {};
  Object.entries(local.notes || {}).forEach(([k, v]) => { if (v && v.trim()) unionNotes[k] = v; });
  Object.entries(cloud.notes || {}).forEach(([k, v]) => {
    if (!(k in unionNotes) && v && v.trim()) unionNotes[k] = v;
  });
  const unionMarks: Record<string, string> = {};
  Object.entries(local.stopMarks || {}).forEach(([k, v]) => { if (v && str(v).trim()) unionMarks[k] = str(v).trim(); });
  Object.entries(cloud.stopMarks || {}).forEach(([k, v]) => {
    if (!(k in unionMarks) && v && str(v).trim()) unionMarks[k] = str(v).trim();
  });

  // إسقاط المشهود بحذفه (إلا ما أُعيد محليًا) ثم تنظيف شواهد العائدين
  const merged = { bookmarks: unionBookmarks, highlights: Array.from(hlMap.values()), notes: unionNotes, readLessons: unionRead, stopMarks: unionMarks };
  const finalData = applyTombsToMerged(merged, local, tombs);
  const prunedTombs = pruneTombs(tombs, finalData);

  const { db, fs } = await getDb();
  await Promise.all([
    saveUserDataSection(db, fs, uid, 'bookmarks', { items: finalData.bookmarks }),
    saveUserDataSection(db, fs, uid, 'highlights', { items: finalData.highlights }),
    saveUserDataSection(db, fs, uid, 'notes', { notes: finalData.notes }),
    saveUserDataSection(db, fs, uid, 'readLessons', { items: finalData.readLessons }),
    saveUserDataSection(db, fs, uid, 'stopMarks', { marks: finalData.stopMarks }),
    saveUserDataSection(db, fs, uid, 'tombstones', { tombs: prunedTombs }),
  ]);
  return { data: finalData, tombs: prunedTombs };
}

// مزامنة قائمة المسائل المقروءة (تتبع التقدم)
export async function syncReadLessons(uid: string, readLessonIds: string[]): Promise<void> {
  const { db, fs } = await getDb();
  await saveUserDataSection(db, fs, uid, 'readLessons', { items: readLessonIds });
}

// مزامنة أيام الزيارة لسلسلة المواظبة عبر الأجهزة
export async function syncVisitDays(uid: string, daysArray: string[]): Promise<void> {
  const { db, fs } = await getDb();
  await saveUserDataSection(db, fs, uid, 'visits', { items: daysArray });
}

/* ==================== إحصائيات القراءة ==================== */

// تسجيل مشاهدة مسألة — عداد مركزي في مستند واحد stats/views
export async function trackLessonView(lessonId: string | number): Promise<void> {
  try {
    const { db, fs } = await getDb();
    await fs.setDoc(
      fs.doc(db, 'stats', 'views'),
      { [`lesson_${lessonId}`]: fs.increment(1) },
      { merge: true }
    );
  } catch (err) {
    // تجاهل أخطاء التتبع — ليست حرجة (تُسجَّل محليًا فقط وبخنق)
    try {
      const { logError } = await import('../utils/logError');
      logError('stats.trackLessonView', err, { lessonId: String(lessonId) });
    } catch {
      /* تجاهل */
    }
  }
}

// جلب خريطة المشاهدات { lesson_1: 42, ... } للوحة الإدارة
export async function fetchLessonViews(): Promise<Record<string, number>> {
  const { db, fs } = await getDb();
  const snap = await fs.getDoc(fs.doc(db, 'stats', 'views'));
  return snap.exists() ? (snap.data() as Record<string, number>) : {};
}

// حفظ ملاحظة مسألة واحدة داخل خريطة الملاحظات الكاملة
export async function syncNote(uid: string, lessonId: string, noteText: string): Promise<void> {
  const { db, fs } = await getDb();
  const notesSnap = await fs.getDoc(fs.doc(await userRoot(db, fs, uid), 'notes'));
  const currentNotes = notesSnap.exists() ? (notesSnap.data().notes as Record<string, string>) || {} : {};
  if (!noteText || !noteText.trim()) {
    delete currentNotes[lessonId];
  } else {
    currentNotes[lessonId] = noteText.trim();
  }
  await saveUserDataSection(db, fs, uid, 'notes', { notes: currentNotes });
}

// حفظ خريطة الملاحظات كاملة دفعة واحدة (تُستخدم عند الدمج بعد تسجيل الدخول)
export async function syncAllNotes(uid: string, notesObject: Record<string, string>): Promise<void> {
  const { db, fs } = await getDb();
  await saveUserDataSection(db, fs, uid, 'notes', { notes: notesObject });
}

/* ==================== المشرفين (Admins) ==================== */

// هل المستخدم مشرف؟
export async function isAdmin(uid: string): Promise<boolean> {
  if (!isFirebaseConfigured || !uid) return false;
  try {
    const { db, fs } = await getDb();
    const adminDoc = await fs.getDoc(fs.doc(db, 'admins', uid));
    return adminDoc.exists();
  } catch {
    return false;
  }
}

/* ==================== سجل أخطاء العملاء (للمشرف فقط) ==================== */

export interface ClientErrorItem {
  id: string;
  scope: string;
  message: string;
  url?: string;
  at: number;
}

// أحدث أخطاء العملاء (القواعد: قراءة/حذف للأدمن فقط)
export async function fetchClientErrors(limitCount = 30): Promise<ClientErrorItem[]> {
  const { db, fs } = await getDb();
  const snapshot = await fs.getDocs(
    fs.query(fs.collection(db, 'client_errors'), fs.orderBy('at', 'desc'), fs.limit(limitCount)),
  );
  return snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ClientErrorItem, 'id'>) }));
}

// مسح خطأ واحد بعد معالجته
export async function deleteClientError(id: string): Promise<void> {
  const { db, fs } = await getDb();
  await fs.deleteDoc(fs.doc(db, 'client_errors', String(id)));
}

// حذف الأخطاء الأقدم من مدة معينة دفعة واحدة — بديل سياسة TTL (التي تتطلب تفعيل الفوترة)
// يُستدعى من زر صريح في لوحة الإدارة فقط (القراءة/الحذف للأدمن أصلًا) — حد أقصى لكل ضغطة أمانًا
export async function pruneOldClientErrors(
  olderThanMs = 30 * 24 * 60 * 60 * 1000,
  batchLimit = 200,
): Promise<number> {
  const { db, fs } = await getDb();
  const cutoff = Date.now() - olderThanMs;
  const snapshot = await fs.getDocs(
    fs.query(fs.collection(db, 'client_errors'), fs.where('at', '<', cutoff), fs.limit(batchLimit)),
  );
  if (snapshot.empty) return 0;
  // دفعات من 400 (حد Firestore الآمن 500 عملية لكل batch)
  const CHUNK = 400;
  const docs = snapshot.docs;
  for (let i = 0; i < docs.length; i += CHUNK) {
    const batch = fs.writeBatch(db);
    docs.slice(i, i + CHUNK).forEach((d) => { batch.delete(d.ref); });
    await batch.commit();
  }
  return docs.length;
}

/* ==================== الترحيل الأولي (Migration) ==================== */
// رفع الداتا المحلية للـ Firestore مرة واحدة فقط

export async function migrateInitialData(lessonsArray: Lesson[], glossaryObject: GlossaryMap): Promise<number> {
  const { db, fs } = await getDb();

  let uploaded = 0;

  for (const lesson of lessonsArray) {
    await fs.setDoc(fs.doc(db, 'lessons', String(lesson.id)), lesson);
    uploaded += 1;
  }

  for (const [term, definition] of Object.entries(glossaryObject)) {
    await fs.setDoc(fs.doc(db, 'glossary', term), { definition });
    uploaded += 1;
  }

  return uploaded;
}

/* ==================== الإشعارات (Announcements) ==================== */
export async function fetchAnnouncements(): Promise<AnnouncementItem[]> {
  const { db, fs } = await getDb();
  const snapshot = await fs.getDocs(fs.collection(db, 'announcements'));
  return snapshot.docs
    .map((d) => ({ ...d.data(), id: d.id }) as AnnouncementItem)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function createAnnouncement(
  annData: Omit<AnnouncementItem, 'id' | 'createdAt'>,
): Promise<AnnouncementItem> {
  const { db, fs } = await getDb();
  const docRef = fs.doc(fs.collection(db, 'announcements'));
  const payload = { ...annData, createdAt: Date.now() };
  await fs.setDoc(docRef, payload);
  return { ...payload, id: docRef.id };
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const { db, fs } = await getDb();
  await fs.deleteDoc(fs.doc(db, 'announcements', String(id)));
}
