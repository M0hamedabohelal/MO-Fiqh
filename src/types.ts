// الأنواع المشتركة لنطاق التطبيق (Domain Types)

export interface Lesson {
  id: number | string;
  _docId?: string;
  bookName: string;
  chapterName: string;
  title: string;
  pageNumber?: string;
  videoNumber?: string;
  videoTimestamp?: string;
  mainText: string;
  sheikhExplanation?: string;
  videoUrl?: string;
  startTime?: string;
  endTime?: string;
  mediaUrl?: string;
  mediaType?: string;
  adminNote?: string;
}

export interface LessonIssue extends Lesson {
  lessonIndex: number;
  isRead: boolean;
}

export interface ChapterGroup {
  bookName: string;
  chapterName: string;
  issues: LessonIssue[];
}

export interface BookStats {
  bookName: string;
  chaptersCount: number;
  issuesCount: number;
  readCount: number;
  progressPercent: number;
}

export type GlossaryMap = Record<string, string>;

export type ThemeName = 'dark' | 'sepia';

export type ViewName =
  | 'hero'
  | 'books'
  | 'chapters'
  | 'lessons'
  | 'reading'
  | 'bookmarks'
  | 'highlights'
  | 'admin'
  | 'settings'
  | 'achievements';

export interface HighlightItem {
  id: number | string;
  lessonId: number | string;
  bookName?: string;
  chapterName?: string;
  title?: string;
  text: string;
}

export interface UserLibraryData {
  bookmarks: string[];
  highlights: HighlightItem[];
  notes: Record<string, string>;
  readLessons: string[];
  visits: string[];
}

export interface AnnouncementItem {
  id: string;
  title: string;
  body: string;
  createdAt: number;
}

declare global {
  interface Window {
    __forceHeroOnPopstate?: boolean;
  }
}
