import { describe, it, expect } from 'vitest';
import { buildBackup, parseBackupFile, backupToText } from './libraryBackup';

describe('libraryBackup', () => {
  it('يبني نسخة قابلة للاستعادة', () => {
    const b = buildBackup({ bookmarks: ['1'], highlights: [], notes: { '2': 'ملاحظة' }, readLessons: ['1', '2'], stopMarks: { 'الطهارة': '5' } });
    expect(b.app).toBe('fqh');
    const restored = parseBackupFile(JSON.stringify(b));
    expect(restored.bookmarks).toEqual(['1']);
    expect(restored.notes).toEqual({ '2': 'ملاحظة' });
    expect(restored.stopMarks).toEqual({ 'الطهارة': '5' });
  });

  it('يقبل نسخة قديمة (v1) بلا علامات توقف', () => {
    const restored = parseBackupFile(JSON.stringify({ app: 'fqh', version: 1, bookmarks: ['3'], highlights: [], notes: {}, readLessons: [] }));
    expect(restored.bookmarks).toEqual(['3']);
    expect(restored.stopMarks).toEqual({});
  });

  it('يرفض ملفًا غريبًا', () => {
    expect(() => parseBackupFile('{"foo":1}')).toThrow();
  });

  it('يحوّل المكتبة لنص قابل للنسخ', () => {
    const t = backupToText({ bookmarks: ['5'], highlights: [], notes: {}, readLessons: [] }, () => 'عنوان');
    expect(t).toContain('المفضلة');
  });
});
