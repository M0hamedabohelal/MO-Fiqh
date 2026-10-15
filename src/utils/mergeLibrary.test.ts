import { describe, it, expect } from 'vitest';
import { mergeLibraries, emptyTombs, mergeTombs, applyTombsToMerged, pruneTombs } from './mergeLibrary';

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
