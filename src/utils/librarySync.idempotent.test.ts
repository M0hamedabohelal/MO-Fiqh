// هل الدمج عديم الأثر؟ (idempotent) — هذا ما يمنع حلقة الكتابة بنيويًا.
import { describe, it, expect } from 'vitest';
import { mergeLibraries, librarySignature } from './librarySync';
import type { SyncableLibrary } from './librarySync';

const lib = (over: Partial<SyncableLibrary> = {}): SyncableLibrary => ({
  bookmarks: [], highlights: [], notes: {}, readLessons: [], updatedAt: {}, ...over,
});

describe('mergeLibraries — عديم الأثر', () => {
  it('دمج مكتبة مع نفسها يعطي نفس التوقيع', () => {
    const a = lib({ bookmarks: ['1', '2'], notes: { n: 'x' }, readLessons: ['3'], updatedAt: { 'note:n': 5 } });
    const m = mergeLibraries(a, a);
    expect(librarySignature(m)).toBe(librarySignature(a));
  });

  it('تكرار الدمج لا يغيّر الناتج (لا نموّ ولا تراكم)', () => {
    const cloud = lib({ bookmarks: ['1'], notes: { n: 'cloud' }, updatedAt: { 'note:n': 10 } });
    const local = lib({ bookmarks: ['2'], notes: { n: 'local' }, updatedAt: { 'note:n': 20 } });
    const once = mergeLibraries(cloud, local);
    const twice = mergeLibraries(cloud, once);
    const thrice = mergeLibraries(cloud, twice);
    expect(librarySignature(twice)).toBe(librarySignature(once));
    expect(librarySignature(thrice)).toBe(librarySignature(once));
  });

  // هذا هو أساس الأمان: بعد تطبيق الدمج محليًا، استقبال نفس اللقطة السحابية مرة
  // أخرى يُنتج **نفس المحتوى** (تقارب) ⇒ لا يصل تغيير جديد ⇒ لا تنطلق دفعة ⇒ لا حلقة.
  // الحُرّاس (lastPushed/suppress) طبقة إضافية للطفرات الزمنية، لا الأساس الوحيد.
  it('بعد تطبيق الدمج، نفس اللقطة لا تُنتج محتوى جديدًا (تقارب)', () => {
    const cloud = lib({ bookmarks: ['55'] });
    const local = lib({ bookmarks: [] });

    const merged = mergeLibraries(cloud, local);
    expect(librarySignature(merged)).toContain('b:55'); // أخذنا مفضلة السحابة

    // التطبيق محليًا ثم استقبال نفس اللقطة: لا تغيير
    const again = mergeLibraries(cloud, merged);
    expect(librarySignature(again)).toBe(librarySignature(merged));
  });
});
