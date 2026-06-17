import React, { useState, useEffect } from 'react';
import { FiEdit3, FiSave } from 'react-icons/fi';
import { motion } from 'framer-motion';

const NotesCard = ({ lessonId }) => {
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // تحميل الملاحظة المحفوظة عند فتح المسألة
    const savedNote = localStorage.getItem(`note_lesson_${lessonId}`);
    if (savedNote) {
      setNote(savedNote);
    } else {
      setNote('');
    }
  }, [lessonId]);

  const handleSave = () => {
    localStorage.setItem(`note_lesson_${lessonId}`, note);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ delay: 0.4 }}
      className="custom-card p-4 p-md-5 mb-4 shadow-sm position-relative"
    >
      <h5 className="mb-4 d-flex align-items-center justify-content-center fw-bold" style={{color: 'var(--primary-color)'}}>
         ملاحظاتي وفوائدي الخاصة <FiEdit3 className="ms-2" />
      </h5>
      
      <textarea 
        className="form-control mb-3 p-3" 
        rows="4" 
        placeholder="اكتب فوائدك وملاحظاتك حول هذه المسألة هنا لتحتفظ بها..."
        value={note}
        onChange={(e) => setNote(e.target.value)}
        style={{ 
          backgroundColor: 'var(--badge-bg)', 
          color: 'var(--text-main)', 
          border: '1px solid var(--border-color)', 
          borderRadius: '12px',
          resize: 'vertical',
          fontSize: '1.05rem',
          lineHeight: '1.8'
        }}
      ></textarea>
      
      <button 
        onClick={handleSave} 
        className="btn w-100 p-2 shadow-sm d-flex align-items-center justify-content-center" 
        style={{ 
          backgroundColor: saved ? '#27ae60' : 'var(--accent-color)', 
          color: saved ? '#fff' : 'var(--primary-color)', 
          fontWeight: 'bold',
          borderRadius: '10px',
          transition: 'all 0.3s ease'
        }}
      >
        {saved ? 'تم الحفظ بنجاح ✓' : <><FiSave className="ms-2" /> حفظ الملاحظات</>}
      </button>
    </motion.div>
  );
};

export default NotesCard;
