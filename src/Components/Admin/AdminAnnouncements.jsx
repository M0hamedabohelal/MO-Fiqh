import { useState, useEffect } from 'react';
import { FiTrash2, FiSend, FiBell } from 'react-icons/fi';
import { fetchAnnouncements, createAnnouncement, deleteAnnouncement } from '../../firebase/services';

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const data = await fetchAnnouncements();
    setAnnouncements(data);
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setLoading(true);
    await createAnnouncement({ title: title.trim(), body: body.trim() });
    setTitle(''); setBody('');
    await load();
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('حذف هذا الإشعار؟')) return;
    setLoading(true);
    await deleteAnnouncement(id);
    await load();
    setLoading(false);
  };

  return (
    <div>
      <form onSubmit={handleSend} className='custom-card p-4 shadow-sm mb-4'>
        <h5 className='mb-3' style={{ color: 'var(--primary-color)' }}><FiBell className='ms-2'/> إرسال إشعار جديد</h5>
        <div className='mb-3'>
          <label className='form-label'>عنوان الإشعار</label>
          <input type='text' className='form-control' value={title} onChange={e => setTitle(e.target.value)} required />
        </div>
        <div className='mb-3'>
          <label className='form-label'>نص الإشعار</label>
          <textarea className='form-control' rows='3' value={body} onChange={e => setBody(e.target.value)} required></textarea>
        </div>
        <button type='submit' className='btn btn-primary' disabled={loading}><FiSend className='ms-2'/> إرسال للمستخدمين</button>
      </form>

      <h5 className='mb-3'>الإشعارات السابقة ({announcements.length})</h5>
      <div className='d-flex flex-column gap-3'>
        {announcements.map(ann => (
          <div key={ann.id} className='custom-card p-3 d-flex justify-content-between align-items-center'>
            <div>
              <h6 className='fw-bold mb-1'>{ann.title}</h6>
              <p className='mb-1 small text-muted'>{ann.body}</p>
              <small style={{ fontSize: '0.7rem' }}>{new Date(ann.createdAt).toLocaleString('ar-EG')}</small>
            </div>
            <button className='btn btn-outline-danger btn-sm rounded-circle p-2' onClick={() => handleDelete(ann.id)} disabled={loading}><FiTrash2/></button>
          </div>
        ))}
      </div>
    </div>
  );
}
