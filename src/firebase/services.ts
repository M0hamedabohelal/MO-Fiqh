// طبقة الخدمات — كل التعامل مع Firestore في مكان واحد
// يبدأ بمسار البيانات فقط (firestore) — لا يُسحب auth معه
import { getFirestore, isFirebaseConfigured } from './config';
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
export async function fetchLessons(): Promise<Lesson[]> {
  const { db, fs } = await getDb();
  const snapshot = await fs.getDocs(fs.collection(db, 'lessons'));
  return snapshot.docs
    .map((d) => ({ ...d.data(), _docId: d.id }) as Lesson)
    .sort((a, b) => Number(a.id) - Number(b.id));
}

// إضافة مسألة جديدة (لوحة الإدارة)
export async function createLesson(lessonData: Omit<Lesson, 'id' | '_docId'>): Promise<Lesson> {
  const { db, fs } = await getDb();

  // نحدد الـ id الجديد = أكبر id موجود + 1
  const existing = await fetchLessons();
  // ترشيح القيم غير الرقمية — معرّف واحد فاسد كان يسمّم Math.max بـ NaN فينتج nextId=NaN
  const numericIds = existing.map((l) => Number(l.id)).filter((n) => Number.isFinite(n));
  const nextId = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;

  const payload = { ...lessonData, id: nextId };
  await fs.setDoc(fs.doc(db, 'lessons', String(nextId)), payload);
  return payload;
}

// استيراد بالجملة — رفع مصفوفة مسائل دفعة واحدة بمعرفات متسلسلة تلقائياً
export async function bulkCreateLessons(lessonsArray: Array<Omit<Lesson, 'id' | '_docId'>>): Promise<number> {
  const { db, fs } = await getDb();

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

// جلب كل بيانات المستخدم: bookmarks / highlights / notes / readLessons / visits
export async function fetchUserData(uid: string): Promise<UserLibraryData> {
  const { db, fs } = await getDb();
  const snapshot = await fs.getDocs(await userRoot(db, fs, uid));
  const data: UserLibraryData = { bookmarks: [], highlights: [], notes: {}, readLessons: [], visits: [] };
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
  } catch {
    // تجاهل أخطاء التتبع — ليست حرجة
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
  const currentNotes = notesSnap.exists() ? notesSnap.data().notes || {} : {};
  currentNotes[lessonId] = noteText;
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
