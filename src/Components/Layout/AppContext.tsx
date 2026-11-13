import { createContext, useContext, useMemo } from 'react';
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

// ── 1. سياق تفضيلات الواجهة (UI Preferences) ──
export interface UIPreferencesContextValue {
  theme: string;
  setTheme: (next: 'dark' | 'sepia' | 'light') => void;
  fontSize: number;
  setFontSize: Dispatch<SetStateAction<number>>;
}
const UIPreferencesContext = createContext<UIPreferencesContextValue | null>(null);

// ── 2. سياق التنقل والملاحة (Navigation) ──
export interface NavigationContextValue {
  currentView: string;
  currentIndex: number;
  currentLesson: Lesson | undefined;
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
}
const NavigationContext = createContext<NavigationContextValue | null>(null);

// ── 3. سياق المكتبة الشخصية (Personal Library) ──
export interface LibraryContextValue {
  bookmarks: string[];
  highlights: HighlightItem[];
  notes: Record<string, string>;
  readLessons: string[];
  stopMarks: StopMarkMap;
  stopMarksReady: boolean;
  toggleBookmark: (lessonId: string | number) => void;
  toggleReadLesson: (lessonId: string | number) => void;
  toggleStopMark: (lesson: Lesson) => void;
  saveNoteForLesson: (lessonId: string | number, text: string) => void;
  deleteHighlight: (highlightId: string | number) => void;
  updateHighlightColor?: (highlightId: string | number, color: string) => void;
  createHighlightFromSelection: (text: string) => void;
  restoreLibrary: (data: {
    bookmarks?: string[];
    notes?: Record<string, string>;
    readLessons?: string[];
    highlights?: HighlightItem[];
    stopMarks?: StopMarkMap;
  }) => void;
}
const LibraryContext = createContext<LibraryContextValue | null>(null);

// ── 4. سياق البيانات السحابية والمحتوى (Data & Content) ──
export interface DataContextValue {
  lessons: Lesson[];
  lessonsCount: number;
  booksWithStats: BookStats[];
  user: User | null;
  isAdminUser: boolean;
  glossary: GlossaryMap;
  cloudStatus: string;
  cloudLessonsLoaded: boolean;
  contentSource: ContentSource;
  contentReady: boolean;
  isOffline: boolean;
  onOpenSearch: () => void;
  onOpenLogin: () => void;
  reloadFromCloud: (manual?: boolean) => Promise<boolean>;
  reloadGlossary?: () => Promise<GlossaryMap | null>;
  upsertLessonLocally?: (lesson: Lesson) => void;
  deleteLessonLocally?: (lessonId: string | number) => void;
  currentSearchQuery: string;
  appVersion: AppVersionState;
  adminEditLessonId?: number | string | null;
  setAdminEditLessonId?: (id: number | string | null) => void;
  openAdminEditLesson?: (lessonId: number | string) => void;
}
const DataContext = createContext<DataContextValue | null>(null);

// القيمة الشاملة المدمجة للحفاظ على التوافق التام (Backward Compatibility)
export interface AppContextValue
  extends UIPreferencesContextValue,
    NavigationContextValue,
    LibraryContextValue,
    DataContextValue {}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ value, children }: { value: AppContextValue; children: ReactNode }) {
  const uiValue: UIPreferencesContextValue = useMemo(() => ({
    theme: value.theme,
    setTheme: value.setTheme,
    fontSize: value.fontSize,
    setFontSize: value.setFontSize,
  }), [value.theme, value.setTheme, value.fontSize, value.setFontSize]);

  const navValue: NavigationContextValue = useMemo(() => ({
    currentView: value.currentView,
    currentIndex: value.currentIndex,
    currentLesson: value.currentLesson,
    selectedBookName: value.selectedBookName,
    selectedBookChapters: value.selectedBookChapters,
    openChapterName: value.openChapterName,
    setCurrentView: value.setCurrentView,
    openBookChapters: value.openBookChapters,
    toggleChapter: value.toggleChapter,
    openLessonById: value.openLessonById,
    goToNextLesson: value.goToNextLesson,
    goToPrevLesson: value.goToPrevLesson,
    goBackToList: value.goBackToList,
  }), [
    value.currentView,
    value.currentIndex,
    value.currentLesson,
    value.selectedBookName,
    value.selectedBookChapters,
    value.openChapterName,
    value.setCurrentView,
    value.openBookChapters,
    value.toggleChapter,
    value.openLessonById,
    value.goToNextLesson,
    value.goToPrevLesson,
    value.goBackToList,
  ]);

  const libraryValue: LibraryContextValue = useMemo(() => ({
    bookmarks: value.bookmarks,
    highlights: value.highlights,
    notes: value.notes,
    readLessons: value.readLessons,
    stopMarks: value.stopMarks,
    stopMarksReady: value.stopMarksReady,
    toggleBookmark: value.toggleBookmark,
    toggleReadLesson: value.toggleReadLesson,
    toggleStopMark: value.toggleStopMark,
    saveNoteForLesson: value.saveNoteForLesson,
    deleteHighlight: value.deleteHighlight,
    updateHighlightColor: value.updateHighlightColor,
    createHighlightFromSelection: value.createHighlightFromSelection,
    restoreLibrary: value.restoreLibrary,
  }), [
    value.bookmarks,
    value.highlights,
    value.notes,
    value.readLessons,
    value.stopMarks,
    value.stopMarksReady,
    value.toggleBookmark,
    value.toggleReadLesson,
    value.toggleStopMark,
    value.saveNoteForLesson,
    value.deleteHighlight,
    value.updateHighlightColor,
    value.createHighlightFromSelection,
    value.restoreLibrary,
  ]);

  const dataValue: DataContextValue = useMemo(() => ({
    lessons: value.lessons,
    lessonsCount: value.lessonsCount,
    booksWithStats: value.booksWithStats,
    user: value.user,
    isAdminUser: value.isAdminUser,
    glossary: value.glossary,
    cloudStatus: value.cloudStatus,
    cloudLessonsLoaded: value.cloudLessonsLoaded,
    contentSource: value.contentSource,
    contentReady: value.contentReady,
    isOffline: value.isOffline,
    onOpenSearch: value.onOpenSearch,
    onOpenLogin: value.onOpenLogin,
    reloadFromCloud: value.reloadFromCloud,
    reloadGlossary: value.reloadGlossary,
    upsertLessonLocally: value.upsertLessonLocally,
    deleteLessonLocally: value.deleteLessonLocally,
    currentSearchQuery: value.currentSearchQuery,
    appVersion: value.appVersion,
    adminEditLessonId: value.adminEditLessonId,
    setAdminEditLessonId: value.setAdminEditLessonId,
    openAdminEditLesson: value.openAdminEditLesson,
  }), [
    value.lessons,
    value.lessonsCount,
    value.booksWithStats,
    value.user,
    value.isAdminUser,
    value.glossary,
    value.cloudStatus,
    value.cloudLessonsLoaded,
    value.contentSource,
    value.contentReady,
    value.isOffline,
    value.onOpenSearch,
    value.onOpenLogin,
    value.reloadFromCloud,
    value.reloadGlossary,
    value.upsertLessonLocally,
    value.deleteLessonLocally,
    value.currentSearchQuery,
    value.appVersion,
    value.adminEditLessonId,
    value.setAdminEditLessonId,
    value.openAdminEditLesson,
  ]);

  return (
    <UIPreferencesContext.Provider value={uiValue}>
      <NavigationContext.Provider value={navValue}>
        <LibraryContext.Provider value={libraryValue}>
          <DataContext.Provider value={dataValue}>
            <AppContext.Provider value={value}>{children}</AppContext.Provider>
          </DataContext.Provider>
        </LibraryContext.Provider>
      </NavigationContext.Provider>
    </UIPreferencesContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUIPreferences(): UIPreferencesContextValue {
  const ctx = useContext(UIPreferencesContext);
  if (!ctx) throw new Error('useUIPreferences must be used within AppProvider');
  return ctx;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNavigation(): NavigationContextValue {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error('useNavigation must be used within AppProvider');
  return ctx;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLibrary(): LibraryContextValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used within AppProvider');
  return ctx;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within AppProvider');
  return ctx;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
