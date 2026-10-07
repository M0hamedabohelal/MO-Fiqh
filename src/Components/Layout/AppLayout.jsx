import { lazy, Suspense } from 'react';
import { FiUser } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

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
const AdminPanel     = lazy(() => import('../Admin/AdminPanel'));

const ViewSpinner = ({ label = 'جارٍ التحميل...' }) => (
  <div className="text-center p-5">
    <div className="spinner-border" style={{ color: 'var(--primary-color)' }} role="status" />
    <p className="text-muted mt-3">{label}</p>
  </div>
);

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
}) => (
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
                <ChaptersView
                  bookName={selectedBookName}
                  chapters={selectedBookChapters}
                  openChapterName={openChapterName}
                  onToggleChapter={toggleChapter}
                  onSelectLesson={(lesson) => openLessonById(lesson.id)}
                  newLessonIds={newLessonIds}
                />
              )}

              {currentView === 'lessons' && (
                <LessonsView
                  bookName={selectedBookName}
                  chapters={selectedBookChapters}
                  onSelectLesson={(lesson) => openLessonById(lesson.id)}
                  newLessonIds={newLessonIds}
                />
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
                  isBookmarked={bookmarks.includes(currentLesson.id)}
                  onToggleBookmark={() => toggleBookmark(currentLesson.id)}
                  canGoPrev={currentIndex > 0}
                  canGoNext={currentIndex < lessons.length - 1}
                  onPrev={goToPrevLesson}
                  onNext={goToNextLesson}
                  isStopMarked={lastReadLessonId === currentLesson.id.toString()}
                  onToggleStopMark={toggleStopMark}
                  onCreateHighlight={createHighlightFromSelection}
                  onBackToIndex={goBackToList}
                  onSelectLesson={(lesson) => openLessonById(lesson.id)}
                  setFontSize={setFontSize}
                  theme={theme}
                  setTheme={setTheme}
                />
              )}

              {currentView === 'admin' && (
                isAdminUser ? (
                  <Suspense fallback={<ViewSpinner label="جارٍ تحميل لوحة الإدارة..." />}>
                    <AdminPanel lessons={lessons} glossary={glossary} onDataChanged={reloadFromCloud} />
                  </Suspense>
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
