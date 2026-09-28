// طبقة الخدمات — كل التعامل مع Firestore في مكان واحد
// الـ SDK يُحمَّل مؤجلاً عبر getFirebase() — لا يؤثر على سرعة أول شاشة
import { getFirebase, isFirebaseConfigured } from './config';

async function getDb() {
  if (!isFirebaseConfigured) throw new Error('Firebase غير مهيأ');
  const { db, fsMod } = await getFirebase();
  return { db, fs: fsMod };
}

/* ==================== المسائل (Lessons) ==================== */

// جلب كل المسائل مرتبة حسب id
export async function fetchLessons() {
  const { db, fs } = await getDb();
  const snapshot = await fs.getDocs(fs.collection(db, 'lessons'));
  return snapshot.docs
    .map((d) => ({ ...d.data(), _docId: d.id }))
    .sort((a, b) => a.id - b.id);
}

// إضافة مسألة جديدة (لوحة الإدارة)
export async function createLesson(lessonData) {
  const { db, fs } = await getDb();

  // نحدد الـ id الجديد = أكبر id موجود + 1
  const existing = await fetchLessons();
  const nextId = existing.length > 0 ? Math.max(...existing.map((l) => l.id)) + 1 : 1;

  const payload = { ...lessonData, id: nextId };
  await fs.setDoc(fs.doc(db, 'lessons', String(nextId)), payload);
  return payload;
}

// استيراد بالجملة — رفع مصفوفة مسائل دفعة واحدة بمعرفات متسلسلة تلقائياً
export async function bulkCreateLessons(lessonsArray) {
  const { db, fs } = await getDb();

  const existing = await fetchLessons();
  let nextId = existing.length > 0 ? Math.max(...existing.map((l) => l.id)) + 1 : 1;

  let uploaded = 0;
  for (const item of lessonsArray) {
    // نتجاهل أي معرف قادم من الملف ونعيد الترقيم تلقائياً
    const cleanItem = { ...item };
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
export async function updateLesson(docId, lessonData) {
  const { db, fs } = await getDb();
  await fs.setDoc(fs.doc(db, 'lessons', String(docId)), lessonData);
}

// حذف مسألة
export async function deleteLessonById(docId) {
  const { db, fs } = await getDb();
  await fs.deleteDoc(fs.doc(db, 'lessons', String(docId)));
}

/* ==================== القاموس الفقهي (Glossary) ==================== */

// جلب القاموس ككائن { مصطلح: تعريف }
export async function fetchGlossary() {
  const { db, fs } = await getDb();
  const snapshot = await fs.getDocs(fs.collection(db, 'glossary'));
  const result = {};
  snapshot.forEach((d) => {
    result[d.id] = d.data().definition;
  });
  return result;
}

// إضافة/تعديل مصطلح
export async function saveTerm(term, definition) {
  const { db, fs } = await getDb();
  await fs.setDoc(fs.doc(db, 'glossary', term), { definition });
}

// حذف مصطلح
export async function deleteTerm(term) {
  const { db, fs } = await getDb();
  await fs.deleteDoc(fs.doc(db, 'glossary', term));
}

/* ==================== بيانات المستخدم (User Data) ==================== */
/* المفضلة والفوائد والملاحظات — مستند واحد لكل نوع، متزامن عبر الأجهزة */

async function userRoot(db, fs, uid) {
  return fs.collection(db, 'users', uid, 'data');
}

// جلب كل بيانات المستخدم: bookmarks / highlights / notes / readLessons
export async function fetchUserData(uid) {
  const { db, fs } = await getDb();
  const snapshot = await fs.getDocs(await userRoot(db, fs, uid));
  const data = { bookmarks: [], highlights: [], notes: {}, readLessons: [] };
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
      default:
        break;
    }
  });
  return data;
}

async function saveUserDataSection(db, fs, uid, section, value) {
  await fs.setDoc(fs.doc(await userRoot(db, fs, uid), section), value, { merge: true });
}

export async function syncBookmarks(uid, bookmarkIds) {
  const { db, fs } = await getDb();
  await saveUserDataSection(db, fs, uid, 'bookmarks', { items: bookmarkIds });
}

export async function syncHighlights(uid, highlightsArray) {
  const { db, fs } = await getDb();
  await saveUserDataSection(db, fs, uid, 'highlights', { items: highlightsArray });
}

// مزامنة قائمة المسائل المقروءة (تتبع التقدم)
export async function syncReadLessons(uid, readLessonIds) {
  const { db, fs } = await getDb();
  await saveUserDataSection(db, fs, uid, 'readLessons', { items: readLessonIds });
}

/* ==================== إحصائيات القراءة ==================== */

// تسجيل مشاهدة مسألة — عداد مركزي في مستند واحد stats/views
export async function trackLessonView(lessonId) {
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
export async function fetchLessonViews() {
  const { db, fs } = await getDb();
  const snap = await fs.getDoc(fs.doc(db, 'stats', 'views'));
  return snap.exists() ? snap.data() : {};
}

// حفظ ملاحظة مسألة واحدة داخل خريطة الملاحظات الكاملة
export async function syncNote(uid, lessonId, noteText) {
  const { db, fs } = await getDb();
  const notesSnap = await fs.getDoc(fs.doc(await userRoot(db, fs, uid), 'notes'));
  const currentNotes = notesSnap.exists() ? notesSnap.data().notes || {} : {};
  currentNotes[lessonId] = noteText;
  await saveUserDataSection(db, fs, uid, 'notes', { notes: currentNotes });
}

// حفظ خريطة الملاحظات كاملة دفعة واحدة (تُستخدم عند الدمج بعد تسجيل الدخول)
export async function syncAllNotes(uid, notesObject) {
  const { db, fs } = await getDb();
  await saveUserDataSection(db, fs, uid, 'notes', { notes: notesObject });
}

/* ==================== المشرفين (Admins) ==================== */

// هل المستخدم مشرف؟
export async function isAdmin(uid) {
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

export async function migrateInitialData(lessonsArray, glossaryObject) {
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
export async function fetchAnnouncements() {
  const { db, fs } = await getDb();
  const snapshot = await fs.getDocs(fs.collection(db, 'announcements'));
  return snapshot.docs.map(d => ({ ...d.data(), id: d.id })).sort((a,b) => b.createdAt - a.createdAt);
}

export async function createAnnouncement(annData) {
  const { db, fs } = await getDb();
  const docRef = fs.doc(fs.collection(db, 'announcements'));
  const payload = { ...annData, createdAt: Date.now() };
  await fs.setDoc(docRef, payload);
  return { ...payload, id: docRef.id };
}

export async function deleteAnnouncement(id) {
  const { db, fs } = await getDb();
  await fs.deleteDoc(fs.doc(db, 'announcements', String(id)));
}
