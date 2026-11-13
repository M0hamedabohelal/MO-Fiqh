import { getFirestore, isFirebaseConfigured } from '../../firebase/config';
import type { Firestore } from 'firebase/firestore';
import type * as FsMod from 'firebase/firestore';
import { logError } from '../../utils/logError';

export interface NoteDoc {
  lessonId: number | string;
  text: string;
  updatedAt: number;
}

async function getDb(): Promise<{ db: Firestore; fs: typeof FsMod }> {
  if (!isFirebaseConfigured) throw new Error('Firebase غير مهيأ');
  const { db, fsMod } = await getFirestore();
  return { db, fs: fsMod };
}

export function noteDocPath(uid: string, lessonId: number | string): string {
  return `users/${uid}/notes/${lessonId}`;
}

/**
 * حفظ ملاحظة لمسألة معينة في المجموعة الفرعية (Subcollection)
 * لتفادي الوصول إلى سقف 1MB المخصص لمستند واحد في Firestore عند تدوين ملاحظات مطوّلة.
 */
export async function saveNoteToSubcollection(
  uid: string,
  lessonId: number | string,
  text: string,
): Promise<void> {
  if (!uid) return;
  const trimmed = text.trim();
  const { db, fs } = await getDb();
  const ref = fs.doc(db, noteDocPath(uid, lessonId));

  if (!trimmed) {
    // نص فارغ يطابق رغبة الحذف
    await fs.deleteDoc(ref);
    return;
  }

  const payload: NoteDoc = {
    lessonId,
    text: trimmed.slice(0, 20000),
    updatedAt: Date.now(),
  };

  await fs.setDoc(ref, payload);
}

/**
 * حذف ملاحظة مسألة من المجموعة الفرعية
 */
export async function deleteNoteFromSubcollection(
  uid: string,
  lessonId: number | string,
): Promise<void> {
  if (!uid) return;
  const { db, fs } = await getDb();
  const ref = fs.doc(db, noteDocPath(uid, lessonId));
  await fs.deleteDoc(ref);
}

/**
 * جلب جميع الملاحظات للمستخدم من المجموعة الفرعية
 */
export async function fetchNotesFromSubcollection(
  uid: string,
): Promise<Record<string, string>> {
  if (!uid) return {};
  try {
    const { db, fs } = await getDb();
    const notesCol = fs.collection(db, `users/${uid}/notes`);
    const snapshot = await fs.getDocs(notesCol);
    const notesMap: Record<string, string> = {};

    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data() as Partial<NoteDoc>;
      if (data && typeof data.text === 'string' && data.lessonId !== undefined) {
        notesMap[String(data.lessonId)] = data.text;
      }
    });

    return notesMap;
  } catch (error) {
    logError('notes.subcollection.fetch', error);
    return {};
  }
}

/**
 * ترحيل الملاحظات المخزنة في الكائن الموحد إلى المجموعة الفرعية
 */
export async function migrateLegacyNotesToSubcollection(
  uid: string,
  legacyNotes: Record<string, string>,
): Promise<{ migratedCount: number; errors: number }> {
  if (!uid || !legacyNotes) return { migratedCount: 0, errors: 0 };
  const entries = Object.entries(legacyNotes).filter(([, text]) => typeof text === 'string' && text.trim().length > 0);
  if (entries.length === 0) return { migratedCount: 0, errors: 0 };

  let migratedCount = 0;
  let errors = 0;

  for (const [lessonId, text] of entries) {
    try {
      await saveNoteToSubcollection(uid, lessonId, text);
      migratedCount++;
    } catch (err) {
      errors++;
      logError('notes.subcollection.migrate', err);
    }
  }

  return { migratedCount, errors };
}
