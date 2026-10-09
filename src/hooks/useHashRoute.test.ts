import { describe, it, expect } from 'vitest';
import { parseRoute } from './useHashRoute';
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
