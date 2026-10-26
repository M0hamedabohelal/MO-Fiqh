// طبقة الخدمات — كل التعامل مع Firestore في مكان واحد
// يبدأ بمسار البيانات فقط (firestore) — لا يُسحب auth معه
import { getFirestore, isFirebaseConfigured } from './config';
import type { Firestore } from 'firebase/firestore';
import type * as FsMod from 'firebase/firestore';
import type { Lesson, GlossaryMap, AnnouncementItem } from '../types';

async function getDb(): Promise<{ db: Firestore; fs: typeof FsMod }> {
  if (!isFirebaseConfigured) throw new Error('Firebase غير مهيأ');
  const { db, fsMod } = await getFirestore();
  return { db, fs: fsMod };
}

/* ==================== المسائل (Lessons) ==================== */

// جلب كل المسائل مرتبة حسب id
// ملاحظة أداء: للمجموعات الصغيرة (< ~2000) الجلب الكامل مقبول ومخزّن محليًا.
export async function fetchLessons(): Promise<Lesson[]> {
  const { db, fs } = await getDb();
  const snapshot = await fs.getDocs(fs.collection(db, 'lessons'));
  return snapshot.docs
    .map((d) => ({ ...d.data(), _docId: d.id }) as Lesson)
    .sort((a, b) => Number(a.id) - Number(b.id));
}

// مشترك دائم على قائمة المسائل.
// سبب وجوده (وقاية من عطل Firestore داخلي معروف): جعل قراءة لحظية (getDocs/getDocsFromServer)
// أول عملية على اتصال بارد يُطلق تأكيدًا داخليًا فاشلًا (ca9 ثم b815) يُعطّل عميل Firestore
// كله حتى إعادة تحميل الصفحة. إبقاء مستمع مفتوح على نفس الاستعلام يُدفئ الهدف ويجعل كل
// القراءات اللاحقة تُعيد استخدامه، كما يعطينا تحديثات حيّة للمحتوى.
export async function subscribeToLessons(
  onNext: (lessons: Lesson[], fromCache: boolean) => void,
  onError: (error: unknown) => void,
): Promise<() => void> {
  const { db, fs } = await getDb();
  return fs.onSnapshot(
    fs.collection(db, 'lessons'),
    // true ضروري: بدونه قد لا تصل لقطة "تأكيد الخادم" إن كانت البيانات نفسها موجودة في الكاش،
    // فتبقى الحالة 'syncing' رغم نجاح الاتصال.
    { includeMetadataChanges: true },
    (snapshot) => {
      const lessons = snapshot.docs
        .map((d) => ({ ...d.data(), _docId: d.id }) as Lesson)
        .sort((a, b) => Number(a.id) - Number(b.id));
      onNext(lessons, snapshot.metadata.fromCache);
    },
    onError,
  );
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
  const lessonRef = fs.doc(db, 'lessons', String(docId));
  const revisionRef = fs.doc(fs.collection(db, 'lessonRevisions', String(docId), 'versions'));
  await fs.runTransaction(db, async (transaction) => {
    const current = await transaction.get(lessonRef);
    if (!current.exists()) throw new Error('المسألة لم تعد موجودة؛ حدّث القائمة قبل الحفظ.');
    transaction.set(revisionRef, { lesson: current.data(), savedAt: Date.now() });
    transaction.set(lessonRef, lessonData);
  });
}

export interface LessonRevision {
  id: string;
  lesson: Lesson;
  savedAt: number;
}

export async function fetchLessonRevisions(docId: string, limitCount = 20): Promise<LessonRevision[]> {
  const { db, fs } = await getDb();
  const versions = fs.collection(db, 'lessonRevisions', String(docId), 'versions');
  const snapshot = await fs.getDocs(fs.query(versions, fs.orderBy('savedAt', 'desc'), fs.limit(limitCount)));
  return snapshot.docs.flatMap((version) => {
    const data = version.data();
    if (!data.lesson || typeof data.lesson !== 'object' || !Number.isFinite(Number(data.savedAt))) return [];
    return [{ id: version.id, lesson: data.lesson as Lesson, savedAt: Number(data.savedAt) }];
  });
}

export interface DeletedLessonItem {
  docId: string;
  lesson: Lesson;
  deletedAt: number;
}

export async function fetchDeletedLessons(): Promise<DeletedLessonItem[]> {
  const { db, fs } = await getDb();
  const snapshot = await fs.getDocs(fs.collection(db, 'lessonRevisions'));
  return snapshot.docs.flatMap((doc) => {
    const data = doc.data();
    if (data.isDeleted !== true || !data.deletedLesson || typeof data.deletedLesson !== 'object') return [];
    return [{ docId: doc.id, lesson: data.deletedLesson as Lesson, deletedAt: Number(data.deletedAt) || 0 }];
  }).sort((a, b) => b.deletedAt - a.deletedAt);
}

export async function restoreDeletedLesson(docId: string): Promise<void> {
  const { db, fs } = await getDb();
  const revisionRef = fs.doc(db, 'lessonRevisions', String(docId));
  const lessonRef = fs.doc(db, 'lessons', String(docId));
  await fs.runTransaction(db, async (transaction) => {
    const [revision, existingLesson] = await Promise.all([
      transaction.get(revisionRef),
      transaction.get(lessonRef),
    ]);
    const deletedLesson = revision.data()?.deletedLesson;
    if (!revision.exists() || revision.data()?.isDeleted !== true || !deletedLesson || typeof deletedLesson !== 'object') {
      throw new Error('لا توجد نسخة محذوفة صالحة للاستعادة.');
    }
    if (existingLesson.exists()) throw new Error('يوجد مستند بالمعرّف نفسه؛ لم تتم الاستعادة لتجنب استبداله.');
    transaction.set(lessonRef, deletedLesson);
    transaction.set(revisionRef, { isDeleted: false, restoredAt: Date.now() }, { merge: true });
  });
}

// حذف مسألة مع حفظ نسخة قابلة للاستعادة في المعاملة نفسها
export async function deleteLessonById(docId: string): Promise<void> {
  const { db, fs } = await getDb();
  const lessonRef = fs.doc(db, 'lessons', String(docId));
  const revisionRef = fs.doc(db, 'lessonRevisions', String(docId));
  const versionRef = fs.doc(fs.collection(db, 'lessonRevisions', String(docId), 'versions'));
  await fs.runTransaction(db, async (transaction) => {
    const current = await transaction.get(lessonRef);
    if (!current.exists()) throw new Error('المسألة غير موجودة أو حُذفت بالفعل.');
    const lesson = current.data();
    transaction.set(versionRef, { lesson, savedAt: Date.now() });
    transaction.set(revisionRef, { isDeleted: true, deletedLesson: lesson, deletedAt: Date.now() }, { merge: true });
    transaction.delete(lessonRef);
  });
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

/* ==================== إحصائيات القراءة ==================== */

// مسألة واحدة تُحتسب مرة واحدة في الجلسة: التنقل ذهابًا وإيابًا بين نفس المسائل كان
// يُرسل كتابة لكل انتقال (تكلفة + سطح عبث أوسع). الجلسة = tab واحد (sessionStorage).
const VIEWED_KEY = 'lessons_viewed_session_v1';

function hasCountedThisSession(lessonId: string): boolean {
  try {
    const raw = sessionStorage.getItem(VIEWED_KEY);
    const seen: string[] = raw ? JSON.parse(raw) : [];
    return seen.includes(lessonId);
  } catch {
    return false;
  }
}

function markCountedThisSession(lessonId: string): void {
  try {
    const raw = sessionStorage.getItem(VIEWED_KEY);
    const seen: string[] = raw ? JSON.parse(raw) : [];
    if (!seen.includes(lessonId)) {
      const next = [...seen.slice(-499), lessonId];
      sessionStorage.setItem(VIEWED_KEY, JSON.stringify(next));
    }
  } catch {
    /* تجاهل */
  }
}

// تسجيل مشاهدة مسألة — عداد مركزي في مستند واحد stats/views (للمستخدمين المسجلين فقط لمنع استنزاف الحصص)
export async function trackLessonView(lessonId: string | number): Promise<void> {
  const idStr = String(lessonId);
  if (hasCountedThisSession(idStr)) return;
  try {
    const { getAuthModule } = await import('./config');
    const { auth } = await getAuthModule();
    if (!auth.currentUser) return;

    markCountedThisSession(idStr);

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

/* ==================== المشرفين (Admins) ==================== */

// هل المستخدم مشرف؟
// 'unknown' عند فشل التقييم (شبكة/توكن/تهيئة باردة) بدل false،
// لأن إرجاع false عند أي خطأ يُخفي لوحة الإدارة نهائيًا عن المشرف الحقيقي.
type AdminCheck = boolean | 'unknown';

// server = قراءة من الخادم بدل الكاش.
// ⚠️ لا تُستخدم في أول عملية على عميل Firestore البارد: القراءة اللحظية كأول عملية
// تُطلق عطل ca9/b815 الداخلي المعروف فتُعطّل العميل كله (تفشل بعدها كل القراءات
// والكتابات: المحتوى والمكتبة وعلامة الوقوف). لذلك: الكاش أولًا (رخيص ويعيد
// استخدام الهدف المُدفّأ)، وطلب الخادم في محاولة لاحقة فقط لكشف رفض كاش قديم.
export async function isAdmin(uid: string, options?: { server?: boolean }): Promise<AdminCheck> {
  if (!isFirebaseConfigured || !uid) return false;
  try {
    const { db, fs } = await getDb();
    const ref = fs.doc(db, 'admins', uid);
    const adminDoc = options?.server ? await fs.getDocFromServer(ref) : await fs.getDoc(ref);
    return adminDoc.exists();
  } catch (error) {
    // فشل حقيقي (offline / permission / تهيئة باردة) — ليس رفضًا
    try {
      const { logError } = await import('../utils/logError');
      logError('admins.check', error, { uid, server: Boolean(options?.server) });
    } catch { /* تجاهل */ }
    return 'unknown';
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
