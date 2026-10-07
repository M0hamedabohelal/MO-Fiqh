import { useMemo, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiList, FiX } from 'react-icons/fi';

const FloatingTOC = ({ currentLesson, allLessons, onSelectLesson }) => {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);
  const btnRef = useRef(null);

  // الإغلاق بالضغط في أي مكان خارج اللوحة والزر (لا يحجب التمرير أو التفاعل)
  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e) => {
      if (panelRef.current && panelRef.current.contains(e.target)) return;
      if (btnRef.current && btnRef.current.contains(e.target)) return;
      setIsOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [isOpen]);

  const bookLessons = useMemo(() => {
    return allLessons.filter(l => l.bookName === currentLesson.bookName);
  }, [allLessons, currentLesson.bookName]);

  const chapters = useMemo(() => {
    const map = new Map();
    bookLessons.forEach(l => {
      const c = l.chapterName || 'بدون فصل';
      if (!map.has(c)) map.set(c, []);
      map.get(c).push(l);
    });
    return Array.from(map.entries());
  }, [bookLessons]);

  if (!allLessons || allLessons.length === 0) return null;

  return (
    <>
      {/* Toggle Button */}
      <button
        ref={btnRef}
        onClick={() => setIsOpen(!isOpen)}
        className="btn shadow-lg d-flex align-items-center justify-content-center floating-toc-btn"
        title="شجرة الفقه"
        style={{
          position: 'fixed',
          left: '20px',
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          backgroundColor: 'var(--card-bg)',
          border: '2px solid var(--accent-color)',
          color: 'var(--primary-color)',
          zIndex: 1051,
          transition: 'all 0.3s'
        }}
      >
        {isOpen ? <FiX size={24} /> : <FiList size={24} />}
      </button>

      {/* Floating Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, x: -50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -50, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="floating-toc-panel"
            style={{ 
              position: 'fixed', 
              left: '20px', 
              width: '280px', 
              height: 'calc(100vh - 120px)',
              maxHeight: '600px',
              zIndex: 1050 
            }}
          >
            <div className="shadow-lg h-100 d-flex flex-column parchment-texture" style={{ backgroundColor: 'var(--card-bg)', borderRadius: '16px', border: '2px solid var(--border-color)', overflow: 'hidden' }}>
              <div className="p-3 border-bottom" style={{ borderColor: 'var(--border-color)' }}>
                <h6 className="fw-bold mb-0 d-flex align-items-center" style={{ color: 'var(--primary-color)' }}>
                  <FiList className="ms-2" /> شجرة الفقه
                </h6>
                <small className="text-muted d-block mt-1">{currentLesson.bookName}</small>
              </div>
              
              <div className="p-2 overflow-auto flex-grow-1 reading-mode-scroll">
                {chapters.map(([chapterName, issues]) => (
                  <div key={chapterName} className="mb-3">
                    <div className="small fw-bold text-muted mb-2 px-2" style={{ color: 'var(--accent-color)' }}>
                      {chapterName}
                    </div>
                    <ul className="list-unstyled mb-0 px-2">
                      {issues.map(lesson => {
                        const isActive = lesson.id === currentLesson.id;
                        return (
                          <li key={lesson.id} className="mb-1">
                            <button 
                              className="btn btn-sm w-100 text-start border-0"
                              style={{
                                fontSize: '0.85rem',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                backgroundColor: isActive ? 'var(--primary-color)' : 'transparent',
                                color: isActive ? 'var(--text-on-primary)' : 'var(--text-main)',
                                transition: 'all 0.2s'
                              }}
                              onClick={() => {
                                onSelectLesson(lesson);
                                // Optional: Close on mobile when selecting a lesson
                                if (window.innerWidth < 992) {
                                  setIsOpen(false);
                                }
                              }}
                            >
                              <div className="d-flex align-items-start justify-content-start gap-2 text-start">
                                <span style={{ opacity: isActive ? 1 : 0.4 }}>•</span>
                                <span style={{ lineHeight: '1.4' }}>{lesson.title}</span>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FloatingTOC;
