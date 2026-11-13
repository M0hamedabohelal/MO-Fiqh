// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  noteDocPath,
  saveNoteToSubcollection,
  deleteNoteFromSubcollection,
  fetchNotesFromSubcollection,
  migrateLegacyNotesToSubcollection,
} from './notesSubcollection';
import type { NoteDoc } from './notesSubcollection';

const mockDoc = vi.fn((_db, path) => ({ path }));
const mockSetDoc = vi.fn<(_ref: unknown, _payload: NoteDoc) => Promise<void>>(async () => {});
const mockDeleteDoc = vi.fn(async () => {});
const mockGetDocs = vi.fn();
const mockCollection = vi.fn((_db, path) => ({ path }));

vi.mock('../../firebase/config', () => ({
  isFirebaseConfigured: true,
  getFirestore: async () => ({
    db: { __name: 'mock-db' },
    fsMod: {
      doc: mockDoc,
      setDoc: mockSetDoc,
      deleteDoc: mockDeleteDoc,
      getDocs: mockGetDocs,
      collection: mockCollection,
    },
  }),
}));

describe('Notes Subcollection Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('يبني مسار مستند الملاحظة بدقة', () => {
    expect(noteDocPath('user_123', 42)).toBe('users/user_123/notes/42');
    expect(noteDocPath('user_abc', 'lesson_9')).toBe('users/user_abc/notes/lesson_9');
  });

  it('يحفظ الملاحظة في المسار الفرعي مع تقليم النص وختم التوقيت', async () => {
    await saveNoteToSubcollection('user_1', 10, '   ملاحظة فقهية مهمة   ');

    expect(mockDoc).toHaveBeenCalledWith({ __name: 'mock-db' }, 'users/user_1/notes/10');
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const call = mockSetDoc.mock.calls[0];
    expect(call).toBeDefined();
    const payload = call[1];
    expect(payload.lessonId).toBe(10);
    expect(payload.text).toBe('ملاحظة فقهية مهمة');
    expect(typeof payload.updatedAt).toBe('number');
  });

  it('يحذف المستند إذا كان النص فارغًا أو مسافات فقط', async () => {
    await saveNoteToSubcollection('user_1', 10, '   ');

    expect(mockDoc).toHaveBeenCalledWith({ __name: 'mock-db' }, 'users/user_1/notes/10');
    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it('يحذف الملاحظة عبر deleteNoteFromSubcollection', async () => {
    await deleteNoteFromSubcollection('user_1', 15);

    expect(mockDoc).toHaveBeenCalledWith({ __name: 'mock-db' }, 'users/user_1/notes/15');
    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
  });

  it('يجلب الملاحظات ويركبها في هيئة خريطة معرف -> نص', async () => {
    mockGetDocs.mockResolvedValueOnce({
      docs: [
        { data: () => ({ lessonId: 1, text: 'ملاحظة 1', updatedAt: 100 }) },
        { data: () => ({ lessonId: 2, text: 'ملاحظة 2', updatedAt: 200 }) },
      ],
    });

    const result = await fetchNotesFromSubcollection('user_1');
    expect(result).toEqual({
      '1': 'ملاحظة 1',
      '2': 'ملاحظة 2',
    });
  });

  it('يرحل الملاحظات القديمة بنجاح ويتخطى الملاحظات الفارغة', async () => {
    const legacy = {
      '1': 'ملاحظة قديمة 1',
      '2': '   ',
      '3': 'ملاحظة قديمة 3',
    };

    const res = await migrateLegacyNotesToSubcollection('user_1', legacy);
    expect(res.migratedCount).toBe(2);
    expect(res.errors).toBe(0);
    expect(mockSetDoc).toHaveBeenCalledTimes(2);
  });
});
