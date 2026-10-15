// دمج مكتبة الضيف مع مكتبة السحابة — دالة pure قابلة للاختبار
// مستخرجة من useUserLibrary للحفاظ على نفس السلوك مع إمكانية التغطية بـ vitest
import type { HighlightItem } from '../types';

export interface LibraryState {
  bookmarks: string[];
  highlights: HighlightItem[];
  notes: Record<string, string>;
  readLessons: string[];
  stopMarks: Record<string, string>;
}

const asStrings = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);

export function mergeLibraries(
  cloud: Partial<LibraryState>,
  guest: Partial<LibraryState>,
): LibraryState {
  const mergedBookmarks = Array.from(
    new Set([...asStrings(cloud.bookmarks), ...asStrings(guest.bookmarks)]),
  );

  const highlightMap = new Map<string, HighlightItem>();
  [...(guest.highlights ?? []), ...(cloud.highlights ?? [])].forEach((h) => {
    if (h) highlightMap.set(String(h.id ?? h.text), h);
  });

  // ملاحظات السحابة أحدث (كُتبت من جهاز آخر) — تتفوق عند التعارض، وملاحظات الضيف الجديدة تُضاف
  const mergedNotes: Record<string, string> = { ...(guest.notes ?? {}), ...(cloud.notes ?? {}) };

  // علامات التوقف: نفس القاعدة — السحابة تتفوق عند التعارض على نفس الكتاب (جهاز آخر أحدث غالبًا)
  const mergedStopMarks: Record<string, string> = { ...(guest.stopMarks ?? {}), ...(cloud.stopMarks ?? {}) };

  const mergedReadLessons = Array.from(
    new Set([...asStrings(guest.readLessons), ...asStrings(cloud.readLessons)]),
  );

  return {
    bookmarks: mergedBookmarks,
    highlights: Array.from(highlightMap.values()),
    notes: mergedNotes,
    readLessons: mergedReadLessons,
    stopMarks: mergedStopMarks,
  };
}
