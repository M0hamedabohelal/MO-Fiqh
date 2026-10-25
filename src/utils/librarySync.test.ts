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
  pruneTombstones,
  TOMBSTONE_TTL_MS,
  MAX_TOMBSTONES,
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

  it('حذف المفضلة ينتشر عندما يكون طابع الحذف أحدث', () => {
    // الجهاز A حذف المسألة 5 في الزمن 200
    const a: SyncableLibrary = { ...empty(), bookmarks: [], updatedAt: { 'bm:5': 200 } };
    // الجهاز B كان أضافها في الزمن 100
    const b: SyncableLibrary = { ...empty(), bookmarks: ['5'], updatedAt: { 'bm:5': 100 } };
    const m = mergeLibraries(a, b);
    expect(m.bookmarks).not.toContain('5');
    expect(m.updatedAt['bm:5']).toBe(200);
  });

  it('إعادة إضافة المفضلة بطابع أحدث تعيدها بنجاح', () => {
    // الجهاز A أعاد إضافة المسألة 5 في الزمن 300
    const a: SyncableLibrary = { ...empty(), bookmarks: ['5'], updatedAt: { 'bm:5': 300 } };
    // الجهاز B كان حذفها في الزمن 200
    const b: SyncableLibrary = { ...empty(), bookmarks: [], updatedAt: { 'bm:5': 200 } };
    const m = mergeLibraries(a, b);
    expect(m.bookmarks).toContain('5');
    expect(m.updatedAt['bm:5']).toBe(300);
  });

  it('إلغاء تعليم المسألة كمقروءة ينتشر عندما يكون طابع الحذف أحدث', () => {
    // الجهاز A ألغى قراءة المسألة 7 في الزمن 250
    const a: SyncableLibrary = { ...empty(), readLessons: [], updatedAt: { 'read:7': 250 } };
    // الجهاز B كان علّمها في الزمن 150
    const b: SyncableLibrary = { ...empty(), readLessons: ['7'], updatedAt: { 'read:7': 150 } };
    const m = mergeLibraries(a, b);
    expect(m.readLessons).not.toContain('7');
    expect(m.updatedAt['read:7']).toBe(250);
  });

  it('حذف الملاحظة ينتشر عندما يكون طابع الحذف أحدث', () => {
    // الجهاز A حذف الملاحظة 3 في الزمن 400
    const a: SyncableLibrary = { ...empty(), notes: {}, updatedAt: { 'note:3': 400 } };
    // الجهاز B كان يملكها في الزمن 200
    const b: SyncableLibrary = { ...empty(), notes: { '3': 'نص قديم' }, updatedAt: { 'note:3': 200 } };
    const m = mergeLibraries(a, b);
    expect(m.notes['3']).toBeUndefined();
    expect(m.updatedAt['note:3']).toBe(400);
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

describe('pruneTombstones — تقليم شواهد القبور والسقف', () => {
  const now = 100_000_000;

  it('يحتفظ بالأختام النشطة للعناصر الموجودة في المكتبة بغض النظر عن عمرها', () => {
    const updatedAt = {
      'bm:1': 100, // قديم جدًا لكن المفضلة 1 موجودة
      'read:2': 200,
      'note:3': 300,
      theme: 400,
    };
    const active = {
      bookmarks: ['1'],
      readLessons: ['2'],
      notes: { '3': 'نص' },
      highlights: [],
    };
    const res = pruneTombstones(updatedAt, active, now);
    expect(res).toEqual(updatedAt);
  });

  it('يحذف شواهد الحذف الأقدم من 30 يومًا ويُبقي الأحدث منها', () => {
    const expiredStamp = now - TOMBSTONE_TTL_MS - 5000;
    const freshStamp = now - 1000;
    const updatedAt = {
      'bm:old': expiredStamp, // محذوف من أكثر من 30 يومًا
      'bm:recent': freshStamp, // محذوف حديثًا
    };
    const active = {
      bookmarks: [],
      readLessons: [],
      notes: {},
      highlights: [],
    };
    const res = pruneTombstones(updatedAt, active, now);
    expect(res['bm:old']).toBeUndefined();
    expect(res['bm:recent']).toBe(freshStamp);
  });

  it('يقيد عدد شواهد القبور بـ MAX_TOMBSTONES محتفظًا بالأحدث فقط', () => {
    const updatedAt: Record<string, number> = {};
    for (let i = 0; i < MAX_TOMBSTONES + 50; i++) {
      updatedAt[`bm:${i}`] = now - 1000 + i;
    }
    const res = pruneTombstones(updatedAt, { bookmarks: [] }, now);
    expect(Object.keys(res).length).toBe(MAX_TOMBSTONES);
    // الأحدث (الأعلى طابعًا) محفوظ
    expect(res[`bm:${MAX_TOMBSTONES + 49}`]).toBeDefined();
    // الأقدم حُذف
    expect(res['bm:0']).toBeUndefined();
  });
});

describe('تعارض الأوفلاين في mergeLibraries', () => {
  it('حذف السحابة الأحدث يغلب العنصر الموجود في جهاز كان أوفلاين', () => {
    const t0 = Date.now() - 10000;
    const t1 = t0 + 2000;
    // جهاز كان أوفلاين منذ وقت t0 ويحمل المفضلة 7
    const offlineDevice: SyncableLibrary = {
      ...empty(),
      bookmarks: ['7'],
      updatedAt: { 'bm:7': t0 },
    };
    // سحابة حذفت المفضلة 7 في وقت t1
    const cloud: SyncableLibrary = {
      ...empty(),
      bookmarks: [],
      updatedAt: { 'bm:7': t1 },
    };

    const res = mergeLibraries(cloud, offlineDevice);
    expect(res.bookmarks).not.includes('7');
    expect(res.updatedAt['bm:7']).toBe(t1);
  });

  it('إضافة محلية أحدث من حذف السحابة تغلب الحذف (إعادة إضافة واعية)', () => {
    const t0 = Date.now() - 10000;
    const t1 = t0 + 2000;
    // السحابة حذفت المفضلة 7 في وقت t0
    const cloud: SyncableLibrary = {
      ...empty(),
      bookmarks: [],
      updatedAt: { 'bm:7': t0 },
    };
    // المستخدم أعاد إضافة المفضلة 7 محليًا في وقت t1
    const localDevice: SyncableLibrary = {
      ...empty(),
      bookmarks: ['7'],
      updatedAt: { 'bm:7': t1 },
    };

    const res = mergeLibraries(cloud, localDevice);
    expect(res.bookmarks).toContain('7');
    expect(res.updatedAt['bm:7']).toBe(t1);
  });
});
