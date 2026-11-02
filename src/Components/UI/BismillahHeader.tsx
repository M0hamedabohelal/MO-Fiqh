import { motion } from 'framer-motion';

const BismillahHeader = () => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="bismillah-header text-center my-2 my-md-3"
      style={{ pointerEvents: 'none', userSelect: 'none' }}
      aria-hidden="true"
    >
      <span
        style={{
          fontFamily: "'Amiri Quran', var(--font-heading), 'Amiri', serif",
          fontSize: 'clamp(1.15rem, 1rem + 0.8vw, 1.45rem)',
          color: 'var(--primary-color)',
          letterSpacing: '0.02em',
          opacity: 0.9,
          display: 'inline-block',
        }}
      >
        بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
      </span>
    </motion.div>
  );
};

export default BismillahHeader;
