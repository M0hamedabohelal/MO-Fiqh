import { describe, expect, it } from 'vitest';
import { auditLessons } from './auditLessons';

describe('auditLessons', () => {
  it('يفصل عدد المسائل عن أعلى معرّف ويعرض الفجوات دون اعتبارها أخطاء', () => {
    const audit = auditLessons([
      { id: 1, title: 'الأولى', bookName: 'الصلاة', chapterName: 'باب' },
      { id: 3, title: 'الثالثة', bookName: 'الصلاة', chapterName: 'باب' },
    ]);

    expect(audit.total).toBe(2);
    expect(audit.maximumId).toBe(3);
    expect(audit.missingNumericIds).toEqual([2]);
  });

  it('يكشف تكرار المعرّف والبيانات الوصفية الناقصة', () => {
    const audit = auditLessons([
      { id: '7', title: 'مسألة', bookName: 'الطهارة', chapterName: 'باب' },
      { id: 7, title: '', bookName: 'الطهارة', chapterName: '' },
    ]);

    expect(audit.duplicateIds).toEqual([{ id: '7', count: 2 }]);
    expect(audit.incompleteLessonIds).toEqual(['7']);
    expect(audit.books).toEqual([{ name: 'الطهارة', count: 2 }]);
  });
});
