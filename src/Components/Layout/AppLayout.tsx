import { lazy, Suspense } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { User } from 'firebase/auth';
import { FiUser } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import type {
  Lesson,
  ChapterGroup,
  BookStats,
  GlossaryMap,
  HighlightItem,
} from '../../types';

import Topbar from '../Header/Topbar';
import Slider from '../Sidebar/Slider';

// شاشات التطبيق — lazy loaded
const BooksView      = lazy(() => import('../Views/BooksView'));
const ChaptersView   = lazy(() => import('../Views/ChaptersView'));
const LessonsView    = lazy(() => import('../Views/LessonsView'));
const BookmarksView  = lazy(() => import('../Views/BookmarksView'));
const HighlightsView = lazy(() => import('../Views/HighlightsView'));
const ReadingView    = lazy(() => import('../Views/ReadingView'));
const SettingsView   = lazy(() => import('../Views/SettingsView'));
const AchievementsView = lazy(() => import('../Views/AchievementsView'));
const AdminPanel     = lazy(() => import('../Admin/AdminPanel'));

interface ViewSpinnerProps {
  label?: string;
}

const ViewSpinner = ({ label = 'جارٍ التحميل...' }: ViewSpinnerProps) => (
  <div className="text-center p-5">
    <div className="spinner-border" style={{ color: 'var(--primary-color)' }} role="status" />
    <p className="text-muted mt-3">{label}</p>
  </div>
);

interface AppLayoutProps {
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
  promptInstall: () => void;
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

/**
 * AppLayout — هيكل التطبيق الداخلي (بعد Hero)
 * يحتوي على: Sidebar + Topbar + حاوية الشاشات المتحركة
 */
const AppLayout = ({
  currentView, currentIndex, currentLesson, lessons,
  user, isAdminUser,
  theme, setTheme, setFontSize,
  cloudStatus,
  canInstall, promptInstall,
  glossary, notes, bookmarks, highlights, readLessons,
  booksWithStats, selectedBookName, selectedBookChapters,
  openChapterName, lastReadLessonId,
  setCurrentView, openBookChapters, toggleChapter,
  openLessonById, goToNextLesson, goToPrevLesson, goBackToList,
  toggleBookmark, toggleReadLesson, saveNoteForLesson,
  deleteHighlight, createHighlightFromSelection,
  toggleStopMark,
  onOpenSearch, onOpenLogin, reloadFromCloud,
  currentSearchQuery,
  newLessonIds,
  newLessonsCount,
  lessonsCount,
}: AppLayoutProps) => (
  <div className="row g-0">

    {/* الشريط الجانبي */}
    <div className="col-lg-2 col-md-3 d-none d-md-block sidebar-container">
      <Slider
        activeView={currentView}
        setActiveView={setCurrentView}
        onOpenSearch={onOpenSearch}
        onOpenLogin={onOpenLogin}
        user={user}
        isAdminUser={isAdminUser}
        canInstall={canInstall}
        onInstall={promptInstall}
      />
    </div>

    {/* المنطقة الرئيسية */}
    <div className="col-lg-10 col-md-9 px-4 py-3 pb-5 pb-md-3">
      <Topbar
        setFontSize={setFontSize}
        theme={theme}
        toggleTheme={setTheme}
        cloudStatus={cloudStatus}
      />

      <div className="container mt-4" style={{ maxWidth: '850px' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView === 'reading' ? `reading-${currentIndex}` : currentView}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <Suspense fallback={<ViewSpinner />}>

              {currentView === 'books' && (
                <BooksView books={booksWithStats} onOpenBook={openBookChapters} newCount={newLessonsCount} />
              )}

              {currentView === 'chapters' && (
                selectedBookName ? (
                  <ChaptersView
                    bookName={selectedBookName}
                    chapters={selectedBookChapters}
                    openChapterName={openChapterName}
                    onToggleChapter={toggleChapter}
                    onSelectLesson={(lesson: Lesson) => openLessonById(lesson.id)}
                    newLessonIds={newLessonIds}
                  />
                ) : (
                  <BooksView books={booksWithStats} onOpenBook={openBookChapters} newCount={newLessonsCount} />
                )
              )}

              {currentView === 'lessons' && (
                selectedBookName ? (
                  <LessonsView
                    bookName={selectedBookName}
                    chapters={selectedBookChapters}
                    onSelectLesson={(lesson: Lesson) => openLessonById(lesson.id)}
                    newLessonIds={newLessonIds}
                  />
                ) : (
                  <BooksView books={booksWithStats} onOpenBook={openBookChapters} newCount={newLessonsCount} />
                )
              )}

              {currentView === 'bookmarks' && (
                <BookmarksView
                  bookmarks={bookmarks}
                  lessons={lessons}
                  onOpenLessonById={openLessonById}
                  onBrowse={() => setCurrentView('books')}
                  onOpenLogin={onOpenLogin}
                />
              )}

              {currentView === 'highlights' && (
                <HighlightsView
                  highlights={highlights}
                  notes={notes}
                  lessons={lessons}
                  onDeleteHighlight={deleteHighlight}
                  onOpenLessonById={openLessonById}
                  onOpenLogin={onOpenLogin}
                />
              )}

              {currentView === 'reading' && currentLesson && (
                <ReadingView
                  lesson={currentLesson}
                  allLessons={lessons}
                  glossary={glossary}
                  searchQuery={currentSearchQuery}
                  noteValue={notes[String(currentLesson.id)] || ''}
                  onSaveNote={saveNoteForLesson}
                  isRead={readLessons.includes(String(currentLesson.id))}
                  onToggleRead={() => toggleReadLesson(currentLesson.id)}
                  isBookmarked={bookmarks.includes(String(currentLesson.id))}
                  onToggleBookmark={() => toggleBookmark(String(currentLesson.id))}
                  canGoPrev={currentIndex > 0}
                  canGoNext={currentIndex < lessons.length - 1}
                  onPrev={goToPrevLesson}
                  onNext={goToNextLesson}
                  isStopMarked={lastReadLessonId === currentLesson.id.toString()}
                  onToggleStopMark={toggleStopMark}
                  onCreateHighlight={createHighlightFromSelection}
                  onBackToIndex={goBackToList}
                  onSelectLesson={(lesson: Lesson) => openLessonById(lesson.id)}
                />
              )}

              {currentView === 'admin' && (
                isAdminUser ? (
                  <AdminPanel lessons={lessons} glossary={glossary} onDataChanged={reloadFromCloud} />
                ) : (
                  <div className="mt-4 mb-5">
                    <div className="custom-card p-5 text-center shadow-sm">
                      <FiUser size={48} className="mb-3 text-muted" style={{ opacity: 0.35 }} />
                      <h5 className="fw-bold mb-2" style={{ color: 'var(--text-main)' }}>هذه الصفحة للمشرفين فقط</h5>
                      <p className="text-muted mb-0">سجّل الدخول بحساب مشرف للوصول إلى لوحة الإدارة.</p>
                    </div>
                  </div>
                )
              )}

              {currentView === 'settings' && (
                <SettingsView
                  canInstall={canInstall}
                  onInstall={promptInstall}
                  isInstalled={false}
                  onOpenAchievements={() => setCurrentView('achievements')}
                />
              )}

              {currentView === 'achievements' && (
                <AchievementsView
                  readLessons={readLessons}
                  highlights={highlights}
                  notes={notes}
                  booksWithStats={booksWithStats}
                  lessonsCount={lessonsCount}
                  userName={user?.displayName || user?.email || 'طالب العلم'}
                />
              )}

            </Suspense>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  </div>
);

export default AppLayout;
