import { createContext, useContext } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type { User } from 'firebase/auth';
import type {
  Lesson,
  ChapterGroup,
  BookStats,
  GlossaryMap,
  HighlightItem,
} from '../../types';
import type { StopMarkMap } from '../../features/stopMarks/model';
import type { ContentSource } from '../../utils/contentSource';
import type { AppVersionState } from '../../hooks/useAppVersion';

// قيمة سياق التطبيق — نفس شكل layoutProps سابقًا (مصدر واحد للحقيقة بدل ~40 prop متناثرة)
export interface AppContextValue {
  currentView: string;
  currentIndex: number;
  currentLesson: Lesson | undefined;
  lessons: Lesson[];
  user: User | null;
  isAdminUser: boolean;
  theme: string;
  setTheme: (next: 'dark' | 'sepia' | 'light') => void;
  fontSize: number;
  setFontSize: Dispatch<SetStateAction<number>>;
  cloudStatus: string;
  cloudLessonsLoaded: boolean;
  // مصدر المحتوى المعروض: سحابة / كاش / لا شيء (حالة خطأ صريحة)
  contentSource: ContentSource;
  // هل انتهت أول محاولة لتحميل المحتوى؟ (مستقل عن cloudStatus المشترك مع مزامنة المكتبة)
  contentReady: boolean;
  // هل الجهاز بلا اتصال؟ (لعرض مؤشر الواي فاي المشطوب في الشريط العلوي)
  isOffline: boolean;
  glossary: GlossaryMap;
  notes: Record<string, string>;
  bookmarks: string[];
  highlights: HighlightItem[];
  readLessons: string[];
  stopMarks: StopMarkMap;
  stopMarksReady: boolean;
  booksWithStats: BookStats[];
  selectedBookName: string | null;
  selectedBookChapters: ChapterGroup[];
  openChapterName: string | null;
  setCurrentView: (view: string) => void;
  openBookChapters: (bookName: string) => void;
  toggleChapter: (chapterName: string) => void;
  openLessonById: (lessonId: string | number) => void;
  goToNextLesson: () => void;
  goToPrevLesson: () => void;
  goBackToList: () => void;
  toggleBookmark: (lessonId: string | number) => void;
  toggleReadLesson: (lessonId: string | number) => void;
  toggleStopMark: (lesson: Lesson) => void;
  saveNoteForLesson: (lessonId: string | number, text: string) => void;
  deleteHighlight: (highlightId: string | number) => void;
  createHighlightFromSelection: (text: string) => void;
  restoreLibrary: (data: {
    bookmarks?: string[];
    notes?: Record<string, string>;
    readLessons?: string[];
    highlights?: HighlightItem[];
    stopMarks?: StopMarkMap;
  }) => void;
  onOpenSearch: () => void;
  onOpenLogin: () => void;
  reloadFromCloud: (manual?: boolean) => Promise<boolean>;
  currentSearchQuery: string;
  lessonsCount: number;
  appVersion: AppVersionState;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ value, children }: { value: AppContextValue; children: ReactNode }) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
