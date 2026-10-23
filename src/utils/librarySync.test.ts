// @vitest-environment jsdom
// طبقة مزامنة مكتبة المستخدم بين الأجهزة.
// القواعد المثبتة هنا:
//  - لا مساس بالسحابة بلا حساب.
//  - الدمج (لا الاستبدال) بين السحابة والمحلي، فلا يضيع شيء من أي جهاز.
//  - آخر تعديل يفوز في التعارض، بمقارنة updatedAt لكل عنصر.
//  - الكتابة تُخنَّق (debounce) ولا تحدث إلا عند اختلاف حقيقي — لا حلقة كتابة.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const setDoc = vi.fn(async () => {});
const getDoc = vi.fn();
const onSnapshot = vi.fn();

vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...p: string[]) => ({ path: p.join('/') }),
  setDoc: (...a: unknown[]) => setDoc(...(a as [])),
  getDoc: (...a: unknown[]) => getDoc(...(a as [])),
  onSnapshot: (...a: unknown[]) => onSnapshot(...(a as [])),
}));
vi.mock('../firebase/config', () => ({
  isFirebaseConfigured: true,
  getFirestore: async () => ({ db: { __db: true }, fsMod: {} }),
}));

import {
  mergeLibraries,
  librarySignature,
  libraryDocPath,
  cloudEnabled,
} from './librarySync';
import type { SyncableLibrary } from './librarySync';

const empty = (): SyncableLibrary => ({ bookmarks: [], highlights: [], notes: {}, readLessons: [], updatedAt: {} });

describe('mergeLibraries — دمج بلا فقدان', () => {
  it('اتحاد المفضلة والمسائل المقروءة (مجموعتان مستقلتان)', () => {
    const a: SyncableLibrary = { ...empty(), bookmarks: ['1', '2'], readLessons: ['5'] };
    const b: SyncableLibrary = { ...empty(), bookmarks: ['2', '3'], readLessons: ['6'] };
    const m = mergeLibraries(a, b);
    expect(m.bookmarks.sort()).toEqual(['1', '2', '3']);
    expect(m.readLessons.sort()).toEqual(['5', '6']);
  });

  it('الملاحظات: آخر تعديل يفوز حسب updatedAt', () => {
    const a: SyncableLibrary = {
      ...empty(),
      notes: { l1: 'قديمة', l2: 'من أ' },
      updatedAt: { 'note:l1': 100, 'note:l2': 200 },
    };
    const b: SyncableLibrary = {
      ...empty(),
      notes: { l1: 'أحدث', l2: 'من ب' },
      updatedAt: { 'note:l1': 300, 'note:l2': 50 },
    };
    const m = mergeLibraries(a, b);
    expect(m.notes.l1).toBe('أحدث');
    // l2: أ أحدث (200 > 50)
    expect(m.notes.l2).toBe('من أ');
  });

  it('الفوائد: تُدمج بالمعرّف، والأحدث يحل محل الأقدم', () => {
    const a: SyncableLibrary = {
      ...empty(),
      highlights: [{ id: 'h1', lessonId: '1', text: 'نص أ' } as never],
      updatedAt: { 'hl:h1': 100 },
    };
    const b: SyncableLibrary = {
      ...empty(),
      highlights: [{ id: 'h1', lessonId: '1', text: 'نص ب' } as never, { id: 'h2', lessonId: '2', text: 'جديد' } as never],
      updatedAt: { 'hl:h1': 300, 'hl:h2': 300 },
    };
    const m = mergeLibraries(a, b);
    expect(m.highlights).toHaveLength(2);
    expect((m.highlights.find((h) => h.id === 'h1') as { text: string }).text).toBe('نص ب');
  });

  it('حذف عنصر محليًا لا يُحييه جهاز آخر إلا إن كان أحدث', () => {
    // b حذف h1 (لا وجود له) و updatedAt أحدث → يُعتمد الحذف
    const a: SyncableLibrary = {
      ...empty(),
      highlights: [{ id: 'h1', lessonId: '1', text: 'x' } as never],
      updatedAt: { 'hl:h1': 100 },
    };
    const b: SyncableLibrary = { ...empty(), updatedAt: { 'hl:h1': 500 } };
    const m = mergeLibraries(a, b);
    expect(m.highlights).toHaveLength(0);
  });

  it('الدمج تبادلي في المحتوى (لا يعتمد على ترتيب الوسيطين)', () => {
    const a: SyncableLibrary = { ...empty(), bookmarks: ['1'], notes: { n: 'أ' }, updatedAt: { 'note:n': 10 } };
    const b: SyncableLibrary = { ...empty(), bookmarks: ['2'], notes: { n: 'ب' }, updatedAt: { 'note:n': 20 } };
    expect(mergeLibraries(a, b).notes.n).toBe(mergeLibraries(b, a).notes.n);
  });

  it('لا يعدّل المدخلات (نقي)', () => {
    const a: SyncableLibrary = { ...empty(), bookmarks: ['1'] };
    const b: SyncableLibrary = { ...empty(), bookmarks: ['2'] };
    mergeLibraries(a, b);
    expect(a.bookmarks).toEqual(['1']);
    expect(b.bookmarks).toEqual(['2']);
  });
});

describe('librarySignature — كشف التغيير الحقيقي', () => {
  it('نفس المحتوى بترتيب مختلف = توقيع واحد (لا كتابة زائدة)', () => {
    const a: SyncableLibrary = { ...empty(), bookmarks: ['1', '2'] };
    const b: SyncableLibrary = { ...empty(), bookmarks: ['2', '1'] };
    expect(librarySignature(a)).toBe(librarySignature(b));
  });

  it('اختلاف المحتوى = توقيع مختلف', () => {
    const a: SyncableLibrary = { ...empty(), bookmarks: ['1'] };
    const b: SyncableLibrary = { ...empty(), bookmarks: ['1', '2'] };
    expect(librarySignature(a)).not.toBe(librarySignature(b));
  });
});

describe('المسار والتفعيل', () => {
  beforeEach(() => {
    setDoc.mockClear();
    getDoc.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('مسار المستند محصور بالمستخدم', () => {
    expect(libraryDocPath('u9')).toBe('users/u9/data/library');
  });

  it('بلا معرف مستخدم لا مزامنة إطلاقًا', () => {
    expect(cloudEnabled(null)).toBe(false);
    expect(cloudEnabled('')).toBe(false);
    expect(cloudEnabled('u1')).toBe(true);
  });
});
