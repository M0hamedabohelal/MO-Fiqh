import { lazy, Suspense } from 'react';
import { FiUser, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import EmptyState from '../UI/EmptyState';
import { motion, AnimatePresence } from 'framer-motion';

import Topbar from '../Header/Topbar';
import Slider from '../Sidebar/Slider';
import { useApp } from './AppContext';
import { ErrorBoundary, ViewErrorFallback } from '../../ErrorBoundary';

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

/**
 * AppLayout — هيكل التطبيق الداخلي (بعد Hero)
 * يحتوي على: Sidebar + Topbar + حاوية الشاشات المتحركة
 * الشاشات تسحب حاجتها مباشرة من useApp() بدل تمرير عشرات الخصائص
 */
const AppLayout = () => {
  const {
    currentView, currentIndex, currentLesson, lessons,
    user, isAdminUser,
    theme, setTheme,
    selectedBookName,
    setCurrentView,
    onOpenSearch, onOpenLogin,
    contentSource, isOffline, reloadFromCloud,
  } = useApp();

  // الشاشات التي تعتمد على المسائل فعليًا — تُستبدل بحالة "تعذّر تحميل المسائل" عند غياب المحتوى
  const contentViews = ['books', 'chapters', 'lessons', 'reading', 'bookmarks', 'highlights', 'achievements'];

  // عنوان الصفحة الدلالي (h1) — لكل شاشة عنوان واحد واضح للزحّاف وقارئ الشاشة
  const viewTitle = currentView === 'reading'
    ? (currentLesson?.title ?? 'قراءة مسألة')
    : ({
        books: 'فهرس الكتب',
        chapters: selectedBookName ? `${selectedBookName} — الفصول` : 'الفصول',
        lessons: 'المسائل',
        bookmarks: 'المفضلة',
        highlights: 'الفوائد المقتبسة',
        achievements: 'إنجازاتي ومواظبتي',
        settings: 'الإعدادات',
        admin: 'لوحة الإدارة',
      } as Record<string, string>)[currentView] ?? 'يُسْر';

  return (
  <div className="row g-0">

    {/* الشريط الجانبي */}
    <div
      className="col-lg-2 col-md-3 d-none d-md-block sidebar-container"
      style={{ paddingTop: 'calc(1.25rem + env(safe-area-inset-top, 0px))' }}
    >
      <Slider
        activeView={currentView}
        setActiveView={setCurrentView}
        onOpenSearch={onOpenSearch}
        onOpenLogin={onOpenLogin}
        user={user}
        isAdminUser={isAdminUser}
      />
    </div>

    {/* المنطقة الرئيسية */}
    <div
      className="col-lg-10 col-md-9 px-4 pb-5 pb-md-3"
      style={{ paddingTop: 'calc(1.25rem + env(safe-area-inset-top, 0px))' }}
    >
      <Topbar
        theme={theme}
        toggleTheme={() => setTheme(theme === 'dark' ? 'sepia' : 'dark')}
      />

      <div className="container mt-4" style={{ maxWidth: '850px' }}>
        {/* عنوان الصفحة الدلالي: الشاشات تستخدم h3/h4 للتنسيق، فبدون h1 يفقد
            الزحّاف وقارئ الشاشة عنوان الصفحة الرئيسي. مخفي بصريًا بلا أي أثر على التصميم. */}
        <h1 className="visually-hidden">{viewTitle}</h1>
        {/* لا يوجد محتوى إطلاقًا (لا سحابة ولا كاش): حالة صريحة مع إعادة محاولة.
            قبل ذلك كانت اللقطة المضمّنة القديمة (16 مسألة) تُعرض صامتة كأنها الكتاب كله. */}
        {contentSource === 'empty' && contentViews.includes(currentView) ? (
          <div className="custom-card p-5 text-center mt-4" role="alert">
            <FiAlertCircle size={46} className="mb-3" style={{ color: '#e74c3c', opacity: 0.75 }} />
            <h4 className="fw-bold mb-2" style={{ color: 'var(--text-main)' }}>تعذّر تحميل المسائل</h4>
            <p className="text-muted mb-3" style={{ lineHeight: '1.8' }}>
              {isOffline
                ? 'لا يوجد اتصال بالإنترنت، ولا توجد نسخة محفوظة على هذا الجهاز بعد.'
                : 'لم يصل المحتوى من السحابة. تحقّق من الاتصال ثم أعد المحاولة.'}
            </p>
            <button
              type="button"
              className="btn btn-primary d-inline-flex align-items-center gap-2"
              onClick={() => { void reloadFromCloud(true); }}
              disabled={isOffline}
            >
              <FiRefreshCw size={16} /> إعادة المحاولة
            </button>
            <p className="text-muted small mt-3 mb-0">
              لن تُعرض نسخة قديمة ناقصة بدل المحتوى الحقيقي.
            </p>
          </div>
        ) : (
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
                <ErrorBoundary fallback={<ViewErrorFallback />}>
                  <BooksView />
                </ErrorBoundary>
              )}

              {currentView === 'chapters' && (
                <ErrorBoundary fallback={<ViewErrorFallback />}>
                  {selectedBookName ? (
                    <ChaptersView />
                  ) : (
                    <BooksView />
                  )}
                </ErrorBoundary>
              )}

              {currentView === 'lessons' && (
                <ErrorBoundary fallback={<ViewErrorFallback />}>
                  {selectedBookName ? (
                    <LessonsView />
                  ) : (
                    <BooksView />
                  )}
                </ErrorBoundary>
              )}

              {currentView === 'bookmarks' && (
                <ErrorBoundary fallback={<ViewErrorFallback />}>
                  <BookmarksView />
                </ErrorBoundary>
              )}

              {currentView === 'highlights' && (
                <ErrorBoundary fallback={<ViewErrorFallback />}>
                  <HighlightsView />
                </ErrorBoundary>
              )}

              {currentView === 'reading' && !currentLesson && (
                lessons.length === 0 ? (
                  <ViewSpinner label="جارٍ تحميل المسألة..." />
                ) : (
                  <EmptyState
                    icon={FiAlertCircle}
                    title="المسألة غير موجودة"
                    message="ربما حُذفت هذه المسألة أو الرابط غير صحيح."
                  >
                    <button className="btn btn-primary mt-1" onClick={() => setCurrentView('books')}>
                      العودة إلى الكتب
                    </button>
                  </EmptyState>
                )
              )}

              {currentView === 'reading' && currentLesson && (
                <ErrorBoundary fallback={<ViewErrorFallback />}>
                  <ReadingView />
                </ErrorBoundary>
              )}

              {currentView === 'admin' && (
                isAdminUser ? (
                  <ErrorBoundary fallback={<ViewErrorFallback />}>
                    <AdminPanel />
                  </ErrorBoundary>
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
                <ErrorBoundary fallback={<ViewErrorFallback />}>
                  <SettingsView />
                </ErrorBoundary>
              )}

              {currentView === 'achievements' && (
                <ErrorBoundary fallback={<ViewErrorFallback />}>
                  <AchievementsView />
                </ErrorBoundary>
              )}

            </Suspense>
          </motion.div>
        </AnimatePresence>
        )}
      </div>
    </div>
  </div>
  );
};

export default AppLayout;
