import { describe, it, expect } from 'vitest';
import { mergeLibraries } from './mergeLibrary';

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
