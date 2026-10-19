import { describe, it, expect } from 'vitest';
import { validateLessonForm, filterValidBulkLessons } from './validateLesson';

describe('validateLessonForm', () => {
  it('يرفض الفارغ', () => {
    expect(validateLessonForm({})).toContain('اسم الكتاب إلزامي.');
    expect(validateLessonForm({})).toContain('عنوان المسألة إلزامي.');
  });

  it('يقبل مسألة صالحة', () => {
    expect(
      validateLessonForm({ bookName: 'الطهارة', title: 'المسألة الأولى', mainText: 'نص' }),
    ).toEqual([]);
  });

  it('يرفض بلا متن ولا شرح', () => {
    expect(
      validateLessonForm({ bookName: 'ك', title: 'ع' }),
    ).toContain('يجب إدخال نص المتن أو شرح الشيخ على الأقل.');
  });

  it('يرفض رابط فيديو فاسد', () => {
    expect(
      validateLessonForm({ bookName: 'ك', title: 'ع', mainText: 'ن', videoUrl: 'notaurl' }).length,
    ).toBeGreaterThan(0);
  });

  it('يقبل رابط صوت MP3 صالح ويرفض الفاسد', () => {
    expect(
      validateLessonForm({ bookName: 'ك', title: 'ع', mainText: 'ن', audioUrl: 'https://res.cloudinary.com/x/audio.mp3' }),
    ).toEqual([]);
    expect(
      validateLessonForm({ bookName: 'ك', title: 'ع', mainText: 'ن', audioUrl: 'notaurl' }).length,
    ).toBeGreaterThan(0);
  });

  it('يرفض رابطًا بلا مضيف فعلي (http:// فقط)', () => {
    expect(
      validateLessonForm({ bookName: 'ك', title: 'ع', mainText: 'ن', videoUrl: 'http://' }).length,
    ).toBeGreaterThan(0);
  });

  it('يرفض البروتوكول النسبي //evil.com للميديا ويقبل المسار المحلي', () => {
    expect(
      validateLessonForm({ bookName: 'ك', title: 'ع', mainText: 'ن', mediaUrl: '//evil.com/x.png' }).length,
    ).toBeGreaterThan(0);
    expect(
      validateLessonForm({ bookName: 'ك', title: 'ع', mainText: 'ن', mediaUrl: '/uploads/x.png' }),
    ).toEqual([]);
  });
});

describe('filterValidBulkLessons', () => {
  it('يفصل الصالح عن الفاسد مع الأسباب', () => {
    const { valid, rejected } = filterValidBulkLessons([
      { bookName: 'ك', title: 'صالح', mainText: 'نص' },
      { title: 'بلا كتاب' },
    ]);
    expect(valid).toHaveLength(1);
    expect(rejected).toBe(1);
  });
});
