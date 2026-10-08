import { motion } from 'framer-motion';

const BismillahHeader = () => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="text-center my-4 opacity-75"
      style={{ pointerEvents: 'none' }}
    >
      <svg width="220" height="60" viewBox="0 0 400 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          fill="var(--primary-color)"
          fontSize="48"
          fontFamily="Amiri Quran, serif"
        >
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </text>
      </svg>
    </motion.div>
  );
};

export default BismillahHeader;
