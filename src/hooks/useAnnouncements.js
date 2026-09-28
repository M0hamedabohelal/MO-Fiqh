import { useState, useEffect } from 'react';
import { fetchAnnouncements } from '../firebase/services';
import { isFirebaseConfigured } from '../firebase/config';

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    fetchAnnouncements().then(data => {
      setAnnouncements(data);
      const readIds = JSON.parse(localStorage.getItem('readAnnouncements') || '[]');
      const unread = data.filter(a => !readIds.includes(a.id)).length;
      setUnreadCount(unread);
    }).catch(console.error);
  }, []);

  const markAsRead = () => {
    const allIds = announcements.map(a => a.id);
    localStorage.setItem('readAnnouncements', JSON.stringify(allIds));
    setUnreadCount(0);
  };

  return { announcements, unreadCount, markAsRead };
}
