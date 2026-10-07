// لوحة الإدارة — هيكل الصفحة وتبويباتها (المسائل/القاموس/الإحصائيات/التنبيهات)
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FiEdit2, FiBook, FiBarChart2, FiBell,
  FiCheckCircle, FiAlertTriangle, FiRefreshCw,
} from 'react-icons/fi';
import AdminLessonsTab from './AdminLessonsTab';
import AdminGlossaryTab from './AdminGlossaryTab';
import AdminStatsTab from './AdminStatsTab';
import AdminAnnouncements from './AdminAnnouncements';

const AdminPanel = ({ lessons, glossary, onDataChanged }) => {
  const [tab, setTab] = useState('lessons'); // lessons | glossary | stats | announcements
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success'|'error', text }
  const [busy, setBusy] = useState(false);

  const flash = (type, text) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  return (
    <div className="mt-4 mb-5">
      <h3 className="mb-4 fw-bold d-flex align-items-center" style={{ color: 'var(--primary-color)' }}>
        <FiEdit2 className="ms-2" /> لوحة الإدارة
      </h3>

      {/* رسالة الحالة */}
      {statusMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`alert d-flex align-items-center gap-2 ${statusMessage.type === 'success' ? 'alert-success' : 'alert-danger'}`}
          role="alert"
        >
          {statusMessage.type === 'success' ? <FiCheckCircle /> : <FiAlertTriangle />}
          {statusMessage.text}
        </motion.div>
      )}

      {/* تبويبات */}
      <ul className="nav nav-pills mb-4 gap-2">
        <li className="nav-item">
          <button
            className={`nav-link ${tab === 'lessons' ? 'active' : ''}`}
            onClick={() => setTab('lessons')}
            style={tab === 'lessons' ? { backgroundColor: 'var(--primary-color)' } : { color: 'var(--text-main)' }}
          >
            <FiBook className="ms-1" /> المسائل ({lessons.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${tab === 'glossary' ? 'active' : ''}`}
            onClick={() => setTab('glossary')}
            style={tab === 'glossary' ? { backgroundColor: 'var(--primary-color)' } : { color: 'var(--text-main)' }}
          >
            📖 القاموس ({Object.keys(glossary).length})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link d-flex align-items-center gap-1 ${tab === 'stats' ? 'active' : ''}`}
            onClick={() => setTab('stats')}
            style={tab === 'stats' ? { backgroundColor: 'var(--primary-color)' } : { color: 'var(--text-main)' }}
          >
            <FiBarChart2 /> الإحصائيات
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link d-flex align-items-center gap-1 ${tab === 'announcements' ? 'active' : ''}`}
            onClick={() => setTab('announcements')}
            style={tab === 'announcements' ? { backgroundColor: 'var(--primary-color)' } : { color: 'var(--text-main)' }}
          >
            <FiBell /> التنبيهات
          </button>
        </li>
      </ul>

      {/* محتوى التبويبات */}
      {tab === 'lessons' && (
        <AdminLessonsTab lessons={lessons} onDataChanged={onDataChanged} flash={flash} />
      )}
      {tab === 'glossary' && (
        <AdminGlossaryTab glossary={glossary} onDataChanged={onDataChanged} flash={flash} />
      )}
      {tab === 'stats' && (
        <AdminStatsTab lessons={lessons} />
      )}
      {tab === 'announcements' && (
        <AdminAnnouncements />
      )}

      {/* زر تحديث من السحابة */}
      <div className="text-center mt-5">
        <button className="btn btn-sm btn-light text-muted d-flex align-items-center gap-2 mx-auto" onClick={async () => { setBusy(true); await onDataChanged(); setBusy(false); }} disabled={busy}>
          <FiRefreshCw size={14} /> تحديث البيانات من السحابة
        </button>
      </div>
    </div>
  );
};

export default AdminPanel;
