import { describe, it, expect } from 'vitest';
import { buildBackup, parseBackupFile, backupToText } from './libraryBackup';
import { stopMarkBookKey } from '../features/stopMarks/model';

describe('libraryBackup', () => {
  it('يبني نسخة قابلة للاستعادة', () => {
    const bookName = 'الطهارة';
    const b = buildBackup({
      bookmarks: ['1'], highlights: [], notes: { '2': 'ملاحظة' }, readLessons: ['1', '2'],
      stopMarks: { [stopMarkBookKey(bookName)]: { bookName, lessonId: '5', updatedAt: 100, deviceId: 'test' } },
    });
    expect(b.app).toBe('fqh');
    const restored = parseBackupFile(JSON.stringify(b));
    expect(restored.bookmarks).toEqual(['1']);
    expect(restored.notes).toEqual({ '2': 'ملاحظة' });
    expect(restored.stopMarks[stopMarkBookKey(bookName)]?.lessonId).toBe('5');
  });

  it('يستعيد النسخ السابقة ويتجاهل الحقول الإضافية', () => {
    const restored = parseBackupFile(JSON.stringify({
      app: 'fqh', version: 2, bookmarks: ['3'], highlights: [], notes: {}, readLessons: [],
      stopMarks: { 'الطهارة': '5' },
    }));
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
