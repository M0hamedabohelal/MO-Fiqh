import { useState, useEffect } from 'react';
import { motion, useScroll, AnimatePresence } from 'framer-motion';
import { FiArrowUp } from 'react-icons/fi';

// زر العودة للأعلى مع حلقة تقدم التمرير — مكتفي ذاتياً (يدير مستمع التمرير بنفسه)
const BackToTopButton = () => {
  const [visible, setVisible] = useState(false);
  const { scrollYProgress } = useScroll();

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="back-to-top"
          aria-label="العودة للأعلى"
        >
          <svg className="back-to-top-progress" viewBox="0 0 48 48" aria-hidden="true">
            <circle className="back-to-top-progress-track" cx="24" cy="24" r="21" />
            <motion.circle
              className="back-to-top-progress-value"
              cx="24"
              cy="24"
              r="21"
              pathLength={1}
              style={{ pathLength: scrollYProgress }}
            />
          </svg>
          <span className="back-to-top-icon">
            <FiArrowUp />
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
};

export default BackToTopButton;
