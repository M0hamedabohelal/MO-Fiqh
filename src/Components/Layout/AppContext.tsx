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
import type { QuizTarget } from '../UI/QuizModal';

// قيمة سياق التطبيق — نفس شكل layoutProps سابقًا (مصدر واحد للحقيقة بدل ~40 prop متناثرة)
export interface AppContextValue {
  currentView: string;
  currentIndex: number;
  currentLesson: Lesson | undefined;
  lessons: Lesson[];
  user: User | null;
  isAdminUser: boolean;
  theme: string;
  setTheme: Dispatch<SetStateAction<string>>;
  fontSize: number;
  setFontSize: Dispatch<SetStateAction<number>>;
  cloudStatus: string;
  canInstall: boolean;
  isInstalled: boolean;
  promptInstall: () => void;
  needRefresh: boolean;
  applyUpdate: () => void;
  checkForUpdates: () => Promise<void>;
  glossary: GlossaryMap;
  notes: Record<string, string>;
  bookmarks: string[];
  highlights: HighlightItem[];
  readLessons: string[];
  booksWithStats: BookStats[];
  selectedBookName: string | null;
  selectedBookChapters: ChapterGroup[];
  openChapterName: string | null;
  lastReadLessonId: string | null;
  setCurrentView: (view: string) => void;
  openBookChapters: (bookName: string) => void;
  toggleChapter: (chapterName: string) => void;
  openQuiz: (target: QuizTarget) => void;
  openMindMap: () => void;
  openLessonById: (lessonId: string | number) => void;
  goToNextLesson: () => void;
  goToPrevLesson: () => void;
  goBackToList: () => void;
  toggleBookmark: (lessonId: string | number) => void;
  toggleReadLesson: (lessonId: string | number) => void;
  saveNoteForLesson: (lessonId: string | number, text: string) => void;
  deleteHighlight: (highlightId: string | number) => void;
  createHighlightFromSelection: (text: string) => void;
  toggleStopMark: () => void;
  onOpenSearch: () => void;
  onOpenLogin: () => void;
  reloadFromCloud: () => Promise<void>;
  currentSearchQuery: string;
  newLessonIds: Set<string>;
  newLessonsCount: number;
  lessonsCount: number;
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
