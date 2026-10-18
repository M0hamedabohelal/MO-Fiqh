import { describe, it, expect } from 'vitest';
import { mergeLibraries, emptyTombs, mergeTombs, applyTombsToMerged, pruneTombs, threeWayMergeMaps, normalizeNoteMap, dropStaleTombs } from './mergeLibrary';

describe('mergeLibraries', () => {
  it('يوحّد المعرفات رقم/نص ويزيل التكرار', () => {
    const merged = mergeLibraries(
      { bookmarks: ['1', '2'], readLessons: ['5'] },
      { bookmarks: [1 as unknown as string, '3'], readLessons: [5 as unknown as string, '6'] },
    );
    expect(merged.bookmarks.sort()).toEqual(['1', '2', '3']);
    expect(merged.readLessons.sort()).toEqual(['5', '6']);
  });

  it('ملاحظات السحابة تتفوق عند التعارض والضيف يُضاف', () => {
    const merged = mergeLibraries(
      { notes: { '1': 'سحابة' } },
      { notes: { '1': 'ضيف', '2': 'جديدة' } },
    );
    expect(merged.notes).toEqual({ '1': 'سحابة', '2': 'جديدة' });
  });

  it('الفوائد تُدمج بدون فقد (مفتاح id أو النص)', () => {
    const merged = mergeLibraries(
      { highlights: [{ id: 1, lessonId: 1, text: 'أ' }] },
      { highlights: [{ id: 2, lessonId: 1, text: 'ب' }] },
    );
    expect(merged.highlights).toHaveLength(2);
  });

  it('مدخلات فارغة تعطي حالة فارغة آمنة', () => {
    expect(mergeLibraries({}, {})).toEqual({ bookmarks: [], highlights: [], notes: {}, readLessons: [], stopMarks: {} });
  });

  it('علامات التوقف تُدمج لكل كتاب والسحابة تتفوق عند التعارض', () => {
    const merged = mergeLibraries(
      { stopMarks: { 'الطهارة': '10', 'الصلاة': '20' } },
      { stopMarks: { 'الطهارة': '11', 'الزكاة': '30' } },
    );
    expect(merged.stopMarks).toEqual({ 'الطهارة': '10', 'الصلاة': '20', 'الزكاة': '30' });
  });
});

describe('threeWayMergeMaps', () => {
  it('بلا تغييرات: تُحفظ القيم', () => {
    expect(threeWayMergeMaps({ 'أ': '1' }, { 'أ': '1' }, { 'أ': '1' })).toEqual({ 'أ': '1' });
  });

  it('تغيير محلي فقط: المحلية تفوز', () => {
    expect(threeWayMergeMaps({ 'أ': '1' }, { 'أ': '2' }, { 'أ': '1' })).toEqual({ 'أ': '2' });
  });

  it('تغيير سحابي فقط (جهاز قديم يزامن): السحابة تفوز ولا تُمحى', () => {
    expect(threeWayMergeMaps({ 'أ': '1' }, { 'أ': '1' }, { 'أ': '2' })).toEqual({ 'أ': '2' });
  });

  it('تعارض حقيقي (الجهتان غيّرتا): المحلية تفوز حتميًا', () => {
    expect(threeWayMergeMaps({ 'أ': '1' }, { 'أ': '2' }, { 'أ': '3' })).toEqual({ 'أ': '2' });
  });

  it('حذف محلي مع ثبات السحابة: يُحذف', () => {
    expect(threeWayMergeMaps({ 'أ': '1' }, {}, { 'أ': '1' })).toEqual({});
  });

  it('حذف سحابي مع ثبات المحلية: يُحذف', () => {
    expect(threeWayMergeMaps({ 'أ': '1' }, { 'أ': '1' }, {})).toEqual({});
  });

  it('مفتاح جديد من أي جهة يُقبل', () => {
    expect(threeWayMergeMaps({}, { 'أ': '1' }, { 'ب': '2' })).toEqual({ 'أ': '1', 'ب': '2' });
  });

  it('نص ملاحظة أحدث سحابيًا يفوز على نص محلي قديم (بعد التطبيع)', () => {
    const base = normalizeNoteMap({ '5': 'قديمة' });
    const local = normalizeNoteMap({ '5': 'قديمة' });
    const cloud = normalizeNoteMap({ '5': 'محدّثة من جهاز آخر  ' });
    expect(threeWayMergeMaps(base, local, cloud)).toEqual({ '5': 'محدّثة من جهاز آخر' });
  });
});

describe('normalizeNoteMap', () => {
  it('يقلّم النصوص ويسقط الفارغ وغير النصي', () => {
    expect(normalizeNoteMap({ '1': '  نص  ', '2': '   ', '3': '', '4': 5 as unknown as string })).toEqual({ '1': 'نص' });
  });

  it('مدخلات فارغة تعطي خريطة فارغة آمنة', () => {
    expect(normalizeNoteMap({})).toEqual({});
    expect(normalizeNoteMap(null as unknown as Record<string, unknown>)).toEqual({});
  });
});

describe('tombstones', () => {
  const base = {
    bookmarks: ['1', '2'],
    highlights: [],
    notes: { '1': 'نص' },
    readLessons: ['5'],
    stopMarks: { 'الطهارة': '10' },
  };
  const local = {
    bookmarks: ['1'],
    highlights: [],
    notes: {},
    readLessons: [],
    stopMarks: {},
  };

  it('المشهور بحذفه يُسقط من المدمج ما لم يعد محليًا', () => {
    const tombs = { ...emptyTombs(), bookmarks: { '2': Date.now() }, noteKeys: { '1': Date.now() }, stopMarkKeys: { 'الطهارة': Date.now() } };
    const out = applyTombsToMerged(base, local, tombs);
    expect(out.bookmarks).toEqual(['1']);
    expect(out.notes).toEqual({});
    expect(out.stopMarks).toEqual({});
    expect(out.readLessons).toEqual(['5']); // بلا شاهد → يُحفظ
  });

  it('إعادة الإضافة محليًا تُلغي الشاهد', () => {
    const tombs = { ...emptyTombs(), bookmarks: { '2': Date.now() } };
    const out = applyTombsToMerged(base, { ...local, bookmarks: ['1', '2'] }, tombs);
    expect(out.bookmarks).toEqual(['1', '2']);
  });

  it('اتحاد الشواهد يجمع المفاتيح', () => {
    const m = mergeTombs(
      { ...emptyTombs(), bookmarks: { '1': 100 } },
      { ...emptyTombs(), bookmarks: { '1': 200, '2': 50 } },
    );
    expect(m.bookmarks).toEqual({ '1': 200, '2': 50 });
  });

  it('تنظيف الشواهد يسقط شواهد العناصر العائدة', () => {
    const tombs = { ...emptyTombs(), bookmarks: { '1': 1, '9': 2 } };
    const pruned = pruneTombs(tombs, { ...base, bookmarks: ['1'] });
    expect(pruned.bookmarks).toEqual({ '9': 2 });
  });
});

describe('dropStaleTombs', () => {
  const present = {
    bookmarks: ['1'],
    highlights: [],
    notes: { 'م': 'ملاحظة' },
    readLessons: [],
    stopMarks: { 'الطهارة': '5' },
  };

  it('يسقط الشاهد الذي يعيق عنصرًا ما زال قائمًا في السحابة (عالق بلا أساس)', () => {
    const now = Date.now();
    const tombs = {
      ...emptyTombs(),
      bookmarks: { '1': now - 60000 },
      stopMarkKeys: { 'الطهارة': now - 60000 },
      noteKeys: { 'م': now - 60000 },
    };
    const out = dropStaleTombs(tombs, present, 10000, now);
    expect(out.bookmarks).toEqual({});
    expect(out.stopMarkKeys).toEqual({});
    expect(out.noteKeys).toEqual({});
  });

  it('يحترم الشاهد الحديث (حذفة محلية لم تُرفع بعد) فلا يُلغى', () => {
    const now = Date.now();
    const tombs = { ...emptyTombs(), bookmarks: { '1': now - 1000 } };
    const out = dropStaleTombs(tombs, present, 10000, now);
    expect(out.bookmarks).toEqual({ '1': now - 1000 });
  });

  it('يُبقي الشواهد التي لا يعيقها عنصر قائم (حذف صحيح)', () => {
    const now = Date.now();
    const tombs = { ...emptyTombs(), bookmarks: { '2': now - 60000 } };
    const out = dropStaleTombs(tombs, present, 10000, now);
    expect(out.bookmarks).toEqual({ '2': now - 60000 });
  });

  it('يطابق أقسام الخرائط والمصفوفات معًا', () => {
    const now = Date.now();
    const tombs = {
      ...emptyTombs(),
      readLessons: { '7': now - 60000 },
      highlightIds: { 'h1': now - 60000 },
    };
    const withHl = { ...present, readLessons: ['7'], highlights: [{ id: 'h1', lessonId: '7', text: 'نص' }] as never[] };
    const out = dropStaleTombs(tombs, withHl, 10000, now);
    expect(out.readLessons).toEqual({});
    expect(out.highlightIds).toEqual({});
  });
});
