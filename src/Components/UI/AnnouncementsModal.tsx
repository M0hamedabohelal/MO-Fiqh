import { motion, AnimatePresence } from 'framer-motion';
import { FiBell, FiX, FiClock } from 'react-icons/fi';
import type { AnnouncementItem } from '../../types';

interface AnnouncementsModalProps {
  announcements: AnnouncementItem[];
  onClose: () => void;
}

const AnnouncementsModal = ({ announcements, onClose }: AnnouncementsModalProps) => {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className='modal-backdrop modal-overlay'
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '15px' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          className='custom-card'
          style={{ width: '100%', maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto', backgroundColor: 'var(--card-bg)', borderRadius: '15px', padding: '20px' }}
          onClick={e => e.stopPropagation()}
        >
          <div className='d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom'>
            <h4 className='mb-0 fw-bold d-flex align-items-center' style={{ color: 'var(--primary-color)' }}>
              <FiBell className='ms-2' /> الإشعارات والتنبيهات
            </h4>
            <button className='btn btn-light rounded-circle p-2 d-flex align-items-center justify-content-center' onClick={onClose}><FiX size={20} /></button>
          </div>

          {announcements.length === 0 ? (
            <div className='text-center text-muted py-5'>
              <FiBell size={40} className='mb-3' style={{ opacity: 0.3 }} />
              <h5>لا توجد إشعارات حالياً</h5>
            </div>
          ) : (
            <div className='d-flex flex-column gap-3'>
              {announcements.map(ann => (
                <div key={ann.id} className='p-3 rounded' style={{ backgroundColor: 'var(--badge-bg)', border: '1px solid var(--border-color)' }}>
                  <h6 className='fw-bold mb-2' style={{ color: 'var(--primary-color)' }}>{ann.title}</h6>
                  <p className='mb-2 small' style={{ lineHeight: '1.6' }}>{ann.body}</p>
                  <small className='text-muted d-flex align-items-center'><FiClock className='ms-1' /> {new Date(ann.createdAt).toLocaleDateString('ar-EG')}</small>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AnnouncementsModal;
