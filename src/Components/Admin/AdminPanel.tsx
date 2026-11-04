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
import { useApp } from '../Layout/AppContext';

type AdminTab = 'lessons' | 'glossary' | 'stats' | 'announcements';

interface StatusMessage {
  type: 'success' | 'error';
  text: string;
}

const AdminPanel = () => {
  const { lessons, glossary, cloudLessonsLoaded, cloudStatus, isOffline, reloadFromCloud, reloadGlossary, adminEditLessonId, setAdminEditLessonId } = useApp();
  const [tab, setTab] = useState<AdminTab>('lessons'); // lessons | glossary | stats | announcements
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null); // { type: 'success'|'error', text }
  const [busy, setBusy] = useState(false);

  const activeTab: AdminTab = adminEditLessonId != null ? 'lessons' : tab;

  const handleSelectTab = (nextTab: AdminTab): void => {
    if (adminEditLessonId != null) {
      setAdminEditLessonId?.(null);
    }
    setTab(nextTab);
  };

  const flash = (type: 'success' | 'error', text: string): void => {
    setStatusMessage({ type, text });
    if (type === 'error') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setTimeout(() => setStatusMessage(null), type === 'error' ? 8000 : 3500);
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
          className={`alert d-flex align-items-center justify-content-between ${statusMessage.type === 'success' ? 'alert-success' : 'alert-danger'}`}
          role="alert"
        >
          <div className="d-flex align-items-center gap-2">
            {statusMessage.type === 'success' ? <FiCheckCircle /> : <FiAlertTriangle />}
            <span>{statusMessage.text}</span>
          </div>
          <button
            type="button"
            className="btn-close ms-2"
            onClick={() => setStatusMessage(null)}
            aria-label="إغلاق التنبيه"
          />
        </motion.div>
      )}

      {/* تبويبات */}
      <ul className="nav nav-pills mb-4 gap-2">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'lessons' ? 'active' : ''}`}
            onClick={() => handleSelectTab('lessons')}
            style={activeTab === 'lessons' ? { backgroundColor: 'var(--primary-color)' } : { color: 'var(--text-main)' }}
          >
            <FiBook className="ms-1" /> المسائل ({lessons.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'glossary' ? 'active' : ''}`}
            onClick={() => handleSelectTab('glossary')}
            style={activeTab === 'glossary' ? { backgroundColor: 'var(--primary-color)' } : { color: 'var(--text-main)' }}
          >
            📖 القاموس ({Object.keys(glossary).length})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link d-flex align-items-center gap-1 ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => handleSelectTab('stats')}
            style={activeTab === 'stats' ? { backgroundColor: 'var(--primary-color)' } : { color: 'var(--text-main)' }}
          >
            <FiBarChart2 /> الإحصائيات
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link d-flex align-items-center gap-1 ${activeTab === 'announcements' ? 'active' : ''}`}
            onClick={() => handleSelectTab('announcements')}
            style={activeTab === 'announcements' ? { backgroundColor: 'var(--primary-color)' } : { color: 'var(--text-main)' }}
          >
            <FiBell /> التنبيهات
          </button>
        </li>
      </ul>

      {/* محتوى التبويبات */}
      {activeTab === 'lessons' && (
        <AdminLessonsTab
          lessons={lessons}
          cloudBackupReady={cloudLessonsLoaded && !isOffline}
          onDataChanged={reloadFromCloud}
          flash={flash}
          initialEditLessonId={adminEditLessonId}
          onClearInitialEdit={() => setAdminEditLessonId?.(null)}
        />
      )}
      {activeTab === 'glossary' && (
        <AdminGlossaryTab glossary={glossary} lessons={lessons} onDataChanged={reloadGlossary || reloadFromCloud} flash={flash} />
      )}
      {activeTab === 'stats' && (
        <AdminStatsTab lessons={lessons} cloudLessonsLoaded={cloudLessonsLoaded} cloudStatus={cloudStatus} />
      )}
      {activeTab === 'announcements' && (
        <AdminAnnouncements />
      )}

      {/* زر تحديث من السحابة */}
      <div className="text-center mt-5">
        <button className="btn btn-sm btn-light text-muted d-flex align-items-center gap-2 mx-auto" onClick={async () => { setBusy(true); try { await reloadFromCloud(true); } finally { setBusy(false); } }} disabled={busy}>
          <FiRefreshCw size={14} /> تحديث البيانات من السحابة
        </button>
      </div>
    </div>
  );
};

export default AdminPanel;
