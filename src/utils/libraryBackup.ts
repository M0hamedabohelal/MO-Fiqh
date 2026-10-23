// نسخ احتياطي لمكتبة المستخدم (مفضلة/فوائد/ملاحظات/مقروء) — تصدير واستعادة JSON محليًا
import type { HighlightItem } from '../types';
import { normalizeStopMarkMap } from '../features/stopMarks/model';
import type { StopMarkMap } from '../features/stopMarks/model';

interface LibraryBackup {
  app: 'fqh';
  version: 3;
  exportedAt: string;
  bookmarks: string[];
  highlights: HighlightItem[];
  notes: Record<string, string>;
  readLessons: string[];
  stopMarks: StopMarkMap;
}

export function buildBackup(input: Omit<LibraryBackup, 'app' | 'version' | 'exportedAt'>): LibraryBackup {
  return {
    app: 'fqh',
    version: 3,
    exportedAt: new Date().toISOString(),
    bookmarks: input.bookmarks || [],
    highlights: input.highlights || [],
    notes: input.notes || {},
    readLessons: input.readLessons || [],
    stopMarks: Object.fromEntries(Object.entries(normalizeStopMarkMap(input.stopMarks)).filter(([, mark]) => mark.lessonId !== null)),
  };
}

export function downloadBackup(data: LibraryBackup): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `fqh-library-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function parseBackupFile(text: string): Omit<LibraryBackup, 'app' | 'version' | 'exportedAt'> {
  const parsed = JSON.parse(text) as Partial<LibraryBackup>;
  const asStrings = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);
  // تُقبل النسخ السابقة أيضًا — أي كائن فيه bookmarks يُعد نسخة صالحة
  if (parsed && typeof parsed === 'object' && (parsed.app === 'fqh' || 'bookmarks' in parsed)) {
    return {
      bookmarks: asStrings(parsed.bookmarks),
      highlights: Array.isArray(parsed.highlights) ? (parsed.highlights as HighlightItem[]) : [],
      notes: parsed.notes && typeof parsed.notes === 'object' ? (parsed.notes as Record<string, string>) : {},
      readLessons: asStrings(parsed.readLessons),
      // تُستعاد علامات النسخة الجديدة فقط؛ السجل القديم كان بصيغة مختلفة ومصدره غير موثوق.
      stopMarks: parsed.version === 3 ? normalizeStopMarkMap(parsed.stopMarks) : {},
    };
  }
  throw new Error('ملف غير صالح — ليس نسخة احتياطية من يُسْر.');
}

export function backupToText(input: {
  bookmarks?: unknown; highlights?: unknown; notes?: unknown; readLessons?: unknown; stopMarks?: unknown;
}, lessonTitleOf: (id: string) => string): string {
  const lines: string[] = ['يُسْر — مكتبتي', ''];
  const bookmarks = Array.isArray(input.bookmarks) ? input.bookmarks.map(String) : [];
  const highlights = Array.isArray(input.highlights) ? (input.highlights as HighlightItem[]) : [];
  const notes = input.notes && typeof input.notes === 'object' ? (input.notes as Record<string, string>) : {};
  const readLessons = Array.isArray(input.readLessons) ? input.readLessons.map(String) : [];
  const stopMarks = normalizeStopMarkMap(input.stopMarks);
  if (bookmarks.length > 0) {
    lines.push('★ المفضلة:');
    bookmarks.forEach((id) => lines.push(`- ${lessonTitleOf(String(id)) || `مسألة ${id}`} (#${id})`));
    lines.push('');
  }
  if (highlights.length > 0) {
    lines.push('✎ الفوائد:');
    highlights.forEach((h) => {
      if (h) lines.push(`- "${h.text}" — ${lessonTitleOf(String(h.lessonId)) || ''}`);
    });
    lines.push('');
  }
  const noteEntries = Object.entries(notes).filter(([, t]) => t && String(t).trim());
  if (noteEntries.length > 0) {
    lines.push('📝 ملاحظاتي:');
    noteEntries.forEach(([id, t]) => lines.push(`- ${lessonTitleOf(String(id)) || `مسألة ${id}`}: ${t}`));
    lines.push('');
  }
  if (readLessons.length > 0) {
    lines.push(`✓ مسائل مقروءة: ${readLessons.length}`);
    lines.push('');
  }
  const activeMarks = Object.values(stopMarks).filter((mark) => mark.lessonId !== null);
  if (activeMarks.length > 0) {
    lines.push('🚩 علامات الوقوف:');
    activeMarks.forEach((mark) => lines.push(`- ${mark.bookName}: ${lessonTitleOf(mark.lessonId!) || `مسألة ${mark.lessonId}`}`));
    lines.push('');
  }
  return lines.join('\n');
}
