import { describe, it, expect } from 'vitest';
import { parseRoute, hashFromCleanPath, canonicalPathFor } from './useHashRoute';
import type { Lesson } from '../types';

const sampleLessons: Lesson[] = [
  { id: 1, bookName: 'كتاب الطهارة', chapterName: 'الباب الأول', title: 'الأولى', mainText: 'نص' },
  { id: 2, bookName: 'كتاب الطهارة', chapterName: 'الباب الأول', title: 'الثانية', mainText: 'نص' },
  { id: 3, bookName: 'كتاب الصلاة', chapterName: 'الباب الأول', title: 'الأولى', mainText: 'نص' },
];

describe('parseRoute', () => {
  it('يحل رابط مسألة موجودة إلى وضع القراءة بالفهرس الصحيح', () => {
    const r = parseRoute('#/lesson/2', sampleLessons);
    expect(r.view).toBe('reading');
    expect(r.index).toBe(1);
    expect(r.lessonId).toBe('2');
  });

  it('المعرّف غير الموجود يعيد index=-1 (لا يعرض مسألة خاطئة)', () => {
    const r = parseRoute('#/lesson/999', sampleLessons);
    expect(r.view).toBe('reading');
    expect(r.index).toBe(-1);
    expect(r.lessonId).toBe('999');
  });

  it('يطابق المعرّف كنص (رقم مقابل نص)', () => {
    const r = parseRoute('#/lesson/3', sampleLessons);
    expect(r.index).toBe(2);
  });

  it('يحل رابط كتاب إلى شاشة الأبواب', () => {
    const r = parseRoute(`#/book/${encodeURIComponent('كتاب الطهارة')}`, sampleLessons);
    expect(r.view).toBe('chapters');
    expect(r.bookName).toBe('كتاب الطهارة');
    expect(r.chapterName).toBeNull();
  });

  it('يحل رابط باب إلى شاشة الأبواب مع فتح الباب', () => {
    const r = parseRoute(
      `#/book/${encodeURIComponent('كتاب الطهارة')}/chapter/${encodeURIComponent('الباب الأول')}`,
      sampleLessons,
    );
    expect(r.view).toBe('chapters');
    expect(r.chapterName).toBe('الباب الأول');
  });

  it('الرابط الفارغ أو الغريب يعود للواجهة', () => {
    expect(parseRoute('', sampleLessons).view).toBe('hero');
    expect(parseRoute('#/unknown', sampleLessons).view).toBe('hero');
    expect(parseRoute('#/books', sampleLessons).view).toBe('books');
  });
});

// الجسر بين الصفحات الثابتة (canonical) والتطبيق — الروابط النظيفة لا الهاش.
// الصفحة الثابتة /lessons/1/ تعلن نفسها canonical وزرّها يشير إليها، فلو لم يترجمها
// التطبيق لوقع الزائر على الصفحة الرئيسية بعد أن قرأ المسألة في نتائج جوجل.
describe('hashFromCleanPath', () => {
  it('يحوّل مسار مسألة نظيفًا (بشرطة نهائية أو بدونها) إلى هاش', () => {
    expect(hashFromCleanPath('/lessons/1/')).toBe('#/lesson/1');
    expect(hashFromCleanPath('/lessons/91')).toBe('#/lesson/91');
    expect(hashFromCleanPath('/lessons/')).toBe('#/lessons');
    expect(hashFromCleanPath('/lessons')).toBe('#/lessons');
  });

  it('يحوّل مسار كتاب عربي مُرمَّزًا ثم يفكّ ترميزه', () => {
    const encoded = `/books/${encodeURIComponent('كتاب الصلاة')}/`;
    expect(hashFromCleanPath(encoded)).toBe(`#/book/${encodeURIComponent('كتاب الصلاة')}`);
  });

  it('يتجاهل جذر الموقع والمسارات غير المعروفة', () => {
    expect(hashFromCleanPath('/')).toBeNull();
    expect(hashFromCleanPath('/about')).toBeNull();
    expect(hashFromCleanPath('/lessons/1/extra')).toBeNull();
  });

  it('مسار بترميز فاسد لا يرمي استثناء', () => {
    expect(() => hashFromCleanPath('/books/%E0%A4%A/')).not.toThrow();
    expect(hashFromCleanPath('/books/%E0%A4%A/')).toBe('#/book/%E0%A4%A');
  });
});

// المسار الذي تُشارك به المسألة يجب أن يكون هو نفسه الـ canonical المُعلَن في
// public/lessons/{id}/index.html — وإلا شارك المستخدمون رابطًا غير قابل للفهرسة.
describe('canonicalPathFor', () => {
  it('يعطي مسار الصفحة الثابتة للمسألة', () => {
    expect(canonicalPathFor('reading', '15')).toBe('/lessons/15/');
  });

  it('يعطي مسار صفحة فهرس المسائل', () => {
    expect(canonicalPathFor('lessons')).toBe('/lessons/');
  });

  it('يعطي مسار صفحة الكتاب (بعد تقليم المسافات)', () => {
    expect(canonicalPathFor('chapters', null, ' كتاب الطهارة ')).toBe(
      `/books/${encodeURIComponent('كتاب الطهارة')}/`,
    );
  });

  it('لا يعطي مسارًا لشاشات بلا صفحة ثابتة', () => {
    expect(canonicalPathFor('hero')).toBeNull();
    expect(canonicalPathFor('reading', null)).toBeNull();
  });
});
